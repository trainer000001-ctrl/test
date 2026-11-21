"use client";

import type { Era, TimelineEvent } from "@moonwitness/contracts/types";
import { EventDetail, Sheet, SheetContent, SheetTitle, ZineButton } from "@moonwitness/ui";
import type { TimelineEventAuditEntry } from "@/lib/api/timeline";

interface EventDetailPanelProps {
  variant: "aside" | "drawer";
  event: TimelineEvent;
  era: Era;
  relatedEvents: TimelineEvent[];
  shareUrl: string;
  onRelated: (id: string) => void;
  onClose?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  mutating?: boolean;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  historyEntries?: TimelineEventAuditEntry[];
  historyLoading?: boolean;
}

export function EventDetailPanel({
  variant,
  event,
  era,
  relatedEvents,
  shareUrl,
  onRelated,
  onClose,
  canEdit = false,
  canDelete = false,
  mutating = false,
  onArchive,
  onDelete,
  historyEntries,
  historyLoading = false,
}: EventDetailPanelProps) {
  const customAttrs = (event as TimelineEvent & { _attrs?: Record<string, unknown> })._attrs;
  const customEntries = customAttrs ? Object.entries(customAttrs) : [];

  const detail = (
    <div className="flex h-full flex-col overflow-y-auto border-2 border-[var(--border)] bg-[var(--card)]">
      <EventDetail
        event={event}
        era={era}
        relatedEvents={relatedEvents}
        shareUrl={shareUrl}
        onRelated={onRelated}
        onClose={onClose}
      />

      {customEntries.length > 0 && (
        <div className="border-t border-[var(--border)] bg-[var(--background)]/60 p-4">
          <p className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
            CUSTOM ATTRIBUTES
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px]">
            {customEntries.map(([key, value]) => (
              <div key={key} className="border border-[var(--border)] px-2 py-1">
                <dt className="text-[10px] uppercase text-[var(--muted-foreground)]">{key}</dt>
                <dd className="truncate text-[var(--foreground)]">{String(value ?? "—")}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {(canEdit || canDelete || (historyEntries && historyEntries.length > 0)) && (
        <div className="space-y-3 border-t-2 border-[var(--border)] bg-[var(--muted)]/55 p-4">
          {(canEdit || canDelete) && (
            <div className="flex flex-wrap gap-2">
              {canEdit && onArchive && (
                <ZineButton
                  type="button"
                  tone="yellow"
                  disabled={mutating}
                  onClick={() => onArchive(event.id)}
                  className="min-h-10 px-3 py-1.5 text-[11px] disabled:opacity-50"
                >
                  ARCHIVE EVENT
                </ZineButton>
              )}
              {canDelete && onDelete && (
                <ZineButton
                  type="button"
                  tone="pink"
                  disabled={mutating}
                  onClick={() => onDelete(event.id)}
                  className="min-h-10 border-red-400 px-3 py-1.5 text-[11px] text-red-300 disabled:opacity-50"
                >
                  DELETE EVENT
                </ZineButton>
              )}
            </div>
          )}

          <div>
            <p className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
              AUDIT HISTORY
            </p>
            {historyLoading ? (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Loading history…</p>
            ) : !historyEntries || historyEntries.length === 0 ? (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                No recorded mutations for this event.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 font-mono text-[11px] text-[var(--foreground)]">
                {historyEntries.slice(0, 6).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5"
                  >
                    <span>
                      <strong className="text-[var(--primary)]">{entry.action}</strong> v
                      {entry.entity_version}
                    </span>
                    <span className="truncate text-[10px] text-[var(--muted-foreground)]">
                      {entry.changed_by ?? entry.source} ·{" "}
                      {new Date(entry.changed_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "aside") {
    return (
      <aside className="hidden xl:block" aria-label="Event detail">
        <div className="sticky top-20 h-[calc(100vh-6rem)]">{detail}</div>
      </aside>
    );
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <SheetContent
        side="right"
        hideClose
        aria-describedby={undefined}
        aria-label="Event detail"
        className="w-full max-w-md sm:max-w-md p-0 xl:hidden overflow-y-auto"
      >
        <SheetTitle className="sr-only">Event detail</SheetTitle>
        {detail}
      </SheetContent>
    </Sheet>
  );
}
