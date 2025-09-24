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

export interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
}

export class WindowsAudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private audioChunks: Blob[] = [];
  private config: AudioCaptureConfig;
  private onDataCallback?: (audioData: AudioData) => void;

  constructor(config: Partial<AudioCaptureConfig> = {}) {
    this.config = {
      sampleRate: 16000,
      channels: 2,
      bufferSize: 4096,
      mimeType: 'audio/webm;codecs=opus',
      ...config
    };
  }

  /**
   * Get available audio sources (microphone and desktop audio)
   * @returns Promise<MediaDeviceInfo[]>
   */
  async getAudioSources(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Error getting audio sources:', error);
      throw error;
    }
  }

  /**
   * Get available desktop sources (windows and screens) for audio capture
   * @returns Promise<DesktopSource[]>
   */
  async getDesktopSources(): Promise<DesktopSource[]> {
    try {
      if (!window.electronAPI) {
        throw new Error('Not running in Electron environment');
      }
      
      const sources = await window.electronAPI.getDesktopSources();
      return sources;
    } catch (error) {
      console.error('Error getting desktop sources:', error);
      throw error;
    }
  }

  /**
   * Start capturing audio from a specific window/application
   * @param windowId - ID of the window to capture audio from
   * @param onDataCallback - Callback for audio data chunks
   * @returns Promise<boolean> - Success status
   */
  async startWindowAudioCapture(windowId: string, onDataCallback?: (audioData: AudioData) => void): Promise<boolean> {
    try {
      this.onDataCallback = onDataCallback;

      // Request desktop audio capture with specific window
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: windowId,
          }
        } as any
      });

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.config.mimeType
      });

      // Set up data handler
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          
          const audioData: AudioData = {
            data: event.data,
            mimeType: this.config.mimeType,
            timestamp: Date.now(),
            duration: event.data.size / (this.config.sampleRate * this.config.channels * 2)
          };
          
          if (this.onDataCallback) {
            this.onDataCallback(audioData);
          }
        }
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      
      console.log(`Started capturing audio from window: ${windowId}`);
      return true;
    } catch (error) {
      console.error('Error starting window audio capture:', error);
      return false;
    }
  }

      /**
       * Start capturing audio from a desktop source (window or screen)
       * @param sourceId - ID of the desktop source to capture audio from
       * @param onDataCallback - Callback for audio data chunks
       * @returns Promise<boolean> - Success status
       */
      async startDesktopAudioCapture(sourceId: string, onDataCallback?: (audioData: AudioData) => void): Promise<boolean> {
        try {
          this.onDataCallback = onDataCallback;

          console.log('Requesting desktop audio capture for source:', sourceId);

          // Use a more compatible approach for desktop capture
          const constraints: MediaStreamConstraints = {
            audio: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                chromeMediaSourceConstraints: {
                  audio: true
                }
              }
            } as any
          };

          // Add fallback for different browsers
          if (navigator.mediaDevices.getDisplayMedia) {
            try {
              // Try getDisplayMedia first (more modern approach)
              this.stream = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: false
              });
              console.log('Desktop audio stream obtained via getDisplayMedia');
            } catch (displayError) {
              console.log('getDisplayMedia failed, trying getUserMedia:', displayError);
              this.stream = await navigator.mediaDevices.getUserMedia(constraints);
              console.log('Desktop audio stream obtained via getUserMedia');
            }
          } else {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Desktop audio stream obtained via getUserMedia');
          }

          // Create media recorder with error handling
          try {
            this.mediaRecorder = new MediaRecorder(this.stream, {
              mimeType: this.config.mimeType
            });
          } catch (recorderError) {
            console.log('Primary mimeType failed, trying fallback:', recorderError);
            // Try fallback mimeType
            this.mediaRecorder = new MediaRecorder(this.stream, {
              mimeType: 'audio/webm'
            });
          }

          // Set up data handler
          this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              this.audioChunks.push(event.data);
              
              const audioData: AudioData = {
                data: event.data,
                mimeType: this.mediaRecorder?.mimeType || this.config.mimeType,
                timestamp: Date.now(),
                duration: event.data.size / (this.config.sampleRate * this.config.channels * 2)
              };
              
              if (this.onDataCallback) {
                this.onDataCallback(audioData);
              }
            }
          };

          // Set up error handler
          this.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
            this.isRecording = false;
          };

          // Set up stop handler
          this.mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped');
            this.isRecording = false;
          };

          // Start recording with error handling
          try {
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            console.log(`Started capturing audio from desktop source: ${sourceId}`);
            return true;
          } catch (startError) {
            console.error('Error starting MediaRecorder:', startError);
            return false;
          }
        } catch (error) {
          console.error('Error starting desktop audio capture:', error);
          return false;
        }
      }

  /**
   * Start capturing microphone audio
   * @param onDataCallback - Callback for audio data chunks
   * @returns Promise<boolean> - Success status
   */
  async startMicrophoneCapture(onDataCallback?: (audioData: AudioData) => void): Promise<boolean> {
    try {
      this.onDataCallback = onDataCallback;

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.config.mimeType
      });

      // Set up data handler
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          
          const audioData: AudioData = {
            data: event.data,
            mimeType: this.config.mimeType,
            timestamp: Date.now(),
            duration: event.data.size / (this.config.sampleRate * this.config.channels * 2)
          };
          
          if (this.onDataCallback) {
            this.onDataCallback(audioData);
          }
        }
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      
      console.log('Started capturing microphone audio');
      return true;
    } catch (error) {
      console.error('Error starting microphone capture:', error);
      return false;
    }
  }

  /**
   * Stop audio capture
   * @returns Promise<Blob | null> - Final audio blob or null if failed
   */
  async stopCapture(): Promise<Blob | null> {
    if (!this.mediaRecorder || !this.isRecording) {
      return null;
    }

    try {
      return new Promise((resolve) => {
        this.mediaRecorder!.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: this.config.mimeType });
          this.isRecording = false;
          console.log('Stopped audio capture');
          resolve(audioBlob);
        };
        
        this.mediaRecorder!.stop();
      });
    } catch (error) {
      console.error('Error stopping audio capture:', error);
      return null;
    }
  }

  /**
   * Pause audio capture
   */
  pauseCapture(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
      console.log('Paused audio capture');
    }
  }

  /**
   * Resume audio capture
   */
  resumeCapture(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.resume();
      console.log('Resumed audio capture');
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
    
    this.isRecording = false;
    this.audioChunks = [];
    this.onDataCallback = undefined;
    console.log('Cleaned up audio capture resources');
  }
}

// Export singleton instance
export const windowsAudioCaptureService = new WindowsAudioCaptureService();
