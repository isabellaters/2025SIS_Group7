import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { error } from 'console';
import { processLectureData } from './services/gemini';
import { LectureService } from './services/lecture';
import { SpeechToTextService } from './services/speech-to-text';
import { TranslationService } from './services/translation';

console.log("index.ts loaded successfully — merged version (Haley + main)");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST']
  }
});
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

/* ------------------------- AI Summary Generation ------------------------- */
app.post('/api/summary', async (req: Request, res: Response) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required" });
  }

  try {
    const result = await processLectureData(transcript);
    res.json(result);
  } catch (err: any) {
    console.error('Error processing lecture:', err);

    if (err.status) {
      return res.status(err.status).json({
        error: err.message || "Error occurred with Gemini API",
      });
    }

    res.status(500).json({ error: "Failed to process lecture" });
  }
});

/* ------------------------------ Transcripts ------------------------------ */
// Create transcript
app.post("/api/transcripts", async (req: Request, res: Response) => {
  try {
    const id = await LectureService.createTranscript(req.body);
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create transcript" });
  }
});

// Get transcript
app.get("/api/transcripts/:id", async (req: Request, res: Response) => {
  const transcript = await LectureService.findTranscript(req.params.id);
  if (!transcript) return res.status(404).json({ error: "Transcript not found" });
  res.json(transcript);
});

// Update transcript
app.patch("/api/transcripts/:id", async (req: Request, res: Response) => {
  try {
    await LectureService.updateTranscript(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update transcript" });
  }
});

/* -------------------------------- Lectures ------------------------------- */
// Create lecture
app.post("/api/lectures", async (req: Request, res: Response) => {
  try {
    const id = await LectureService.createLecture(req.body);
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create lecture" });
  }
});

// Get lecture
app.get("/api/lectures/:id", async (req: Request, res: Response) => {
  const lecture = await LectureService.findLecture(req.params.id);
  if (!lecture) return res.status(404).json({ error: "Lecture not found" });
  res.json(lecture);
});

// Update lecture
app.patch("/api/lectures/:id", async (req: Request, res: Response) => {
  try {
    await LectureService.updateLecture(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update lecture" });
  }
});

// Save lecture with transcript
app.post("/api/lectures/save", async (req: Request, res: Response) => {
  try {
    const { title, transcript, translation, translationLanguage } = req.body;

    if (!title || !transcript) {
      return res.status(400).json({ error: "Title and transcript are required" });
    }

    const transcriptData: any = {
      text: transcript,
      status: 'completed',
    };

    if (translation) transcriptData.translation = translation;
    if (translationLanguage) transcriptData.translationLanguage = translationLanguage;

    const transcriptId = await LectureService.createTranscript(transcriptData);

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

/* ------------------------------- Glossary API ----------------------------- */
console.log("📘 Glossary route is loaded!");
app.get("/api/glossary", async (req: Request, res: Response) => {
  try {
    const glossary = {
      algorithm: "Step-by-step process for solving a problem",
      runtime: "The time taken for a program to execute",
      complexity: "Measure of efficiency of an algorithm",
      API: "Interface allowing different software to communicate",
      database: "Organized collection of structured information or data",
    };
    res.json(glossary);
  } catch (err) {
    console.error("Error fetching glossary:", err);
    res.status(500).json({ error: "Failed to load glossary" });
  }
});

/* ---------------------------- Socket.IO Streaming ---------------------------- */
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let speechService: SpeechToTextService | null = null;
  let translationService: TranslationService | null = null;
  let recognizeStream: any = null;
  let targetLanguage: string = 'es'; // Default to Spanish
  let translationEnabled: boolean = false;
  let lastTranslatedText: string = '';

  socket.on('set-target-language', (language: string) => {
    targetLanguage = language;
  });

  socket.on('set-translation-enabled', (enabled: boolean) => {
    translationEnabled = enabled;
    if (!enabled) lastTranslatedText = '';
  });

  socket.on('start-transcription', () => {
    speechService = new SpeechToTextService();
    translationService = new TranslationService();

    const currentTranslationService = translationService;

    recognizeStream = speechService.startStreaming(
      async (result) => {
        socket.emit('transcript', result);

        const textToTranslate = result.transcript.trim();
        const shouldTranslate = translationEnabled &&
          textToTranslate &&
          textToTranslate !== lastTranslatedText &&
          textToTranslate.length > 3 &&
          currentTranslationService;

        if (shouldTranslate) {
          try {
            const translation = await currentTranslationService.translateText(
              textToTranslate,
              targetLanguage,
              'en'
            );

            lastTranslatedText = textToTranslate;

            socket.emit('translation', {
              original: textToTranslate,
              translated: translation.translatedText,
              targetLanguage,
              detectedSourceLanguage: translation.detectedSourceLanguage,
              isFinal: result.isFinal
            });
          } catch (error: any) {
            console.error('[TRANSLATION ERROR]', error);
            socket.emit('translation-error', { error: error.message });
          }
        }

        if (result.isFinal) lastTranslatedText = '';
      },
      (error) => {
        console.error('Transcription error:', error);
        socket.emit('transcription-error', { error: error.message });
      }
    );
  });

  socket.on('audio-data', (audioChunk: Buffer) => {
    if (recognizeStream) {
      recognizeStream.write(audioChunk);
    } else {
      console.warn('Received audio data but recognizeStream is not initialized');
    }
  });

  socket.on('stop-transcription', () => {
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

/* ------------------------------- Start Server ----------------------------- */
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server ready for real-time transcription`);
});