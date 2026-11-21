"use client";

import { Badge, Button, Sheet, SheetContent, SheetHeader, SheetTitle } from "@moonwitness/ui";
import type { MemoryKnowledgeRecord, MemorySourceData } from "@/lib/api/memory";

interface MemoryInspectorDrawerProps {
  record: MemoryKnowledgeRecord | null;
  sources: MemorySourceData | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function MemoryInspectorDrawer({
  record,
  sources,
  loading,
  error,
  onClose,
}: MemoryInspectorDrawerProps) {
  return (
    <Sheet
      open={Boolean(record)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        hideClose
        aria-describedby={undefined}
        className="w-full overflow-y-auto p-6 sm:max-w-lg"
      >
        {record && (
          <div className="space-y-4">
            <SheetHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div className="min-w-0">
                <Badge variant="outline">{(record.kind || "concept").toUpperCase()}</Badge>
                <SheetTitle className="mt-2 font-brush text-2xl leading-tight text-[var(--card-foreground)]">
                  {record.title}
                </SheetTitle>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close source provenance drawer"
                className="min-h-11 min-w-11 shrink-0 p-2"
              >
                ✕
              </Button>
            </SheetHeader>

            {record.content && (
              <div className="border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-relaxed text-[var(--card-foreground)]">
                {record.content}
              </div>
            )}

            <div className="space-y-2 border-t border-[var(--border)] pt-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
                SOURCE PROVENANCE MESSAGES
              </p>
              {loading && (
                <p className="font-mono text-xs text-[var(--muted-foreground)]">
                  Loading source conversation excerpts…
                </p>
              )}
              {error && (
                <p role="alert" className="border border-[var(--destructive)] p-3 text-xs">
                  {error}
                </p>
              )}
              {!loading && !error && sources && sources.messages.length === 0 && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  No direct source messages recorded for this entry.
                </p>
              )}
              {!loading &&
                !error &&
                sources?.messages.map((msg) => (
                  <div
                    key={msg.message_id}
                    className="space-y-1 border border-[var(--border)] bg-[var(--background)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--muted-foreground)]">
                      <span>
                        {msg.role.toUpperCase()} · {msg.conversation_title || msg.conversation_id}
                      </span>
                      {msg.created_at && <span>{msg.created_at}</span>}
                    </div>
                    <p className="whitespace-pre-wrap text-xs text-[var(--card-foreground)]">
                      {msg.content}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
