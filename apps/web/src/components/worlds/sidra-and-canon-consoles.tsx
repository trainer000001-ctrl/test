"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@moonwitness/ui";
import { DnaBadge, SidraConstellationLinks } from "@moonwitness/ui/imperium";
import {
  DX_MANGA_FOUR_PANELS,
  JERUSALEM_70CE_CASE_001,
  SRGBL_V8_STAGES,
  SYAFAAT_BASE_STATES,
} from "@/data/empire-canon-codex";
import { SIDRA_KNOWLEDGE_AXIOMS } from "@/data/empire-registry";
import { artPlateSrc } from "@/lib/art";

export function SidraKnowledgeConsole() {
  const [selectedAxiomId, setSelectedAxiomId] = useState<string>(
    SIDRA_KNOWLEDGE_AXIOMS[0]?.id ?? "noor-optics",
  );
  const selectedAxiom =
    SIDRA_KNOWLEDGE_AXIOMS.find((axiom) => axiom.id === selectedAxiomId) ??
    SIDRA_KNOWLEDGE_AXIOMS[0]!;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm uppercase tracking-[0.18em] text-[var(--dna-accent)]">
          SIDRA POLYHEDRAL KNOWLEDGE CONSTELLATION
        </span>
        <span className="font-mono text-xs text-[var(--dna-accent)]">
          {selectedAxiom.geometricRatio}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <div
            role="group"
            aria-label="Sidra Knowledge Graph"
            className="relative h-60 w-full overflow-hidden border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] shadow-[inset_0_0_28px_rgba(0,0,0,0.88)] sm:h-64"
          >
            <Image
              src={artPlateSrc("sidra-lote-constellation")}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover opacity-90"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_20%,rgba(6,9,18,0.68)_100%)]"
            />
            <SidraConstellationLinks
              axioms={SIDRA_KNOWLEDGE_AXIOMS}
              selectedId={selectedAxiom.id}
            />

            {SIDRA_KNOWLEDGE_AXIOMS.map((axiomNode) => {
              const isCurrent = axiomNode.id === selectedAxiom.id;
              const placePillAbove = axiomNode.id === "noor-optics";
              return (
                <Button
                  key={axiomNode.id}
                  type="button"
                  variant="plain"
                  aria-label={`Inspect ${axiomNode.title}`}
                  aria-pressed={isCurrent}
                  onClick={() => setSelectedAxiomId(axiomNode.id)}
                  style={{
                    left: `${axiomNode.coordinateX}%`,
                    top: `${axiomNode.coordinateY}%`,
                  }}
                  className="group absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center focus:outline-none"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-300 ${
                      isCurrent
                        ? "scale-125 border-[var(--dna-text)] bg-[var(--dna-text)] shadow-[0_0_16px_rgba(255,244,210,0.95)]"
                        : "border-[var(--dna-canvas)] bg-[var(--dna-accent)] shadow-[0_0_8px_rgba(223,192,123,0.55)] group-hover:scale-110 group-hover:bg-[var(--dna-text)]"
                    }`}
                  />
                  <span
                    className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-serif text-[10px] tracking-[0.04em] backdrop-blur-sm transition-colors ${
                      placePillAbove ? "bottom-[calc(50%+12px)]" : "top-[calc(50%+12px)]"
                    } ${
                      isCurrent
                        ? "border-[var(--dna-text)]/75 bg-[var(--dna-canvas)]/90 text-[var(--dna-text)]"
                        : "border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)]/80 text-[var(--dna-accent)] group-hover:border-[var(--dna-accent)]/60"
                    }`}
                  >
                    {axiomNode.id === "qalam-codex" ? "Qalam" : axiomNode.title.split(" ")[0]}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2.5 sm:col-span-6">
          <div className="font-mono text-xs uppercase text-[var(--dna-accent)]">
            {selectedAxiom.discipline}
          </div>
          <h5 className="font-monument text-lg text-[var(--dna-text)]">{selectedAxiom.title}</h5>
          <p className="font-serif text-sm leading-relaxed text-[var(--dna-muted)]">
            {selectedAxiom.exposition}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {SIDRA_KNOWLEDGE_AXIOMS.map((axiomItem) => (
              <Button
                key={axiomItem.id}
                type="button"
                variant="plain"
                onClick={() => setSelectedAxiomId(axiomItem.id)}
                className={`min-h-[44px] cursor-pointer border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                  axiomItem.id === selectedAxiom.id
                    ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/25 text-[var(--dna-text)]"
                    : "border-[var(--dna-accent)]/25 text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/55"
                }`}
              >
                {axiomItem.title}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CrayonSpectrumConsole() {
  const [selectedSrgblIdx, setSelectedSrgblIdx] = useState<number>(0);
  const selectedSrgblStage = SRGBL_V8_STAGES[selectedSrgblIdx] ?? SRGBL_V8_STAGES[0]!;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--brand-blue)]/30 pb-3">
        <span className="font-monument text-sm uppercase tracking-[0.14em] text-[var(--dna-text)]">
          CRAYON · SRGBL v8 HERMENEUTIC SPECTRUM
        </span>
        <DnaBadge>CANON EXPLORER · bjo163/ALLAH-CRAYON-RGBL-ENGINE</DnaBadge>
      </div>
      <p className="mt-3 font-sans text-sm text-[var(--dna-muted)]">
        Select a lens stage to inspect how CRAYON illuminates primary text from sense to living
        action:
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SRGBL_V8_STAGES.map((stage, idx) => (
          <Button
            key={stage.stage}
            type="button"
            variant="plain"
            onClick={() => setSelectedSrgblIdx(idx)}
            className={`min-h-[44px] cursor-pointer border px-3 py-1.5 font-mono text-xs uppercase ${
              selectedSrgblIdx === idx
                ? "border-[var(--brand-blue)] bg-[var(--brand-blue)]/20 text-[var(--dna-text)]"
                : "border-[var(--dna-accent)]/25 text-[var(--dna-muted)] hover:border-[var(--brand-blue)]/60"
            }`}
          >
            {stage.stage}
          </Button>
        ))}
      </div>
      <div className="mt-4 space-y-2 border border-[var(--brand-blue)]/35 bg-[var(--dna-canvas)] p-4">
        <div className="font-mono text-xs uppercase text-[var(--brand-blue)]">
          {selectedSrgblStage.symbolicLayer}
        </div>
        <h5 className="font-monument text-lg text-[var(--dna-text)]">{selectedSrgblStage.title}</h5>
        <p className="font-serif text-base text-[var(--dna-text)]">
          {selectedSrgblStage.auditQuestion}
        </p>
      </div>
    </div>
  );
}

export function SinCanConsole() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent-secondary)]/35 pb-3">
        <span className="font-monument text-sm uppercase tracking-[0.14em] text-[var(--dna-text)]">
          SIN CAN · BETTER HUMAN REFLECTION ARC
        </span>
        <DnaBadge>CANON EXPLORER · 4 STORY PANELS</DnaBadge>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DX_MANGA_FOUR_PANELS.map((panel) => (
          <div
            key={panel.panelNumber}
            className="border border-[var(--dna-accent-secondary)]/35 bg-[var(--dna-canvas)] p-3.5"
          >
            <div className="flex items-center justify-between font-mono text-xs text-[var(--dna-accent)]">
              <span>{panel.panelNumber}</span>
              <span>{panel.romajiSfx}</span>
            </div>
            <div className="font-monument mt-1 text-sm text-[var(--dna-text)]">{panel.title}</div>
            <p className="mt-1.5 font-sans text-sm text-[var(--dna-muted)]">{panel.meaning}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {SYAFAAT_BASE_STATES.map((stateItem) => (
          <span
            key={stateItem.state}
            className="border border-[var(--dna-accent-secondary)]/35 bg-[var(--dna-surface-elevated)] px-2.5 py-1 font-mono text-xs text-[var(--dna-text)]"
          >
            {stateItem.state}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MythosCaseConsole() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/30 pb-3">
        <span className="font-monument text-sm uppercase tracking-[0.14em] text-[var(--dna-text)]">
          MYTHOS · MFTL & SHARED CASE 001
        </span>
        <DnaBadge>CANON EXPLORER · DOM-02 / DOM-03</DnaBadge>
      </div>
      <p className="mt-3 font-sans text-sm text-[var(--dna-muted)]">
        {JERUSALEM_70CE_CASE_001.title} — cross-domain verification across four primary strands:
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {JERUSALEM_70CE_CASE_001.strands.map((strand) => (
          <div
            key={strand.domain}
            className="border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] p-3.5"
          >
            <div className="font-mono text-xs uppercase text-[var(--dna-accent)]">
              {strand.domain}
            </div>
            <p className="mt-1.5 font-sans text-sm text-[var(--dna-text)]">{strand.evidence}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-xs text-[var(--dna-success)]">
        VERDICT: {JERUSALEM_70CE_CASE_001.verdict}
      </p>
    </div>
  );
}

const AWS_GATES = [
  "SOURCE",
  "RULE",
  "JURISDICTION",
  "APPLICABILITY",
  "ARGUMENT",
  "REVIEW",
] as const;

export function AwsNormativeConsole() {
  const [selectedAwsStageIdx, setSelectedAwsStageIdx] = useState<number>(0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--brand-blue)]/30 pb-3">
        <span className="font-monument text-sm uppercase tracking-[0.14em] text-[var(--dna-text)]">
          ANGEL WITH SHOTGUN · AWS NORMATIVE ENGINE
        </span>
        <DnaBadge>CANON EXPLORER · DOM-05 LAW</DnaBadge>
      </div>
      <p className="mt-3 font-sans text-sm text-[var(--dna-accent)]">
        CORE INVARIANT: LEGAL TEXT ≠ APPLICABLE LAW WITHOUT FULL SCOPE VALIDATION
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {AWS_GATES.map((gate, idx) => (
          <Button
            key={gate}
            type="button"
            variant="plain"
            onClick={() => setSelectedAwsStageIdx(idx)}
            className={`min-h-[44px] cursor-pointer border px-3 py-1.5 font-mono text-xs uppercase ${
              selectedAwsStageIdx === idx
                ? "border-[var(--dna-accent)] bg-[var(--dna-accent)] font-bold text-[var(--dna-canvas)]"
                : "border-[var(--brand-blue)]/35 text-[var(--dna-text)] hover:border-[var(--dna-accent)]"
            }`}
          >
            0{idx + 1} · {gate}
          </Button>
        ))}
      </div>
      <div className="mt-4 border border-[var(--brand-blue)]/35 bg-[var(--dna-canvas)] p-4">
        <div className="font-mono text-xs uppercase text-[var(--brand-blue)]">
          ACTIVE GATE // 0{selectedAwsStageIdx + 1} · {AWS_GATES[selectedAwsStageIdx]}
        </div>
        <p className="mt-2 font-sans text-base text-[var(--dna-text)]">
          Every normative judgment traverses all six gates in sequence (Source, Rule, Jurisdiction,
          Applicability, Argument, and Review) before any obligation applies.
        </p>
      </div>
    </div>
  );
}
