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

  /**
   * Sync all subjects' lectureIds arrays with actual lectures in the database
   * This fixes any data inconsistencies
   */
  static async syncAllSubjectLectureCounts(): Promise<{
    fixed: number;
    details: Array<{ subjectId: string; name: string; oldCount: number; newCount: number }>
  }> {
    try {
      const details: Array<{ subjectId: string; name: string; oldCount: number; newCount: number }> = [];
      let fixed = 0;

      // Get all subjects
      const subjectsSnap = await db.collection(SUBJECTS_COLLECTION).get();

      // Get all lectures
      const lecturesSnap = await db.collection("lectures").get();
      const lecturesBySubject = new Map<string, string[]>();

      // Group lectures by subjectId
      lecturesSnap.docs.forEach((doc) => {
        const data = doc.data();
        const subjectId = data.subjectId;
        if (subjectId) {
          if (!lecturesBySubject.has(subjectId)) {
            lecturesBySubject.set(subjectId, []);
          }
          lecturesBySubject.get(subjectId)!.push(doc.id);
        }
      });

      // Update each subject with correct lectureIds
      const batch = db.batch();
      let batchCount = 0;

      for (const doc of subjectsSnap.docs) {
        const subjectData = doc.data();
        const subjectId = doc.id;
        const oldLectureIds = Array.isArray(subjectData.lectureIds)
          ? subjectData.lectureIds.map(String)
          : [];
        const actualLectureIds = lecturesBySubject.get(subjectId) || [];

        // Check if they're different
        const oldSet = new Set(oldLectureIds);
        const newSet = new Set(actualLectureIds);

        let areDifferent = oldSet.size !== newSet.size;
        if (!areDifferent) {
          for (const id of oldLectureIds) {
            if (!newSet.has(id)) {
              areDifferent = true;
              break;
            }
          }
        }

        if (areDifferent) {
          // Update needed
          const docRef = db.collection(SUBJECTS_COLLECTION).doc(subjectId);
          batch.update(docRef, {
            lectureIds: actualLectureIds,
            updatedAt: admin.firestore.Timestamp.now(),
          });

          details.push({
            subjectId,
            name: subjectData.name || "Unknown",
            oldCount: oldLectureIds.length,
            newCount: actualLectureIds.length,
          });

          fixed++;
          batchCount++;

          // Commit batch every 500 operations (Firestore limit)
          if (batchCount >= 500) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }

      // Commit remaining operations
      if (batchCount > 0) {
        await batch.commit();
      }

      return { fixed, details };
    } catch (err) {
      console.error("Error syncing subject lecture counts:", err);
      throw err;
    }
  }
}