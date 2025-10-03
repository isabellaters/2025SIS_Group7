# Desktop Audio Capture & Real-time Transcription

## Overview
This implementation provides cross-platform (Windows & macOS) desktop audio capture with real-time speech-to-text transcription using Google Cloud Speech-to-Text API.

## Current Status
⚠️ **In Development** - Audio capture pipeline is being tested and debugged.

### Working Features:
- ✅ Audio source enumeration (screens and windows)
- ✅ Socket.IO connection between frontend and backend
- ✅ Google Cloud Speech-to-Text API integration
- ✅ Visual audio level indicator
- ✅ Interim and final transcript display

### Under Development:
- 🔄 Desktop audio stream capture (testing with desktopCapturer)
- 🔄 Audio data flow from Electron to backend
- 🔄 Real-time transcription accuracy

## Architecture

### Components:

1. **Electron Main Process** (`electron/main/main.js`)
   - Handles desktop audio source enumeration via `desktopCapturer`
   - IPC handler: `get-audio-sources`
   - Note: Using `main.js` (not `index.ts`)

2. **Electron Preload** (`electron/preload/index.js`)
   - Exposes `electronAPI.getAudioSources()` to renderer
   - Uses `contextBridge` for security

3. **Audio Capture Service** (`src/services/audioCapture.ts`)
   - Captures desktop audio using `navigator.mediaDevices.getUserMedia()`
   - Uses Web Audio API's `ScriptProcessorNode` for audio processing
   - Converts Float32 to Int16 (LINEAR16 format)
   - Sample rate: 16kHz

4. **Transcription Socket Service** (`src/services/transcriptionSocket.ts`)
   - Socket.IO client for real-time communication
   - Events: `start-transcription`, `audio-data`, `transcript`, `stop-transcription`

5. **Backend Socket Server** (`backend/index.ts`)
   - Express + Socket.IO server on port 3001
   - Receives audio chunks and forwards to Google Speech-to-Text
   - Emits transcript results back to frontend

6. **Speech-to-Text Service** (`backend/services/speech-to-text.ts`)
   - Google Cloud Speech-to-Text streaming API
   - Uses JWT authentication with service account credentials
   - Config: LINEAR16, 16kHz, en-US, interim results enabled

7. **Frontend UI** (`src/App.tsx`)
   - Audio source dropdown selector
   - Audio level visualization (green bar)
   - Interim transcripts (shown in brackets)
   - Final transcripts (permanent)

## Setup

### 1. Google Cloud Configuration
1. Create a Google Cloud project
2. Enable the Speech-to-Text API
3. Create a service account with Speech-to-Text permissions
4. Download the JSON key file
5. Place it at: `backend/google-credentials.json`

### 2. Install Dependencies
```bash
# Root directory
npm install

# Backend directory
cd backend
npm install
```

### 3. Run the Application
```bash
# From root directory (runs backend + frontend + electron concurrently)
npm run dev
```

This starts:
- Backend server on `http://localhost:3001`
- Vite dev server on `http://localhost:5173`
- Electron app

## How It Works

1. **Audio Source Selection**
   - User selects a screen/window from the dropdown
   - Sources retrieved via Electron's `desktopCapturer.getSources()`

2. **Audio Capture**
   - `getUserMedia()` requests desktop audio stream
   - Requires both `audio` and `video` with `chromeMediaSource: 'desktop'`
   - Creates `MediaStream` with audio tracks

3. **Audio Processing**
   - `AudioContext` processes at 16kHz sample rate
   - `ScriptProcessorNode` processes 4096-sample chunks
   - Converts Float32Array to Int16Array (LINEAR16)

4. **Streaming to Backend**
   - Audio chunks sent via Socket.IO (`audio-data` event)
   - Chunk size: ~8KB (4096 samples × 2 bytes)
   - Frequency: ~256ms per chunk

5. **Speech Recognition**
   - Backend streams chunks to Google Speech-to-Text API
   - Interim results returned continuously
   - Final results marked with `isFinal: true`

6. **Display**
   - Interim transcripts shown in brackets: `[partial text...]`
   - Final transcripts appended to transcript list
   - Audio level visualized with green bar

