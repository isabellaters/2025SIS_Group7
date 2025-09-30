import { API_BASE_URL } from "./config";

export class AiService {

  static async generateSummary(transcript: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/summary`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({transcript}),
        });
        return await response.json();
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    }
  }

}