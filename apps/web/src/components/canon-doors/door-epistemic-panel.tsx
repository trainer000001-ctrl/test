"use client";

import { useState } from "react";
import { Button } from "@moonwitness/ui";
import {
  EPISTEMIC_FEDERATION_DOMAINS,
  JERUSALEM_70CE_CASE_001,
  SRGBL_V8_STAGES,
  SWING_SWING_KEY_ROTATIONS,
} from "@/data/empire-canon-codex";
import { ChamberWingTabs, type ChamberWingOption } from "./chamber-wing-tabs";
import { FourCorpusAndWhcmtPanel, P18KeyWitnessInspector } from "./epistemic-lab-modules";

type EpistemicWingId = "four-scriptures" | "srgbl-pipeline" | "p18-witness" | "rocksoul-domains";

const EPISTEMIC_WINGS: readonly ChamberWingOption<EpistemicWingId>[] = [
  { id: "four-scriptures", code: "WING 01", label: "Four Scriptures & Policy" },
  { id: "srgbl-pipeline", code: "WING 02", label: "SRGBL v8 & 7 Rotations" },
  { id: "p18-witness", code: "WING 03", label: "P18 Key Witness v0" },
  { id: "rocksoul-domains", code: "WING 04", label: "7 Domains & Case 001" },
];

