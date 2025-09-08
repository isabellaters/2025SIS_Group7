import express, { Request, Response } from 'express';
import cors from 'cors';
import { processLectureData } from './services/gemini';
import { LectureService } from './services/lecture';

console.log("index.ts loaded from:", __dirname);

const app = express();
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

/* ------------------------------- Glossary API ----------------------------- */
console.log("Glossary route is loaded!");

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

/* ------------------------------- Start Server ----------------------------- */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Socket.IO not initialized in this version — Haley’s clean build");
});