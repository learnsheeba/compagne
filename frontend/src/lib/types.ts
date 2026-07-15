export interface Chapter {
  id: string;
  title: string;
  page_start: number;
  page_end: number;
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  chapters: Chapter[];
  total_pages: number;
  message: string;
}

export type QuizMode = "strict" | "study";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  chapter_id: string;
  chapter_title: string;
}

export interface QuizResponse {
  quiz_id: string;
  mode: QuizMode;
  questions: QuizQuestion[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export interface AppState {
  documentId: string | null;
  filename: string | null;
  chapters: Chapter[];
  totalPages: number;
}
