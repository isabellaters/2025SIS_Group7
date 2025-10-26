import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv"

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

async function callGeminiAPI(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('API key not found');
    }
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
    });
    return response.text || '';
}

export async function summarizeLecture(transcript: string): Promise<string> {
    const prompt = `Summarize the following lecture transcript in 2-3 concise sentences. Focus on the main topic and key takeaways:\n\n${transcript}`;
    return await callGeminiAPI(prompt);
}

export async function extractKeywords(transcript: string): Promise<string[]> {
    const prompt = `Extract the main keywords and technical terms from the following lecture transcript. Return only the most important 8-10 terms as a comma-separated list without any additional text:\n\n${transcript}`;
    const result = await callGeminiAPI(prompt);
    return result.split(',').map(k => k.trim()).filter(Boolean);
}

export async function extractKeywordsWithDefinitions(transcript: string): Promise<Array<{ term: string, definition: string }>> {
    const prompt = `Extract 8-10 important technical terms or keywords from the following lecture transcript. For each term, provide a brief 1-2 sentence definition in the context of the lecture. Return as JSON array with format: [{"term": "keyword", "definition": "brief definition"}]. Return ONLY valid JSON, no additional text:\n\n${transcript}`;

    try {
        const result = await callGeminiAPI(prompt);
        // Try to parse as JSON
        const cleaned = result.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to parse keywords JSON:', error);
        // Fallback: extract just keywords
        const keywords = await extractKeywords(transcript);
        return keywords.map(term => ({ term, definition: "No definition available" }));
    }
}

export async function generateDefinition(term: string, context: string): Promise<string> {
    const prompt = `Given the following lecture context, provide a clear and concise definition (1-2 sentences) for the term "${term}":\n\nContext:\n${context}`;
    return await callGeminiAPI(prompt);
}

export async function generateKeyPoints(transcript: string): Promise<string[]> {
    const prompt = `Generate 5-7 very short bullet points (maximum one line each) highlighting the absolute main takeaways and most important concepts from this lecture. Focus on what students MUST remember - these should be concise summary highlights, NOT definitions. Return only the points, one per line:\n\n${transcript}`;
    const result = await callGeminiAPI(prompt);
    return result.split(/\n/).map(p => p.trim().replace(/^[•\-*]\s*/, '')).filter(p => p.length > 0);
}

export async function generateQuestions(transcript: string, numQuestions: number = 3): Promise<string[]> {
    const prompt = `Generate exactly ${numQuestions} review questions based on the following lecture transcript. These should test understanding of the main concepts. Return only the questions, one per line, without numbering:\n\n${transcript}`;
    const result = await callGeminiAPI(prompt);
    return result.split(/\n/).map(q => q.trim().replace(/^\d+[\.)]\s*/, '')).filter(q => q.length > 0).slice(0, numQuestions);
}

export async function extractLiveKeywords(transcript: string): Promise<Array<{ term: string, definition: string }>> {
    // Extract keywords from live transcript (optimized for shorter text)
    const prompt = `Extract 3-5 important technical terms or keywords from the following text. For each term, provide a brief 1-sentence definition in the context of the text. Return as JSON array with format: [{"term": "keyword", "definition": "brief definition"}]. Return ONLY valid JSON, no additional text:\n\n${transcript}`;

    try {
        const result = await callGeminiAPI(prompt);
        // Try to parse as JSON
        const cleaned = result.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to parse keywords JSON:', error);
        return [];
    }
}

export async function processLectureData(transcript: string) {
    const [summary, keywords, keyPoints, questions] = await Promise.all([
        summarizeLecture(transcript),
        extractKeywords(transcript),
        generateKeyPoints(transcript),
        generateQuestions(transcript, 3)
    ]);

    return {
        summary,
        keywords,
        keyPoints,
        questions
    };
}