import { db } from "./firebase";
import admin from "firebase-admin";

const SUBJECTS_COLLECTION = "subjects";

export class SubjectService {
  static async createSubject(data: { name: string; code: string; term?: string }): Promise<string> {
    try {
      const now = admin.firestore.Timestamp.now();
      const subject = {
        ...data,
        lectureIds: [], // Initialize empty array for lecture IDs
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

  static async getSubjectById(id: string): Promise<any | null> {
    try {
      const docRef = db.collection(SUBJECTS_COLLECTION).doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return null;
      return { id: docSnap.id, ...docSnap.data() };
    } catch (err) {
      console.error("Error fetching subject by ID:", err);
      throw err;
    }
  }

  static async addLectureToSubject(subjectId: string, lectureId: string): Promise<void> {
    try {
      const docRef = db.collection(SUBJECTS_COLLECTION).doc(subjectId);
      await docRef.update({
        lectureIds: admin.firestore.FieldValue.arrayUnion(lectureId),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    } catch (err) {
      console.error("Error adding lecture to subject:", err);
      throw err;
    }
  }

  static async getMiscellaneousSubject(): Promise<any> {
    try {
      // Check if Miscellaneous subject already exists
      const snap = await db.collection(SUBJECTS_COLLECTION)
        .where("code", "==", "MISC")
        .limit(1)
        .get();

      if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, ...doc.data() };
      }

      // Create Miscellaneous subject if it doesn't exist
      const now = admin.firestore.Timestamp.now();
      const miscSubject = {
        name: "Miscellaneous",
        code: "MISC",
        term: "All Terms",
        lectureIds: [],
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await db.collection(SUBJECTS_COLLECTION).add(miscSubject);
      return { id: docRef.id, ...miscSubject };
    } catch (err) {
      console.error("Error getting/creating miscellaneous subject:", err);
      throw err;
    }
  }

  static async deleteSubject(subjectId: string, deleteLectures: boolean = true): Promise<{ deletedLectures: number }> {
    try {
      const subjectRef = db.collection(SUBJECTS_COLLECTION).doc(subjectId);
      const subjectSnap = await subjectRef.get();

      if (!subjectSnap.exists) {
        throw new Error("Subject not found");
      }

      const subjectData = subjectSnap.data();
      const lectureIds = subjectData?.lectureIds || [];

      // Delete all lectures associated with this subject if requested
      let deletedLectures = 0;
      if (deleteLectures && lectureIds.length > 0) {
        const batch = db.batch();
        for (const lectureId of lectureIds) {
          const lectureRef = db.collection("lectures").doc(lectureId);
          batch.delete(lectureRef);
          deletedLectures++;
        }
        await batch.commit();
      }

      // Delete the subject
      await subjectRef.delete();

      return { deletedLectures };
    } catch (err) {
      console.error("Error deleting subject:", err);
      throw err;
    }
  }

  static async removeLectureFromSubject(subjectId: string, lectureId: string): Promise<void> {
    try {
      const docRef = db.collection(SUBJECTS_COLLECTION).doc(subjectId);
      await docRef.update({
        lectureIds: admin.firestore.FieldValue.arrayRemove(lectureId),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    } catch (err) {
      console.error("Error removing lecture from subject:", err);
      throw err;
    }
  }
}