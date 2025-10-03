# Frontend Architecture - Audio Transcription

## Overview
The frontend is built with **React + TypeScript** and uses a component-based architecture for the audio capture and transcription features. All audio-related functionality has been extracted into reusable components and a custom React hook.

## File Structure

```
src/
├── App.tsx                           # Main app with routing & pages
├── components/                       # Reusable UI components
│   ├── AudioSourceSelector.tsx      # Dropdown for selecting audio source
│   ├── AudioLevelIndicator.tsx      # Visual audio level meter
│   ├── TranscriptDisplay.tsx        # Display transcripts (final + interim)
│   └── TransportControls.tsx        # Play/pause/stop/seek controls
├── hooks/                            # Custom React hooks
│   └── useAudioCapture.ts           # Audio capture & transcription logic
└── services/                         # Core services (not React-specific)
    ├── audioCapture.ts              # Desktop audio capture via Electron
    └── transcriptionSocket.ts       # Socket.IO client for backend comms
```

## Component Architecture

### 1. **`useAudioCapture` Hook** (`src/hooks/useAudioCapture.ts`)

**Purpose:** Centralized state management for audio capture and transcription.

**Responsibilities:**
- Load available audio sources from Electron
- Establish Socket.IO connection to backend
- Start/stop audio capture
- Process incoming transcription results
- Manage audio level for visualization

**State Managed:**
```typescript
{
  audioSources: AudioSource[],      // Available screens/windows
  selectedSource: string,            // Currently selected source ID
  isCapturing: boolean,              // Is audio being captured
  audioLevel: number,                // Current audio amplitude (0-1)
  transcriptLines: string[],         // Final transcripts
  interimTranscript: string,         // Temporary/interim transcript
}
```

**Functions Exposed:**
```typescript
{
  startCapture: () => Promise<void>,  // Start audio capture
  stopCapture: () => void,            // Stop audio capture
  setSelectedSource: (id: string) => void,
}
```

**How It Works:**
1. **On mount:** Loads audio sources and connects to Socket.IO server
2. **When capture starts:**
   - Calls `AudioCaptureService.startCapture()` with selected source
   - Receives raw audio chunks (Float32Array)
   - Converts to Int16 (LINEAR16 format)
   - Sends to backend via Socket.IO
3. **When transcripts arrive:**
   - Interim results: Update `interimTranscript` (temporary)
   - Final results: Append to `transcriptLines` array (permanent)
4. **On unmount:** Disconnects and cleans up

---

### 2. **`AudioSourceSelector`** (`src/components/AudioSourceSelector.tsx`)

**Purpose:** Dropdown to select desktop audio source (screen or window).

**Props:**
```typescript
{
  sources: AudioSource[],            // List of available sources
  selectedSource: string,            // Currently selected source ID
  isCapturing: boolean,              // Disable when capturing
  onSourceChange: (id: string) => void,
}
```

