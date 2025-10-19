import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { error } from 'console';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { processLectureData } from './services/gemini';
import { LectureService } from './services/lecture';
import { SpeechToTextService } from './services/speech-to-text-mock';
import { TranslationService } from './services/translation';
import { VideoTranscriptionService } from './services/video-transcription-mock';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST']
  }
});
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'video/mp4') {
        cb(null, true);
      } else {
        cb(new Error('Only MP4 video files are allowed') as any, false);
      }
    },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Store for tracking video processing status
const videoProcessingStatus = new Map<string, { status: string; transcript?: string; error?: string }>();


// AI Summary Generation
app.post('/api/summary', async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required"});
  }

  try {
    const result = await processLectureData(transcript);
    res.json(result);
  } catch (err: any) {
    console.error('Error processing lecture:', err);

    if(err.status) {
      return res.status(err.status).json({
        error: err.message || "error occurred with Gemini API",
      });
    }

    res.status(500).json({ error: "Failed to process lecture" });
  }
});

// AI Definition Generation
app.post('/api/definition', async (req, res) => {
  const { term, context } = req.body;

  if (!term || !context) {
    return res.status(400).json({ error: "Term and context are required" });
  }

  try {
    const { generateDefinition } = await import('./services/gemini');
    const definition = await generateDefinition(term, context);
    res.json({ term, definition });
  } catch (err: any) {
    console.error('Error generating definition:', err);
    res.status(500).json({ error: "Failed to generate definition" });
  }
});


//Transcript

// Create transcript
app.post("/api/transcripts", async (req, res) => {
  try {
    const id = await LectureService.createTranscript(req.body);
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create transcript" });
  }
});

// Get transcript
app.get("/api/transcripts/:id", async (req, res) => {
  const transcript = await LectureService.findTranscript(req.params.id);
  if (!transcript) return res.status(404).json({ error: "Transcript not found" });
  res.json(transcript);
});

