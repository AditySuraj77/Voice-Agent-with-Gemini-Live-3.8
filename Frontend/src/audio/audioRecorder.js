import { downsampleBuffer, float32ToPCM16, arrayBufferToBase64 } from './pcmUtils.js';

const AUDIO_WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];
      if (this.bufferIndex >= this.bufferSize) {
        this.port.postMessage(this.buffer);
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

/**
 * AudioRecorder captures microphone input using modern Web Audio AudioWorkletNode
 * (running off the main thread on dedicated audio thread), downsamples to 16kHz mono PCM,
 * and sends base64 chunks through callback.
 */
export class AudioRecorder {
  constructor({ onAudioChunk, onVolumeChange }) {
    this.onAudioChunk = onAudioChunk;
    this.onVolumeChange = onVolumeChange;
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.workletNode = null;
    this.processorNode = null;
    this.isRecording = false;
    this.isMuted = false;
    this._lastVolTime = 0;
    this._vadHangoverFrames = 0;
  }

  /**
   * Internal helper to process a slice of raw Float32 microphone samples
   */
  processAudioSlice(inputData) {
    if (!this.isRecording || this.isMuted) return;

    // Local Voice Activity Detection (VAD) & Noise Gate
    // Calculate RMS energy of current audio buffer
    let sumSquares = 0;
    for (let i = 0; i < inputData.length; i++) {
      sumSquares += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sumSquares / inputData.length);

    // Throttled volume estimation for UI activity indicator (max ~5/sec instead of flooding 12+/sec)
    if (this.onVolumeChange) {
      const now = performance.now();
      if (now - this._lastVolTime > 200) {
        this._lastVolTime = now;
        this.onVolumeChange(Math.min(1, rms * 5)); // Scaled volume level (0 to 1)
      }
    }

    // Noise gate threshold: RMS below 0.006 is background static/fan hum
    const SPEECH_THRESHOLD = 0.006;
    if (rms >= SPEECH_THRESHOLD) {
      // User is speaking, reset hangover frames to keep sending natural word endings
      this._vadHangoverFrames = 4; // ~350ms of audio hangover
    } else if (this._vadHangoverFrames > 0) {
      this._vadHangoverFrames--;
    } else {
      // Background silence/hum: suppress packet transmission to save bandwidth & prevent accidental interruptions
      return;
    }

    // Downsample input from browser rate (e.g. 48kHz) to Gemini 16kHz
    const downsampled = downsampleBuffer(inputData, this.audioContext.sampleRate, 16000);
    const pcm16 = float32ToPCM16(downsampled);
    const base64Chunk = arrayBufferToBase64(pcm16);

    if (this.onAudioChunk && base64Chunk) {
      this.onAudioChunk(base64Chunk);
    }
  }

  /**
   * Starts recording from the user's microphone.
   */
  async start() {
    if (this.isRecording) return;

    try {
      // Echo cancellation, noise suppression, and auto gain control enabled with speech-optimized configuration
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Browser AudioContext (typically 44100 or 48000 Hz)
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Attempt to use modern AudioWorkletNode for off-thread processing
      let workletInitialized = false;
      if (this.audioContext.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
        try {
          const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          await this.audioContext.audioWorklet.addModule(workletUrl);
          URL.revokeObjectURL(workletUrl);

          this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-processor');
          this.workletNode.port.onmessage = (event) => {
            this.processAudioSlice(event.data);
          };

          this.sourceNode.connect(this.workletNode);
          workletInitialized = true;
          console.log(`[AudioRecorder] AudioWorkletNode initialized at ${this.audioContext.sampleRate}Hz (dedicated audio thread).`);
        } catch (workletErr) {
          console.warn('[AudioRecorder] AudioWorklet failed to initialize, falling back to ScriptProcessor:', workletErr);
        }
      }

      // Fallback to ScriptProcessorNode if AudioWorklet unavailable
      if (!workletInitialized) {
        const bufferSize = 4096;
        this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

        this.processorNode.onaudioprocess = (event) => {
          for (let i = 0; i < event.outputBuffer.numberOfChannels; i++) {
            event.outputBuffer.getChannelData(i).fill(0);
          }
          const inputData = event.inputBuffer.getChannelData(0);
          this.processAudioSlice(inputData);
        };

        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination);
        console.log(`[AudioRecorder] ScriptProcessor fallback initialized at ${this.audioContext.sampleRate}Hz.`);
      }

      this.isRecording = true;
    } catch (err) {
      console.error('[AudioRecorder] Failed to start microphone:', err);
      this.stop();
      throw err;
    }
  }

  /**
   * Sets mute state. When muted, chunks are dropped.
   */
  setMuted(muted) {
    this.isMuted = muted;
  }

  /**
   * Stops recording and releases microphone track.
   */
  stop() {
    this.isRecording = false;

    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
    console.log('[AudioRecorder] Microphone stopped.');
  }
}
