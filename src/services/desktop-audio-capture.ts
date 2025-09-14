export interface DesktopAudioConfig {
  sampleRate: number;
  channels: number;
  bufferSize: number;
  mimeType: string;
  includeSystemAudio: boolean;
  includeMicrophone: boolean;
}

export interface DesktopAudioData {
  data: Blob;
  mimeType: string;
  timestamp: number;
  duration: number;
  source: 'desktop' | 'microphone' | 'mixed';
}

export class DesktopAudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private desktopStream: MediaStream | null = null;
  private microphoneStream: MediaStream | null = null;
  private mixedStream: MediaStream | null = null;
  private isRecording: boolean = false;
  private audioChunks: Blob[] = [];
  private config: DesktopAudioConfig;

  constructor(config: Partial<DesktopAudioConfig> = {}) {
    this.config = {
      sampleRate: 16000,
      channels: 2, // Stereo for desktop audio
      bufferSize: 4096,
      mimeType: 'audio/webm;codecs=opus',
      includeSystemAudio: true,
      includeMicrophone: false,
      ...config
    };
  }

  /**
   * Initialize desktop audio capture with user permissions
   * @returns Promise<boolean> - Success status
   */
  async initialize(): Promise<boolean> {
    try {
      // Request desktop audio capture
      if (this.config.includeSystemAudio) {
        this.desktopStream = await navigator.mediaDevices.getDisplayMedia({
          video: false,
          audio: {
            sampleRate: this.config.sampleRate,
            channelCount: this.config.channels,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
      }

      // Request microphone access if needed
      if (this.config.includeMicrophone) {
        this.microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: this.config.sampleRate,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }

      // Create mixed stream if both sources are available
      if (this.desktopStream && this.microphoneStream) {
        this.mixedStream = await this.createMixedStream();
      } else if (this.desktopStream) {
        this.mixedStream = this.desktopStream;
      } else if (this.microphoneStream) {
        this.mixedStream = this.microphoneStream;
      } else {
        throw new Error('No audio sources available');
      }

      // Create audio context for processing
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate
      });

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.mixedStream, {
        mimeType: this.config.mimeType
      });

      return true;
    } catch (error) {
      console.error('Error initializing desktop audio capture:', error);
      return false;
    }
  }

  /**
   * Create a mixed audio stream from desktop and microphone
   * @returns Promise<MediaStream>
   */
  private async createMixedStream(): Promise<MediaStream> {
    if (!this.desktopStream || !this.microphoneStream) {
      throw new Error('Both desktop and microphone streams are required for mixing');
    }

    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    // Create audio sources
    const desktopSource = audioContext.createMediaStreamSource(this.desktopStream);
    const microphoneSource = audioContext.createMediaStreamSource(this.microphoneStream);

    // Create gain nodes for volume control
    const desktopGain = audioContext.createGain();
    const microphoneGain = audioContext.createGain();

    // Set volume levels (adjust as needed)
    desktopGain.gain.value = 0.8; // Desktop audio volume
    microphoneGain.gain.value = 0.6; // Microphone volume

    // Connect sources through gain nodes to destination
    desktopSource.connect(desktopGain).connect(destination);
    microphoneSource.connect(microphoneGain).connect(destination);

    return destination.stream;
  }

  /**
   * Start recording desktop audio
   * @param onDataCallback - Callback for audio data chunks
   * @returns Promise<boolean> - Success status
   */
  async startRecording(onDataCallback?: (audioData: DesktopAudioData) => void): Promise<boolean> {
    if (!this.mediaRecorder || this.isRecording) {
      return false;
    }

    try {
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          
          // Determine audio source
          let source: 'desktop' | 'microphone' | 'mixed' = 'mixed';
          if (this.desktopStream && this.microphoneStream) {
            source = 'mixed';
          } else if (this.desktopStream) {
            source = 'desktop';
          } else if (this.microphoneStream) {
            source = 'microphone';
          }

          const audioData: DesktopAudioData = {
            data: event.data,
            mimeType: this.config.mimeType,
            timestamp: Date.now(),
            duration: event.data.size / (this.config.sampleRate * this.config.channels * 2),
            source
          };
          
          if (onDataCallback) {
            onDataCallback(audioData);
          }
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      return true;
    } catch (error) {
      console.error('Error starting desktop audio recording:', error);
      return false;
    }
  }

  /**
   * Stop recording desktop audio
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
      console.error('Error stopping desktop audio recording:', error);
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
   * Get available audio sources
   * @returns Promise<{desktop: boolean, microphone: boolean}>
   */
  async getAvailableSources(): Promise<{desktop: boolean, microphone: boolean}> {
    try {
      // Check if getDisplayMedia is supported
      const desktopSupported = 'getDisplayMedia' in navigator.mediaDevices;
      
      // Check microphone availability
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphoneAvailable = devices.some(device => device.kind === 'audioinput');

      return {
        desktop: desktopSupported,
        microphone: microphoneAvailable
      };
    } catch (error) {
      console.error('Error checking available sources:', error);
      return { desktop: false, microphone: false };
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
   * Update configuration
   * @param newConfig - Partial configuration updates
   */
  updateConfig(newConfig: Partial<DesktopAudioConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   * @returns DesktopAudioConfig
   */
  getConfig(): DesktopAudioConfig {
    return { ...this.config };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    
    if (this.desktopStream) {
      this.desktopStream.getTracks().forEach(track => track.stop());
      this.desktopStream = null;
    }
    
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    
    if (this.mixedStream) {
      this.mixedStream.getTracks().forEach(track => track.stop());
      this.mixedStream = null;
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
export const desktopAudioCaptureService = new DesktopAudioCaptureService();
