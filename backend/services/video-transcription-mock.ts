export interface VideoTranscriptionResult {
  transcript: string;
  confidence?: number;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
}

export class VideoTranscriptionService {
  /**
   * Mock video transcription for testing without FFmpeg
   */
  public static async transcribeVideo(videoPath: string): Promise<VideoTranscriptionResult> {
    console.log(`Mock video transcription for: ${videoPath}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Return a mock transcript
    return {
      transcript: "This is a mock transcription of the uploaded video. The actual video transcription would require FFmpeg to be installed on the system. This is a placeholder transcript that demonstrates the video upload and transcription workflow.",
      confidence: 0.95,
      status: 'completed'
    };
  }

  /**
   * Check if FFmpeg is available (always returns false for mock)
   */
  public static async checkFFmpegAvailability(): Promise<boolean> {
    return false;
  }
}
