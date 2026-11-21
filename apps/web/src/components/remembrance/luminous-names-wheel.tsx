"use client";

import Image from "next/image";
import { LUMINOUS_NAMES_OF_ALLAH } from "@/data/remembrance-sanctuary";
import type { WorldIdentifier } from "@/data/empire-registry";
import { artPlateSrc } from "@/lib/art";
import { Button } from "@moonwitness/ui";
import { DnaButton } from "@moonwitness/ui/imperium";
import { SpatialTiltCard, triggerSacredViewTransition } from "../motion-primitives";

interface LuminousNamesWheelProps {
  selectedNameId: string;
  onSelectName: (id: string) => void;
  quietMode: boolean;
  onNavigateToWorld?: (worldId: WorldIdentifier) => void;
}

export function LuminousNamesWheel({
  selectedNameId,
  onSelectName,
  quietMode,
  onNavigateToWorld,
}: LuminousNamesWheelProps) {
  const selectedNameIndex = Math.max(
    0,
    LUMINOUS_NAMES_OF_ALLAH.findIndex((entry) => entry.id === selectedNameId),
  );
  const selectedName = LUMINOUS_NAMES_OF_ALLAH[selectedNameIndex] ?? LUMINOUS_NAMES_OF_ALLAH[0]!;

  return (
    <div className="flex flex-col justify-between lg:col-span-7">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dna-accent)]">
            UNIVERSAL ATTRIBUTES · LUMINOUS CONTEMPLATIONS (9 OF 99)
          </span>
          <span className="font-mono text-[10.5px] text-[var(--dna-muted)]">
            MONOCENTRIC UNITY · ZERO HUMAN IDOLS
          </span>
        </div>

        {/* Desktop / Tablet: 9-Fold Nonagram Celestial Ring */}
        <div className="mt-5 hidden sm:block">
          <div
            role="tablist"
            aria-label="Select a Beautiful Name of Allah to contemplate"
            className="relative mx-auto h-[412px] w-[412px] select-none"
          >
            <div className="pointer-events-none absolute inset-4 overflow-hidden rounded-full border border-[var(--dna-accent)]/40 bg-[var(--dna-canvas)] shadow-[0_0_54px_rgba(223,192,123,0.14),inset_0_0_36px_rgba(0,0,0,0.92)]">
              <Image
                src={artPlateSrc("nonagram-sanctuary-dial")}
                alt=""
                fill
                loading="eager"
                sizes="380px"
                className="scale-[1.04] object-cover opacity-88"
              />
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(5,7,14,0.88)_0%,rgba(5,7,14,0.52)_28%,rgba(5,7,14,0.28)_64%,rgba(5,7,14,0.9)_100%)]" />
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-4"
              style={{
                transform: `rotate(${selectedNameIndex * 40}deg)`,
                transition: quietMode ? "none" : "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div className="absolute left-1/2 top-[11%] h-[22%] w-px -translate-x-1/2 bg-gradient-to-b from-[var(--dna-text)] via-[var(--dna-accent)]/70 to-transparent" />
              <div className="absolute left-1/2 top-[10%] h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-[var(--dna-text)] bg-[var(--dna-accent)]/40" />
            </div>

            <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[var(--dna-accent)]/45 bg-[var(--dna-canvas)]/90 px-2 text-center shadow-[0_0_30px_rgba(223,192,123,0.18)] backdrop-blur-sm">
              <span className="font-mono text-[9px] tracking-[0.22em] text-[var(--dna-accent)]">
                0{selectedNameIndex + 1} / 09
              </span>
              <div dir="rtl" lang="ar" className="mt-1 text-2xl text-[var(--dna-text)]">
                {selectedName.arabic}
              </div>
              <div className="font-monument mt-0.5 text-[11px] tracking-[0.12em] text-[var(--dna-accent)]">
                {selectedName.transliteration}
              </div>
            </div>

            {LUMINOUS_NAMES_OF_ALLAH.map((entry, idx) => {
              const rad = ((idx * 40 - 90) * Math.PI) / 180;
              const x = Number((206 + Math.cos(rad) * 162 - 44).toFixed(1));
              const y = Number((206 + Math.sin(rad) * 162 - 25).toFixed(1));
              const isSelected = entry.id === selectedName.id;
              return (
                <Button
                  key={entry.id}
                  type="button"
                  variant="plain"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() =>
                    triggerSacredViewTransition(() => {
                      onSelectName(entry.id);
                    }, quietMode)
                  }
                  style={{ left: `${x}px`, top: `${y}px` }}
                  className={`absolute flex h-[50px] w-[88px] cursor-pointer flex-col items-center justify-center gap-0 rounded-sm border px-1.5 transition-all duration-300 ${
                    isSelected
                      ? "z-10 scale-105 border-[var(--dna-text)] bg-[var(--dna-surface)]/95 shadow-[0_0_24px_rgba(245,223,166,0.34)]"
                      : "border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)]/92 hover:border-[var(--dna-accent)]/70 hover:bg-[var(--dna-surface)]"
                  }`}
                >
                  <span dir="rtl" lang="ar" className="text-sm leading-none text-[var(--dna-text)]">
                    {entry.arabic}
                  </span>
                  <span className="font-monument mt-1 whitespace-nowrap text-[9.5px] leading-none tracking-[0.06em] text-[var(--dna-text)]">
                    {entry.transliteration}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Mobile (< 640px): Compact 3x3 Luminous Tile Grid */}
        <div
          role="tablist"
          aria-label="Select a Beautiful Name of Allah to contemplate"
          className="mt-4 grid grid-cols-3 gap-2.5 sm:hidden"
        >
          {LUMINOUS_NAMES_OF_ALLAH.map((entry) => {
            const isSelected = entry.id === selectedName.id;
            return (
              <Button
                key={entry.id}
                type="button"
                variant="plain"
                role="tab"
                aria-selected={isSelected}
                onClick={() =>
                  triggerSacredViewTransition(() => {
                    onSelectName(entry.id);
                  }, quietMode)
                }
                className={`h-auto min-h-[68px] cursor-pointer flex-col items-center justify-center gap-0 border px-2 py-2.5 text-center transition-all ${
                  isSelected
                    ? "border-[var(--dna-text)] bg-[var(--dna-accent)]/18 shadow-[0_0_24px_rgba(223,192,123,0.18)]"
                    : "border-[var(--dna-accent)]/22 bg-[var(--dna-canvas)] hover:border-[var(--dna-accent)]/55"
                }`}
              >
                <div dir="rtl" lang="ar" className="text-lg text-[var(--dna-text)]">
                  {entry.arabic}
                </div>
                <div className="font-monument mt-0.5 whitespace-nowrap text-[10px] tracking-[0.06em] text-[var(--dna-text)]">
                  {entry.transliteration}
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      <SpatialTiltCard disabled={quietMode} maxTiltDeg={2.5} className="mt-5">
        <div className="relative border border-[var(--dna-accent)]/40 bg-gradient-to-br from-[var(--dna-surface)] via-[var(--dna-canvas)] to-[var(--dna-canvas)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dna-accent)]/20 pb-3">
            <div className="flex items-baseline gap-3">
              <span dir="rtl" lang="ar" className="text-2xl text-[var(--dna-text)]">
                {selectedName.arabic}
              </span>
              <span className="font-monument text-lg tracking-[0.14em] text-[var(--dna-text)]">
                {selectedName.transliteration}
              </span>
            </div>
            <span className="border border-[var(--dna-accent)]/35 bg-[var(--dna-accent)]/12 px-2.5 py-0.5 font-mono text-[10px] text-[var(--dna-accent)]">
              {selectedName.meaning}
            </span>
          </div>

          <p className="mt-4 font-serif text-base leading-relaxed text-[var(--dna-text)]">
            {selectedName.contemplation}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--dna-accent)]/15 pt-3">
            <span className="text-xs text-[var(--dna-accent)]">
              Practice:{" "}
              <span className="text-[var(--dna-text)]">{selectedName.practicePrompt}</span>
            </span>
            {onNavigateToWorld && (
              <DnaButton
                type="button"
                tone="secondary"
                onClick={() => onNavigateToWorld(selectedName.linkedWorldId)}
                className="min-h-0 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--dna-accent)] hover:text-[var(--dna-text)]"
              >
                {selectedName.worldLabel} &rsaquo;
              </DnaButton>
            )}
          </div>
        </div>
      </SpatialTiltCard>
    </div>
  );
}
