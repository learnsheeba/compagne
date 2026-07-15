"use client";

import { useState } from "react";
import { scoreQuiz, verifyAnswer } from "@/lib/api";
import type { QuizMode, QuizQuestion } from "@/lib/types";

interface QuizViewProps {
  quizId: string;
  mode: QuizMode;
  questions: QuizQuestion[];
  onBack: () => void;
}

export default function QuizView({ quizId, mode, questions, onBack }: QuizViewProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [verified, setVerified] = useState<Record<string, { correct: number; explanation: string }>>({});
  const [verifying, setVerifying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<{ score: number; total: number } | null>(null);
  const [scoring, setScoring] = useState(false);

  const q = questions[current];
  const selected = answers[q.id];
  const verification = verified[q.id];

  const handleVerify = async () => {
    if (selected === undefined) return;
    setVerifying(true);
    try {
      const result = await verifyAnswer(quizId, q.id);
      setVerified((prev) => ({
        ...prev,
        [q.id]: { correct: result.correct_index, explanation: result.explanation },
      }));
    } finally {
      setVerifying(false);
    }
  };

  const handleFinish = async () => {
    if (mode === "strict") {
      setScoring(true);
      try {
        const result = await scoreQuiz(
          quizId,
          questions.map((question) => ({
            question_id: question.id,
            selected_index: answers[question.id] ?? -1,
          }))
        );
        setFinalScore({ score: result.score, total: result.total });
      } finally {
        setScoring(false);
      }
    }
    setFinished(true);
  };

  if (finished) {
    const score = mode === "strict" && finalScore
      ? finalScore.score
      : questions.filter((question) => {
          const v = verified[question.id];
          return v && answers[question.id] === v.correct;
        }).length;
    const total = mode === "strict" && finalScore ? finalScore.total : questions.length;

    return (
      <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-stone-100">Quiz Complete</h2>
        <p className="mb-6 text-4xl font-bold text-yellow-400">
          {score} / {total}
        </p>
        <p className="mb-8 text-stone-400">
          {score === total
            ? "Perfect score!"
            : score >= total * 0.7
              ? "Great job!"
              : "Keep studying — you've got this."}
        </p>
        <button
          onClick={onBack}
          className="rounded-lg bg-yellow-400 px-6 py-2.5 text-sm font-semibold text-stone-900 hover:bg-yellow-300"
        >
          Back to chapters
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-stone-500">
            Question {current + 1} of {questions.length}
          </p>
          <p className="text-xs text-yellow-500/80">{q.chapter_title}</p>
        </div>
        <span className="rounded-full bg-stone-800 px-3 py-1 text-xs font-medium text-stone-400">
          {mode === "strict" ? "Strict mode" : "Study mode"}
        </span>
      </div>

      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-stone-800">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      <h3 className="mb-6 mt-4 text-lg font-medium leading-relaxed text-stone-100">
        {q.question}
      </h3>

      <div className="mb-6 space-y-2">
        {q.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrect = verification && idx === verification.correct;
          const isWrong = verification && isSelected && idx !== verification.correct;

          return (
            <button
              key={idx}
              onClick={() => {
                if (mode === "study" && verification) return;
                setAnswers((prev) => ({ ...prev, [q.id]: idx }));
              }}
              disabled={mode === "study" && !!verification}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                isCorrect
                  ? "border-green-500/60 bg-green-500/10 text-green-300"
                  : isWrong
                    ? "border-red-500/60 bg-red-500/10 text-red-300"
                    : isSelected
                      ? "border-yellow-500 bg-yellow-500/10 text-stone-100"
                      : "border-stone-700 text-stone-300 hover:border-stone-600"
              }`}
            >
              <span className="mr-2 font-mono text-stone-500">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {mode === "study" && verification && (
        <div className="mb-6 rounded-lg border border-stone-700 bg-stone-800/50 p-4">
          <p className="mb-1 text-xs font-semibold uppercase text-stone-500">Explanation</p>
          <p className="text-sm leading-relaxed text-stone-300">{verification.explanation}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="rounded-lg border border-stone-700 px-4 py-2 text-sm text-stone-400 hover:border-stone-600 disabled:opacity-30"
        >
          Previous
        </button>

        <div className="flex gap-2">
          {mode === "study" && !verification && (
            <button
              onClick={handleVerify}
              disabled={selected === undefined || verifying}
              className="rounded-lg border border-yellow-500/50 px-4 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-40"
            >
              {verifying ? "Checking…" : "Verify"}
            </button>
          )}

          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent((c) => c + 1)}
              disabled={
                selected === undefined ||
                (mode === "study" && !verification)
              }
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-semibold text-stone-900 hover:bg-yellow-300 disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={
                selected === undefined ||
                (mode === "study" && !verification) ||
                scoring
              }
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-semibold text-stone-900 hover:bg-yellow-300 disabled:opacity-40"
            >
              {scoring ? "Scoring…" : "Finish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
