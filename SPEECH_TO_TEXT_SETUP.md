# Speech-to-Text Setup Guide

## Prerequisites

1. **Google AI Studio Account**: Sign up at [Google AI Studio](https://aistudio.google.com/)
2. **API Key**: Generate an API key from the Google AI Studio dashboard

## Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```env
# Google AI Studio Configuration (REQUIRED for speech-to-text)
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

## Getting Your Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Navigate to the API Keys section
4. Click "Create API Key"
5. Copy the generated API key
6. Paste it into your `.env.local` file as `VITE_GOOGLE_AI_API_KEY`

## Features Implemented

With this setup, you'll have access to:

- **Microphone Audio Capture**: Traditional microphone-based transcription
- **Window Audio Capture**: Capture audio from any Windows application (videos, music, games, etc.)
- **Real-time Transcription**: Continuous audio capture and transcription using Google AI
- **Console Output**: Transcribed text is output to the console as requested
- **Live UI**: Real-time display of transcribed text in the application

## Usage

1. Start your development server: `npm run dev`
2. The app will open with the Speech-to-Text Demo component
3. Choose your audio source:
   - **🎤 Microphone**: Traditional voice input
   - **🖥️ Window Audio**: Capture audio from any Windows application
4. Click "Start Recording" to begin live transcription
5. Watch the real-time transcription appear in the UI and console

### Window Audio Capture

When you select "Window Audio", the app will:
1. Show a list of available windows/applications
2. Let you select which window to capture audio from
3. Capture audio from that specific window
4. Transcribe the audio in real-time

This allows you to transcribe:
- YouTube videos
- Online lectures
- Music with lyrics
- Video calls
- Any application playing audio

## Console Output

As requested, all transcribed text is output to the console with:
- `🎤 Transcribed Text:` - The latest transcribed segment
- `📝 Full Transcript:` - The complete accumulated transcript

## Troubleshooting

- **API Key Issues**: Verify your API key is correctly set in `.env.local`
- **Microphone Access**: Make sure to allow microphone permissions when prompted
- **Window Audio**: Ensure you're running the app in Electron (not browser) for window capture
- **Audio Quality**: Ensure you're in a quiet environment for best results

## Technical Details

- **Audio Format**: WebM with Opus codec
- **Sample Rate**: 16kHz
- **Transcription Interval**: 5 seconds (configurable)
- **AI Model**: Google Gemini 1.5 Flash
- **Minimum Audio Length**: 1 second before transcription
