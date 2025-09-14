export interface AudioCaptureConfig {
  sampleRate: number;
  channels: number;
  bufferSize: number;
  mimeType: string;
}

export interface AudioData {
  data: Blob;
  mimeType: string;
  timestamp: number;
  duration: number;
}

export class AudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private audioChunks: Blob[] = [];
  private config: AudioCaptureConfig;

  constructor(config: Partial<AudioCaptureConfig> = {}) {
    this.config = {
      sampleRate: 16000,
      channels: 1,
      bufferSize: 4096,
      mimeType: 'audio/webm;codecs=opus',
      ...config
    };
  }

  /**
   * Initialize audio capture with user permissions
   * @returns Promise<boolean> - Success status
   */
  async initialize(): Promise<boolean> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create audio context for processing
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate
      });

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.config.mimeType
      });

      return true;
    } catch (error) {
      console.error('Error initializing audio capture:', error);
      return false;
    }
  }

  /**
   * Start recording audio
   * @param onDataCallback - Callback for audio data chunks
   * @returns Promise<boolean> - Success status
   */
  async startRecording(onDataCallback?: (audioData: AudioData) => void): Promise<boolean> {
    if (!this.mediaRecorder || this.isRecording) {
      return false;
    }

    try {
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          
          // Convert to base64 for Google AI
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            const audioData: AudioData = {
              data: event.data,
              mimeType: this.config.mimeType,
              timestamp: Date.now(),
              duration: event.data.size / (this.config.sampleRate * this.config.channels * 2) // Rough duration calculation
            };
            
            if (onDataCallback) {
              onDataCallback(audioData);
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  /**
   * Stop recording audio
   * @returns Promise<Blob | null> - Final audio blob or null if failed
   */
  async stopRecording(): Promise<Blob | null> {
    if (!this.mediaRecorder || !this.isRecording) {
      return null;
    }

    try {
      return new Promise((resolve) => {
        this.mediaRecorder!.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: this.config.mimeType });
          this.isRecording = false;
          resolve(audioBlob);
        };
        
        this.mediaRecorder!.stop();
      });
    } catch (error) {
      console.error('Error stopping recording:', error);
      return null;
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Get current recording status
   * @returns boolean
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get available audio input devices
   * @returns Promise<MediaDeviceInfo[]>
   */
  async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }

  /**
   * Convert audio blob to base64 string
   * @param audioBlob - Audio blob to convert
   * @returns Promise<string> - Base64 encoded audio data
   */
  async audioBlobToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isRecording = false;
    this.audioChunks = [];
  }
}

// Export singleton instance
export const audioCaptureService = new AudioCaptureService();
