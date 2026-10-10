import { base64ToArrayBuffer, pcm16ToFloat32 } from './pcmUtils.js';

/**
 * AudioPlayer handles streaming PCM 24kHz audio playback from Gemini Live API.
 * Accurately schedules audio buffers to eliminate gaps, overlaps, and latency,
 * and provides instant interruption/barge-in flushing.
 */
export class AudioPlayer {
  constructor({ onPlaybackStateChange }) {
    this.onPlaybackStateChange = onPlaybackStateChange;
    this.playerId = Math.random().toString(36).slice(2, 6);
    this.audioContext = null;
    this.sampleRate = 24000; // Gemini Live API outputs 24kHz PCM
    this.nextScheduledTime = 0;
    this.isPlaying = false;
    this.activeSourceNodes = new Set();
    this.chunkCounter = 0;
  }

  /**
   * Initializes or resumes the playback AudioContext.
   */
  async init() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
      });
      this.nextScheduledTime = 0;
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Schedules a base64 PCM 24kHz audio chunk for seamless playback.
   * @param {string} base64PCMChunk
   */
  async playChunk(base64PCMChunk) {
    if (!base64PCMChunk) return;

    await this.init();

    const arrayBuffer = base64ToArrayBuffer(base64PCMChunk);
    const float32Data = pcm16ToFloat32(arrayBuffer);

    if (float32Data.length === 0) return;

    // Create AudioBuffer at 24000Hz mono
    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, this.sampleRate);
    audioBuffer.copyToChannel(float32Data, 0);

    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.audioContext.destination);

    // Schedule seamlessly right after previous chunk finishes.
    // If nextScheduledTime has fallen behind currentTime (or queue was idle), start at currentTime + 20ms lead.
    const currentTime = this.audioContext.currentTime;
    const leadTime = 0.02; // 20ms lead time for jitter-free scheduling
    const startTime = Math.max(currentTime + leadTime, this.nextScheduledTime);

    sourceNode.start(startTime);
    this.nextScheduledTime = startTime + audioBuffer.duration;

    const playId = ++this.chunkCounter;
    console.log(
      `[AudioPlayer #${this.playerId}] playChunk #${playId}: duration=${audioBuffer.duration.toFixed(3)}s, ` +
      `startTime=${startTime.toFixed(3)}s, currentTime=${currentTime.toFixed(3)}s, ` +
      `queueEnd=${this.nextScheduledTime.toFixed(3)}s, activeNodes=${this.activeSourceNodes.size + 1}`
    );

    this.activeSourceNodes.add(sourceNode);

    if (!this.isPlaying) {
      this.isPlaying = true;
      if (this.onPlaybackStateChange) {
        this.onPlaybackStateChange(true);
      }
    }

    sourceNode.onended = () => {
      this.activeSourceNodes.delete(sourceNode);
      if (this.activeSourceNodes.size === 0) {
        this.isPlaying = false;
        if (this.onPlaybackStateChange) {
          this.onPlaybackStateChange(false);
        }
      }
    };
  }

  /**
   * Critical Barge-in / Interruption handler:
   * Immediately stops all currently playing and scheduled buffers,
   * flushes the queue, and resets timing to prevent stale audio playback.
   */
  stopAndClear() {
    console.log(`[AudioPlayer #${this.playerId}] stopAndClear: stopping ${this.activeSourceNodes.size} queued audio nodes.`);
    for (const source of this.activeSourceNodes) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source may have already stopped
      }
    }
    this.activeSourceNodes.clear();

    if (this.audioContext) {
      this.nextScheduledTime = 0;
    }
    this.isPlaying = false;
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(false);
    }
  }

  /**
   * Closes the AudioContext.
   */
  destroy() {
    this.stopAndClear();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
