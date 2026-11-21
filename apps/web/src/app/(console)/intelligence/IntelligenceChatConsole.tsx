"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { SRGBL_V8_STAGES } from "@moonwitness/canon";
import { Button, Textarea, ZineButton } from "@moonwitness/ui";
import { useRiotAiChat, type RiotAiMessage, type RiotAiModel } from "@/lib/api/riot-ai";

type EpistemicFrameMode = "standard" | "srgbl-v8" | "p18-witness" | "offside-onside";

const EPISTEMIC_FRAME_OPTIONS: readonly {
  readonly id: EpistemicFrameMode;
  readonly label: string;
  readonly prefix: string;
}[] = [
  { id: "standard", label: "STANDARD PROMPT", prefix: "" },
  {
    id: "srgbl-v8",
    label: "SRGBL v8 (S1–L5)",
    prefix: `[EPISTEMIC FRAME: SRGBL v8 Pipeline — ${SRGBL_V8_STAGES.map((s) => s.stage).join(" -> ")}. Distinguish verified facts from UNKNOWN.]`,
  },
  {
    id: "p18-witness",
    label: "P18 KEY WITNESS",
    prefix:
      "[EPISTEMIC FRAME: P18 Key Witness v0 — Evaluate Artifact/Edition/Passage spine, cite provenance explicitly, never invent certainty.]",
  },
  {
    id: "offside-onside",
    label: "OFFSIDE → ONSIDE",
    prefix:
      "[EPISTEMIC FRAME: WSI Semantic Frame Audit — Expose hidden assumptions before inference and separate source category from witness claim.]",
  },
];

interface ConversationMessage extends RiotAiMessage {
  id: string;
}

interface IntelligenceChatConsoleProps {
  models: RiotAiModel[];
  modelsLoading: boolean;
  modelsError: string | null;
  permissionError: boolean;
  query: string;
  canChat: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onRefreshModels: () => void;
}

