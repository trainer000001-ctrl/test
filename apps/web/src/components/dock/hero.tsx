"use client";

import {
  CutoutArtwork,
  DistressedSticker,
  DnaBrandLogo,
  Grain,
  SkinArtworkFrame,
  useSkin,
} from "@moonwitness/ui";
import { Splatter, Star4 } from "@moonwitness/ui/icons";

export function DockHero({ visibleCount, total }: { visibleCount: number; total: number }) {
  const { skin } = useSkin();
  return (
    <div className="relative overflow-hidden border-b-2 border-[var(--border)] bg-[var(--background)]">
      <Grain />
      <SkinArtworkFrame
        skin={skin}
        artKey={skin === "default" ? "dock-chronicle-hero" : undefined}
        eager
        sizes="(max-width: 1024px) 100vw, 80vw"
        className="pointer-events-none absolute inset-0"
        plateClassName="object-cover object-[62%_45%] opacity-60"
        scrimClassName="bg-gradient-to-r from-[var(--background)]/95 via-[var(--background)]/70 to-[var(--background)]/25"
      />
      <Splatter className="absolute -left-6 top-4 h-32 w-32 text-[var(--primary)] opacity-60" />
      <Star4 className="absolute right-[28%] top-8 hidden h-6 w-6 text-[var(--primary)] opacity-70 md:block" />
      <CutoutArtwork
        id="tape-reel-spools"
        decorative
        className="pointer-events-none absolute right-[18%] bottom-3 z-[2] hidden h-28 w-28 text-[var(--primary)] opacity-25 md:block"
      />
      <div className="relative z-10 grid gap-6 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <DnaBrandLogo id="dock-chronicle" variant="lockup" size={24} decorative />
          </div>
          <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[var(--primary)]">
            ARCHIVE // PUBLIC RECORD
          </p>
          <h1 className="mt-2 font-brush text-4xl leading-none text-[var(--foreground)] sm:text-6xl">
            DOCK <span className="text-[var(--muted-foreground)]">//</span>{" "}
            <span className="text-[var(--primary)]">TIMELINE</span> CHRONICLE
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--foreground)]/90">
            A public chronology of projects, stories, signals, and moments across the Empire.
            Different people. Same sky. Many stories.
          </p>
          <p className="mt-2 text-[11px] font-semibold tracking-wide text-[var(--primary)]">
            STORY-WORLD DEMO DATA // NOT VERIFIED REAL-WORLD REPORTING
          </p>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-3 lg:items-end">
          <div className="hidden flex-wrap gap-2 sm:flex lg:justify-end">
            <DistressedSticker variant="hazard" text="SAME MOON DIFFERENT PEOPLE" />
            <DistressedSticker variant="barcode" code="STORIES IN MOTION" className="rotate-2" />
          </div>
          <div className="w-full shrink-0 border-2 border-[var(--secondary)] bg-[var(--secondary)] px-5 py-3 text-left text-[var(--secondary-foreground)] shadow-[4px_4px_0_rgba(0,0,0,0.6)] sm:w-auto lg:min-w-[180px] lg:text-right">
            <div className="font-brush text-4xl leading-none">
              {visibleCount}
              <span className="text-2xl">/{total}</span>
            </div>
            <div className="mt-1 font-mono text-[11px] font-bold tracking-widest">
              EVENTS VISIBLE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
