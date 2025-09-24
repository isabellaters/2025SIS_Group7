import React, { useState, useEffect, useRef } from 'react';
import { speechToTextService, SpeechToTextState, DesktopSource } from '../services/speech-to-text-service';

interface SpeechToTextInterfaceProps {
  className?: string;
}

export const SpeechToTextInterface: React.FC<SpeechToTextInterfaceProps> = ({
  className = ''
}) => {
  const [state, setState] = useState<SpeechToTextState>({
    isRecording: false,
    isTranscribing: false,
    currentTranscript: '',
    allTranscripts: [],
    lastTranscriptionTime: 0,
    error: null,
    availableSources: [],
    selectedSource: null,
    isInitialized: false,
    audioSourceType: null
  });

  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initService = async () => {
      try {
        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 10000)
        );
        
        await Promise.race([
          speechToTextService.initialize(),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('Failed to initialize speech service:', error);
        // Force the component to show even if initialization fails
        setState(prev => ({ ...prev, isInitialized: true, error: error.message }));
      }
    };

    initService();

    const unsubscribe = speechToTextService.subscribe((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
      speechToTextService.cleanup();
    };
  }, []);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [state.currentTranscript]);

      const handleStartStop = async () => {
        if (state.isRecording) {
          await speechToTextService.stopTranscription();
        } else {
          if (!state.audioSourceType) {
            // Default to microphone if none selected
            await speechToTextService.selectSource('microphone', 'microphone');
          }

          if (state.audioSourceType === 'desktop' && !state.selectedSource) {
            setShowSourceSelector(true);
            return;
          }
          
          // Add a small delay to prevent rapid clicking issues
          setTimeout(async () => {
            await speechToTextService.startTranscription();
          }, 100);
        }
      };

  const handlePauseResume = () => {
    if (state.isRecording) {
      speechToTextService.pauseTranscription();
    } else {
      speechToTextService.resumeTranscription();
    }
  };

  const handleSourceSelect = async (source: DesktopSource) => {
    const success = await speechToTextService.selectSource(source.id, 'desktop');
    if (success) {
      setShowSourceSelector(false);
    }
  };

  const handleAudioSourceTypeChange = async (type: 'microphone' | 'desktop') => {
    if (type === 'microphone') {
      await speechToTextService.selectSource('microphone', 'microphone');
    } else {
      // For desktop, we'll wait for explicit selection
      speechToTextService.selectSource('', 'desktop'); // Clear previous selection
      setShowSourceSelector(true);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!state.isInitialized) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
          <span className="text-yellow-800">Initializing speech-to-text service...</span>
        </div>
      </div>
    );
  }

  if (state.error && state.error.includes('Not running in Electron')) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 text-red-500">⚠️</div>
          <div>
            <p className="text-red-800 font-medium">Electron Required</p>
            <p className="text-red-700 text-sm">This feature requires the Electron app. Please run the app using Electron instead of the browser.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Speech-to-Text Demo</h3>

        {/* Audio Source Type Selection */}
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-700 mr-3">Audio Source:</span>
          <label className="inline-flex items-center mr-4">
            <input
              type="radio"
              className="form-radio"
              name="audioSource"
              value="microphone"
              checked={state.audioSourceType === 'microphone'}
              onChange={() => handleAudioSourceTypeChange('microphone')}
            />
            <span className="ml-2 text-gray-700">🎤 Microphone</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="audioSource"
              value="desktop"
              checked={state.audioSourceType === 'desktop'}
              onChange={() => handleAudioSourceTypeChange('desktop')}
            />
            <span className="ml-2 text-gray-700">🖥️ Window Audio</span>
          </label>
        </div>

        {/* Selected Source Info */}
        <div className="mt-4">
          {state.selectedSource ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Selected Source:</span>
              <span className="text-sm text-blue-600 font-medium">{state.selectedSource.name}</span>
              {state.audioSourceType === 'desktop' && (
                <button
                  onClick={() => setShowSourceSelector(true)}
                  className="text-xs text-blue-500 hover:text-blue-700 underline"
                >
                  Change
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">No source selected</span>
              {state.audioSourceType === 'desktop' && (
                <button
                  onClick={() => setShowSourceSelector(true)}
                  className="text-sm text-blue-500 hover:text-blue-700 font-medium"
                >
                  Select Source
                </button>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center space-x-3">
          <button
            onClick={handleStartStop}
            disabled={state.isTranscribing || (!state.selectedSource && state.audioSourceType !== 'microphone')}
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

      {/* Source Selector Modal */}
      {showSourceSelector && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Select Desktop Source:</h4>
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
            {state.availableSources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleSourceSelect(source)}
                className="flex items-center space-x-3 p-2 text-left hover:bg-gray-100 rounded border"
              >
                {source.thumbnail && (
                  <img
                    src={source.thumbnail}
                    alt={source.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                )}
                <span className="text-sm text-gray-700">{source.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSourceSelector(false)}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

          {/* Status Display */}
          {state.error && state.error.includes('credentials not found') && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 text-yellow-500">🎭</div>
                <span className="text-yellow-800 text-sm">Using mock transcription (Google Cloud credentials not found)</span>
              </div>
            </div>
          )}
          
          {/* Error Display */}
          {state.error && !state.error.includes('Not running in Electron') && !state.error.includes('credentials not found') && (
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
                ? `Listening for speech from ${state.selectedSource?.name || 'selected source'}...`
                : state.selectedSource
                ? 'Click "Start Recording" to begin transcription'
                : 'Select an audio source to begin'}
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

export default SpeechToTextInterface;