export function IntelligenceChatConsole({
  models,
  modelsLoading,
  modelsError,
  permissionError,
  query,
  canChat,
  draft,
  onDraftChange,
  onRefreshModels,
}: IntelligenceChatConsoleProps) {
  const chat = useRiotAiChat();
  const [selectedModel, setSelectedModel] = useState("");
  const [epistemicFrame, setEpistemicFrame] = useState<EpistemicFrameMode>("standard");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingRequestRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const visibleModels = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? models.filter((model) => `${model.name} ${model.id}`.toLowerCase().includes(needle))
      : models;
  }, [models, query]);
  const activeModel = models.find((model) => model.id === selectedModel);

  useEffect(() => {
    if (!canChat || models.length === 0) {
      setSelectedModel("");
      return;
    }
    if (!models.some((model) => model.id === selectedModel)) {
      setSelectedModel(models[0]?.id ?? "");
    }
  }, [canChat, models, selectedModel]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingContent]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawContent = draft.trim();
    if (!rawContent || !selectedModel || pendingRequestRef.current) return;

    const frameSpec = EPISTEMIC_FRAME_OPTIONS.find((opt) => opt.id === epistemicFrame);
    const content = frameSpec?.prefix ? `${frameSpec.prefix}\n\n${rawContent}` : rawContent;

    const nextMessages: ConversationMessage[] = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", content },
    ];
    setMessages(nextMessages);
    onDraftChange("");
    setChatError(null);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;
    pendingRequestRef.current = true;
    try {
      const response = await chat.mutateAsync({
        model: selectedModel,
        messages: nextMessages.map(({ role, content: messageContent }) => ({
          role,
          content: messageContent,
        })),
        signal: controller.signal,
        onContent: (chunk) => setStreamingContent((current) => current + chunk),
      });
      const answer = response.choices[0]?.message.content ?? "";
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: answer },
      ]);
      setStreamingContent("");
    } catch (error) {
      if (!controller.signal.aborted) {
        setChatError(error instanceof Error ? error.message : "Inference request failed.");
      }
      setStreamingContent("");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        pendingRequestRef.current = false;
      }
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)]">
      <div className="border-2 border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-3">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
              APPROVED CATALOG
            </p>
            <h2 className="mt-1 font-brush text-xl text-[var(--foreground)]">Models</h2>
          </div>
          <span className="font-mono text-xs text-[var(--muted-foreground)]">
            {visibleModels.length} shown
          </span>
        </div>
        {modelsLoading ? (
          <p className="p-5 text-sm text-[var(--muted-foreground)]" role="status">
            Loading approved models…
          </p>
        ) : modelsError ? (
          <div className="p-5" role="alert">
            <p className="font-brush text-lg text-[var(--primary)]">
              {permissionError ? "OPERATOR ACCESS REQUIRED" : "MODEL LIST UNAVAILABLE"}
            </p>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              {permissionError
                ? "Sign in with an authorized operator account to view approved models."
                : modelsError}
            </p>
            {!permissionError && (
              <Button
                type="button"
                variant="link"
                onClick={onRefreshModels}
                className="mt-3 h-auto min-h-11 p-0 text-xs"
              >
                Retry model list
              </Button>
            )}
          </div>
        ) : !canChat ? (
          <p className="p-5 text-sm text-[var(--muted-foreground)]">
            Editor or administrator access is required to view approved models and chat.
          </p>
        ) : visibleModels.length === 0 ? (
          <p className="p-5 text-sm text-[var(--muted-foreground)]">
            {models.length === 0
              ? "No approved models are available. Configure RIOT_AI_MODEL and verify the inference runtime."
              : "No approved models match this search."}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {visibleModels.map((model) => (
              <li key={model.id}>
                <Button
                  type="button"
                  variant="plain"
                  aria-pressed={selectedModel === model.id}
                  onClick={() => setSelectedModel(model.id)}
                  disabled={!canChat}
                  className={`min-h-16 w-full flex-col items-start justify-center gap-0 px-4 py-3 text-left transition-colors hover:bg-white/5 disabled:cursor-default ${
                    selectedModel === model.id ? "border-l-4 border-[var(--pink)] bg-white/5" : ""
                  }`}
                >
                  <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                    {model.name}
                  </span>
                  <span className="mt-1 block truncate font-mono text-[10px] text-[var(--muted-foreground)]">
                    {model.id} · {model.provider}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-h-[32rem] flex-col border-2 border-[var(--border)] bg-[var(--card)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--border)] px-4 py-3">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
              SECURE SESSION
            </p>
            <h2 className="mt-1 font-brush text-xl text-[var(--foreground)]">Inference console</h2>
          </div>
          <span className="max-w-48 truncate rounded-full border border-[var(--border)] px-3 py-1 font-mono text-[10px] text-[var(--muted-foreground)]">
            {activeModel?.id ?? "NO MODEL SELECTED"}
          </span>
        </div>

        <div
          className="flex-1 space-y-4 overflow-y-auto p-4"
          aria-label="Conversation"
          aria-live="polite"
        >
          {messages.length === 0 && !streamingContent && (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <p className="font-brush text-2xl text-[var(--foreground)]">READY WHEN YOU ARE</p>
              <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">
                Select an approved model and send a prompt to begin a private inference session.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[90%] whitespace-pre-wrap break-words border-2 p-3 text-sm ${
                message.role === "user"
                  ? "ml-auto border-[var(--blue)]/50 bg-[var(--blue)]/10 text-[var(--foreground)]"
                  : "mr-auto border-[var(--border)] bg-[var(--muted)]/60 text-[var(--foreground)]"
              }`}
            >
              <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                {message.role}
              </p>
              {message.content}
            </article>
          ))}
          {(chat.isPending || streamingContent) && (
            <article className="mr-auto max-w-[90%] whitespace-pre-wrap break-words border-2 border-[var(--border)] bg-[var(--muted)]/60 p-3 text-sm text-[var(--foreground)]">
              <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                assistant
              </p>
              {streamingContent || (
                <span className="animate-pulse text-[var(--muted-foreground)]">Thinking…</span>
              )}
            </article>
          )}
          <div ref={endRef} />
        </div>

        {chatError && (
          <div
            className="mx-4 mb-3 border border-[var(--red)]/50 bg-[var(--red)]/10 p-3 text-sm text-[var(--red)]"
            role="alert"
          >
            {chatError}
          </div>
        )}

        <form onSubmit={submitMessage} className="border-t-2 border-[var(--border)] p-4">
          <div
            className="mb-3 flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Epistemic prompt framing"
          >
            <span className="mr-1 font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
              FRAME:
            </span>
            {EPISTEMIC_FRAME_OPTIONS.map((opt) => (
              <Button
                key={opt.id}
                type="button"
                variant="plain"
                aria-pressed={epistemicFrame === opt.id}
                onClick={() => setEpistemicFrame(opt.id)}
                className={`min-h-8 border px-2.5 py-1 font-mono text-[10px] tracking-wider transition-colors ${
                  epistemicFrame === opt.id
                    ? "border-[var(--blue)] bg-[var(--blue)]/20 text-[var(--foreground)]"
                    : "border-[var(--border)] bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <label htmlFor="riot-ai-prompt" className="sr-only">
            Message the selected inference model
          </label>
          <Textarea
            id="riot-ai-prompt"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            maxLength={48_000}
            rows={3}
            placeholder={
              selectedModel ? "Write a message… (Enter to send)" : "No approved model available"
            }
            disabled={!canChat || !selectedModel || chat.isPending || pendingRequestRef.current}
            className="min-h-20 w-full resize-y border-2 border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Shift+Enter for a new line · up to 48,000 characters
            </p>
            {chat.isPending || pendingRequestRef.current ? (
              canChat && (
                <ZineButton
                  type="button"
                  tone="pink"
                  onClick={() => abortRef.current?.abort()}
                  className="min-h-11 border-red-400 px-5 py-2 text-xs text-red-300"
                >
                  STOP GENERATION
                </ZineButton>
              )
            ) : (
              <ZineButton
                type="submit"
                tone="pink"
                disabled={!canChat || !draft.trim() || !selectedModel}
                className="min-h-11 px-5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                SEND PROMPT
              </ZineButton>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
