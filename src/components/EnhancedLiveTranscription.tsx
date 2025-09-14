import React, { useState, useEffect, useRef } from 'react';
import { enhancedLiveTranscriptionService, EnhancedTranscriptionState } from '../services/enhanced-live-transcription';

interface EnhancedLiveTranscriptionProps {
  onTranscriptUpdate?: (transcript: string) => void;
  className?: string;
}

export const EnhancedLiveTranscription: React.FC<EnhancedLiveTranscriptionProps> = ({
  onTranscriptUpdate,
  className = ''
}) => {
  const [state, setState] = useState<EnhancedTranscriptionState>({
    isRecording: false,
    isTranscribing: false,
    currentTranscript: '',
    allTranscripts: [],
    lastTranscriptionTime: 0,
    error: null,
    availableSources: {desktop: false}
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize the service
    const initService = async () => {
      const success = await enhancedLiveTranscriptionService.initialize();
      setIsInitialized(success);
    };

    initService();

    // Subscribe to state changes
    const unsubscribe = enhancedLiveTranscriptionService.subscribe((newState) => {
      setState(newState);
      if (onTranscriptUpdate) {
        onTranscriptUpdate(newState.currentTranscript);
      }
    });

    // Auto-scroll to bottom of transcript
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }

    return () => {
      unsubscribe();
      enhancedLiveTranscriptionService.cleanup();
    };
  }, [onTranscriptUpdate]);

  const handleStartStop = async () => {
    if (state.isRecording) {
      await enhancedLiveTranscriptionService.stopTranscription();
    } else {
      await enhancedLiveTranscriptionService.startTranscription();
    }
  };

  const handlePauseResume = () => {
    if (state.isRecording) {
      enhancedLiveTranscriptionService.pauseTranscription();
    } else {
      enhancedLiveTranscriptionService.resumeTranscription();
    }
  };


  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getSourceLabel = () => {
    return '🖥️ Desktop Audio';
  };

  if (!isInitialized) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
          <span className="text-yellow-800">Initializing audio capture...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Desktop Audio Transcription
          </h3>
          <div className="flex items-center space-x-2">
            {/* Status indicator */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  state.isRecording
                    ? 'bg-green-500 animate-pulse'
                    : state.isTranscribing
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-sm text-gray-600">
                {state.isRecording
                  ? 'Recording'
                  : state.isTranscribing
                  ? 'Transcribing...'
                  : 'Stopped'}
              </span>
            </div>
          </div>
        </div>

        {/* Audio Source Info */}
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Audio Source:</span>
            <span className="text-sm text-blue-600 font-medium">{getSourceLabel()}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Captures audio from any Windows application
          </p>
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center space-x-3">
          <button
            onClick={handleStartStop}
            disabled={state.isTranscribing}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              state.isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {state.isRecording ? 'Stop' : 'Start'} Recording
          </button>

          {state.isRecording && (
            <button
              onClick={handlePauseResume}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              {state.isRecording ? 'Pause' : 'Resume'}
            </button>
          )}

          <div className="text-sm text-gray-500">
            Last update: {state.lastTranscriptionTime ? formatTimestamp(state.lastTranscriptionTime) : 'Never'}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 text-red-500">⚠️</div>
            <span className="text-red-800 text-sm">{state.error}</span>
          </div>
        </div>
      )}

      {/* Transcript Display */}
      <div className="p-4">
        <div className="mb-2">
          <label className="text-sm font-medium text-gray-700">Live Transcript:</label>
        </div>
        <div
          ref={transcriptRef}
          className="h-64 overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm leading-relaxed"
        >
          {state.currentTranscript ? (
            <div className="whitespace-pre-wrap">{state.currentTranscript}</div>
          ) : (
            <div className="text-gray-500 italic">
            {state.isRecording
              ? `Listening for speech from ${getSourceLabel()}...`
              : 'Click "Start Recording" to begin desktop audio transcription'}
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Segments:</span>
            <span className="ml-2 text-gray-600">{state.allTranscripts.length}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Characters:</span>
            <span className="ml-2 text-gray-600">{state.currentTranscript.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLiveTranscription;
