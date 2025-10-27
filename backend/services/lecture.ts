
import { db } from "./firebase";
import admin from 'firebase-admin';

// Backend-local types to avoid incompatible Timestamp definitions between
// firebase-admin and the front-end Firestore client types.
type AdminTimestamp = admin.firestore.Timestamp;
interface Transcript {
  id?: string;
  text: string;
  translation?: string;
  translationLanguage?: string;
  duration?: number;
  createdAt?: AdminTimestamp | any;
  updatedAt?: AdminTimestamp | any;
  status?: string;
}

interface Lecture {
  id?: string;
  title: string;
  subjectId?: string;
  courseId?: string;
  transcriptId: string;
  summary?: string;
  keywords?: string[];
  keyPoints?: string[];
  questions?: string[];
  notes?: string;
  createdAt?: AdminTimestamp | any;
  updatedAt?: AdminTimestamp | any;
  userId?: string;
  status?: string;
}

const TRANSCRIPTS_COLLECTION = "transcripts";
const LECTURES_COLLECTION = "lectures";

export class LectureService {
  // ------------------ Transcripts ------------------
  static async createTranscript(data: Omit<Transcript, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const now = admin.firestore.Timestamp.now();
      const transcript: Omit<Transcript, "id"> = {
        ...data,
        status: data.status || "processing",
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await db.collection(TRANSCRIPTS_COLLECTION).add(transcript);
      return docRef.id;
    } catch (err) {
      console.error("Error creating transcript:", err);
      throw err;
    }
  }

  static async findTranscript(id: string): Promise<Transcript | null> {
    try {
      const docRef = db.collection(TRANSCRIPTS_COLLECTION).doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return null;
      return { id: docSnap.id, ...docSnap.data() } as Transcript;
    } catch (err) {
      console.error("Error fetching transcript:", err);
      throw err;
    }
  }

  static async updateTranscript(id: string, data: Partial<Transcript>): Promise<void> {
    try {
      const docRef = db.collection(TRANSCRIPTS_COLLECTION).doc(id);
      await docRef.update({ ...data, updatedAt: admin.firestore.Timestamp.now() });
    } catch (err) {
      console.error("Error updating transcript:", err);
      throw err;
    }
  }

  // ------------------ Lectures ------------------
  static async createLecture(data: Omit<Lecture, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const now = admin.firestore.Timestamp.now();
      const lecture: Omit<Lecture, "id"> = {
        ...data,
        createdAt: now,
        updatedAt: now,
        status: data.status || "processing",
      };
      const docRef = await db.collection(LECTURES_COLLECTION).add(lecture);
      return docRef.id;
    } catch (err) {
      console.error("Error creating lecture:", err);
      throw err;
    }
  }

  static async findLecture(id: string): Promise<Lecture | null> {
    try {
      const docRef = db.collection(LECTURES_COLLECTION).doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return null;
      return { id: docSnap.id, ...docSnap.data() } as Lecture;
    } catch (err) {
      console.error("Error fetching lecture:", err);
      throw err;
    }
  }

  static async updateLecture(id: string, data: Partial<Lecture>): Promise<void> {
    try {
      const docRef = db.collection(LECTURES_COLLECTION).doc(id);
      await docRef.update({ ...data, updatedAt: admin.firestore.Timestamp.now() });
    } catch (err) {
      console.error("Error updating lecture:", err);
      throw err;
    }
  }

  static async deleteLecture(id: string): Promise<void> {
    try {
      const docRef = db.collection(LECTURES_COLLECTION).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        throw new Error("Lecture not found");
      }

      const lectureData = docSnap.data();
      const subjectId = lectureData?.subjectId;

      // Remove lecture from subject's lectureIds array if it belongs to a subject
      if (subjectId) {
        const { SubjectService } = await import('./subject');
        await SubjectService.removeLectureFromSubject(subjectId, id);
      }

      // Delete the lecture
      await docRef.delete();
    } catch (err) {
      console.error("Error deleting lecture:", err);
      throw err;
    }
  }
}
