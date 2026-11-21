"use client";

import {
  DHGS_13_STEPS,
  type evaluateDhgsAssuranceLoop,
  type queryOxDxHierarchy,
  type tokenizeAndParseAqel,
} from "@moonwitness/canon";
import { Button, Input, Textarea } from "@moonwitness/ui";

type OxdxHit = ReturnType<typeof queryOxDxHierarchy>[number];
type DhgsResult = ReturnType<typeof evaluateDhgsAssuranceLoop>;
type AqelResult = ReturnType<typeof tokenizeAndParseAqel>;

export function OxDxDhgsTabPanel({
  oxdxQuery,
  oxdxHits,
  doneDhgsCodes,
  dhgsResult,
  onQueryChange,
  onToggleStep,
}: {
  readonly oxdxQuery: string;
  readonly oxdxHits: readonly OxdxHit[];
  readonly doneDhgsCodes: readonly string[];
  readonly dhgsResult: DhgsResult;
  readonly onQueryChange: (value: string) => void;
  readonly onToggleStep: (code: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <label className="block font-mono text-[10px] text-[var(--dna-accent)]">
          QUERY OX-DX 49 ONTOLOGICAL LEVELS ({oxdxHits.length} MATCHED)
          <Input
            type="search"
            value={oxdxQuery}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Origin, Covenant, Sovereign, Physics, AI..."
            className="mt-1 min-h-0 w-full border border-[var(--dna-accent)]/35 bg-[var(--dna-canvas)] px-3 py-2 font-mono text-xs text-[var(--dna-text)] focus:outline-none"
          />
        </label>
        <div className="max-h-56 overflow-y-auto border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-3 space-y-1.5">
          {oxdxHits.slice(0, 14).map((hit, idx) => (
            <div
              key={`${hit.zoneIndex}-${hit.level}-${idx}`}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/10 pb-1.5 font-mono text-[10.5px]"
            >
              <span className="text-[var(--dna-accent)]">
                Z0{hit.zoneIndex} · {hit.zoneName}
              </span>
              <span className="text-[var(--dna-muted)]">{hit.level}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-2.5">
          <span className="font-mono text-[10.5px] text-[var(--dna-accent)]">
            DHGS 13-STEP VERIFICATION LOOP ({dhgsResult.completedCount}/{dhgsResult.totalSteps})
          </span>
          <span
            className={`border px-2 py-0.5 font-mono text-[10px] font-bold ${
              dhgsResult.status === "VERIFIED_LOOP"
                ? "border-[var(--dna-success)]/50 bg-[var(--dna-success)]/10 text-[var(--dna-success)]"
                : "border-[var(--dna-accent)]/40 bg-[var(--dna-accent)]/10 text-[var(--dna-accent)]"
            }`}
          >
            {dhgsResult.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DHGS_13_STEPS.map((step) => {
            const checked = doneDhgsCodes.includes(step.code);
            return (
              <Button
                key={step.code}
                type="button"
                variant="plain"
                aria-pressed={checked}
                onClick={() => onToggleStep(step.code)}
                className={`px-2 py-1 font-mono text-[9.5px] cursor-pointer ${
                  checked
                    ? "border border-[var(--dna-success)]/60 bg-[var(--dna-success)]/15 text-[var(--dna-success)]"
                    : "border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] text-[var(--dna-muted)]"
                }`}
              >
                {String(step.stepNumber).padStart(2, "0")}·{step.code}
              </Button>
            );
          })}
        </div>
        <div className="font-mono text-[10.5px] text-[var(--dna-muted)]">
          NEXT REQUIRED STEP: {dhgsResult.nextRequiredStep ?? "COMPLETE · LOOP VERIFIED"}
        </div>
      </div>
    </div>
  );
}

export function AqelTabPanel({
  aqelSource,
  aqelResult,
  onSourceChange,
}: {
  readonly aqelSource: string;
  readonly aqelResult: AqelResult;
  readonly onSourceChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <label className="block font-mono text-[10px] text-[var(--dna-accent)]">
          AQEL v0.1 SOURCE BUFFER (DETERMINISTIC ARABIC-FIRST GRAMMAR)
          <Textarea
            dir="rtl"
            lang="ar"
            rows={7}
            value={aqelSource}
            onChange={(e) => onSourceChange(e.target.value)}
            className="mt-1 min-h-0 w-full border border-[var(--dna-accent)]/35 bg-[var(--dna-canvas)] p-3 font-serif text-base leading-relaxed text-[var(--dna-text)] focus:outline-none"
          />
        </label>
      </div>
      <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-2.5 font-mono text-[10.5px]">
          <span className="text-[var(--dna-accent)]">
            TOKENS: {aqelResult.tokens.length} · AST STATEMENTS: {aqelResult.statements.length}
          </span>
          <span className="text-[var(--dna-success)]">
            DIAGNOSTICS: {aqelResult.diagnostics.length} ERRORS
          </span>
        </div>
        <div className="space-y-1.5">
          {aqelResult.statements.map((st, idx) => (
            <div
              key={`${st.line}-${idx}`}
              className="flex flex-wrap items-center justify-between gap-2 border border-[var(--dna-accent)]/20 bg-[var(--dna-surface)] px-3 py-1.5 font-mono text-[11px]"
            >
              <span className="text-[var(--dna-accent)]">
                L{st.line} · KEYWORD [{st.keyword}]
              </span>
              <span dir="rtl" lang="ar" className="text-[var(--dna-text)]">
                {st.target}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {aqelResult.tokens.slice(0, 18).map((tok, i) => (
            <span
              key={i}
              className="border border-[var(--dna-accent)]/20 bg-[var(--dna-surface)] px-2 py-0.5 font-mono text-[9.5px] text-[var(--dna-muted)]"
            >
              {tok.kind}: {tok.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
