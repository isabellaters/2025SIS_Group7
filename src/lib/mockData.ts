// src/lib/mockData.ts
// Simple mock data - no external dependencies

export interface Subject {
  id: string;
  name: string;
  code: string;
  term: string;
  recordings: number;
}

export interface Lecture {
  id: string;
  subjectId: string;
  title: string;
  date: Date;
  duration: string;
  wordCount: number;
}

export const subjects: Subject[] = [
  {
    id: "1",
    name: "Data Structures & Algorithms",
    code: "CS 401",
    term: "Spring 2024",
    recordings: 12,
  },
  {
    id: "2",
    name: "Machine Learning",
    code: "CS 501",
    term: "Spring 2024",
    recordings: 8,
  },
  {
    id: "3",
    name: "Software Engineering",
    code: "CS 301",
    term: "Spring 2024",
    recordings: 15,
  },
];

export const lectures: Lecture[] = [
  // CS 401 lectures
  {
    id: "1",
    subjectId: "1",
    title: "Introduction to Arrays",
    date: new Date("2024-01-15T10:00:00"),
    duration: "1h 15m",
    wordCount: 3420,
  },
  {
    id: "2",
    subjectId: "1",
    title: "Linked Lists Fundamentals",
    date: new Date("2024-01-17T10:00:00"),
    duration: "1h 30m",
    wordCount: 4120,
  },
  {
    id: "3",
    subjectId: "1",
    title: "Stack and Queue Operations",
    date: new Date("2024-01-22T10:00:00"),
    duration: "1h 20m",
    wordCount: 3850,
  },
  // CS 501 lectures
  {
    id: "4",
    subjectId: "2",
    title: "Introduction to Neural Networks",
    date: new Date("2024-01-16T14:00:00"),
    duration: "2h 00m",
    wordCount: 5200,
  },
  {
    id: "5",
    subjectId: "2",
    title: "Supervised Learning Basics",
    date: new Date("2024-01-18T14:00:00"),
    duration: "1h 45m",
    wordCount: 4680,
  },
  // CS 301 lectures
  {
    id: "6",
    subjectId: "3",
    title: "Agile Methodology Overview",
    date: new Date("2024-01-19T09:00:00"),
    duration: "1h 10m",
    wordCount: 3120,
  },
  {
    id: "7",
    subjectId: "3",
    title: "Software Testing Strategies",
    date: new Date("2024-01-24T09:00:00"),
    duration: "1h 25m",
    wordCount: 3940,
  },
];

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

export function getLecturesBySubjectId(subjectId: string): Lecture[] {
  return lectures.filter((l) => l.subjectId === subjectId);
}

export function getAllSubjects(): Subject[] {
  return subjects;
}
