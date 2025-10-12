import speech from '@google-cloud/speech';
import { Duplex } from 'stream';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

// Load and parse credentials
const credentialsPath = path.join(__dirname, '..', 'google-credentials.json');
const credentialsJson = fs.readFileSync(credentialsPath, 'utf-8');
const credentials = JSON.parse(credentialsJson);

// Create JWT client using constructor (not fromJSON)
const jwtClient = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Pass the JWT client directly
const speechClient = new speech.SpeechClient({
  authClient: jwtClient,
  projectId: credentials.project_id
});

export interface TranscriptResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

export class SpeechToTextService {
  private recognizeStream: any = null;

  /**
   * Create a streaming recognition session
   * @param onTranscript - Callback for each transcript result
   * @param onError - Callback for errors
   */
  startStreaming(
    onTranscript: (result: TranscriptResult) => void,
    onError: (error: Error) => void
  ): Duplex {
    console.log('Starting Google Speech-to-Text streaming...');

    const request = {
      config: {
        encoding: 'LINEAR16' as const,
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        model: 'default',
        useEnhanced: true,
      },
      interimResults: true,
    };

    console.log('Speech-to-Text config:', request);

    this.recognizeStream = speechClient
      .streamingRecognize(request)
      .on('error', (err: Error) => {
        console.error('Speech recognition error:', err);
        onError(err);
      })
      .on('data', (data: any) => {
        console.log('Received data from Google Speech API:', data);
        if (data.results[0] && data.results[0].alternatives[0]) {
          const result: TranscriptResult = {
            transcript: data.results[0].alternatives[0].transcript,
            isFinal: data.results[0].isFinal,
            confidence: data.results[0].alternatives[0].confidence,
          };
          console.log('Transcript result:', result);
          onTranscript(result);
        }
      });

    console.log('Speech recognition stream created');
    return this.recognizeStream;
  }

  /**
   * Stop the current streaming session
   */
  stopStreaming(): void {
    if (this.recognizeStream) {
      this.recognizeStream.end();
      this.recognizeStream = null;
    }
  }
}
