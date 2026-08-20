"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api-client";

type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
};

const POLL_MS = 3000;

export default function ChatPanel({ rideId }: { rideId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/rides/${rideId}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
  }, [rideId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, then polling
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setError(null);
    const res = await apiFetch(`/api/rides/${rideId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? "전송에 실패했습니다.");
      return;
    }
    setText("");
    setMessages((prev) => [...prev, data.message]);
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white">
      <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">채팅</p>
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && <p className="text-sm text-slate-400">아직 메시지가 없습니다.</p>}
        {messages.map((m) => {
          const mine = m.sender.id === user?.id;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && <span className="mb-0.5 text-xs text-slate-400">{m.sender.name}</span>}
              <span
                className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                {m.content}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={onSend} className="flex gap-2 border-t border-slate-100 p-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지를 입력하세요"
          maxLength={1000}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-400"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          전송
        </button>
      </form>
      {error && <p className="px-4 pb-2 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
