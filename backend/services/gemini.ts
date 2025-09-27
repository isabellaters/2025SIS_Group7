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
    const prompt = `Summarize the following lecture transcript in a concise paragraph:\n${transcript}`;
    return await callGeminiAPI(prompt);
}

export async function extractKeywords(transcript: string): Promise<string[]> {
    const prompt = `Extract the main keywords from the following lecture transcript as a comma-separated list:\n${transcript}`;
    const result = await callGeminiAPI(prompt);
    return result.split(',').map(k => k.trim()).filter(Boolean);
}

export async function generateQuestions(transcript: string, numQuestions: number = 3): Promise<string[]> {
    const prompt = `Generate ${numQuestions} quiz questions based on the following lecture transcript. Number each question:\n${transcript}`;
    const result = await callGeminiAPI(prompt);
    // Split by line and filter out empty lines
    return result.split(/\n|\r/).map(q => q.trim()).filter(q => q.length > 0);
}

export async function processLectureData(transcript: string) {
    const summary = await summarizeLecture(transcript);
    const keywords = await extractKeywords(transcript);
    const questions = await generateQuestions(transcript);
    console.log("test");

    return {
        summary,
        keywords,
        questions
    };
}