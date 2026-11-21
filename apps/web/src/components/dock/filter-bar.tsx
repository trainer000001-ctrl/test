"use client";

import { Grid, List } from "@moonwitness/ui/icons";

import type { Era, EraId } from "@moonwitness/contracts/types";
import { Button, cn, NativeSelect } from "@moonwitness/ui";

export type SortKey = "newest" | "oldest";

interface FilterBarProps {
  eras: Era[];
  era: EraId | "all";
  onEraChange: (era: EraId | "all") => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
}

export function FilterBar({
  eras,
  era,
  onEraChange,
  sort,
  onSortChange,
  view,
  onViewChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 border-2 border-[var(--border)] bg-[var(--card)] p-3 lg:flex-row lg:flex-nowrap lg:items-center">
      <span className="shrink-0 font-brush text-sm text-[var(--card-foreground)]">
        FILTER BY ERA
      </span>

      <div
        className="flex flex-wrap gap-1.5 lg:flex-nowrap lg:overflow-x-auto"
        role="group"
        aria-label="Filter by era"
      >
        <Button
          type="button"
          variant="plain"
          onClick={() => onEraChange("all")}
          aria-pressed={era === "all"}
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] transition-colors max-lg:min-h-11",
            era === "all"
              ? "border-[var(--primary)] bg-[var(--primary)] font-bold text-[var(--primary-foreground)]"
              : "border-[var(--border)] text-[var(--card-foreground)] hover:border-[var(--muted-foreground)]",
          )}
        >
          All Eras
        </Button>
        {eras.map((e) => (
          <Button
            key={e.id}
            type="button"
            variant="plain"
            onClick={() => onEraChange(era === e.id ? "all" : e.id)}
            aria-pressed={era === e.id}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-colors max-lg:min-h-11",
              era === e.id
                ? "font-bold text-[var(--card-foreground)]"
                : "border-[var(--border)] text-[var(--card-foreground)] hover:border-[var(--muted-foreground)]",
            )}
            style={era === e.id ? { borderColor: e.color, background: `${e.color}33` } : undefined}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.color }} />
            {e.name}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:flex-nowrap">
        <label className="sr-only" htmlFor="dock-sort">
          Sort events
        </label>
        <NativeSelect
          id="dock-sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="zine-input rounded-md px-3 py-1.5 text-[11px] max-lg:min-h-11"
        >
          <option value="newest">Sort: Newest First</option>
          <option value="oldest">Sort: Oldest First</option>
        </NativeSelect>

        <div
          className="flex rounded-md border border-[var(--border)]"
          role="group"
          aria-label="View mode"
        >
          <Button
            type="button"
            variant="plain"
            onClick={() => onViewChange("grid")}
            aria-pressed={view === "grid"}
            aria-label="Grid view"
            className={cn(
              "inline-flex items-center justify-center rounded-none px-2.5 py-1.5 max-lg:min-h-11 max-lg:min-w-11",
              view === "grid"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]",
            )}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="plain"
            onClick={() => onViewChange("list")}
            aria-pressed={view === "list"}
            aria-label="List view"
            className={cn(
              "inline-flex items-center justify-center rounded-none px-2.5 py-1.5 max-lg:min-h-11 max-lg:min-w-11",
              view === "list"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]",
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