export function DoorEpistemicPanel({ quietMode }: { readonly quietMode: boolean }) {
  const [activeWing, setActiveWing] = useState<EpistemicWingId>("four-scriptures");
  const [activeStageLetter, setActiveStageLetter] = useState<"S" | "R" | "G" | "B" | "L">("S");
  const [activeRotationIdx, setActiveRotationIdx] = useState<number>(0);

  const activeStage =
    SRGBL_V8_STAGES.find((stage) => stage.letter === activeStageLetter) ?? SRGBL_V8_STAGES[0]!;
  const transitionClass = quietMode ? "transition-none" : "transition-colors duration-150";

  return (
    <div className="space-y-6">
      <ChamberWingTabs
        wings={EPISTEMIC_WINGS}
        activeWing={activeWing}
        onSelectWing={setActiveWing}
        ariaLabel="Door II Gallery Wings"
        quietMode={quietMode}
      />

      {activeWing === "four-scriptures" && <FourCorpusAndWhcmtPanel />}

      {/* SRGBL v8 Interactive 5-Stage Witness Pipeline */}
      {activeWing === "srgbl-pipeline" && (
        <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
            <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
              SRGBL v8 CANONICAL 5-STAGE WITNESS PIPELINE &amp; SYMBOLIC RGBL
            </span>
            <span className="font-mono text-[11px] text-[var(--dna-accent)]">
              SOURCE: bjo163/moonwitness-corpus · P18 KEY WITNESS
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
            {SRGBL_V8_STAGES.map((stage) => {
              const selected = stage.letter === activeStage.letter;
              return (
                <Button
                  key={stage.stage}
                  type="button"
                  variant="plain"
                  onClick={() => setActiveStageLetter(stage.letter)}
                  className={`min-h-[44px] h-auto flex-col items-start justify-start gap-0 border p-3.5 text-left ${transitionClass} cursor-pointer ${
                    selected
                      ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20"
                      : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] hover:border-[var(--dna-accent)]/50"
                  }`}
                >
                  <div className="font-mono text-[11px] text-[var(--dna-accent)]">
                    {stage.stage}
                  </div>
                  <div className="font-monument mt-1 text-xs sm:text-sm text-[var(--dna-text)]">
                    {stage.title}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-[var(--dna-accent)]">
                    {stage.symbolicLayer}
                  </div>
                </Button>
              );
            })}
          </div>

          <div className="mt-4 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-monument text-base sm:text-lg text-[var(--dna-text)]">
                {activeStage.stage} — {activeStage.title}
              </span>
              <span className="border border-[var(--dna-accent)]/35 bg-[var(--dna-accent)]/10 px-2.5 py-0.5 font-mono text-[11px] text-[var(--dna-accent)]">
                {activeStage.symbolicLayer}
              </span>
            </div>
            <p className="mt-2 font-serif text-sm text-[var(--dna-muted)]">
              AUDIT QUESTION: {activeStage.auditQuestion}
            </p>
          </div>

          {/* Swing Swing Key 7 Rotations */}
          <div className="mt-6 border-t border-[var(--dna-accent)]/20 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] tracking-[0.18em] text-[var(--dna-accent)] uppercase">
                SWING SWING KEY · 7 RESEARCH OPERATORS (MAX 3 HOPS · CANDIDATE ROTATIONS ONLY)
              </span>
              <span className="font-mono text-[11px] text-[var(--dna-accent)]">
                ACTIVE ROTATION {activeRotationIdx + 1} / 7
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {SWING_SWING_KEY_ROTATIONS.map((rotationLabel, idx) => {
                const isSelected = idx === activeRotationIdx;
                return (
                  <Button
                    key={rotationLabel}
                    type="button"
                    variant="plain"
                    onClick={() => setActiveRotationIdx(idx)}
                    className={`min-h-[44px] justify-start border px-3 py-2 text-left font-mono text-[11px] transition-colors cursor-pointer ${
                      isSelected
                        ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                        : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/45"
                    }`}
                  >
                    {rotationLabel}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6 ROCKSOUL Domains + Correlation Layer */}
      {activeWing === "rocksoul-domains" && (
        <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
            <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
              6-DOMAIN + RELATIONSHIP ROCKSOUL EPISTEMIC FEDERATION
            </span>
            <span className="font-mono text-[11px] text-[var(--dna-accent)]">
              OFFSIDE → ONSIDE SEMANTIC VERIFICATION (QS 37:30)
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EPISTEMIC_FEDERATION_DOMAINS.map((domain) => (
              <div
                key={domain.code}
                className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                    <span>{domain.code}</span>
                    <span>{domain.repoSlug}</span>
                  </div>
                  <h4 className="font-monument mt-1 text-sm sm:text-base text-[var(--dna-text)]">
                    {domain.name}
                  </h4>
                  <div className="mt-0.5 text-xs text-[var(--dna-accent)]">
                    {domain.domainFocus}
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-[var(--dna-muted)]">
                    {domain.pipelineOrFamilies}
                  </p>
                </div>
                <div className="mt-3 border-t border-[var(--dna-accent)]/15 pt-2 text-[11px] text-[var(--dna-muted)]">
                  INVARIANT: {domain.coreInvariant}
                </div>
              </div>
            ))}
          </div>

          {/* Shared Case 001: Jerusalem 70 CE */}
          <div className="mt-6 border border-[var(--dna-accent)]/35 bg-[var(--dna-surface)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-monument text-sm sm:text-base tracking-[0.14em] text-[var(--dna-text)]">
                {JERUSALEM_70CE_CASE_001.caseId} · {JERUSALEM_70CE_CASE_001.title}
              </span>
              <span className="border border-[var(--dna-accent)]/40 bg-[var(--dna-accent)]/15 px-2.5 py-0.5 font-mono text-[10px] text-[var(--dna-text)]">
                CROSS-DOMAIN BENCHMARK
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {JERUSALEM_70CE_CASE_001.strands.map((strand) => (
                <div
                  key={strand.domain}
                  className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3"
                >
                  <div className="font-mono text-[10px] text-[var(--dna-accent)]">
                    {strand.domain}
                  </div>
                  <p className="mt-1 text-xs text-[var(--dna-muted)]">{strand.evidence}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 font-mono text-xs text-[var(--dna-accent)]">
              VERDICT // {JERUSALEM_70CE_CASE_001.verdict}
            </div>
          </div>
        </div>
      )}

      {/* P18 Key Witness v0 Spine, 20 Controlled Keys & 12 Relations */}
      {activeWing === "p18-witness" && <P18KeyWitnessInspector quietMode={quietMode} />}
    </div>
  );
}
