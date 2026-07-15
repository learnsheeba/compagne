"use client";

import type { Chapter, QuizMode } from "@/lib/types";

interface ChapterSelectorProps {
  chapters: Chapter[];
  selected: Set<string>;
  mode: QuizMode;
  loading: boolean;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onModeChange: (mode: QuizMode) => void;
  onGenerate: () => void;
}

export default function ChapterSelector({
  chapters,
  selected,
  mode,
  loading,
  onToggle,
  onSelectAll,
  onModeChange,
  onGenerate,
}: ChapterSelectorProps) {
  const estimatedQuestions =
    selected.size <= 1 ? 5 : selected.size <= 3 ? selected.size * 4 : selected.size * 3;

  return (
    <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-yellow-400">Select Chapters</h2>
        <button
          onClick={onSelectAll}
          className="text-sm text-white hover:text-stone-300"
        >
          {selected.size === chapters.length ? "Deselect all" : "Select all"}
        </button>
      </div>

      <div className="mb-6 max-h-64 space-y-2 overflow-y-auto">
        {chapters.map((ch) => (
          <label
            key={ch.id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition ${
              selected.has(ch.id)
                ? "border-white/60 bg-white/10"
                : "border-stone-700 hover:border-stone-600"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(ch.id)}
              onChange={() => onToggle(ch.id)}
              className="mt-1 accent-white"
            />
            <div>
              <p className="text-sm font-medium text-stone-200">{ch.title}</p>
              <p className="text-xs text-stone-500">
                Pages {ch.page_start}–{ch.page_end}
              </p>
            </div>
          </label>
        ))}
      </div>

      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-yellow-400">Quiz Mode</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onModeChange("strict")}
            className={`rounded-lg border px-4 py-3 text-left transition ${
              mode === "strict"
                ? "border-white/70 bg-white/10"
                : "border-stone-700 hover:border-stone-600"
            }`}
          >
            <p className="text-sm font-semibold text-stone-100">Strict</p>
            <p className="text-xs text-stone-500">No hints until the end</p>
          </button>
          <button
            onClick={() => onModeChange("study")}
            className={`rounded-lg border px-4 py-3 text-left transition ${
              mode === "study"
                ? "border-white/70 bg-white/10"
                : "border-stone-700 hover:border-stone-600"
            }`}
          >
            <p className="text-sm font-semibold text-stone-100">Study</p>
            <p className="text-xs text-stone-500">Verify answers with explanations</p>
          </button>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={selected.size === 0 || loading}
        className="w-full rounded-lg bg-yellow-400 py-3 text-sm font-semibold text-stone-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading
          ? "Generating quiz…"
          : `Generate Quiz (~${estimatedQuestions} questions)`}
      </button>
    </div>
  );
}
