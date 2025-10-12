import { io, Socket } from 'socket.io-client';
import type { TranscriptResult, TranslationResult } from '../types';

export type { TranscriptResult, TranslationResult };

export class TranscriptionSocketService {
  private socket: Socket | null = null;
  private onTranscriptCallback: ((result: TranscriptResult) => void) | null = null;
  private onTranslationCallback: ((result: TranslationResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  /**
   * Connect to the backend Socket.IO server
   */
  connect(serverUrl: string = 'http://localhost:3001'): void {
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to transcription server');
    });

    this.socket.on('transcript', (result: TranscriptResult) => {
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(result);
      }
    });

    this.socket.on('translation', (result: TranslationResult) => {
      if (this.onTranslationCallback) {
        this.onTranslationCallback(result);
      }
    });

    this.socket.on('transcription-error', (data: { error: string }) => {
      console.error('Transcription error:', data.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(data.error);
      }
    });

    this.socket.on('translation-error', (data: { error: string }) => {
      console.error('Translation error:', data.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(data.error);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from transcription server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback('Failed to connect to server');
      }
    });
  }

  /**
   * Set callback for transcript updates
   */
  onTranscript(callback: (result: TranscriptResult) => void): void {
    this.onTranscriptCallback = callback;
  }

  /**
   * Set callback for translation updates
   */
  onTranslation(callback: (result: TranslationResult) => void): void {
    this.onTranslationCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Set target language for translation
   */
  setTargetLanguage(languageCode: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }
    this.socket.emit('set-target-language', languageCode);
  }

  /**
   * Enable or disable translation
   */
  setTranslationEnabled(enabled: boolean): void {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }
    this.socket.emit('set-translation-enabled', enabled);
  }

  /**
   * Start transcription session
   */
  startTranscription(): void {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }
    this.socket.emit('start-transcription');
  }

  /**
   * Send audio data to server for transcription
   */
  sendAudioData(audioData: ArrayBuffer): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('audio-data', audioData);
  }

  /**
   * Stop transcription session
   */
  stopTranscription(): void {
    if (this.socket) {
      this.socket.emit('stop-transcription');
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.onTranscriptCallback = null;
    this.onTranslationCallback = null;
    this.onErrorCallback = null;
  }
}
