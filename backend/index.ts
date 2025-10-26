import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { processLectureData } from './services/gemini';
import { LectureService } from './services/lecture';
import { SpeechToTextService } from './services/speech-to-text';
import { TranslationService } from './services/translation';
import { SubjectService } from "./services/subject";
import { db } from "./services/firebase";

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

//Add subject
app.post("/subjects", async (req, res) => {
  try {
    const id = await SubjectService.createSubject(req.body);
    res.status(200).send({ id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to create subject" });
  }
});

// Get all subjects
app.get("/subjects", async (req, res) => {
  try {
    const subjects = await SubjectService.getAllSubjects();
    res.status(200).json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// Get single subject by ID
app.get("/subjects/:id", async (req, res) => {
  try {
    const subject = await SubjectService.getSubjectById(req.params.id);
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }
    res.status(200).json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch subject" });
  }
});

// Get or create miscellaneous subject
app.get("/subjects/misc/get-or-create", async (req, res) => {
  try {
    const miscSubject = await SubjectService.getMiscellaneousSubject();
    res.status(200).json(miscSubject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get miscellaneous subject" });
  }
});

// Delete subject (and optionally its lectures)
app.delete("/subjects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await SubjectService.deleteSubject(id, true); // Always delete lectures
    res.status(200).json({
      message: "Subject deleted successfully",
      deletedLectures: result.deletedLectures
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to delete subject" });
  }
});

// Move lecture to different subject
app.patch("/lectures/:lectureId/move", async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { fromSubjectId, toSubjectId } = req.body;

    if (!toSubjectId) {
      return res.status(400).json({ error: "toSubjectId is required" });
    }

    // Update lecture's subjectId
    await LectureService.updateLecture(lectureId, { subjectId: toSubjectId });

    // Remove from old subject's lectureIds if provided
    if (fromSubjectId) {
      await SubjectService.removeLectureFromSubject(fromSubjectId, lectureId);
    }

    // Add to new subject's lectureIds
    await SubjectService.addLectureToSubject(toSubjectId, lectureId);

    res.status(200).json({ message: "Lecture moved successfully" });
  } catch (err: any) {
    console.error("Error moving lecture:", err);
    res.status(500).json({ error: err.message || "Failed to move lecture" });
  }
});

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

// Live Keywords Extraction
app.post('/api/live-keywords', async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required" });
  }

  try {
    const { extractLiveKeywords } = await import('./services/gemini');
    const keywords = await extractLiveKeywords(transcript);
    res.json({ keywords });
  } catch (err: any) {
    console.error('Error extracting live keywords:', err);
    res.status(500).json({ error: "Failed to extract keywords" });
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
    const { title, transcriptId, subjectId, status, summary, keywords, questions } = req.body;

    // ✅ Ensure subjectId exists
    if (!subjectId) {
      return res.status(400).json({ error: "subjectId is required" });
    }

    const lectureData = {
      title: title || "Untitled Lecture",
      transcriptId: transcriptId || null,
      subjectId,
      status: status || "completed",
      summary,
      keywords,
      questions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const lectureId = await LectureService.createLecture(lectureData);

    // ✅ Add lecture ID to subject's lectureIds array
    await SubjectService.addLectureToSubject(subjectId, lectureId);

    res.json({ id: lectureId });
  } catch (err) {
    console.error("Error creating lecture:", err);
    res.status(500).json({ error: "Failed to create lecture" });
  }
});

app.get("/api/lectures/:id", async (req, res) => {
  const lecture = await LectureService.findLecture(req.params.id);
  if (!lecture) return res.status(404).json({ error: "Lecture not found" });
  res.json(lecture);
});

app.get("/api/lectures/:id", async (req, res) => {
  const lecture = await LectureService.findLecture(req.params.id);
  if (!lecture) return res.status(404).json({ error: "Lecture not found" });
  res.json(lecture);
});

// ✅ Non-API version to match frontend route
app.get("/lectures/:id", async (req, res) => {
  try {
    const lecture = await LectureService.findLecture(req.params.id);
    if (!lecture) return res.status(404).json({ error: "Lecture not found" });
    res.json(lecture);
  } catch (err) {
    console.error("Error fetching lecture:", err);
    res.status(500).json({ error: "Failed to fetch lecture" });
  }
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

// Delete lecture
app.delete("/api/lectures/:id", async (req, res) => {
  try {
    await LectureService.deleteLecture(req.params.id);
    res.json({ success: true, message: "Lecture deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete lecture" });
  }
});

// Save lecture with transcript
app.post("/api/lectures/save", async (req, res) => {
  try {
    const { title, transcript, translation, translationLanguage, subjectId, summary, keywords, questions } = req.body;

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
    const lectureData: any = {
      title,
      transcriptId,
      status: 'completed'
    };

    // Add optional fields
    if (subjectId) lectureData.subjectId = subjectId;
    if (summary) lectureData.summary = summary;
    if (keywords) lectureData.keywords = keywords;
    if (questions) lectureData.questions = questions;

    const lectureId = await LectureService.createLecture(lectureData);

    // ✅ If subjectId provided, add lecture to subject
    if (subjectId) {
      await SubjectService.addLectureToSubject(subjectId, lectureId);
    }

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

// Get all lectures for a specific subject (existing API route)
app.get("/api/lectures/subject/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const lecturesRef = db.collection("lectures");
    const snap = await lecturesRef.where("subjectId", "==", subjectId).get();

    const lectures = snap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(lectures);
  } catch (err) {
    console.error("Error fetching lectures by subject:", err);
    res.status(500).json({ error: "Failed to fetch lectures" });
  }
});

// ✅ NEW: non-API route to match frontend call (/lectures/subject/:subjectId)
app.get("/lectures/subject/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;
    console.log("📚 Fetching lectures for subject:", subjectId);

    const lecturesRef = db.collection("lectures");
    const snap = await lecturesRef.where("subjectId", "==", subjectId).get();

    const lectures = snap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(lectures);
  } catch (err) {
    console.error("Error fetching lectures by subject (non-API):", err);
    res.status(500).json({ error: "Failed to fetch lectures" });
  }
});
// ✅ Non-API alias route (for frontend direct navigation)
app.get("/lectures/:id", async (req, res) => {
  try {
    const lecture = await LectureService.findLecture(req.params.id);
    if (!lecture) return res.status(404).json({ error: "Lecture not found" });
    res.json(lecture);
  } catch (err) {
    console.error("Error fetching lecture:", err);
    res.status(500).json({ error: "Failed to fetch lecture" });
  }
});
