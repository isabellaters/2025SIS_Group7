// Transcript Models

import { Timestamp } from "firebase/firestore";

export interface Transcript {
    id?: string;
    title: string
    text: string
    duration?: number;
    courseId?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    userId?: string;
    status?: 'processing' | 'completed' | 'failed';
}