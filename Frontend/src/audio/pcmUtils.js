/**
 * Utilities for PCM conversions, resamplings, and Base64 operations.
 * Gemini Live API expects 16kHz mono 16-bit linear PCM input,
 * and produces 24kHz mono 16-bit linear PCM output.
 */

/**
 * Downsamples a Float32Array audio buffer from inputSampleRate to outputSampleRate.
 * Uses linear interpolation for clean, lightweight resampling.
 */
export function downsampleBuffer(buffer, inputSampleRate, outputSampleRate = 16000) {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }
  if (inputSampleRate < outputSampleRate) {
    // Upsample via linear interpolation when input sample rate is lower than target
    const upsampleRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / upsampleRatio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const pos = i * upsampleRatio;
      const index = Math.floor(pos);
      const frac = pos - index;
      const s0 = buffer[index] || 0;
      const s1 = buffer[index + 1] !== undefined ? buffer[index + 1] : s0;
      result[i] = s0 + frac * (s1 - s0);
    }
    return result;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const center = i * sampleRateRatio;
    const startIndex = Math.floor(center);
    const endIndex = Math.min(buffer.length, Math.ceil(center + sampleRateRatio));
    
    let sum = 0;
    let count = 0;
    for (let j = startIndex; j < endIndex; j++) {
      sum += buffer[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : buffer[Math.min(buffer.length - 1, Math.round(center))];
  }
  return result;
}

/**
 * Converts Float32Array audio samples (-1.0 to 1.0) into 16-bit signed PCM ArrayBuffer.
 */
export function float32ToPCM16(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16.buffer;
}

/**
 * Converts 16-bit signed PCM ArrayBuffer to Float32Array for AudioBuffer / Web Audio playback.
 */
export function pcm16ToFloat32(arrayBuffer) {
  const int16Array = new Int16Array(arrayBuffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
}

/**
 * Converts an ArrayBuffer to a Base64 string.
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return window.btoa(binary);
}

/**
 * Converts a Base64 string to an ArrayBuffer.
 */
export function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
