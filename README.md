# LiveLecture - Audio Transcription & Translation

## Local Development Setup

- Install frontend dependencies: `npm install`
- Install backend dependencies: `cd backend && npm install`
- Add `google-credentials.json` to the `backend/` directory with your Google Cloud service account credentials
- Copy `.env.template` to `backend/.env` (rename `.env.template` to just `.env`) and configure Firebase and Gemini API credentials
- Return to root directory: `cd ..`
- Start development server: `npm run dev` (from root directory)
