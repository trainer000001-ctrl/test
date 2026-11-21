"use client";

import { useState, type FormEvent } from "react";
import { Button, CassetteRecorderArt, Input, SkinOrnament, ZineButton } from "@moonwitness/ui";
import { MemoryTapeNode } from "@moonwitness/ui/icons";
import {
  formatMemoryContextPrompt,
  getMemoryExportUrl,
  useMemoryKnowledge,
  useMemoryStatus,
  type MemoryKnowledgeRecord,
} from "@/lib/api/memory";

interface ArchiveMemoryBridgeProps {
  onAttachContext: (snippet: string) => void;
}

export function ArchiveMemoryBridge({ onAttachContext }: ArchiveMemoryBridgeProps) {
  const status = useMemoryStatus();
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [attachedId, setAttachedId] = useState<string | null>(null);

  const bridgeConfigured = status.data?.configured ?? false;
  const bridgeReachable = status.data?.reachable ?? false;
  const knowledge = useMemoryKnowledge(submittedQuery, bridgeConfigured && bridgeReachable, 8);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(searchInput.trim());
  }

  function handleAttach(record: MemoryKnowledgeRecord) {
    onAttachContext(formatMemoryContextPrompt(record));
    setAttachedId(record.id);
  }

  const badgeText = status.isLoading
    ? "CHECKING BRIDGE"
    : status.isError
      ? "BRIDGE UNAVAILABLE"
      : !bridgeConfigured
        ? "OPTIONAL / NOT CONFIGURED"
        : bridgeReachable
          ? `ONLINE · ${status.data?.counts?.knowledge ?? 0} RECORDS`
          : "CONFIGURED / OFFLINE";

  return (
    <section
      aria-label="Archive memory bridge"
      className="relative overflow-hidden border-2 border-[var(--border)] bg-[var(--card)] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MemoryTapeNode className="h-4 w-4 text-[var(--primary)]" />
            <p className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
              SOVEREIGN KNOWLEDGE BRIDGE · /MEMORY VAULT
            </p>
            <SkinOrnament slot="tag" label="MEMORY BRIDGE" />
          </div>
          <h2 className="mt-1 font-brush text-2xl text-[var(--foreground)]">Archive Memory</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Search distilled knowledge from local ChatGPT archives and attach verified context into
            your inference prompt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`border px-2.5 py-1 font-mono text-[10px] tracking-wider ${
              bridgeReachable
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"
            }`}
            role="status"
          >
            {badgeText}
          </span>
          {bridgeConfigured && bridgeReachable && (
            <a
              href={getMemoryExportUrl()}
              download="moonwitness-knowledge.ndjson"
              className="inline-flex min-h-11 items-center border border-[var(--border)] px-3 py-2 font-mono text-[10px] tracking-wider text-[var(--foreground)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]"
            >
              EXPORT NDJSON
            </a>
          )}
        </div>
      </div>

      {status.isError ? (
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">
          Archive memory bridge could not be queried right now. Core inference controls above remain
          available.
        </p>
      ) : !bridgeConfigured ? (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <CassetteRecorderArt className="h-16 w-16 shrink-0 opacity-85" decorative />
          <div className="min-w-0 flex-1 space-y-2">
            <p>
              Set <code className="font-mono text-[var(--foreground)]">MEMORY_API_URL</code> (for
              example{" "}
              <code className="font-mono text-[var(--foreground)]">http://127.0.0.1:8000</code>) on{" "}
              <code className="font-mono text-[var(--foreground)]">@moonwitness/api</code> to enable
              archive knowledge search from this console.
            </p>
            <p className="font-mono text-[11px] text-[var(--muted-foreground)]">
              Vault ingest: launch <span className="text-[var(--foreground)]">services/memory</span>{" "}
              stack (port 3005 / API 8000) and upload{" "}
              <span className="text-[var(--foreground)]">chatgpt_mohrezzafahlevi.zip</span>.
            </p>
          </div>
        </div>
      ) : !bridgeReachable ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--primary)]">
            {status.data?.error ?? "Archive memory backend is offline."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void status.refetch()}
            className="min-h-11 px-3 py-2 font-mono text-[10px] tracking-wider hover:border-[var(--blue)]"
          >
            RETRY BRIDGE
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {status.data?.counts && (
            <dl className="grid gap-3 sm:grid-cols-4">
              <div className="border border-[var(--border)] bg-[var(--muted)]/60 px-3 py-2">
                <dt className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
                  ARCHIVES
                </dt>
                <dd className="mt-1 font-brush text-lg text-[var(--foreground)]">
                  {status.data.counts.archives}
                </dd>
              </div>
              <div className="border border-[var(--border)] bg-[var(--muted)]/60 px-3 py-2">
                <dt className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
                  MESSAGES
                </dt>
                <dd className="mt-1 font-brush text-lg text-[var(--foreground)]">
                  {status.data.counts.messages}
                </dd>
              </div>
              <div className="border border-[var(--border)] bg-[var(--muted)]/60 px-3 py-2">
                <dt className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
                  KNOWLEDGE
                </dt>
                <dd className="mt-1 font-brush text-lg text-[var(--foreground)]">
                  {status.data.counts.knowledge}
                </dd>
              </div>
              <div className="border border-[var(--border)] bg-[var(--muted)]/60 px-3 py-2">
                <dt className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
                  EMBEDDINGS
                </dt>
                <dd className="mt-1 font-mono text-xs text-[var(--foreground)]">
                  {status.data.system?.embeddings_enabled
                    ? status.data.system.embedding_model
                    : "FTS ONLY"}
                </dd>
              </div>
            </dl>
          )}

          <form
            onSubmit={submitSearch}
            className="flex flex-wrap items-center gap-2"
            aria-label="Search archive knowledge"
          >
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search archive knowledge, decisions, architecture..."
              aria-label="Search archive knowledge"
              className="min-h-11 min-w-0 flex-1 border-2 border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--blue)] focus:outline-none"
            />
            <ZineButton
              type="submit"
              tone="blue"
              disabled={knowledge.isFetching}
              className="min-h-11 px-4 py-2 text-xs disabled:opacity-50"
            >
              {knowledge.isFetching ? "SEARCHING..." : "SEARCH MEMORY"}
            </ZineButton>
            {submittedQuery && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setSubmittedQuery("");
                }}
                className="min-h-11 px-3 py-2 font-mono text-[10px] tracking-wider hover:border-[var(--primary)]"
              >
                CLEAR
              </Button>
            )}
          </form>

          {knowledge.isLoading ? (
            <p className="text-xs text-[var(--muted-foreground)]" role="status">
              Loading archive knowledge...
            </p>
          ) : knowledge.isError ? (
            <p className="text-xs text-[var(--primary)]" role="alert">
              {knowledge.error instanceof Error
                ? knowledge.error.message
                : "Could not load archive knowledge."}
            </p>
          ) : !knowledge.data || knowledge.data.records.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]" role="status">
              {submittedQuery
                ? `No archive knowledge matched "${submittedQuery}".`
                : "No distilled archive knowledge records yet."}
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {knowledge.data.records.map((record) => (
                <li
                  key={record.id}
                  className="flex min-w-0 flex-col justify-between gap-3 border border-[var(--border)] bg-[var(--muted)]/60 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)]">
                        {record.kind}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                        {Math.round(record.confidence * 100)}% conf
                      </span>
                    </div>
                    <h3 className="mt-1 break-words text-sm font-semibold text-[var(--foreground)]">
                      {record.title}
                    </h3>
                    {(record.summary || record.content) && (
                      <p className="mt-1 line-clamp-3 break-words text-xs text-[var(--muted-foreground)]">
                        {record.summary || record.content}
                      </p>
                    )}
                    {record.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {record.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAttach(record)}
                      className="min-h-11 px-3 py-1.5 font-mono text-[10px] tracking-wider hover:border-[var(--pink)] hover:text-[var(--foreground)]"
                    >
                      {attachedId === record.id ? "ATTACHED TO PROMPT" : "ATTACH TO PROMPT"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
