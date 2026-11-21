"use client";

import { Button } from "@moonwitness/ui";
import {
  NAVIGATION_TABS,
  WORLD_DOMAINS,
  type NavigationSectionId,
  type WorldIdentifier,
} from "@/data/empire-registry";
import { DiamondStarOrnament, SearchLensIcon } from "./sacred-icons";

/**
 * Slim Vertical Observatory Meridian Spine anchored cleanly inside the outer right gutter
 * on wide viewports (>=1400px), leaving centered max-w-7xl cards 100% unobstructed.
 */
export function CelestialHudCapsule({
  activeNavTab,
  activeWorldId,
  pageScrollFraction,
  onNavigateSection,
  onJumpToRemembrance,
  onOpenSearch,
}: {
  readonly activeNavTab: NavigationSectionId;
  readonly activeWorldId: WorldIdentifier;
  readonly pageScrollFraction: number;
  readonly onNavigateSection: (sectionId: NavigationSectionId) => void;
  readonly onJumpToRemembrance: () => void;
  readonly onOpenSearch: () => void;
}) {
  if (pageScrollFraction < 0.06) {
    return null;
  }

  const azimuthDegrees = String(Math.round(pageScrollFraction * 360)).padStart(3, "0");
  const activeWorld = WORLD_DOMAINS.find((w) => w.id === activeWorldId) ?? WORLD_DOMAINS[0]!;

  return (
    <aside
      aria-label="Observatory Celestial Telemetry Capsule"
      className="hud-glass-capsule fixed right-1.5 top-1/2 z-40 hidden min-[1400px]:flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-full border border-[var(--dna-accent)]/35 py-2.5 px-1 text-[9px] font-mono tracking-[0.12em] text-[var(--dna-muted)] transition-opacity duration-300 opacity-85 hover:opacity-100"
      title={`Active Realm: ${activeWorld.name} · ${azimuthDegrees}° Azimuth`}
    >
      {/* Live Azimuth Degree Counter */}
      <div className="text-[9.5px] font-semibold text-[var(--dna-text)] tabular-nums">
        {azimuthDegrees}°
      </div>

      <span className="h-px w-4 bg-[var(--dna-accent)]/30" aria-hidden="true" />

      {/* 5 Interactive Meridian Chapter Beacons */}
      <nav aria-label="Quick Meridian Spine" className="flex flex-col items-center gap-1">
        {NAVIGATION_TABS.map((tab, idx) => {
          const isCurrent = activeNavTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              variant="plain"
              onClick={() => onNavigateSection(tab.id)}
              title={tab.label}
              aria-label={`Jump to ${tab.label}`}
              aria-current={isCurrent ? "page" : undefined}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-[9px] transition-all cursor-pointer ${
                isCurrent
                  ? "border-[var(--dna-text)] bg-[var(--dna-accent)]/25 text-[var(--dna-text)] shadow-[0_0_14px_rgba(245,223,166,0.35)]"
                  : "border-transparent text-[var(--dna-muted)]/80 hover:border-[var(--dna-accent)]/45 hover:text-[var(--dna-text)]"
              }`}
            >
              0{idx + 1}
            </Button>
          );
        })}
      </nav>

      <span className="h-px w-4 bg-[var(--dna-accent)]/30" aria-hidden="true" />

      {/* Quick Contemplative Covenant Jump */}
      <Button
        type="button"
        variant="plain"
        onClick={onJumpToRemembrance}
        title="Jump to Four Scriptures & Contemplation Sanctuary"
        aria-label="Jump to Four Scriptures & Contemplation Sanctuary"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--dna-accent)]/35 bg-[var(--dna-accent)]/12 text-[var(--dna-text)] hover:border-[var(--dna-text)] hover:bg-[var(--dna-accent)]/28 transition-colors cursor-pointer"
      >
        <DiamondStarOrnament className="h-3.5 w-3.5" />
      </Button>

      {/* Command Search Trigger */}
      <Button
        type="button"
        variant="plain"
        onClick={onOpenSearch}
        title="Search Empire (Ctrl+K)"
        aria-label="Open Empire Command Search"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--dna-accent)]/30 text-[var(--dna-accent)] hover:border-[var(--dna-text)] hover:text-[var(--dna-text)] transition-colors cursor-pointer"
      >
        <SearchLensIcon className="h-3.5 w-3.5" />
      </Button>
    </aside>
  );
}
