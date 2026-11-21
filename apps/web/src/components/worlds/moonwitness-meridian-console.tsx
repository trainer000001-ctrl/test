"use client";

import { useState } from "react";
import { Button } from "@moonwitness/ui";
import { MeridianConstellationMapSvg } from "../sacred-illustrations";

const MOONWITNESS_MERIDIANS = [
  {
    code: "MERIDIAN 01",
    city: "Cairo",
    fullLabel: "Cairo · Al-Qāhirah",
    stats: "Nile Witness Chain · Heritage Focus",
    bearing: "30.0444° N · 31.2357° E",
    note: "Observatory of nocturnal lanterns preserving Mediterranean & Nile scholarly chains.",
    x: 68,
    y: 78,
  },
  {
    code: "MERIDIAN 02",
    city: "Samarkand",
    fullLabel: "Samarkand · Ulugh",
    stats: "Meridian Sextant Table · Heritage Focus",
    bearing: "39.6542° N · 66.9597° E",
    note: "High-precision celestial meridian sextant tables illuminating Eurasian astronavigation.",
    x: 180,
    y: 48,
  },
  {
    code: "MERIDIAN 03",
    city: "Nusantara",
    fullLabel: "Nusantara · Archipelago",
    stats: "Maritime Oral Tradition · Heritage Focus",
    bearing: "6.2088° S · 106.8456° E",
    note: "Equatorial ocean corridor uniting oral wisdom, calligraphy, and monsoon celestial navigation.",
    x: 292,
    y: 84,
  },
] as const;

export function MoonwitnessMeridianConsole() {
  const [activeMeridianIdx, setActiveMeridianIdx] = useState<number>(0);
  const activeMeridian = MOONWITNESS_MERIDIANS[activeMeridianIdx] ?? MOONWITNESS_MERIDIANS[0]!;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm uppercase tracking-[0.18em] text-[var(--dna-accent)]">
          MOONWITNESS MERIDIAN OBSERVATORY
        </span>
        <span className="font-mono text-xs text-[var(--dna-accent)]">ORBITAL SYNC: 100%</span>
      </div>
      <p className="mt-3 font-sans text-xs text-[var(--dna-muted)]">
        Select an observatory meridian to inspect witness corridors linking human testimony across
        regions under the same sky:
      </p>

      <div className="mt-4">
        <MeridianConstellationMapSvg
          meridians={MOONWITNESS_MERIDIANS}
          activeIndex={activeMeridianIdx}
          onSelectMeridian={setActiveMeridianIdx}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MOONWITNESS_MERIDIANS.map((meridian, idx) => {
          const selected = idx === activeMeridianIdx;
          return (
            <Button
              key={meridian.code}
              type="button"
              variant="plain"
              onClick={() => setActiveMeridianIdx(idx)}
              className={`h-auto min-h-[44px] cursor-pointer flex-col items-start justify-start gap-0 border p-3.5 text-left transition-colors ${
                selected
                  ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/14"
                  : "border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] hover:border-[var(--dna-accent)]/55"
              }`}
            >
              <div className="font-mono text-[11px] text-[var(--dna-accent)]">{meridian.code}</div>
              <div className="font-monument mt-1 text-sm text-[var(--dna-text)]">
                {meridian.fullLabel}
              </div>
              <div className="mt-1 font-sans text-xs text-[var(--dna-muted)]">{meridian.stats}</div>
            </Button>
          );
        })}
      </div>

      <div className="mt-4 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3.5">
        <div className="flex flex-wrap items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
          <span>{activeMeridian.fullLabel}</span>
          <span>{activeMeridian.bearing}</span>
        </div>
        <p className="mt-1.5 font-serif text-sm text-[var(--dna-muted)]">{activeMeridian.note}</p>
      </div>
    </div>
  );
}
