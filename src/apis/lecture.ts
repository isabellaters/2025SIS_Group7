import { API_BASE_URL } from "./config";
import type { Transcript, Lecture } from "../types";

export class LectureService {
  // Create a transcript & lecture record
  static async createTranscript(data: Omit<Transcript, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/transcripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      return result.id;
    } catch (err) {
      console.error("Error creating transcript:", err);
      throw err;
    }
  }

  // Get a transcript by ID
  static async findTranscript(id: string): Promise<Transcript | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/transcripts/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error("Error fetching transcript:", err);
      throw err;
    }
  }

  // Update a transcript
  static async updateTranscript(id: string, data: Partial<Transcript>): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/transcripts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error("Error updating transcript:", err);
      throw err;
    }
  }

  static async createLecture(
    lectureData: Omit<Lecture, "id" | "createdAt" | "updatedAt">
  ): Promise<Lecture> {
    const response = await fetch(`${API_BASE_URL}/lectures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lectureData),
    });
    return await response.json();
  }


  // Optional: create/update lecture metadata (summary, keywords, questions)
  static async updateLecture(id: string, data: Partial<Lecture>): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/lectures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error("Error updating lecture:", err);
      throw err;
    }
  }

  static async findLecture(id: string): Promise<Lecture | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/lectures/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error("Error fetching lecture:", err);
      throw err;
    }
  }
}
// }