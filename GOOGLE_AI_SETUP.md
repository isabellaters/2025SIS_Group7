# Google AI Studio Setup Guide

## Prerequisites

1. **Google AI Studio Account**: Sign up at [Google AI Studio](https://aistudio.google.com/)
2. **API Key**: Generate an API key from the Google AI Studio dashboard

## Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```env
# Firebase Configuration (existing)
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google AI Studio Configuration (NEW)
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

## Getting Your Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Navigate to the API Keys section
4. Click "Create API Key"
5. Copy the generated API key
6. Paste it into your `.env.local` file as `VITE_GOOGLE_AI_API_KEY`

## Features Enabled

With this setup, you'll have access to:

- **Live Speech-to-Text**: Real-time audio transcription using Google's Gemini model
- **Desktop Audio Capture**: Transcribe audio from any Windows application (videos, music, games, etc.)
- **Microphone Capture**: Traditional microphone-based transcription
- **Mixed Audio**: Combine both desktop and microphone audio for comprehensive transcription
- **Multi-language Support**: Automatic language detection and translation
- **High Accuracy**: Powered by Google's advanced AI models
- **Real-time Processing**: Continuous audio capture and transcription

## Usage

1. Start your development server: `npm run dev`
2. Click "Show Live Transcription" in the app
3. Choose your audio source:
   - **🎤 Microphone**: Traditional voice input
   - **🖥️ Desktop Audio**: Capture audio from any Windows application
   - **🎤🖥️ Both**: Combine microphone and desktop audio
4. Click "Start Recording" to begin live transcription
5. Watch the real-time transcription appear

### Desktop Audio Capture

When you select "Desktop Audio" or "Both", the browser will prompt you to:
1. Choose which screen/window to share
2. Make sure to check "Share audio" when prompted
3. Select the specific application or entire screen you want to transcribe

This allows you to transcribe:
- YouTube videos
- Online lectures
- Music with lyrics
- Video calls
- Any application playing audio

## Troubleshooting

- **Microphone Access**: Make sure to allow microphone permissions when prompted
- **API Key Issues**: Verify your API key is correctly set in `.env.local`
- **Audio Quality**: Ensure you're in a quiet environment for best results
- **Browser Compatibility**: Use a modern browser that supports WebRTC and MediaRecorder API
