
import type { Transcript, Lecture } from "../../src/types/index";
import { db } from "./firebase";
import { collection, doc, addDoc, getDoc, updateDoc, Timestamp } from "firebase/firestore";

const TRANSCRIPTS_COLLECTION = "transcripts";
const LECTURES_COLLECTION = "lectures";

export class LectureService {
  // ------------------ Transcripts ------------------
  static async createTranscript(data: Omit<Transcript, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const now = Timestamp.now();
      const transcript: Omit<Transcript, "id"> = {
        ...data,
        status: data.status || "processing",
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await addDoc(collection(db, TRANSCRIPTS_COLLECTION), transcript);
      return docRef.id;
    } catch (err) {
      console.error("Error creating transcript:", err);
      throw err;
    }
  }

  static async findTranscript(id: string): Promise<Transcript | null> {
    try {
      const docRef = doc(db, TRANSCRIPTS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Transcript;
    } catch (err) {
      console.error("Error fetching transcript:", err);
      throw err;
    }
  }

  static async updateTranscript(id: string, data: Partial<Transcript>): Promise<void> {
    try {
      const docRef = doc(db, TRANSCRIPTS_COLLECTION, id);
      await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
    } catch (err) {
      console.error("Error updating transcript:", err);
      throw err;
    }
  }

  // ------------------ Lectures ------------------
  static async createLecture(data: Omit<Lecture, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const now = Timestamp.now();
      const lecture: Omit<Lecture, "id"> = {
        ...data,
        createdAt: now,
        updatedAt: now,
        status: data.status || "processing",
      };
      const docRef = await addDoc(collection(db, LECTURES_COLLECTION), lecture);
      return docRef.id;
    } catch (err) {
      console.error("Error creating lecture:", err);
      throw err;
    }
  }

  static async findLecture(id: string): Promise<Lecture | null> {
    try {
      const docRef = doc(db, LECTURES_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Lecture;
    } catch (err) {
      console.error("Error fetching lecture:", err);
      throw err;
    }
  }

  static async updateLecture(id: string, data: Partial<Lecture>): Promise<void> {
    try {
      const docRef = doc(db, LECTURES_COLLECTION, id);
      await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
    } catch (err) {
      console.error("Error updating lecture:", err);
      throw err;
    }
  }
}
