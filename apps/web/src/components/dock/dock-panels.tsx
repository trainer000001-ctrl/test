"use client";

import { Button, ZineButton, ZineCardRough } from "@moonwitness/ui";

export function DockModeTabs({
  dockTab,
  canEditTimeline,
  createOpen,
  onSelectTab,
  onToggleCreate,
}: {
  readonly dockTab: "chronicle" | "canon";
  readonly canEditTimeline: boolean;
  readonly createOpen: boolean;
  readonly onSelectTab: (tab: "chronicle" | "canon") => void;
  readonly onToggleCreate: () => void;
}) {
  return (
    <div role="tablist" aria-label="Dock view mode" className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="plain"
        role="tab"
        aria-selected={dockTab === "chronicle"}
        onClick={() => onSelectTab("chronicle")}
        className={`min-h-11 border-2 px-4 py-2 font-mono text-xs tracking-wider transition-colors ${
          dockTab === "chronicle"
            ? "border-[var(--pink)] bg-[var(--pink)]/15 text-[var(--foreground)]"
            : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        }`}
      >
        CHRONICLE EVENTS
      </Button>
      <Button
        type="button"
        variant="plain"
        role="tab"
        aria-selected={dockTab === "canon"}
        onClick={() => onSelectTab("canon")}
        className={`min-h-11 border-2 px-4 py-2 font-mono text-xs tracking-wider transition-colors ${
          dockTab === "canon"
            ? "border-[var(--blue)] bg-[var(--blue)]/15 text-[var(--foreground)]"
            : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        }`}
      >
        CANON LORE ARCHIVE
      </Button>
      {canEditTimeline && dockTab === "chronicle" && (
        <ZineButton
          type="button"
          tone="pink"
          onClick={onToggleCreate}
          className="ml-auto min-h-11 px-4 py-2 font-mono text-xs tracking-wider"
        >
          {createOpen ? "CLOSE FORM" : "+ NEW EVENT"}
        </ZineButton>
      )}
    </div>
  );
}

export function DockChronicleError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="flex h-[45vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-brush text-xl text-[var(--primary)]">THE ARCHIVE SIGNAL WAS LOST…</p>
      <p className="text-sm text-[var(--muted-foreground)]">
        We couldn&apos;t load the timeline. Check your connection and try again.
      </p>
      <ZineButton type="button" tone="blue" onClick={onRetry} className="px-5 py-2 text-sm">
        Retry
      </ZineButton>
    </div>
  );
}

export function DockArchiveStats({
  total,
  erasCount,
  kindCount,
}: {
  readonly total: number | string;
  readonly erasCount: number;
  readonly kindCount: number;
}) {
  return (
    <section
      aria-label="Timeline archive statistics"
      className="grid grid-cols-3 gap-3 text-center"
    >
      <ZineCardRough className="p-3">
        <p className="font-brush text-2xl text-[var(--primary)]">{total}</p>
        <p className="text-[11px] tracking-widest text-[var(--foreground)]">ARCHIVE EVENTS</p>
      </ZineCardRough>
      <ZineCardRough className="p-3">
        <p className="font-brush text-2xl text-[var(--primary)]">{erasCount}</p>
        <p className="text-[11px] tracking-widest text-[var(--foreground)]">ERAS</p>
      </ZineCardRough>
      <ZineCardRough className="p-3">
        <p className="font-brush text-2xl text-[var(--primary)]">{kindCount}</p>
        <p className="text-[11px] tracking-widest text-[var(--foreground)]">EVENT TYPES</p>
      </ZineCardRough>
    </section>
  );
}
