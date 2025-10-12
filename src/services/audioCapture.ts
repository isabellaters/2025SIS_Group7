/**
 * Desktop Audio Capture Service
 * Cross-platform audio capture using Electron's desktopCapturer API
 */

import type { AudioSource } from '../types';

export type { AudioSource };

export class AudioCaptureService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onAudioDataCallback: ((data: Float32Array) => void) | null = null;

  /**
   * Get available audio sources (screens/windows)
   */
  async getAudioSources(): Promise<AudioSource[]> {
    if (!(window as any).electronAPI?.getAudioSources) {
      throw new Error('Electron API not available');
    }
    return (window as any).electronAPI.getAudioSources();
  }

  /**
   * Start capturing audio from a specific source
   * @param sourceId - The ID of the audio source to capture
   * @param onAudioData - Callback for raw audio data chunks
   */
  async startCapture(
    sourceId: string,
    onAudioData: (data: Float32Array) => void
  ): Promise<void> {
    try {
      this.onAudioDataCallback = onAudioData;

      console.log('Requesting audio stream for source:', sourceId);

      // Get media stream from desktop capturer
      // Note: We need to request video even though we only use audio,
      // because Windows Graphics Capture requires both to be captured together
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        } as any,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: 1,
            maxHeight: 1,
            maxFrameRate: 1,
          },
        } as any,
      });

      console.log('Media stream obtained:', stream);
      console.log('Audio tracks:', stream.getAudioTracks());

      this.mediaStream = stream;

      // Create audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      console.log('Audio context created, sample rate:', this.audioContext.sampleRate);

      const source = this.audioContext.createMediaStreamSource(stream);

      // Create script processor for audio chunks
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      let processCount = 0;
      this.processor.onaudioprocess = (e) => {
        processCount++;
        const inputData = e.inputBuffer.getChannelData(0);

        // Check if there's actual audio data (not silence)
        const hasAudio = inputData.some(sample => Math.abs(sample) > 0.01);
        const maxAmplitude = Math.max(...Array.from(inputData).map(Math.abs));

        if (processCount % 10 === 0) {
          console.log(`Audio process #${processCount}, max amplitude: ${maxAmplitude}, hasAudio: ${hasAudio}`);
        }

        if (this.onAudioDataCallback) {
          this.onAudioDataCallback(inputData);
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      console.log('Audio capture pipeline connected successfully');
    } catch (error) {
      console.error('Error starting audio capture:', error);
      throw error;
    }
  }

  /**
   * Stop audio capture and clean up resources
   */
  stopCapture(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.onAudioDataCallback = null;
    console.log('Audio capture stopped');
  }

  /**
   * Convert Float32Array to Int16Array (LINEAR16 format for Google Speech API)
   */
  static convertFloat32ToInt16(buffer: Float32Array): Int16Array {
    const int16 = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16;
  }
}
