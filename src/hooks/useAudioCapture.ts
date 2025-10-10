import { useState, useEffect } from 'react';
import { AudioCaptureService } from '../services/audioCapture';
import { TranscriptionSocketService } from '../services/transcriptionSocket';
import type { AudioSource, TranscriptResult, TranslationResult } from '../types';

/**
 * useAudioCapture - Custom hook for managing desktop audio capture and transcription
 *
 * Handles:
 * - Loading available audio sources
 * - Establishing Socket.IO connection
 * - Starting/stopping audio capture
 * - Processing transcription results (interim and final)
 * - Audio level monitoring
 */
export function useAudioCapture() {
  // Capture state
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Transcription results
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  // Translation results
  const [translationLines, setTranslationLines] = useState<string[]>([]);
  const [interimTranslation, setInterimTranslation] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('es'); // Default to Spanish
  const [translationEnabled, setTranslationEnabled] = useState<boolean>(false); // Off by default

  // Services (created once)
  const [audioService] = useState(() => new AudioCaptureService());
  const [socketService] = useState(() => new TranscriptionSocketService());

  // Start audio capture and transcription
  const startCapture = async () => {
    try {
      // Get first available audio source
      const sources = await audioService.getAudioSources();
      if (sources.length === 0) {
        console.error('No audio sources available');
        return;
      }
      const selectedSource = sources[0].id;

      console.log('Starting audio capture for source:', selectedSource);
      setIsCapturing(true);
      socketService.startTranscription();

      let chunkCount = 0;
      await audioService.startCapture(selectedSource, (audioData: Float32Array) => {
        // Calculate audio level for visualization
        const maxAmplitude = Math.max(...Array.from(audioData).map(Math.abs));
        setAudioLevel(maxAmplitude);

        // Convert and send to backend
        const int16Data = AudioCaptureService.convertFloat32ToInt16(audioData);
        socketService.sendAudioData(int16Data.buffer as ArrayBuffer);

        chunkCount++;
        if (chunkCount % 50 === 0) {
          console.log(`Sent ${chunkCount} audio chunks to backend`);
        }
      });
      console.log('Audio capture started successfully');
    } catch (error) {
      console.error('Failed to start capture:', error);
      setIsCapturing(false);
    }
  };

  // Stop audio capture and transcription (but keep transcripts)
  const stopCapture = () => {
    console.log('Stopping audio capture');
    audioService.stopCapture();
    socketService.stopTranscription();
    setIsCapturing(false);
    setAudioLevel(0);
    // Note: We DON'T clear transcriptLines or translationLines here
    // so they persist until the user leaves the page
  };

  // Initialize on mount
  useEffect(() => {
    // Connect to transcription socket
    console.log('Connecting to transcription socket...');
    socketService.connect();

    // Handle transcription results
    socketService.onTranscript((result: TranscriptResult) => {
      console.log('Received transcript:', result);
      if (result.isFinal) {
        // Final transcript - add to permanent list only if not empty/whitespace
        const trimmedTranscript = result.transcript.trim();
        if (trimmedTranscript) {
          setTranscriptLines((prev) => [...prev, result.transcript]);
        }
        setInterimTranscript(''); // Clear interim
      } else {
        // Interim transcript - temporary display
        setInterimTranscript(result.transcript);
      }
    });

    // Handle translation results
    socketService.onTranslation((result: TranslationResult) => {
      console.log('Received translation:', result);
      if (result.isFinal) {
        // Final translation - add to permanent list only if not empty/whitespace
        const trimmedTranslation = result.translated.trim();
        if (trimmedTranslation) {
          setTranslationLines((prev) => [...prev, result.translated]);
        }
        setInterimTranslation(''); // Clear interim
      } else {
        // Interim translation - temporary display
        setInterimTranslation(result.translated);
      }
    });

    // Handle errors
    socketService.onError((error: string) => {
      console.error('Transcription/Translation error:', error);
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
      audioService.stopCapture();
    };
  }, []);

  // Function to change target language
  const changeTargetLanguage = (languageCode: string) => {
    setTargetLanguage(languageCode);
    socketService.setTargetLanguage(languageCode);
  };

  // Function to toggle translation
  const toggleTranslation = () => {
    const newState = !translationEnabled;
    setTranslationEnabled(newState);
    socketService.setTranslationEnabled(newState);
  };

  return {
    // Capture state
    isCapturing,
    audioLevel,

    // Transcription data
    transcriptLines,
    interimTranscript,

    // Translation data
    translationLines,
    interimTranslation,
    targetLanguage,
    translationEnabled,
    changeTargetLanguage,
    toggleTranslation,

    // Socket service (for direct access if needed)
    socketService,

    // Control functions
    startCapture,
    stopCapture,
  };
}
