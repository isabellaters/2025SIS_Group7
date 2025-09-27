import express from 'express';
import cors from 'cors';
import { error } from 'console';
import { processLectureData } from './services/gemini';
import { LectureService } from './services/lecture';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());


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


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
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