## File Structure

```
2025SIS_Group7/
├── electron/
│   ├── main/
│   │   ├── main.js          ← Main process (ACTIVE)
│   │   └── index.ts         ← Not used
│   └── preload/
│       ├── index.js         ← Preload script (ACTIVE, dev mode)
│       ├── index.ts         ← TypeScript source
│       └── index.mjs        ← Built preload (production)
├── backend/
│   ├── index.ts             ← Express + Socket.IO server
│   ├── google-credentials.json  ← Google Cloud credentials
│   └── services/
│       ├── speech-to-text.ts    ← Google Speech API wrapper
│       ├── gemini.ts            ← Gemini AI service
│       └── lecture.ts           ← Lecture data service
├── src/
│   ├── App.tsx              ← Main UI component
│   └── services/
│       ├── audioCapture.ts       ← Desktop audio capture
│       └── transcriptionSocket.ts ← Socket.IO client
└── package.json
```

## Performance Notes

- **Sample Rate**: 16kHz (optimal for speech recognition)
- **Audio Format**: LINEAR16 (PCM signed 16-bit)
- **Chunk Size**: 4096 samples (~256ms at 16kHz, ~8KB)
- **Expected Latency**: 500ms-2s (capture + network + API processing)
- **Audio Level Update**: Real-time (every ~256ms)

## Cross-Platform Support

- ✅ **Windows**: Should work with system audio loopback
- ✅ **macOS**: Requires screen recording permissions
- ❌ **Linux**: Not tested (may require additional setup)

## Troubleshooting

### No audio sources available
**Error:** "Electron API not available"
- Ensure preload script is loading correctly
- Check browser console for "Preload script loaded - electronAPI available"
- Verify `electron/preload/index.js` exists

### Audio sources load but no audio captured
**Symptoms:** Green audio level bar doesn't move
- Check browser console for "Audio process #X" messages
- Verify audio tracks exist: check "Audio tracks: [...]" log
- On **macOS**: Grant screen recording permission to Electron
  - System Preferences → Security & Privacy → Screen Recording
- On **Windows**: May need to select "Screen" instead of "Window"

### Transcription not working
**Symptoms:** Audio captured but no transcripts appear
- **Backend console:** Check for "Received X audio chunks from client"
- **Backend console:** Check for "Received data from Google Speech API"
- Verify `backend/google-credentials.json` exists and is valid
- Check Google Cloud project has Speech-to-Text API enabled
- Verify service account has correct permissions

### Connection issues
**Error:** "Failed to connect to server"
- Ensure backend is running on port 3001
- Check CORS settings in `backend/index.ts`
- Verify Socket.IO connection in browser console

### Poor transcription quality
- Ensure the selected source is playing audio
- Use "Screen" capture instead of individual windows
- Check audio isn't too quiet (green bar should show movement)
- Verify internet connection is stable

## Debug Logging

Enable detailed logging in browser console:
1. Open DevTools (F12)
2. Look for:
   - "Loading audio sources..."
   - "Audio sources loaded: [...]"
   - "Starting audio capture for source: ..."
   - "Audio process #X, max amplitude: Y, hasAudio: true"
   - "Sent X audio chunks to backend"
   - "Received transcript: {...}"

Backend console logging:
- "Client connected: [socket-id]"
- "Starting transcription for client: [socket-id]"
- "Received X audio chunks from client"
- "Starting Google Speech-to-Text streaming..."
- "Received data from Google Speech API: {...}"

## Known Issues

1. **Audio not captured from some sources**
   - Some applications may block audio capture
   - Try selecting "Screen" instead of specific window

2. **High CPU usage**
   - `ScriptProcessorNode` is deprecated (will migrate to `AudioWorklet`)

3. **Silence not transcribed**
   - Normal behavior - Google API only returns results when speech detected

## Next Steps / TODO

- [ ] Migrate from `ScriptProcessorNode` to `AudioWorkletNode`
- [ ] Add support for multiple languages
- [ ] Implement translation feature
- [ ] Add transcript export functionality
- [ ] Improve error handling and user feedback
- [ ] Add audio source preview/testing
- [ ] Optimize chunk size for better latency vs. accuracy
