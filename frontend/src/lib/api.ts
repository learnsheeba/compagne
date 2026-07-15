import type {
  ChatMessage,
  QuizMode,
  QuizResponse,
  UploadResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResponse>("/documents/upload", {
    method: "POST",
    body: form,
  });
}

export async function generateQuiz(
  documentId: string,
  chapterIds: string[],
  mode: QuizMode
): Promise<QuizResponse> {
  return request<QuizResponse>("/quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_id: documentId,
      chapter_ids: chapterIds,
      mode,
    }),
  });
}

export async function scoreQuiz(
  quizId: string,
  answers: { question_id: string; selected_index: number }[]
): Promise<{
  score: number;
  total: number;
  results: {
    question_id: string;
    correct: boolean;
    correct_index: number;
    explanation: string;
    selected_index: number;
  }[];
}> {
  return request("/quiz/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quiz_id: quizId, answers }),
  });
}

export async function verifyAnswer(
  quizId: string,
  questionId: string
): Promise<{ correct_index: number; explanation: string }> {
  return request("/quiz/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quiz_id: quizId, question_id: questionId }),
  });
}

export async function sendChatMessage(
  documentId: string,
  message: string,
  history: ChatMessage[]
): Promise<{ reply: string; sources: string[] }> {
  return request("/chat/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_id: documentId,
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
}
