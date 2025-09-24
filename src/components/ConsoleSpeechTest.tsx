// Simple console-focused speech-to-text test component
import React, { useState, useEffect } from 'react';
import { consoleSpeechToTextService } from '../services/console-speech-to-text';

export const ConsoleSpeechTest: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize the service
    console.log('🚀 Initializing Console Speech Test...');
    setIsInitialized(true);
    
    return () => {
      consoleSpeechToTextService.cleanup();
    };
  }, []);

  const handleStartStop = async () => {
    if (isRecording) {
      await consoleSpeechToTextService.stopTranscription();
      setIsRecording(false);
      console.log('⏹️  Recording stopped by user');
    } else {
      const success = await consoleSpeechToTextService.startMicrophoneTranscription();
      if (success) {
        setIsRecording(true);
        console.log('🎙️  Recording started by user');
      } else {
        console.error('❌ Failed to start recording');
      }
    }
  };

  if (!isInitialized) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
          <span className="text-yellow-800">Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Console Speech-to-Text Test</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          This test uses Google Cloud Speech-to-Text. Open Developer Tools (F12) to see transcription results.
        </p>
        <p className="text-xs text-gray-500">
          • Click "Start Recording" to begin microphone capture<br/>
          • Speak into your microphone<br/>
          • Check the console for transcribed text output<br/>
          • Click "Stop Recording" when done<br/>
          • <strong>Note:</strong> Requires Google Cloud authentication setup
        </p>
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          <strong>Setup Required:</strong> See GOOGLE_CLOUD_SETUP.md for authentication instructions
        </div>
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <strong>Current Status:</strong> Using mock transcription (Google Cloud credentials not found)
        </div>
        <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          <strong>Note:</strong> The app automatically falls back to mock service when Google Cloud authentication is not available
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={handleStartStop}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isRecording ? '⏹️ Stop Recording' : '🎙️ Start Recording'}
        </button>

        <div className="text-sm text-gray-600">
          Status: {isRecording ? (
            <span className="text-green-600 font-medium">🔴 Recording</span>
          ) : (
            <span className="text-gray-500">⏸️ Stopped</span>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Console Output:</h4>
        <div className="text-xs text-gray-600 font-mono">
          <div>🎤 Console Speech-to-Text Service initialized</div>
          <div>🚀 Initializing Console Speech Test...</div>
          {isRecording ? (
            <div className="text-green-600">🎙️ Recording started by user</div>
          ) : (
            <div className="text-gray-500">⏸️ Ready to start recording</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsoleSpeechTest;
