"use client";

import { DnaButton } from "@moonwitness/ui/imperium";

export interface ChamberWingOption<T extends string> {
  readonly id: T;
  readonly code: string;
  readonly label: string;
}

/**
 * Shared architectural sub-tab bar dividing each Codex Door into serene gallery wings.
 */
export function ChamberWingTabs<T extends string>({
  wings,
  activeWing,
  onSelectWing,
  ariaLabel,
  quietMode = false,
}: {
  readonly wings: readonly ChamberWingOption<T>[];
  readonly activeWing: T;
  readonly onSelectWing: (id: T) => void;
  readonly ariaLabel: string;
  readonly quietMode?: boolean;
}) {
  const transitionClass = quietMode ? "transition-none" : "transition-colors duration-150";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="grid grid-cols-1 gap-2 border-b border-[var(--dna-accent)]/20 pb-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      {wings.map((wing) => {
        const isActive = wing.id === activeWing;
        return (
          <DnaButton
            key={wing.id}
            type="button"
            tone="secondary"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectWing(wing.id)}
            className={`h-auto flex-col items-stretch justify-start gap-0 px-4 py-2.5 text-left ${transitionClass} ${
              isActive
                ? "text-[var(--dna-text)]"
                : "text-[var(--dna-muted)] hover:text-[var(--dna-text)]"
            }`}
          >
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)]">
              <span>{wing.code}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rotate-45 bg-[var(--dna-text)] shadow-[0_0_8px_var(--dna-text)]"
                />
              )}
            </div>
            <div className="font-monument mt-0.5 text-xs tracking-[0.08em] uppercase">
              {wing.label}
            </div>
          </DnaButton>
        );
      })}
    </div>
  );
}
