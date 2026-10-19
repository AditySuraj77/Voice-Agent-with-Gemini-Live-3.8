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
    this.playbackStopTimer = null;
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

    // Continuous seamless audio scheduling:
    // If nextScheduledTime is in the future, chain directly to eliminate dead-air gaps.
    // If queue ran empty (or first chunk), start with a minimal 5ms lookahead to prevent click/pop.
    const currentTime = this.audioContext.currentTime;
    const startTime = this.nextScheduledTime > currentTime ? this.nextScheduledTime : currentTime + 0.005;

    sourceNode.start(startTime);
    this.nextScheduledTime = startTime + audioBuffer.duration;

    const playId = ++this.chunkCounter;
    this.activeSourceNodes.add(sourceNode);

    // Cancel any pending stop debounce since new audio has arrived
    if (this.playbackStopTimer) {
      clearTimeout(this.playbackStopTimer);
      this.playbackStopTimer = null;
    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      if (this.onPlaybackStateChange) {
        this.onPlaybackStateChange(true);
      }
    }

    sourceNode.onended = () => {
      this.activeSourceNodes.delete(sourceNode);
      if (this.activeSourceNodes.size === 0) {
        // Hysteresis buffer: Wait 250ms before declaring playback ended.
        // This prevents rapid UI flickering and main-thread React re-render thrashing between incoming chunks.
        if (this.playbackStopTimer) {
          clearTimeout(this.playbackStopTimer);
        }
        this.playbackStopTimer = setTimeout(() => {
          if (this.activeSourceNodes.size === 0) {
            this.isPlaying = false;
            this.playbackStopTimer = null;
            if (this.onPlaybackStateChange) {
              this.onPlaybackStateChange(false);
            }
          }
        }, 250);
      }
    };
  }

  /**
   * Critical Barge-in / Interruption handler:
   * Immediately stops all currently playing and scheduled buffers,
   * flushes the queue, and resets timing to prevent stale audio playback.
   */
  stopAndClear() {
    if (this.playbackStopTimer) {
      clearTimeout(this.playbackStopTimer);
      this.playbackStopTimer = null;
    }

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
