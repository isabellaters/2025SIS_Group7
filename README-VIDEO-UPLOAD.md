# Video Upload and Transcription Feature

## Overview
This feature allows users to upload MP4 video files and automatically transcribe them to text using Google Cloud Speech-to-Text API.

## Features
- ✅ Upload MP4 video files (up to 100MB)
- ✅ Automatic audio extraction from video
- ✅ Speech-to-text transcription using Google Cloud API
- ✅ Real-time progress tracking
- ✅ Integration with existing lecture management system
- ✅ Clean UI with drag-and-drop file selection

## Prerequisites

### 1. FFmpeg Installation
FFmpeg is required for video processing. Install it based on your operating system:

#### Windows:
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract the files to a folder (e.g., `C:\ffmpeg`)
3. Add the `bin` folder to your system PATH
4. Verify installation: `ffmpeg -version`

#### macOS:
```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install ffmpeg
```

### 2. Google Cloud Setup
1. Create a Google Cloud project
2. Enable the Speech-to-Text API
3. Create a service account with Speech-to-Text permissions
4. Download the JSON key file
5. Place it at: `backend/google-credentials.json`

### 3. Backend Dependencies
```bash
cd backend
npm install
```

## How It Works

### 1. Video Upload Process
1. User selects an MP4 video file through the UI
2. File is uploaded to the backend via multipart form data
3. Backend stores the video temporarily in `backend/uploads/`

### 2. Video Processing
1. FFmpeg extracts audio from the video file
2. Audio is converted to 16kHz mono WAV format (required by Google Speech-to-Text)
3. Audio file is temporarily stored in `backend/temp/`

### 3. Transcription
1. Audio is sent to Google Cloud Speech-to-Text API
2. API returns transcribed text with confidence scores
3. Transcript is saved to the database as a lecture

### 4. Cleanup
1. Temporary video and audio files are deleted
2. Processing status is tracked in memory

## API Endpoints

### Upload Video
```
POST /api/video/upload
Content-Type: multipart/form-data

Fields:
- video: MP4 file
- title: Lecture title
- subject: Subject name
```

### Check Processing Status
```
GET /api/video/status/:videoId
```

### Get Transcript
```
GET /api/video/transcript/:videoId
```

## File Structure

```
src/components/
├── VideoUploadPage.tsx          # Main upload UI component

backend/
├── services/
│   └── video-transcription.ts   # Video processing service
├── uploads/                     # Temporary video storage
├── temp/                        # Temporary audio storage
└── index.ts                     # API endpoints
```

## Usage

1. Click "Upload Video" button in the sidebar
2. Enter lecture title and select subject
3. Select an MP4 video file
4. Click "Upload & Transcribe"
5. Wait for processing to complete
6. Click "Start Session" to view the transcript

## Error Handling

- File type validation (MP4 only)
- File size limit (100MB)
- FFmpeg availability check
- Google Cloud API error handling
- Automatic cleanup of temporary files

## Performance Notes

- Large video files may take several minutes to process
- Processing is done asynchronously to avoid blocking the UI
- Progress is tracked and displayed to the user
- Temporary files are automatically cleaned up

## Troubleshooting

### FFmpeg Not Found
- Ensure FFmpeg is installed and in your system PATH
- Restart your terminal/IDE after installation

### Google Cloud API Errors
- Verify your service account credentials
- Check that the Speech-to-Text API is enabled
- Ensure your project has sufficient quota

### File Upload Issues
- Check file size (must be under 100MB)
- Ensure file is in MP4 format
- Verify backend server is running on port 3001
