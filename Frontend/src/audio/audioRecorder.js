import { downsampleBuffer, float32ToPCM16, arrayBufferToBase64 } from './pcmUtils.js';

/**
 * AudioRecorder captures microphone input using Web Audio API ScriptProcessor/AudioWorklet,
 * downsamples to 16kHz mono PCM, and sends base64 chunks through a callback.
 */
export class AudioRecorder {
  constructor({ onAudioChunk, onVolumeChange }) {
    this.onAudioChunk = onAudioChunk;
    this.onVolumeChange = onVolumeChange;
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.isRecording = false;
    this.isMuted = false;
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

      // Browser AudioContext (typically 44100 or 48000 Hz, or 16000 if supported)
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Buffer size 4096 gives ~90ms slices, reducing CPU interrupt overhead & packet jitter
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        // Zero out output buffer to guarantee 100% silence to destination (no feedback)
        for (let i = 0; i < event.outputBuffer.numberOfChannels; i++) {
          event.outputBuffer.getChannelData(i).fill(0);
        }

        if (!this.isRecording || this.isMuted) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Volume estimation for UI activity indicator
        if (this.onVolumeChange) {
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          this.onVolumeChange(Math.min(1, rms * 5)); // Scaled volume level (0 to 1)
        }

        // Downsample input from browser rate (e.g. 48kHz) to Gemini 16kHz
        const downsampled = downsampleBuffer(inputData, this.audioContext.sampleRate, 16000);
        const pcm16 = float32ToPCM16(downsampled);
        const base64Chunk = arrayBufferToBase64(pcm16);

        if (this.onAudioChunk && base64Chunk) {
          this.onAudioChunk(base64Chunk);
        }
      };

      // Connect to destination directly so Chromium's audio rendering graph keeps pulling frames
      // while onaudioprocess outputs pure silence to speakers.
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log(`[AudioRecorder] Microphone initialized at ${this.audioContext.sampleRate}Hz.`);
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
