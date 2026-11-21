"use client";

import { useState } from "react";
import { Button } from "@moonwitness/ui";
import {
  DX_MANGA_FOUR_PANELS,
  EIGHT_STORY_ERAS,
  FEATURED_GATE_TRANSMISSIONS,
  FIFTEEN_STORY_EPISODES,
  GOD_PROMISE_THREE_TRACKS,
  ORIGINAL_CREW_ARCHETYPES,
  SEVEN_STEP_PROMISE,
  SIXTEEN_STAGE_LOOP,
  UNIVERSE_FOUR_LENSES,
  WORLD_PATCH_HIGHLIGHTS,
} from "@/data/empire-canon-codex";
import { StoryPlateGeometrySvg } from "../sacred-illustrations";
import { ChamberWingTabs, type ChamberWingOption } from "./chamber-wing-tabs";
import {
  AetherionParadiseAtlas,
  PlatformFunctionsCharactersPanel,
  WorldPatchesRegistryPanel,
} from "./universe-atlas-modules";

type UniverseWingId =
  "promise-storyboard" | "chapters-eras" | "aetherion-paradise" | "patches-functions";

const UNIVERSE_WINGS: readonly ChamberWingOption<UniverseWingId>[] = [
  { id: "promise-storyboard", code: "WING 01", label: "Tracks & 4-Panel Arc" },
  { id: "chapters-eras", code: "WING 02", label: "99 Chapters & 8 Eras" },
  { id: "aetherion-paradise", code: "WING 03", label: "AETHERION & PARADISE V3" },
  { id: "patches-functions", code: "WING 04", label: "33 Patches & 13 Functions" },
];

