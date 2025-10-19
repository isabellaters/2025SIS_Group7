import speech from '@google-cloud/speech';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';

// Load and parse credentials
const credentialsPath = path.join(__dirname, '..', 'google-credentials.json');
const credentialsJson = fs.readFileSync(credentialsPath, 'utf-8');
const credentials = JSON.parse(credentialsJson);

// Create JWT client
const jwtClient = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Create speech client
const speechClient = new speech.SpeechClient({
  authClient: jwtClient,
  projectId: credentials.project_id
});

export interface VideoTranscriptionResult {
  transcript: string;
  confidence?: number;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
}

export class VideoTranscriptionService {
  private static readonly TEMP_DIR = path.join(__dirname, '..', 'temp');
  private static readonly AUDIO_SAMPLE_RATE = 16000;

  /**
   * Extract audio from video file and convert to the format required by Google Speech-to-Text
   */
  private static async extractAudioFromVideo(videoPath: string): Promise<string> {
    const audioPath = path.join(this.TEMP_DIR, `audio_${Date.now()}.wav`);
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.TEMP_DIR)) {
      fs.mkdirSync(this.TEMP_DIR, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .audioChannels(1) // Mono
        .audioFrequency(this.AUDIO_SAMPLE_RATE) // 16kHz
        .audioCodec('pcm_s16le') // 16-bit PCM
        .format('wav')
        .on('end', () => {
          console.log('Audio extraction completed');
          resolve(audioPath);
        })
        .on('error', (err: any) => {
          console.error('Error extracting audio:', err);
          reject(err);
        })
        .save(audioPath);
    });
  }

  /**
   * Read audio file and convert to base64 for Google Speech-to-Text
   */
  private static async readAudioFile(audioPath: string): Promise<Buffer> {
    return fs.promises.readFile(audioPath);
  }

  /**
   * Transcribe audio using Google Speech-to-Text
   */
  private static async transcribeAudio(audioBuffer: Buffer): Promise<VideoTranscriptionResult> {
    const audioBytes = audioBuffer.toString('base64');

    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: 'LINEAR16' as const,
        sampleRateHertz: this.AUDIO_SAMPLE_RATE,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        model: 'default',
        useEnhanced: true,
      },
    };

    try {
      const [response] = await speechClient.recognize(request);
      
      if (!response.results || response.results.length === 0) {
        return {
          transcript: '',
          status: 'failed',
          error: 'No transcription results returned'
        };
      }

      // Combine all results into a single transcript
      const transcript = response.results
        .map(result => result.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();

      // Calculate average confidence
      const confidences = response.results
        .map(result => result.alternatives?.[0]?.confidence)
        .filter(conf => conf !== undefined) as number[];
      
      const avgConfidence = confidences.length > 0 
        ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
        : undefined;

      return {
        transcript,
        confidence: avgConfidence,
        status: 'completed'
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return {
        transcript: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clean up temporary files
   */
  private static async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.promises.unlink(filePath);
        console.log(`Cleaned up temp file: ${filePath}`);
      } catch (error) {
        console.error(`Error cleaning up file ${filePath}:`, error);
      }
    }
  }

  /**
   * Main method to transcribe a video file
   */
  public static async transcribeVideo(videoPath: string): Promise<VideoTranscriptionResult> {
    let audioPath: string | null = null;
    
    try {
      console.log(`Starting video transcription for: ${videoPath}`);
      
      // Extract audio from video
      audioPath = await this.extractAudioFromVideo(videoPath);
      console.log(`Audio extracted to: ${audioPath}`);
      
      // Read audio file
      const audioBuffer = await this.readAudioFile(audioPath);
      console.log(`Audio file size: ${audioBuffer.length} bytes`);
      
      // Transcribe audio
      const result = await this.transcribeAudio(audioBuffer);
      console.log(`Transcription completed. Status: ${result.status}`);
      
      return result;
    } catch (error) {
      console.error('Error in video transcription:', error);
      return {
        transcript: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Clean up temporary files
      const tempFiles = [audioPath].filter(Boolean) as string[];
      await this.cleanupTempFiles(tempFiles);
    }
  }

  /**
   * Check if FFmpeg is available
   */
  public static async checkFFmpegAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.error('FFmpeg not available:', err);
          resolve(false);
        } else {
          console.log('FFmpeg is available');
          resolve(true);
        }
      });
    });
  }
}
