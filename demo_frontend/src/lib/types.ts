// Типи 1:1 з моделями SQLAlchemy у backnote/db/models.py
export type UserStatus = "pending" | "active" | "blocked";
export type SubjectKind = "subject" | "course";
export type LessonKind = "lecture" | "seminar" | "practice" | "lab" | "video" | "reading" | "other";

export interface User {
  id: number; // Telegram ID
  username?: string;
  fullName: string;
  status: UserStatus;
  isAdmin?: boolean; // ADMIN_ID з .env
  createdAt: string;
}

export interface Subject {
  id: number;
  kind: SubjectKind;
  title: string;
  code?: string;
  instructor?: string;
  description?: string;
  year?: number;
  term?: number;
  ects?: number;
  provider?: string;
  url?: string;
  archived: boolean;
}

export interface Lesson {
  id: number;
  subjectId: number;
  number: number;
  kind: LessonKind;
  title: string;
  description?: string;
  videoUrl?: string;
  heldOn?: string;
  summary?: string;
  summarySource?: "manual" | "ai";
}

export const LESSON_KIND_LABEL: Record<LessonKind, string> = {
  lecture: "Лекція",
  seminar: "Семінар",
  practice: "Практика",
  lab: "Лабораторна",
  video: "Відео",
  reading: "Читання",
  other: "Інше",
};
