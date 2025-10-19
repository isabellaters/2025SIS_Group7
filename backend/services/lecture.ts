import express from "express";
import type { Transcript, Lecture } from "../../src/types/index";
import { db } from "./firebase";
import admin from "firebase-admin";

const TRANSCRIPTS_COLLECTION = "transcripts";
const LECTURES_COLLECTION = "lectures";

export class LectureService {
  public router = express.Router();

  constructor() {
    // Existing routes
    this.router.get("/transcripts/:id", this.getTranscriptById);
    this.router.get("/:id", this.getLectureById);
    this.router.post("/transcripts", this.createTranscript);
    this.router.post("/", this.createLecture);

    // New route for SaveLectureButton
    this.router.post("/save", this.saveLecture);
  }

  // ------------------ Transcript Routes ------------------
  async createTranscript(req: express.Request, res: express.Response) {
    try {
      const data = req.body as Omit<Transcript, "id" | "createdAt" | "updatedAt">;
      const now = admin.firestore.Timestamp.now();

      const transcript: Omit<Transcript, "id"> = {
        ...data,
        status: data.status || "processing",
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await db.collection(TRANSCRIPTS_COLLECTION).add(transcript);
      res.json({ id: docRef.id, message: "Transcript created successfully ✅" });
    } catch (err) {
      console.error("Error creating transcript:", err);
      res.status(500).json({ error: "Failed to create transcript" });
    }
  }

  async getTranscriptById(req: express.Request, res: express.Response) {
    try {
      const { id } = req.params;
      const docRef = db.collection(TRANSCRIPTS_COLLECTION).doc(id);
      const docSnap = (await docRef.get()) as FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;

      if (!docSnap.exists) return res.status(404).json({ error: "Transcript not found" });
      res.json({ id: docSnap.id, ...(docSnap.data() as object) });
    } catch (err) {
      console.error("Error fetching transcript:", err);
      res.status(500).json({ error: "Failed to fetch transcript" });
    }
  }

  // ------------------ Lecture Routes ------------------
  async createLecture(req: express.Request, res: express.Response) {
    try {
      const data = req.body as Omit<Lecture, "id" | "createdAt" | "updatedAt">;
      const now = admin.firestore.Timestamp.now();

      const lecture: Omit<Lecture, "id"> = {
        ...data,
        createdAt: now,
        updatedAt: now,
        status: data.status || "processing",
      };

      const docRef = await db.collection(LECTURES_COLLECTION).add(lecture);
      res.json({ id: docRef.id, message: "Lecture created successfully ✅" });
    } catch (err) {
      console.error("Error creating lecture:", err);
      res.status(500).json({ error: "Failed to create lecture" });
    }
  }

  async getLectureById(req: express.Request, res: express.Response) {
    try {
      const { id } = req.params;
      const docRef = db.collection(LECTURES_COLLECTION).doc(id);
      const docSnap = (await docRef.get()) as FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;

      if (!docSnap.exists) return res.status(404).json({ error: "Lecture not found" });
      res.json({ id: docSnap.id, ...(docSnap.data() as object) });
    } catch (err) {
      console.error("Error fetching lecture:", err);
      res.status(500).json({ error: "Failed to fetch lecture" });
    }
  }

  // ------------------ New Save Route ------------------
  async saveLecture(req: express.Request, res: express.Response) {
    try {
      const { title, transcript, translation, translationLanguage } = req.body;

      if (!title || !transcript) {
        return res.status(400).json({ error: "Missing title or transcript" });
      }

      const now = admin.firestore.Timestamp.now();
      const lectureData = {
        title,
        transcript,
        translation: translation || "",
        translationLanguage: translationLanguage || "en",
        createdAt: now,
        updatedAt: now,
        status: "saved",
      };

      const docRef = await db.collection(LECTURES_COLLECTION).add(lectureData);
      console.log("Lecture saved to Firestore:", { id: docRef.id, title });

      res.json({
        message: "Lecture saved successfully",
        id: docRef.id,
        data: lectureData,
      });
    } catch (err) {
      console.error("Error saving lecture:", err);
      res.status(500).json({ error: "Failed to save lecture" });
    }
  }
}