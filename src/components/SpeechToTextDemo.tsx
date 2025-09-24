import React, { useState, useEffect } from 'react';
import { speechToTextService, SpeechToTextState } from '../services/speech-to-text';

interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
}

export const SpeechToTextDemo: React.FC = () => {
  const [state, setState] = useState<SpeechToTextState>({
    isRecording: false,
    isTranscribing: false,
    currentTranscript: '',
    allTranscripts: [],
    lastTranscriptionTime: 0,
    error: null,
    isInitialized: false
  });

  const [desktopSources, setDesktopSources] = useState<DesktopSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [captureMode, setCaptureMode] = useState<'microphone' | 'window'>('microphone');
  const [showSourceSelector, setShowSourceSelector] = useState(false);

  useEffect(() => {
    // Initialize the service
    const initService = async () => {
      await speechToTextService.initialize();
    };

    initService();

    // Subscribe to state changes
    const unsubscribe = speechToTextService.subscribe((newState) => {
      setState(newState);
    });

    // Load desktop sources
    loadDesktopSources();

    return () => {
      unsubscribe();
      speechToTextService.cleanup();
    };
  }, []);

  const loadDesktopSources = async () => {
    try {
      if (window.ipcRenderer && 'getDesktopSources' in window.ipcRenderer) {
        const sources = await (window.ipcRenderer as any).getDesktopSources();
        setDesktopSources(sources);
      } else {
        console.log('Desktop capture not available in browser mode. Use Electron for full functionality.');
      }
    } catch (error) {
      console.error('Error loading desktop sources:', error);
    }
  };

  const handleStartStop = async () => {
    if (state.isRecording) {
      await speechToTextService.stopTranscription();
    } else {
      if (captureMode === 'window' && !selectedSource) {
        setShowSourceSelector(true);
        return;
      }

      // Configure the service based on selected mode
      speechToTextService['config'] = {
        ...speechToTextService['config'],
        captureMode: captureMode,
        windowId: captureMode === 'window' ? selectedSource : undefined
      };

      await speechToTextService.startTranscription();
    }
  };

  const handleSourceSelect = (sourceId: string) => {
    setSelectedSource(sourceId);
    setShowSourceSelector(false);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!state.isInitialized) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
          <span className="text-yellow-800">Initializing speech-to-text service...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">Speech-to-Text Demo</h2>

      {/* Error Display */}
      {state.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 text-red-500">⚠️</div>
            <span className="text-red-800">{state.error}</span>
          </div>
        </div>
      )}

      {/* Capture Mode Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Capture Mode:
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="microphone"
              checked={captureMode === 'microphone'}
              onChange={(e) => setCaptureMode(e.target.value as 'microphone')}
              className="mr-2"
            />
            Microphone
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="window"
              checked={captureMode === 'window'}
              onChange={(e) => setCaptureMode(e.target.value as 'window')}
              className="mr-2"
            />
            Window Audio
          </label>
        </div>
      </div>

      {/* Window Source Selection */}
      {captureMode === 'window' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Window:
          </label>
          <button
            onClick={() => setShowSourceSelector(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            {selectedSource ? 'Change Window' : 'Select Window'}
          </button>
          {selectedSource && (
            <div className="mt-2 text-sm text-gray-600">
              Selected: {desktopSources.find(s => s.id === selectedSource)?.name}
            </div>
          )}
        </div>
      )}

      {/* Source Selector Modal */}
      {showSourceSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Select Window</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {desktopSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceSelect(source.id)}
                  className="flex items-center space-x-3 p-2 text-left hover:bg-gray-100 rounded border w-full"
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
              className="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6">
        <button
          onClick={handleStartStop}
          disabled={state.isTranscribing}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            state.isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {state.isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        {state.isRecording && (
          <button
            onClick={() => speechToTextService.pauseTranscription()}
            className="ml-3 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
          >
            Pause
          </button>
        )}

        {!state.isRecording && state.currentTranscript && (
          <button
            onClick={() => speechToTextService.resumeTranscription()}
            className="ml-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            Resume
          </button>
        )}
      </div>

      {/* Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
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
              ? 'Recording...'
              : state.isTranscribing
              ? 'Transcribing...'
              : 'Stopped'}
          </span>
          <span className="text-sm text-gray-500">
            Last update: {state.lastTranscriptionTime ? formatTimestamp(state.lastTranscriptionTime) : 'Never'}
          </span>
        </div>
      </div>

      {/* Transcript Display */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Live Transcript:</h3>
        <div className="h-64 overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm leading-relaxed">
          {state.currentTranscript ? (
            <div className="whitespace-pre-wrap">{state.currentTranscript}</div>
          ) : (
            <div className="text-gray-500 italic">
              {state.isRecording
                ? `Listening for speech from ${captureMode}...`
                : 'Click "Start Recording" to begin transcription'}
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
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
  );
};

export default SpeechToTextDemo;
