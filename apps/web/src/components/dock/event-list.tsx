"use client";

import type { TimelineEvent } from "@moonwitness/contracts/types";
import { Crown } from "@moonwitness/ui/icons";
import { Button, EventCard, ZineCardRough } from "@moonwitness/ui";

interface EventListProps {
  events: TimelineEvent[];
  total: number;
  pageStart: number;
  pageEnd: number;
  page: number;
  totalPages: number;
  view: "grid" | "list";
  selectedId: string | null;
  query: string;
  onOpen: (id: string) => void;
  onReset: () => void;
  onPageChange: (page: number) => void;
}

export function EventList(props: EventListProps) {
  return <EventListInner {...props} />;
}

function EventListInner({
  events,
  total,
  pageStart,
  pageEnd,
  page,
  totalPages,
  view,
  selectedId,
  query,
  onOpen,
  onReset,
  onPageChange,
}: EventListProps) {
  return (
    <section aria-label="Events">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-brush text-xl text-[var(--foreground)]">
          <Crown className="h-5 w-8 text-[var(--primary)]" /> EVENTS
          <span className="ml-2 hidden text-[10px] font-normal tracking-widest text-[var(--muted-foreground)] sm:inline">
            KEY MOMENTS, PROJECTS, AND SIGNALS FROM ACROSS THE EMPIRE.
          </span>
        </h2>
        <span className="text-[11px] text-[var(--muted-foreground)]" aria-live="polite">
          Showing {pageStart}–{pageEnd} of {total} events
        </span>
      </div>
      {events.length === 0 ? (
        <ZineCardRough className="p-10 text-center">
          <p className="font-brush text-xl text-[var(--muted-foreground)]">NO SIGNALS FOUND.</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Nothing matches “{query}” in this era. Try another frequency.
          </p>
          <Button onClick={onReset} className="mt-4">
            RESET FILTERS
          </Button>
        </ZineCardRough>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              selected={selectedId === ev.id}
              list={false}
              onOpen={() => onOpen(ev.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              selected={selectedId === ev.id}
              list
              onOpen={() => onOpen(ev.id)}
            />
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-4" aria-label="Timeline pages">
          <Button
            type="button"
            variant="outline"
            className="px-4 py-2 text-xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-[var(--muted-foreground)]" aria-current="page">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            className="px-4 py-2 text-xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </section>
  );
}
