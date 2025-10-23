import { db } from "./firebase";
import admin from "firebase-admin";

const SUBJECTS_COLLECTION = "subjects";

export class SubjectService {
  static async createSubject(data: { name: string; code: string; term?: string }): Promise<string> {
    try {
      const now = admin.firestore.Timestamp.now();
      const subject = {
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await db.collection(SUBJECTS_COLLECTION).add(subject);
      return docRef.id;
    } catch (err) {
      console.error("Error creating subject:", err);
      throw err;
    }
  }

  static async getAllSubjects(): Promise<any[]> {
    try {
      const snap = await db.collection(SUBJECTS_COLLECTION).get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Error fetching subjects:", err);
      throw err;
    }
  }
}