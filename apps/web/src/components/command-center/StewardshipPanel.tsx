"use client";

import { useState } from "react";
import { ZineButton } from "@moonwitness/ui";
import {
  CENTER_100_STEWARDSHIP_CLUSTERS,
  DHGS_13_STEPS,
  PRIME_CODE_AXIOMS,
  WINGS_TEN_ARRAY,
} from "@moonwitness/canon";

export function StewardshipPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      aria-label="Empire Stewardship and WINGS 10 Matrix"
      className="mt-6 border-2 border-[var(--border)] bg-[var(--card)] p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--primary)]">
            @MOONWITNESS/CANON · GOVERNANCE TAXONOMY (PROPOSED_NOT_ASSIGNED)
          </p>
          <h2 className="mt-1 font-brush text-2xl text-[var(--foreground)]">
            WINGS 10 · PRIME CODE (PC01–PC09) · 100CENTER · DHGS
          </h2>
        </div>
        <ZineButton
          type="button"
          tone="blue"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
          className="min-h-11 px-4 py-2 text-xs"
        >
          {expanded ? "HIDE STEWARDSHIP MATRIX" : "OPEN STEWARDSHIP MATRIX"}
        </ZineButton>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-[var(--border)] pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {WINGS_TEN_ARRAY.map((wing) => (
              <div
                key={wing.code}
                data-wing-card={wing.code}
                className="min-w-0 overflow-hidden border border-[var(--border)] bg-[var(--muted)]/60 p-3"
              >
                <div className="font-mono text-[10px] text-[var(--primary)] break-words">
                  {wing.code} · {wing.callsign}
                </div>
                <div className="mt-1 text-xs font-semibold text-[var(--foreground)] break-words">
                  {wing.domainRole}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)] break-all sm:break-words [overflow-wrap:anywhere]">
                  {wing.architecturalDuty}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="border border-[var(--border)] bg-[var(--muted)]/60 p-4 space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
                PRIME CODE PC01–PC09 &amp; 100CENTER ({CENTER_100_STEWARDSHIP_CLUSTERS.length}{" "}
                CLUSTERS)
              </div>
              <div className="grid gap-1.5 sm:grid-cols-3">
                {PRIME_CODE_AXIOMS.map((ax) => (
                  <div key={ax.code} className="border border-[var(--border)] bg-[var(--card)] p-2">
                    <div className="font-mono text-[10px] text-[var(--primary)]">
                      {ax.code} · {ax.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                      {ax.statement}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[var(--border)] bg-[var(--muted)]/60 p-4 space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
                DHGS 13-STEP ASSURANCE LOOP (RECEIVE → LEARN)
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {DHGS_13_STEPS.map((step) => (
                  <div
                    key={step.code}
                    className="border border-[var(--border)] bg-[var(--card)] p-2"
                  >
                    <div className="font-mono text-[10px] text-[var(--primary)]">
                      {String(step.stepNumber).padStart(2, "0")} {step.code}
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                      {step.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
