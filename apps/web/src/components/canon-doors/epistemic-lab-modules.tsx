"use client";

import { useState } from "react";
import { Button } from "@moonwitness/ui";
import {
  FOUR_CORPUS_POLICY,
  P18_KEY_WITNESS_SPEC,
  RGBL_FOUR_LEVELS,
  WHCMT_VS_BASSHUNTER_SPEC,
} from "@/data/empire-canon-codex";

export function P18KeyWitnessInspector({ quietMode }: { readonly quietMode: boolean }) {
  const [selectedLayerIdx, setSelectedLayerIdx] = useState<number>(0);
  const [selectedFamilyIdx, setSelectedFamilyIdx] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const transitionClass = quietMode ? "transition-none" : "transition-colors duration-150";

  const activeFamily =
    P18_KEY_WITNESS_SPEC.controlledKeys5Families[selectedFamilyIdx] ??
    P18_KEY_WITNESS_SPEC.controlledKeys5Families[0]!;

  return (
    <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
          P18 KEY WITNESS v0 · 9-LAYER CORPUS SPINE &amp; 20 CONTROLLED KEYS
        </span>
        <span className="font-mono text-[11px] text-[var(--dna-accent)]">
          {P18_KEY_WITNESS_SPEC.sourceRepo}
        </span>
      </div>

      {/* Formula + Rotation Rule */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3">
          <div className="font-mono text-[10px] text-[var(--dna-accent)]">
            SCORING &amp; UNKNOWN GUARD
          </div>
          <div className="mt-1 font-mono text-xs text-[var(--dna-text)]">
            {P18_KEY_WITNESS_SPEC.formula}
          </div>
        </div>
        <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3">
          <div className="font-mono text-[10px] text-[var(--dna-accent)]">
            INVARIANT ROTATION DOCTRINE
          </div>
          <div className="mt-1 font-mono text-xs text-[var(--dna-accent)]">
            {P18_KEY_WITNESS_SPEC.rotationRule}
          </div>
        </div>
      </div>

      {/* 9-Layer Corpus Spine */}
      <div>
        <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
          9-LAYER CORPUS SPINE
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-9">
          {P18_KEY_WITNESS_SPEC.corpusSpine9Layers.map((layer, idx) => {
            const active = idx === selectedLayerIdx;
            return (
              <Button
                key={layer}
                type="button"
                variant="plain"
                onClick={() => setSelectedLayerIdx(idx)}
                className={`min-h-[44px] border p-2 text-center font-mono text-[10px] cursor-pointer ${transitionClass} ${
                  active
                    ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                    : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/50"
                }`}
              >
                {layer}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 20 Controlled Keys (5 Families) + 12 Relations + Frame Dimensions + Direction */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-6 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 space-y-3">
          <div className="font-mono text-[10px] text-[var(--dna-accent)] uppercase">
            20 CONTROLLED KEYS (5 FAMILIES · CANDIDATE LEVEL)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {P18_KEY_WITNESS_SPEC.controlledKeys5Families.map((fam, idx) => {
              const selected = idx === selectedFamilyIdx;
              return (
                <Button
                  key={fam.family}
                  type="button"
                  variant="plain"
                  onClick={() => setSelectedFamilyIdx(idx)}
                  className={`min-h-[44px] border px-2.5 py-1 font-mono text-[10px] cursor-pointer ${transitionClass} ${
                    selected
                      ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                      : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)]"
                  }`}
                >
                  {fam.family}
                </Button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {activeFamily.keys.map((keyWord) => (
              <div
                key={keyWord}
                className="border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)] px-2.5 py-2 text-center font-mono text-xs text-[var(--dna-accent)]"
              >
                {keyWord}
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--dna-accent)]/15 pt-2.5">
            <div className="font-mono text-[10px] text-[var(--dna-accent)]">6 WITNESS TYPES</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {P18_KEY_WITNESS_SPEC.witnessTypes6.map((wt) => (
                <span
                  key={wt}
                  className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] px-2 py-0.5 font-mono text-[10px] text-[var(--dna-muted)]"
                >
                  {wt}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[var(--dna-accent)] uppercase">
              5 FRAME DIMENSIONS &amp; 12 RELATIONS
            </span>
            <span className="font-mono text-[10px] text-[var(--dna-accent)]">
              DIRECTION: {direction > 0 ? `+${direction}` : direction} (RANGE -2..+2)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[-2, -1, 0, 1, 2].map((val) => (
              <Button
                key={val}
                type="button"
                variant="plain"
                onClick={() => setDirection(val)}
                className={`min-h-[44px] flex-1 border font-mono text-xs cursor-pointer ${transitionClass} ${
                  direction === val
                    ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/25 text-[var(--dna-text)]"
                    : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)]"
                }`}
              >
                {val > 0 ? `+${val}` : val}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {P18_KEY_WITNESS_SPEC.mandatoryFrameDimensions5.map((dim) => (
              <span
                key={dim}
                className="border border-[var(--dna-accent)]/35 bg-[var(--dna-surface)] px-2.5 py-1 font-mono text-[10px] text-[var(--dna-text)]"
              >
                {dim}
              </span>
            ))}
          </div>
          <div className="border-t border-[var(--dna-accent)]/15 pt-2.5">
            <div className="font-mono text-[10px] text-[var(--dna-accent)]">12 RELATIONS</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {P18_KEY_WITNESS_SPEC.relations12.map((rel) => (
                <span
                  key={rel}
                  className="border border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] px-2 py-0.5 font-mono text-[10px] text-[var(--dna-muted)]"
                >
                  {rel}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RGBL Cumulative Foundation */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RGBL_FOUR_LEVELS.map((lvl) => (
          <div
            key={lvl.level}
            className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3"
          >
            <div className="font-mono text-[10px] text-[var(--dna-accent)]">
              {lvl.level} · {lvl.name}
            </div>
            <div className="mt-1 text-xs text-[var(--dna-text)]">Yield: {lvl.yield}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FourCorpusAndWhcmtPanel() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Four-Corpus Policy — Balanced Neutral Representation */}
      <div className="lg:col-span-7 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
          <span className="font-monument text-sm tracking-[0.16em] text-[var(--dna-accent)] uppercase">
            FOUR SCRIPTURAL WITNESSES ({FOUR_CORPUS_POLICY.sourceRepo})
          </span>
          <span className="font-mono text-[10.5px] text-[var(--dna-accent)]">
            {FOUR_CORPUS_POLICY.invariant}
          </span>
        </div>
        <p className="border-l-2 border-[var(--dna-accent)]/60 pl-3 font-serif text-xs sm:text-sm leading-relaxed text-[var(--dna-muted)]">
          {FOUR_CORPUS_POLICY.neutralityPrinciple}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FOUR_CORPUS_POLICY.corpora.map((corpus) => (
            <div
              key={corpus.code}
              className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-3.5"
            >
              <div className="flex items-center justify-between font-mono text-[10.5px] text-[var(--dna-accent)]">
                <span>{corpus.code}</span>
                <span>{corpus.classicalLanguage}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="font-monument text-sm text-[var(--dna-text)]">{corpus.name}</div>
                <div className="font-mono text-[10px] text-[var(--dna-accent)]">
                  {corpus.prophetAnchor}
                </div>
              </div>
              <div className="mt-1 font-mono text-[10px] text-[var(--dna-muted)] uppercase">
                {corpus.epistemicRole}
              </div>
              <p className="mt-1.5 font-serif text-xs text-[var(--dna-muted)] leading-relaxed">
                {corpus.neutralSummary}
              </p>
              <p className="mt-2 border-t border-[var(--dna-accent)]/15 pt-1.5 text-[11px] text-[var(--dna-muted)]">
                {corpus.invariant}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* WHCMT vs BASS-HUNTER */}
      <div className="lg:col-span-5 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 space-y-3">
        <div className="border-b border-[var(--dna-accent)]/20 pb-2 font-monument text-sm tracking-[0.16em] text-[var(--dna-accent)] uppercase">
          WHCMT MATRIX vs BASS-HUNTER BOUNDARY
        </div>
        <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-3">
          <div className="flex items-center justify-between font-mono text-[10.5px] text-[var(--dna-accent)]">
            <span>{WHCMT_VS_BASSHUNTER_SPEC.whcmt.code} (2×4 MATRIX)</span>
            <span>Recovered Matrix Spec</span>
          </div>
          <div className="mt-1 font-serif text-xs text-[var(--dna-text)]">
            {WHCMT_VS_BASSHUNTER_SPEC.whcmt.expansion}
          </div>
          <div className="mt-2.5 space-y-1.5 font-mono text-xs">
            <div className="grid grid-cols-4 gap-1.5">
              {WHCMT_VS_BASSHUNTER_SPEC.whcmt.matrixTopRow.map((cell) => (
                <div
                  key={cell}
                  className="border border-[var(--dna-accent)]/35 bg-[var(--dna-surface)] py-1.5 text-center text-[var(--dna-accent)]"
                >
                  {cell}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {WHCMT_VS_BASSHUNTER_SPEC.whcmt.matrixBottomRow.map((cell) => (
                <div
                  key={cell}
                  className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] py-1.5 text-center text-[var(--dna-muted)]"
                >
                  {cell}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-[var(--dna-muted)]/40 bg-[var(--dna-canvas)] p-3">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-[var(--dna-accent)]">
              {WHCMT_VS_BASSHUNTER_SPEC.bassHunter.code}
            </span>
            <span className="border border-[var(--dna-accent)]/30 px-2 py-0.5 text-[var(--dna-accent)]">
              METHOD: {WHCMT_VS_BASSHUNTER_SPEC.bassHunter.scoringStatus}
            </span>
          </div>
          <div className="mt-1 font-serif text-xs text-[var(--dna-text)]">
            {WHCMT_VS_BASSHUNTER_SPEC.bassHunter.expansion}
          </div>
          <p className="mt-1 text-[11px] text-[var(--dna-muted)]">
            {WHCMT_VS_BASSHUNTER_SPEC.bassHunter.rule}
          </p>
        </div>
      </div>
    </div>
  );
}
