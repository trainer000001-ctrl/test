"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@moonwitness/ui";
import { DnaButton } from "@moonwitness/ui/imperium";
import {
  DHGS_13_STEPS,
  QUARANTINED_AMBIGUITY_LEDGER,
  SOVEREIGN_ENGINE_SPECS,
} from "@/data/empire-canon-codex";
import { MTimeInteractiveEngine } from "../mtime-observatory";

export function DhgsAndMTimeSimulator() {
  const [activeStepNum, setActiveStepNum] = useState<number>(1);
  const activeStep = DHGS_13_STEPS.find((s) => s.stepNumber === activeStepNum) ?? DHGS_13_STEPS[0]!;

  return (
    <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
          DHGS 13-STEP ASSURANCE LOOP &amp; MCLOCK-1 TEMPORAL INSPECTOR
        </span>
        <span className="font-mono text-[11px] text-[var(--dna-accent)]">
          RECEIVE → ... → LEARN · {SOVEREIGN_ENGINE_SPECS.mTime.version}
        </span>
      </div>

      {/* DHGS 13-Step Stepper */}
      <div>
        <div className="flex flex-wrap gap-1.5">
          {DHGS_13_STEPS.map((step) => {
            const active = step.stepNumber === activeStep.stepNumber;
            return (
              <Button
                key={step.code}
                type="button"
                variant="plain"
                aria-pressed={active}
                onClick={() => setActiveStepNum(step.stepNumber)}
                className={`min-h-[44px] border px-2.5 py-1.5 font-mono text-[10px] cursor-pointer ${
                  active
                    ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                    : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/50"
                }`}
              >
                {String(step.stepNumber).padStart(2, "0")} {step.code}
              </Button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 sm:grid-cols-3">
          <div>
            <div className="font-mono text-[10px] text-[var(--dna-accent)]">ACTIVE GATE STEP</div>
            <div className="font-monument mt-1 text-base text-[var(--dna-text)]">
              {String(activeStep.stepNumber).padStart(2, "0")} · {activeStep.code}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[var(--dna-accent)]">REQUIRED ACTION</div>
            <p className="mt-1 text-xs text-[var(--dna-muted)]">{activeStep.action}</p>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[var(--dna-accent)]">INVARIANT PURPOSE</div>
            <p className="mt-1 text-xs text-[var(--dna-accent)]">{activeStep.purpose}</p>
          </div>
        </div>
      </div>

      {/* Live M-Time Explainable Observatory Engine (Antikythera Port) */}
      <div className="border-t border-[var(--dna-accent)]/20 pt-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-mono text-[10.5px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
            ANTIKYTHERA M-TIME · LIVE ASTRONOMICAL &amp; CRITERION ENGINE
          </div>
          <DnaButton
            asChild
            tone="secondary"
            className="min-h-0 inline-flex items-center px-3.5 py-1 font-mono text-[10px] text-[var(--dna-accent)] uppercase"
          >
            <Link href="/mtime">OPEN FULL M-TIME PAGE &rsaquo;</Link>
          </DnaButton>
        </div>
        <MTimeInteractiveEngine compact />
      </div>
    </div>
  );
}

export function QuarantinedLedgerPanel() {
  return (
    <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
          QUARANTINED AMBIGUITY &amp; PROVENANCE LEDGER (§VII)
        </span>
        <span className="font-mono text-[11px] text-[var(--dna-accent)]">
          ZERO SILENT FABRICATION · EXPLICIT UNKNOWN DISCLOSURE
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUARANTINED_AMBIGUITY_LEDGER.map((item) => (
          <div
            key={item.id}
            className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-4"
          >
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-[var(--dna-accent)]">{item.id.toUpperCase()}</span>
              <span className="border border-[var(--dna-accent)]/40 bg-[var(--dna-surface)] px-2 py-0.5 text-[var(--dna-accent)]">
                {item.classification}
              </span>
            </div>
            <h5 className="font-monument mt-1.5 text-xs sm:text-sm text-[var(--dna-text)]">
              {item.title}
            </h5>
            <p className="mt-1 text-xs text-[var(--dna-muted)]">{item.detail}</p>
            <div className="mt-2 border-t border-[var(--dna-accent)]/15 pt-2 font-mono text-[10.5px] text-[var(--dna-accent)]">
              RULE // {item.rule}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
