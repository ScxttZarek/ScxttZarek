"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useChat } from "@livekit/components-react";
import { MessageCircleMore, Scissors, Send, Sparkles, X } from "lucide-react";
import { CHAT_MAX } from "@/lib/constants";
import { reservedAvatarForBadge } from "@/lib/reserved-profile";
import { sanitizeChatMessage } from "@/lib/utils";

type Badge = "creator" | "editor";

function badgeOf(metadata?: string): Badge | undefined {
  if (!metadata) return undefined;
  try {
    const value = JSON.parse(metadata) as { badge?: Badge };
    return value.badge;
  } catch {
    return undefined;
  }
}

function senderStyle(badge?: Badge) {
  if (badge === "creator") return "text-violet-300";
  if (badge === "editor") return "text-cyan-300";
  return "text-zinc-200";
}

function fallbackInitial(name: string) {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

function MessageBody({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/gi);
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.55] text-zinc-300">
      {parts.map((part, index) =>
        /^https?:\/\//i.test(part) ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noreferrer noopener"
            className="text-violet-300 underline decoration-violet-300/30 underline-offset-2 transition hover:text-violet-200"
          >
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

export function ChatPanel({
  open,
  onClose,
  onUnread,
}: {
  open: boolean;
  onClose: () => void;
  onUnread: (count: number) => void;
}) {
  const { chatMessages, send, isSending } = useChat();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const previousLength = useRef(0);

  useEffect(() => {
    const delta = chatMessages.length - previousLength.current;
    if (delta > 0 && !open) onUnread(delta);
    previousLength.current = chatMessages.length;

    if (open) {
      onUnread(0);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }, [chatMessages.length, open, onUnread]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = sanitizeChatMessage(message);
    if (!clean || isSending) return;

    try {
      setError("");
      await send(clean);
      setMessage("");
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch {
      setError("Não foi possível enviar a mensagem.");
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <aside
      className={[
        "lumacall-chat-panel absolute bottom-3 right-3 top-3 z-30 flex w-[344px] flex-col overflow-hidden rounded-[22px] border border-white/[.08] bg-[#0b0c10]/95 shadow-2xl shadow-black/35 backdrop-blur-xl transition duration-200",
        open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-5 opacity-0",
      ].join(" ")}
      aria-hidden={!open}
    >
      <header className="flex h-[66px] shrink-0 items-center justify-between border-b border-white/[.07] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-violet-300/10 bg-violet-300/[.07] text-violet-300">
            <MessageCircleMore className="size-[17px]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-[-.01em] text-zinc-100">Chat da sala</h2>
            <p className="text-[10px] text-zinc-500">Mensagens em tempo real</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring grid size-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/[.06] hover:text-zinc-200"
          aria-label="Fechar chat"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {chatMessages.length === 0 ? (
          <div className="grid h-full min-h-[220px] place-items-center">
            <div className="max-w-[230px] text-center">
              <div className="mx-auto grid size-11 place-items-center rounded-2xl border border-white/[.07] bg-white/[.025] text-zinc-600">
                <MessageCircleMore className="size-5" />
              </div>
              <p className="mt-3 text-xs font-medium text-zinc-300">Ainda não tem mensagem por aqui.</p>
              <p className="mt-1 text-[10px] leading-4 text-zinc-600">Manda um oi — só quem está na sala recebe.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {chatMessages.map((item, index) => {
              const badge = badgeOf(item.from?.metadata);
              const avatar = reservedAvatarForBadge(badge);
              const name = item.from?.name || "Participante";
              const own = Boolean(item.from?.isLocal);
              const time = new Intl.DateTimeFormat("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(item.timestamp));

              return (
                <article
                  key={`${item.timestamp}-${index}`}
                  className="group flex gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[.025]"
                >
                  <div className="mt-0.5 shrink-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt=""
                        className={[
                          "size-9 rounded-full object-cover ring-2",
                          badge === "creator" ? "ring-violet-400/45" : "ring-cyan-400/45",
                        ].join(" ")}
                      />
                    ) : (
                      <div className="grid size-9 place-items-center rounded-full border border-white/[.07] bg-white/[.04] text-[11px] font-semibold text-zinc-400">
                        {fallbackInitial(name)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex min-w-0 items-center gap-1.5">
                      <span className={`truncate text-[12px] font-bold ${senderStyle(badge)}`}>
                        {name}{own ? " (você)" : ""}
                      </span>

                      {badge === "creator" && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-300/25 bg-violet-400/[.12] px-2 py-0.5 text-[8px] font-bold tracking-[.08em] text-violet-100">
                          <Sparkles className="size-2.5" /> CRIADOR
                        </span>
                      )}

                      {badge === "editor" && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-400/[.12] px-2 py-0.5 text-[8px] font-bold tracking-[.08em] text-cyan-100">
                          <Scissors className="size-2.5" /> EDITOR
                        </span>
                      )}

                      <time className="ml-auto shrink-0 text-[9px] tabular-nums text-zinc-600">{time}</time>
                    </div>

                    <MessageBody text={item.message} />
                  </div>
                </article>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form ref={formRef} onSubmit={submit} className="shrink-0 border-t border-white/[.07] bg-black/20 p-3">
        <div className="rounded-2xl border border-white/[.08] bg-black/30 p-2 transition focus-within:border-violet-300/25 focus-within:bg-black/40">
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value.slice(0, CHAT_MAX));
              setError("");
            }}
            onKeyDown={keyDown}
            maxLength={CHAT_MAX}
            rows={2}
            placeholder="Mensagem para a sala..."
            className="scrollbar-thin block max-h-28 min-h-[48px] w-full resize-none bg-transparent px-1.5 py-1 text-[13px] leading-5 text-zinc-200 outline-none placeholder:text-zinc-650"
          />
          <div className="mt-1 flex items-center justify-between gap-2 px-1">
            <div>
              {error ? (
                <span className="text-[9px] text-red-300">{error}</span>
              ) : (
                <span className="text-[9px] text-zinc-650">
                  Enter envia <span className="text-zinc-700">•</span> Shift + Enter quebra linha
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] tabular-nums text-zinc-700">{message.length}/{CHAT_MAX}</span>
              <button
                type="submit"
                disabled={isSending || !sanitizeChatMessage(message)}
                className="focus-ring grid size-8 place-items-center rounded-lg bg-violet-300 text-zinc-950 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Enviar mensagem"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </aside>
  );
}