export function DoorUniversePanel({ quietMode }: { readonly quietMode: boolean }) {
  const [activeWing, setActiveWing] = useState<UniverseWingId>("promise-storyboard");
  const [activeTrackCode, setActiveTrackCode] = useState<string>(
    GOD_PROMISE_THREE_TRACKS[0]!.trackCode,
  );
  const [activeLensId, setActiveLensId] = useState<string>(UNIVERSE_FOUR_LENSES[0]!.id);
  const [activeEpisodeCode, setActiveEpisodeCode] = useState<string>(
    FIFTEEN_STORY_EPISODES[0]!.code,
  );
  const [noiseSilenceMode, setNoiseSilenceMode] = useState<"SILENCE" | "NOISE">("SILENCE");

  const activeTrack =
    GOD_PROMISE_THREE_TRACKS.find((track) => track.trackCode === activeTrackCode) ??
    GOD_PROMISE_THREE_TRACKS[0]!;
  const activeLens =
    UNIVERSE_FOUR_LENSES.find((lens) => lens.id === activeLensId) ?? UNIVERSE_FOUR_LENSES[0]!;
  const activeEpisode =
    FIFTEEN_STORY_EPISODES.find((ep) => ep.code === activeEpisodeCode) ??
    FIFTEEN_STORY_EPISODES[0]!;
  const transitionClass = quietMode ? "transition-none" : "transition-colors duration-150";

  return (
    <div className="space-y-6">
      <ChamberWingTabs
        wings={UNIVERSE_WINGS}
        activeWing={activeWing}
        onSelectWing={setActiveWing}
        ariaLabel="Door I Narrative Gallery Wings"
        quietMode={quietMode}
      />

      {activeWing === "promise-storyboard" && (
        <div className="space-y-8">
          {/* Top Strip: NOISE x SILENCE Cognitive Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] px-5 py-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.22em] text-[var(--dna-accent)] uppercase">
                ROCKSOUL-DX LIVING UNIVERSE AXIS // NOISE × SILENCE
              </div>
              <p className="mt-1 font-serif text-sm text-[var(--dna-muted)]">
                {noiseSilenceMode === "SILENCE"
                  ? "SILENCE MODE: Direct clarity of Tawhid contemplation — stripping fragmented high-frequency distraction."
                  : "NOISE MODE: Observing chaotic cultural signals, scars, and global transmissions before Positive Correction."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(["SILENCE", "NOISE"] as const).map((modeLabel) => {
                const selected = noiseSilenceMode === modeLabel;
                return (
                  <Button
                    key={modeLabel}
                    type="button"
                    variant="plain"
                    aria-pressed={selected}
                    onClick={() => setNoiseSilenceMode(modeLabel)}
                    className={`min-h-[44px] border px-4 py-2 font-mono text-xs tracking-[0.18em] uppercase ${transitionClass} cursor-pointer ${
                      selected
                        ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/25 text-[var(--dna-text)]"
                        : "border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/60"
                    }`}
                  >
                    {modeLabel}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 3 GOD-PROMISE Tracks + Monocentric 1-6-3 */}
          <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dna-accent)]/20 pb-3">
              <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                THREE GOD-PROMISE TRACKS &amp; MONOCENTRIC 1·6·3
              </span>
              <span className="font-mono text-[11px] text-[var(--dna-accent)]">
                SOURCE: A-L-L-A-H/master-docs · bjo163/moonwitnessxv
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {GOD_PROMISE_THREE_TRACKS.map((track) => {
                const isCurrent = track.trackCode === activeTrack.trackCode;
                return (
                  <Button
                    key={track.trackCode}
                    type="button"
                    variant="plain"
                    onClick={() => setActiveTrackCode(track.trackCode)}
                    className={`min-h-[44px] h-auto flex-col items-stretch justify-start gap-0 border p-4 text-left ${transitionClass} cursor-pointer ${
                      isCurrent
                        ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/15"
                        : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] hover:border-[var(--dna-accent)]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-[var(--dna-accent)]">
                      <span>{track.trackCode}</span>
                      <span>{track.anchorScripture}</span>
                    </div>
                    <div className="font-monument mt-1 text-sm tracking-[0.08em] text-[var(--dna-text)]">
                      {track.title}
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="mt-4 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 sm:p-5">
              <div className="font-mono text-xs tracking-[0.14em] text-[var(--dna-accent)]">
                {activeTrack.theorem}
              </div>
              <p className="mt-2 font-serif text-sm leading-relaxed text-[var(--dna-muted)]">
                {activeTrack.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeTrack.pillars.map((pillar) => (
                  <span
                    key={pillar}
                    className="border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)] px-2.5 py-1 font-mono text-[11px] text-[var(--dna-accent)]"
                  >
                    {pillar}
                  </span>
                ))}
                {activeTrack.motifTitles.map((motif) => (
                  <span
                    key={motif}
                    className="border border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] px-2.5 py-1 text-[11px] text-[var(--dna-muted)]"
                  >
                    {motif}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4-Panel DX Storyboard (Abstract Architectural Plates — Zero Faces) */}
          <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
              <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                SIN CAN BE BETTER HUMAN — 4-PANEL ARCHITECTURAL STORYBOARD
              </span>
              <span className="font-mono text-[11px] text-[var(--dna-accent)]">
                ARCHIVE FOLIO · ZERO HUMAN FACES
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DX_MANGA_FOUR_PANELS.map((panel) => (
                <div
                  key={panel.panelNumber}
                  className="group flex flex-col justify-between border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-4 transition-colors hover:border-[var(--dna-accent)]/50"
                >
                  <div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                      <span>{panel.panelNumber}</span>
                      <span>{panel.paletteTag}</span>
                    </div>
                    <div className="mt-2.5">
                      <StoryPlateGeometrySvg
                        panelNumber={panel.panelNumber}
                        accentHex={panel.accentHex}
                      />
                    </div>
                    <div
                      className="mt-2.5 font-monument text-lg tracking-[0.14em]"
                      style={{ color: panel.accentHex }}
                    >
                      {panel.japaneseSfx}
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--dna-muted)]">
                      {panel.romajiSfx}
                    </div>
                    <h4 className="font-monument mt-2 text-xs tracking-[0.08em] text-[var(--dna-text)] uppercase">
                      {panel.title}
                    </h4>
                    <p className="mt-1.5 font-serif text-sm leading-relaxed text-[var(--dna-muted)]">
                      {panel.meaning}
                    </p>
                  </div>
                  <div className="mt-3 border-t border-[var(--dna-accent)]/15 pt-2 font-mono text-[10px] text-[var(--dna-muted)]">
                    FORM: {panel.architecturalForm}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4 Creative Lenses across 99 Chapters */}
      {activeWing === "chapters-eras" && (
        <div className="space-y-8">
          <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
              <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                99-CHAPTER MASTER VISION NARRATIVE (S01–S99 · 4 LENSES)
              </span>
              <span className="font-mono text-[11px] text-[var(--dna-accent)]">
                SOURCE: bjo163/moonwitnessxv
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {UNIVERSE_FOUR_LENSES.map((lens) => {
                const isSelected = lens.id === activeLens.id;
                return (
                  <Button
                    key={lens.id}
                    type="button"
                    variant="plain"
                    onClick={() => setActiveLensId(lens.id)}
                    className={`min-h-[44px] h-auto flex-col items-start justify-start gap-0 border p-3.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/15"
                        : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] hover:border-[var(--dna-accent)]/45"
                    }`}
                  >
                    <div className="font-mono text-[11px] text-[var(--dna-accent)]">
                      {lens.chapterRange} ({lens.chapterCount} Chapters)
                    </div>
                    <div className="font-monument mt-1 text-xs sm:text-sm text-[var(--dna-text)]">
                      {lens.name}
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-monument text-sm text-[var(--dna-text)]">
                  {activeLens.name}
                </div>
                <p className="mt-1 text-xs text-[var(--dna-muted)]">{activeLens.focus}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeLens.keyMotifs.map((motif) => (
                  <span
                    key={motif}
                    className="border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)] px-2.5 py-1 font-mono text-[10px] text-[var(--dna-accent)]"
                  >
                    {motif}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* MoonWitness II (8 Eras, 7-Step Promise, 16-Stage Loop) & XII (15 Episodes, 33 Patches) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5">
              <div className="font-monument text-sm tracking-[0.16em] text-[var(--dna-accent)] uppercase border-b border-[var(--dna-accent)]/20 pb-2">
                MOONWITNESS II · 8 STORY ERAS &amp; 16-STAGE LOOP
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {EIGHT_STORY_ERAS.map((era) => (
                  <div
                    key={era.id}
                    className="border border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] p-2.5"
                  >
                    <div className="font-mono text-[10px] text-[var(--dna-accent)]">
                      {era.id.toUpperCase()} · {era.subtitle}
                    </div>
                    <div className="font-monument text-xs text-[var(--dna-text)]">{era.title}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--dna-muted)]">{era.theme}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                  7-STEP PROMISE &amp; 16-STAGE EXPRESSIVE LOOP
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SEVEN_STEP_PROMISE.map((step) => (
                    <span
                      key={step}
                      className="border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--dna-accent)]"
                    >
                      {step}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {SIXTEEN_STAGE_LOOP.map((stage) => (
                    <span
                      key={stage}
                      className="border border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] px-2 py-0.5 font-mono text-[10px] text-[var(--dna-muted)]"
                    >
                      {stage}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                  ORIGINAL CREW ARCHETYPES ({ORIGINAL_CREW_ARCHETYPES.length})
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ORIGINAL_CREW_ARCHETYPES.map((crew) => (
                    <span
                      key={crew}
                      className="border border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] px-2 py-0.5 font-mono text-[10px] text-[var(--dna-muted)]"
                    >
                      {crew}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 flex flex-col justify-between">
              <div>
                <div className="font-monument text-sm tracking-[0.16em] text-[var(--dna-accent)] uppercase border-b border-[var(--dna-accent)]/20 pb-2">
                  MOONWITNESS XII · 15 STORY EPISODES &amp; 33 WORLD PATCHES
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {FIFTEEN_STORY_EPISODES.map((ep) => {
                    const isSelected = ep.code === activeEpisode.code;
                    return (
                      <Button
                        key={ep.code}
                        type="button"
                        variant="plain"
                        onClick={() => setActiveEpisodeCode(ep.code)}
                        className={`min-h-[44px] border px-2.5 py-1.5 font-mono text-[10px] cursor-pointer ${transitionClass} ${
                          isSelected
                            ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                            : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/50"
                        }`}
                      >
                        {ep.code} · {ep.title}
                      </Button>
                    );
                  })}
                </div>
                <div className="mt-3 border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] p-3.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[var(--dna-accent)]">
                    <span>
                      {activeEpisode.code} // {activeEpisode.arcFocus}
                    </span>
                    <span>EPISODE {activeEpisode.number} / 15</span>
                  </div>
                  <div className="mt-1 font-serif text-base text-[var(--dna-text)]">
                    {activeEpisode.title}
                  </div>
                  <p className="mt-1 text-xs text-[var(--dna-muted)]">
                    {activeEpisode.coreQuestion}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                    WORLD PATCH HIGHLIGHTS (#001 – #033 + DUAL-DRAFT DISCLOSURE)
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {WORLD_PATCH_HIGHLIGHTS.map((patch) => (
                      <div
                        key={patch.patchNumber}
                        className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-2.5"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                          <span>PATCH {patch.patchNumber}</span>
                          <span>{patch.category}</span>
                        </div>
                        <div className="mt-0.5 font-serif text-xs text-[var(--dna-text)]">
                          {patch.title}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[var(--dna-muted)]">
                          {patch.summary}
                        </p>
                        {patch.provenanceNote && (
                          <div className="mt-1 font-mono text-[10px] text-[var(--dna-accent)]">
                            {patch.provenanceNote}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--dna-accent)]/20 pt-3">
                <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                  FEATURED GATE TRANSMISSIONS &amp; KINGSLAYER AGREEMENT
                </div>
                <div className="mt-2 space-y-2">
                  {FEATURED_GATE_TRANSMISSIONS.map((tx) => (
                    <div
                      key={tx.id}
                      className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                        <span>{tx.domainOrigin}</span>
                        <span>{tx.format}</span>
                      </div>
                      <div className="mt-0.5 font-serif text-sm text-[var(--dna-text)]">
                        {tx.title}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--dna-muted)]">{tx.premise}</p>
                      <p className="mt-1 font-serif text-xs italic text-[var(--dna-accent)]">
                        “{tx.signatureQuote}”
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AETHERION 10 Realms × 100 Levels & PARADISE V3 */}
      {activeWing === "aetherion-paradise" && <AetherionParadiseAtlas quietMode={quietMode} />}

      {/* Complete 33 World Patches + Dual #014 Conflict Disclosure & 13 Core Functions */}
      {activeWing === "patches-functions" && (
        <div className="space-y-8">
          <WorldPatchesRegistryPanel quietMode={quietMode} />
          <PlatformFunctionsCharactersPanel />
        </div>
      )}
    </div>
  );
}
