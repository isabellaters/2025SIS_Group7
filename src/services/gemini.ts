import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function processAndSaveLectureData(transcript: string) {
    // Generate AI outputs
    const summary = await summarizeLecture(transcript);
    const keywords = await extractKeywords(transcript);
    const questions = await generateQuestions(transcript);

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'lectures'), {
        transcript,
        summary,
        keywords,
        questions,
        createdAt: new Date().toISOString()
    });
    return docRef.id;
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function callGeminiAPI(prompt: string): Promise<string> {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
