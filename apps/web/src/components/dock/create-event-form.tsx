"use client";

import type { FormEvent } from "react";
import type { EraId, EventKind } from "@moonwitness/contracts/types";
import { Input, NativeSelect, Textarea, ZineButton, ZineCardRough } from "@moonwitness/ui";

export interface DockCreateEventFormProps {
  title: string;
  kind: EventKind;
  era: EraId;
  date: string;
  location: string;
  tags: string;
  excerpt: string;
  body: string;
  pending: boolean;
  onTitleChange: (value: string) => void;
  onKindChange: (value: EventKind) => void;
  onEraChange: (value: EraId) => void;
  onDateChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onExcerptChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function DockCreateEventForm({
  title,
  kind,
  era,
  date,
  location,
  tags,
  excerpt,
  body,
  pending,
  onTitleChange,
  onKindChange,
  onEraChange,
  onDateChange,
  onLocationChange,
  onTagsChange,
  onExcerptChange,
  onBodyChange,
  onSubmit,
}: DockCreateEventFormProps) {
  return (
    <ZineCardRough asChild className="space-y-4 p-5">
      <form onSubmit={onSubmit} aria-label="Create timeline event">
        <div className="flex items-center justify-between">
          <h2 className="font-brush text-2xl text-[var(--foreground)]">
            NEW <span className="text-[var(--primary)]">TIMELINE EVENT</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-[var(--foreground)]">
            <span className="mb-1 block font-mono text-[10px] tracking-widest">TITLE *</span>
            <Input
              type="text"
              required
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Relay Node Activated"
              className="min-h-10 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
            />
          </label>
          <label className="text-xs text-[var(--foreground)]">
            <span className="mb-1 block font-mono text-[10px] tracking-widest">KIND *</span>
            <NativeSelect
              value={kind}
              onChange={(e) => onKindChange(e.target.value as EventKind)}
              className="min-h-10 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
            >
              <option value="PROJECT">PROJECT</option>
              <option value="STORY">STORY</option>
              <option value="SIGNAL">SIGNAL</option>
              <option value="WORLD">WORLD</option>
              <option value="PEOPLE">PEOPLE</option>
              <option value="RESEARCH">RESEARCH</option>
            </NativeSelect>
          </label>
          <label className="text-xs text-[var(--foreground)]">
            <span className="mb-1 block font-mono text-[10px] tracking-widest">ERA *</span>
            <NativeSelect
              value={era}
              onChange={(e) => onEraChange(e.target.value as EraId)}
              className="min-h-10 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
            >
              <option value="origins">origins</option>
              <option value="neon">neon</option>
              <option value="fracture">fracture</option>
              <option value="rebuilding">rebuilding</option>
              <option value="expansions">expansions</option>
            </NativeSelect>
          </label>
          <label className="text-xs text-[var(--foreground)]">
            <span className="mb-1 block font-mono text-[10px] tracking-widest">DATE *</span>
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="min-h-10 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-[var(--foreground)]">
            <span className="mb-1 block font-mono text-[10px] tracking-widest">LOCATION</span>
            <Input
              type="text"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="Jakarta / Relay Sector 4"
              className="min-h-10 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
            />
          </label>
          <label className="text-xs text-[var(--foreground)]">
            <span className="mb-1 block font-mono text-[10px] tracking-widest">
              TAGS (comma separated)
            </span>
            <Input
              type="text"
              value={tags}
              onChange={(e) => onTagsChange(e.target.value)}
              placeholder="signal, archive, release"
              className="min-h-10 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
            />
          </label>
        </div>
        <label className="block text-xs text-[var(--foreground)]">
          <span className="mb-1 block font-mono text-[10px] tracking-widest">EXCERPT</span>
          <Input
            type="text"
            value={excerpt}
            onChange={(e) => onExcerptChange(e.target.value)}
            placeholder="Short one-line summary for card view"
            className="min-h-10 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
          />
        </label>
        <label className="block text-xs text-[var(--foreground)]">
          <span className="mb-1 block font-mono text-[10px] tracking-widest">BODY</span>
          <Textarea
            rows={3}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder="Full chronicle details…"
            className="min-h-0 w-full border-2 border-[var(--border)] bg-[var(--background)] p-3 text-xs text-[var(--foreground)]"
          />
        </label>
        <div className="flex justify-end gap-2">
          <ZineButton
            type="submit"
            tone="pink"
            disabled={pending}
            className="min-h-10 px-5 py-2 text-xs"
          >
            {pending ? "SAVING…" : "PUBLISH EVENT"}
          </ZineButton>
        </div>
      </form>
    </ZineCardRough>
  );
}
