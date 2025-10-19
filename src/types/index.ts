// import { Timestamp } from "firebase/firestore";

// Temporary type definition for Timestamp
interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

// ========== Database Models ==========
export interface Transcript {
    id?: string;
    text: string;
    translation?: string;
    translationLanguage?: string;
    duration?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    status?: 'processing' | 'completed' | 'failed';
}

export interface Lecture {
    id?: string;
    title: string;
    courseId?: string;
    transcriptId: string;  // Reference to transcript
    summary?: string;
    keywords?: string[];
    questions?: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
    userId?: string;
    status?: 'processing' | 'completed' | 'failed';
}

// ========== Audio/Transcription Types ==========
export interface AudioSource {
    id: string;
    name: string;
    thumbnail?: string;
}

export interface TranscriptResult {
    transcript: string;
    isFinal: boolean;
    confidence?: number;
}

export interface TranslationResult {
    original: string;
    translated: string;
    targetLanguage: string;
    detectedSourceLanguage?: string;
    isFinal?: boolean;
}

// ========== App Types ==========
export type UpdateKind = "transcript" | "translation";

export interface TextUpdate {
    kind: UpdateKind;
    text: string;
}

export interface TranscriptController {
    start: () => Promise<void> | void;
    pause: () => Promise<void> | void;
    stop: () => Promise<void> | void;
    seekBy: (deltaSeconds: number) => Promise<void> | void;
    onUpdate?: (cb: (update: TextUpdate) => void) => () => void;
}

export interface TestResult {
    name: string;
    ok: boolean;
    error?: string;
}