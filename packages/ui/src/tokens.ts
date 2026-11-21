import type { CSSProperties } from "react";

export type ImperiumCssVars = CSSProperties & Record<`--${string}`, string>;

export function imperiumLumenCssVariables(): ImperiumCssVars {
  return {
    "--dna-canvas": "#070910",
    "--dna-surface": "#101420",
    "--dna-surface-elevated": "#171d2e",
    "--dna-text": "#f7f2e3",
    "--dna-muted": "#b8b09c",
    "--dna-border": "rgba(223, 192, 123, 0.28)",
    "--dna-accent": "#dfc07b",
    "--dna-accent-secondary": "#4f8cff",
    "--dna-success": "#34d399",
    "--dna-warning": "#f59e0b",
    "--dna-danger": "#f87171",
    "--brand-pink": "#ff4f9a",
    "--brand-blue": "#3b82f6",
    "--brand-ink": "#070910",
    "--brand-paper": "#f7f2e3",
    "--brand-yellow": "#facc15",
  };
}