**UI:**
- Dropdown (`<select>`) with all available screens and windows
- Disabled during capture (can't change while recording)
- Shows "Select audio source..." when none selected

---

### 3. **`AudioLevelIndicator`** (`src/components/AudioLevelIndicator.tsx`)

**Purpose:** Visual feedback showing audio capture status and volume.

**Props:**
```typescript
{
  audioLevel: number,   // 0.0 to 1.0 (audio amplitude)
  isCapturing: boolean, // Show/hide indicator
}
```

**UI:**
- Red dot "● Recording" when capturing
- Green horizontal bar showing audio level
- Updates in real-time (~256ms intervals)
- Hidden when not capturing

---

### 4. **`TranscriptDisplay`** (`src/components/TranscriptDisplay.tsx`)

**Purpose:** Display transcription results (both final and interim).

**Props:**
```typescript
{
  transcriptLines: string[],   // Final transcripts
  interimTranscript: string,   // Temporary interim transcript
  cursor: number,              // How many lines to show (for seek)
  isDocked: boolean,           // Window size (docked vs full)
}
```

**Display Logic:**
```
Final transcripts (permanent)
[Interim transcript in brackets]  ← Changes as speech is recognized
```

**UI:**
- Scrollable text area
- Final transcripts shown as plain text
- Interim transcripts shown in `[brackets]` to indicate temporary status
- Auto-scrolls to bottom when new transcripts arrive
- Shows "Waiting for audio..." when empty

---

### 5. **`TransportControls`** (`src/components/TransportControls.tsx`)

**Purpose:** Playback-style controls for audio capture and transcript navigation.

**Props:**
```typescript
{
  isPlaying: boolean,
  onPlay: () => void,
  onPause: () => void,
  onStop: () => void,
  onSeek: (delta: number) => void,  // Navigate through transcript lines
}
```

**Buttons:**
- **Back 5 (J):** Seek backward 5 transcript lines
- **Play/Pause (Space):** Start/pause audio capture
- **Stop (K):** Stop capture completely
- **Forward 5 (L):** Seek forward 5 transcript lines

**Keyboard Shortcuts:**
- `Space` = Play/Pause
- `J` = Back 5 lines
- `L` = Forward 5 lines
- `K` = Stop

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                       │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  App.tsx       │
                    │  LiveSession   │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ useAudioCapture│  ← Custom Hook
                    │     Hook       │
                    └───┬────────┬───┘
                        │        │
            ┌───────────┘        └──────────┐
            ▼                                ▼
   ┌─────────────────┐            ┌──────────────────┐
   │ AudioCapture    │            │ Transcription    │
   │   Service       │            │   Socket Service │
   └────────┬────────┘            └─────────┬────────┘
            │                               │
            ▼                               ▼
   ┌──────────────────┐           ┌─────────────────┐
   │ Electron         │           │ Socket.IO       │
   │ getUserMedia()   │           │ ws://localhost  │
   │ (Desktop Audio)  │           │      :3001      │
   └────────┬─────────┘           └─────────┬───────┘
            │                               │
            │ Float32Array chunks           │ Int16 buffers
            │ (every ~256ms)                │
            ▼                               ▼
   ┌──────────────────┐           ┌─────────────────┐
   │ Convert to       │──────────▶│ Backend Server  │
   │ LINEAR16         │           │ (Express +      │
   │ (Int16)          │           │  Socket.IO)     │
   └──────────────────┘           └─────────┬───────┘
                                            │
                                            ▼
                                   ┌────────────────┐
                                   │ Google Speech  │
                                   │ -to-Text API   │
                                   └────────┬───────┘
                                            │
                                            │ Transcripts
                                            ▼
                                   ┌────────────────┐
                                   │ Socket Emit    │
                                   │ 'transcript'   │
                                   └────────┬───────┘
                                            │
            ┌───────────────────────────────┘
            │
            ▼
   ┌────────────────────┐
   │ useAudioCapture    │
   │ onTranscript()     │
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────┐
   │ Update State:      │
   │ - interimTranscript│  (if !isFinal)
   │ - transcriptLines  │  (if isFinal)
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────┐
   │ React Re-render    │
   │ Components:        │
   │ - TranscriptDisplay│
   │ - AudioLevel       │
   └────────────────────┘
```

## How Transcription Works

### Step-by-Step Process:

1. **User selects audio source**
   - `AudioSourceSelector` displays available screens/windows
   - User picks one (e.g., "YouTube - Chrome")

2. **User clicks Play**
   - `TransportControls.onPlay()` called
   - `useAudioCapture.startCapture()` triggered

3. **Audio capture begins**
   - `AudioCaptureService` requests desktop audio via Electron
   - `getUserMedia({ chromeMediaSource: 'desktop', ... })`
   - Creates `AudioContext` at 16kHz sample rate
   - `ScriptProcessorNode` processes 4096-sample chunks

4. **Audio processing loop** (runs ~every 256ms)
   ```
   Float32Array (raw audio)
        │
        ├─> Calculate amplitude → Update audioLevel state
        │
        └─> Convert to Int16 (LINEAR16)
             │
             └─> Send via Socket.IO ('audio-data' event)
   ```

5. **Backend receives audio**
   - Socket.IO handler receives Int16 buffer
   - Writes to Google Speech-to-Text streaming API

6. **Google returns transcripts**
   - **Interim results** (isFinal: false): Partial, changing transcripts
   - **Final results** (isFinal: true): Confirmed, permanent transcripts

7. **Frontend displays results**
   - Interim: Shown in brackets `[partial text...]`
   - Final: Appended to transcript list (permanent)

8. **User clicks Stop**
   - `TransportControls.onStop()` called
   - `useAudioCapture.stopCapture()` triggered
   - Audio stream closed, Socket.IO stops sending

---

## Component Integration Example

```tsx
import { useAudioCapture } from './hooks/useAudioCapture';
import { AudioSourceSelector } from './components/AudioSourceSelector';
import { AudioLevelIndicator } from './components/AudioLevelIndicator';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { TransportControls } from './components/TransportControls';

function MyTranscriptionPage() {
  // Get all audio capture state & functions from hook
  const {
    audioSources,
    selectedSource,
    setSelectedSource,
    isCapturing,
    audioLevel,
    transcriptLines,
    interimTranscript,
    startCapture,
    stopCapture,
  } = useAudioCapture();

  const [isPlaying, setIsPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);

  const handlePlay = async () => {
    setIsPlaying(true);
    await startCapture();
  };

  const handleStop = () => {
    setIsPlaying(false);
    stopCapture();
  };

  return (
    <div>
      {/* Audio source dropdown */}
      <AudioSourceSelector
        sources={audioSources}
        selectedSource={selectedSource}
        isCapturing={isCapturing}
        onSourceChange={setSelectedSource}
      />

      {/* Recording indicator + level meter */}
      <AudioLevelIndicator
        audioLevel={audioLevel}
        isCapturing={isCapturing}
      />

      {/* Transcript display */}
      <TranscriptDisplay
        transcriptLines={transcriptLines}
        interimTranscript={interimTranscript}
        cursor={cursor}
        isDocked={false}
      />

      {/* Playback controls */}
      <TransportControls
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={() => setIsPlaying(false)}
        onStop={handleStop}
        onSeek={(delta) => setCursor(c => c + delta)}
      />
    </div>
  );
}
```

---

## Key Design Decisions

### 1. **Custom Hook Pattern**
- Keeps component logic separate from UI
- Easy to reuse across different pages
- Testable independently from UI

### 2. **Controlled Components**
- All state managed in hook, passed down as props
- Components are pure (no internal state)
- Easy to debug and trace data flow

### 3. **Service Layer**
- `AudioCaptureService` and `TranscriptionSocketService` are plain TypeScript classes
- Not React-specific, can be used in other contexts
- Easier to test and mock

### 4. **Interim vs Final Transcripts**
- Interim: Temporary, shown in brackets, updates frequently
- Final: Permanent, appended to list, never changes
- Clear visual distinction helps user understand confidence

---

## Future Enhancements

### Planned Improvements:
1. **AudioWorklet Migration**
   - Replace deprecated `ScriptProcessorNode`
   - Better performance, less CPU usage

2. **Translation Tab**
   - Currently a placeholder
   - Will use similar pattern for translation results

3. **Export Functionality**
   - Download transcripts as `.txt`, `.srt`, etc.
   - Save to Firebase for persistence

4. **Multi-language Support**
   - Language selector component
   - Pass language to Google Speech API

5. **Transcript Editing**
   - Allow manual corrections
   - Click-to-edit inline

6. **Audio Preview**
   - Test audio source before recording
   - Show waveform visualization

---

## Debugging Tips

### Check Audio Capture:
```javascript
// Browser console
console.log('Audio sources:', audioSources);
console.log('Selected:', selectedSource);
console.log('Capturing:', isCapturing);
console.log('Audio level:', audioLevel);
```

### Check Transcription:
```javascript
// Browser console
console.log('Transcript lines:', transcriptLines);
console.log('Interim:', interimTranscript);
```

### Check Network:
- Open DevTools → Network → WS (WebSocket)
- Should see Socket.IO connection to `localhost:3001`
- Check for `audio-data` and `transcript` events

### Common Issues:

**No audio level bar movement:**
- Audio source may not have audio playing
- Check browser console for "Audio process #X" logs
- Try selecting "Screen" instead of specific window

**No transcripts appearing:**
- Check backend console for "Received data from Google Speech API"
- Verify Socket.IO connection (should see "Connected to transcription server")
- Ensure Google Cloud credentials are valid

**Components not updating:**
- Check React DevTools for state changes
- Verify hook is returning updated values
- Check for console errors
