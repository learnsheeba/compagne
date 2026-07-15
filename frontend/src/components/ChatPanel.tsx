"use client";

import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  documentId: string;
  filename: string;
  open: boolean;
  onClose: () => void;
}

export default function ChatPanel({ documentId, filename, open, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const { reply, sources } = await sendChatMessage(documentId, text, messages);
      setMessages([...updated, { role: "assistant", content: reply, sources }]);
    } catch {
      setMessages([
        ...updated,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[400px] flex-col overflow-hidden rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between border-b border-stone-700 bg-stone-800/80 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-stone-100">Book Assistant</p>
          <p className="truncate text-xs text-stone-500">{filename}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="mb-1 text-sm font-medium text-stone-300">Ask anything about the book</p>
              <p className="text-xs text-stone-500">
                Answers are grounded in your uploaded document via LanceDB RAG.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-yellow-400 text-stone-900"
                  : "bg-stone-800 text-stone-200"
              }`}
            >
              {msg.content}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 border-t border-stone-700 pt-2">
                  <p className="text-xs text-stone-500">Sources:</p>
                  {msg.sources.map((s, j) => (
                    <p key={j} className="text-xs text-stone-500">
                      {s}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-stone-800 px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-stone-500 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-stone-500 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-stone-500 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-stone-700 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about the book…"
            className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-yellow-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="rounded-lg bg-yellow-400 px-3 py-2 text-stone-900 hover:bg-yellow-300 disabled:opacity-40"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
