import { Timestamp } from "firebase/firestore";

export interface Transcript {
    id?: string;
    text: string
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