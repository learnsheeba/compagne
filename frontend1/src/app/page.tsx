"use client";

import { useCallback, useState } from "react";
import ChapterSelector from "@/components/ChapterSelector";
import ChatPanel from "@/components/ChatPanel";
import QuizView from "@/components/QuizView";
import UploadZone from "@/components/UploadZone";
import { generateQuiz, uploadDocument } from "@/lib/api";
import type { QuizMode, QuizResponse } from "@/lib/types";

type Step = "upload" | "chapters" | "quiz";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(true);
  const [successVisible, setSuccessVisible] = useState(true);

  const [documentId, setDocumentId] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [chapters, setChapters] = useState<import("@/lib/types").Chapter[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [quizMode, setQuizMode] = useState<QuizMode>("study");
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setErrorVisible(true);
    setSuccessVisible(true);
    try {
      const result = await uploadDocument(file);
      setDocumentId(result.document_id);
      setFilename(result.filename);
      setChapters(result.chapters);
      setTotalPages(result.total_pages);
      setSelectedChapters(new Set(result.chapters.map((c) => c.id)));
      setStep("chapters");
      setChatOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleToggleChapter = (id: string) => {
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedChapters.size === chapters.length) {
      setSelectedChapters(new Set());
    } else {
      setSelectedChapters(new Set(chapters.map((c) => c.id)));
    }
  };

  const handleGenerateQuiz = async () => {
    if (!documentId) return;
    setGenerating(true);
    setError(null);
    setErrorVisible(true);
    setSuccessVisible(true);
    try {
      const result = await generateQuiz(
        documentId,
        Array.from(selectedChapters),
        quizMode
      );
      setQuiz(result);
      setStep("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quiz generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setErrorVisible(true);
    setSuccessVisible(true);
    setDocumentId(null);
    setFilename(null);
    setChapters([]);
    setQuiz(null);
    setChatOpen(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-stone-950">
      <header className="border-b border-stone-800 bg-stone-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400 text-sm font-bold text-stone-900">
              C
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-100">Compagne</h1>
              <p className="text-xs text-stone-500">PDF study companion with RAG</p>
            </div>
          </div>
          {documentId && (
            <button
              onClick={handleReset}
              className="text-sm text-stone-500 hover:text-stone-300"
            >
              New document
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {error && errorVisible && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-red-400/60 bg-red-500/20 px-4 py-3 text-sm font-medium text-red-100 shadow-lg shadow-red-500/20">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setErrorVisible(false)}
              className="rounded-md border border-red-300/40 px-3 py-1 text-xs font-semibold text-red-50 transition hover:bg-red-500/30"
            >
              Ok
            </button>
          </div>
        )}

        {step === "upload" && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold text-stone-100">
                Turn any book into a study companion
              </h2>
              <p className="text-stone-500">
                Upload a PDF to build a LanceDB vector index, generate chapter quizzes, and chat with your book.
              </p>
            </div>
            <UploadZone onUpload={handleUpload} loading={uploading} />
          </div>
        )}

        {step === "chapters" && documentId && successVisible && (
          <div>
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-green-400/60 bg-green-500/20 px-4 py-3 shadow-lg shadow-green-500/20">
              <p className="text-sm font-medium text-green-100">
                <span className="font-semibold">{filename}</span> indexed — {chapters.length} chapters, {totalPages} pages
              </p>
              <button
                type="button"
                onClick={() => setSuccessVisible(false)}
                className="rounded-md border border-green-300/40 px-3 py-1 text-xs font-semibold text-green-50 transition hover:bg-green-500/30"
              >
                Ok
              </button>
            </div>
            <ChapterSelector
              chapters={chapters}
              selected={selectedChapters}
              mode={quizMode}
              loading={generating}
              onToggle={handleToggleChapter}
              onSelectAll={handleSelectAll}
              onModeChange={setQuizMode}
              onGenerate={handleGenerateQuiz}
            />
          </div>
        )}

        {step === "quiz" && quiz && (
          <QuizView
            quizId={quiz.quiz_id}
            mode={quiz.mode}
            questions={quiz.questions}
            onBack={() => {
              setQuiz(null);
              setStep("chapters");
            }}
          />
        )}
      </main>

      {documentId && filename && (
        <>
          <ChatPanel
            documentId={documentId}
            filename={filename}
            open={chatOpen}
            onClose={() => setChatOpen(false)}
          />
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-stone-900 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}