// Update transcript
app.patch("/api/transcripts/:id", async (req, res) => {
  try {
    await LectureService.updateTranscript(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update transcript" });
  }
});


// Socket.IO for real-time audio streaming and transcription
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let speechService: SpeechToTextService | null = null;
  let translationService: TranslationService | null = null;
  let recognizeStream: any = null;
  let targetLanguage: string = 'es'; // Default to Spanish
  let translationEnabled: boolean = false; // Default to disabled
  let lastTranslatedText: string = ''; // Track last translated text to avoid duplicates

  socket.on('set-target-language', (language: string) => {
    console.log(`Setting target language to ${language} for client:`, socket.id);
    targetLanguage = language;
  });

  socket.on('set-translation-enabled', (enabled: boolean) => {
    console.log(`Setting translation enabled to ${enabled} for client:`, socket.id);
    translationEnabled = enabled;
    if (!enabled) {
      lastTranslatedText = ''; // Reset when disabling
    }
  });

  socket.on('start-transcription', () => {
    console.log('Starting transcription for client:', socket.id);

    speechService = new SpeechToTextService();
    translationService = new TranslationService();

    // Capture the translation service reference for the callback
    const currentTranslationService = translationService;

    recognizeStream = speechService.startStreaming(
      async (result) => {
        // Emit transcript
        socket.emit('transcript', result);

        // Translate both interim and final results for real-time translation
        // Only translate if translation is enabled, text is different, and has meaningful content
        const textToTranslate = result.transcript.trim();
        const shouldTranslate = translationEnabled &&
                               textToTranslate &&
                               textToTranslate !== lastTranslatedText &&
                               textToTranslate.length > 3 && // At least a few characters
                               currentTranslationService;

        if (shouldTranslate) {
          try {
            console.log(`[TRANSLATING ${result.isFinal ? 'FINAL' : 'INTERIM'}] "${textToTranslate}" to ${targetLanguage}...`);
            const translation = await currentTranslationService.translateText(
              textToTranslate,
              targetLanguage,
              'en'
            );

            // Update last translated text
            lastTranslatedText = textToTranslate;

            socket.emit('translation', {
              original: textToTranslate,
              translated: translation.translatedText,
              targetLanguage,
              detectedSourceLanguage: translation.detectedSourceLanguage,
              isFinal: result.isFinal
            });
            console.log(`[TRANSLATED] "${textToTranslate}" -> "${translation.translatedText}"`);
          } catch (error: any) {
            console.error('[TRANSLATION ERROR]', error);
            socket.emit('translation-error', { error: error.message });
          }
        }

        // Reset tracking when we get a final result
        if (result.isFinal) {
          lastTranslatedText = '';
        }
      },
      (error) => {
        console.error('Transcription error:', error);
        socket.emit('transcription-error', { error: error.message });
      }
    );
  });

  let audioChunkCount = 0;
  socket.on('audio-data', (audioChunk: Buffer) => {
    if (recognizeStream) {
      recognizeStream.write(audioChunk);
      audioChunkCount++;
      if (audioChunkCount % 50 === 0) {
        console.log(`Received ${audioChunkCount} audio chunks from client`);
      }
    } else {
      console.warn('Received audio data but recognizeStream is not initialized');
    }
  });

  socket.on('stop-transcription', () => {
    console.log('Stopping transcription for client:', socket.id);
    if (speechService) {
      speechService.stopStreaming();
      speechService = null;
      translationService = null;
      recognizeStream = null;
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (speechService) {
      speechService.stopStreaming();
      speechService = null;
      translationService = null;
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server ready for real-time transcription`);
});

// Lecture 
app.post("/api/lectures", async (req, res) => {
  try {
    const id = await LectureService.createLecture(req.body);
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create lecture" });
  }
});

app.get("/api/lectures/:id", async (req, res) => {
  const lecture = await LectureService.findLecture(req.params.id);
  if (!lecture) return res.status(404).json({ error: "Lecture not found" });
  res.json(lecture);
});

app.patch("/api/lectures/:id", async (req, res) => {
  try {
    await LectureService.updateLecture(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update lecture" });
  }
});

// Save lecture with transcript
app.post("/api/lectures/save", async (req, res) => {
  try {
    const { title, transcript, translation, translationLanguage } = req.body;

    if (!title || !transcript) {
      return res.status(400).json({ error: "Title and transcript are required" });
    }

    // Create transcript first - only include fields with values
    const transcriptData: any = {
      text: transcript,
      status: 'completed'
    };

    if (translation) {
      transcriptData.translation = translation;
    }

    if (translationLanguage) {
      transcriptData.translationLanguage = translationLanguage;
    }

    const transcriptId = await LectureService.createTranscript(transcriptData);

    // Create lecture with reference to transcript
    const lectureId = await LectureService.createLecture({
      title,
      transcriptId,
      status: 'completed'
    });

    res.json({
      success: true,
      lectureId,
      transcriptId
    });
  } catch (err) {
    console.error('Error saving lecture:', err);
    res.status(500).json({ error: "Failed to save lecture" });
  }
});

// Video Upload and Transcription Endpoints
app.post('/api/video/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { title, subject } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const videoId = req.file.filename;
    const videoPath = req.file.path;

    // Initialize processing status
    videoProcessingStatus.set(videoId, { status: 'processing' });

    // Process video asynchronously
    VideoTranscriptionService.transcribeVideo(videoPath)
      .then(async (result) => {
        if (result.status === 'completed') {
          videoProcessingStatus.set(videoId, { 
            status: 'completed', 
            transcript: result.transcript 
          });

          // Save the lecture with transcript
          try {
            const transcriptData = {
              text: result.transcript,
              status: 'completed' as const
            };

            const transcriptId = await LectureService.createTranscript(transcriptData);
            const lectureId = await LectureService.createLecture({
              title,
              transcriptId,
              status: 'completed'
            });

            console.log(`Video transcription completed for ${videoId}. Lecture ID: ${lectureId}`);
          } catch (saveError) {
            console.error('Error saving lecture:', saveError);
          }
        } else {
          videoProcessingStatus.set(videoId, { 
            status: 'failed', 
            error: result.error || 'Transcription failed' 
          });
        }

        // Clean up video file after processing
        try {
          await fs.promises.unlink(videoPath);
          console.log(`Cleaned up video file: ${videoPath}`);
        } catch (cleanupError) {
          console.error('Error cleaning up video file:', cleanupError);
        }
      })
      .catch((error) => {
        console.error('Error processing video:', error);
        videoProcessingStatus.set(videoId, { 
          status: 'failed', 
          error: error.message || 'Unknown error' 
        });
      });

    res.json({ 
      success: true, 
      videoId,
      message: 'Video uploaded successfully. Processing started.' 
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Check video processing status
app.get('/api/video/status/:videoId', (req, res) => {
  const { videoId } = req.params;
  const status = videoProcessingStatus.get(videoId);

  if (!status) {
    return res.status(404).json({ error: 'Video not found' });
  }

  res.json(status);
});

// Get video transcript
app.get('/api/video/transcript/:videoId', (req, res) => {
  const { videoId } = req.params;
  const status = videoProcessingStatus.get(videoId);

  if (!status) {
    return res.status(404).json({ error: 'Video not found' });
  }

  if (status.status !== 'completed') {
    return res.status(400).json({ error: 'Video processing not completed' });
  }

  res.json({ transcript: status.transcript });
});