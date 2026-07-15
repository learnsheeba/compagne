"use client";

import { useCallback, useState } from "react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  loading: boolean;
}

export default function UploadZone({ onUpload, loading }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") onUpload(file);
    },
    [onUpload]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 transition-all ${
        dragOver
          ? "border-yellow-500 bg-yellow-500/10"
          : "border-stone-600 bg-stone-900/50 hover:border-stone-500"
      }`}
    >
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
          <p className="text-stone-300">Indexing document into LanceDB…</p>
          <p className="text-sm text-stone-500">Extracting chapters and building vectors</p>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-full bg-yellow-500/20 p-4">
            <svg className="h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="mb-2 text-lg font-medium text-stone-200">Drop your PDF here</p>
          <p className="mb-6 text-sm text-stone-500">or click to browse</p>
          <label className="cursor-pointer rounded-lg bg-yellow-400 px-6 py-2.5 text-sm font-semibold text-stone-900 transition hover:bg-yellow-300">
            Choose PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
          </label>
        </>
      )}
    </div>
  );
}
