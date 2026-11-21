"use client";

import type { ReactNode } from "react";
import {
  PALETTES,
  WITNESS_BACKGROUNDS,
  WITNESS_PALETTES,
  type BackgroundName,
  type PaletteName,
} from "@moonwitness/avatars";
import { Button, Slider, ZineButton, ZineCardRough, ZineInput } from "@moonwitness/ui";

const BG_LABEL: Record<BackgroundName, string> = {
  ink: "INK",
  paper: "PAPER",
  transparent: "CLEAR",
};

function Control({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="border-b border-dashed border-[var(--border)] px-4 py-3 last:border-b-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted-foreground)]">
          {label}
        </span>
        {hint && <span className="font-hand text-sm text-[var(--primary)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  render,
  ariaLabel,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  render?: (v: T) => ReactNode;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <Button
          key={opt}
          type="button"
          variant="plain"
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          className={`min-h-9 border-2 px-2.5 text-[10px] font-bold tracking-wider transition-all ${
            value === opt
              ? "border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]"
              : "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:border-[var(--pink)] hover:text-[var(--foreground)]"
          }`}
        >
          {render ? render(opt) : opt.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}

function LabSwitchToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Button
      type="button"
      variant="plain"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-9 w-full items-center justify-between gap-2 border-2 border-[var(--border)] bg-[var(--muted)] px-3 py-1.5 text-left transition-colors hover:border-[var(--pink)]"
    >
      <span className="text-[10px] font-bold tracking-wider text-[var(--foreground)]">{label}</span>
      <span
        className={`relative h-4 w-8 shrink-0 rounded-full border transition-colors ${
          checked
            ? "border-[var(--primary)] bg-[var(--primary)]"
            : "border-[var(--border)] bg-[var(--muted)]"
        }`}
      >
        <span
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-all ${
            checked
              ? "left-[18px] bg-[var(--primary-foreground)]"
              : "left-[3px] bg-[var(--muted-foreground)]"
          }`}
        />
      </span>
    </Button>
  );
}

export interface IdLabControlDeckProps {
  seed: string;
  palette: PaletteName;
  background: BackgroundName;
  size: number;
  radius: number;
  halftone: boolean;
  crown: boolean;
  moon: boolean;
  tape: boolean;
  applied: boolean;
  storageAvailable: boolean;
  onSeedChange: (seed: string) => void;
  onRandomSeed: () => void;
  onPaletteChange: (palette: PaletteName) => void;
  onBackgroundChange: (bg: BackgroundName) => void;
  onSizeChange: (size: number) => void;
  onRadiusChange: (radius: number) => void;
  onHalftoneChange: (checked: boolean) => void;
  onCrownChange: (checked: boolean) => void;
  onMoonChange: (checked: boolean) => void;
  onTapeChange: (checked: boolean) => void;
  onRandomizeAll: () => void;
  onReset: () => void;
  onApply: () => void;
  onResetToDefault: () => void;
}

export function IdLabControlDeck({
  seed,
  palette,
  background,
  size,
  radius,
  halftone,
  crown,
  moon,
  tape,
  applied,
  storageAvailable,
  onSeedChange,
  onRandomSeed,
  onPaletteChange,
  onBackgroundChange,
  onSizeChange,
  onRadiusChange,
  onHalftoneChange,
  onCrownChange,
  onMoonChange,
  onTapeChange,
  onRandomizeAll,
  onReset,
  onApply,
  onResetToDefault,
}: IdLabControlDeckProps) {
  return (
    <div className="lg:sticky lg:top-20 lg:self-start">
      <ZineCardRough className="relative">
        <div className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-3">
          <h2 className="font-brush text-base text-[var(--foreground)]">
            CONTROL <span className="text-[var(--primary)]">DECK</span>
          </h2>
          <span className="text-[9px] tracking-[0.2em] text-[var(--muted-foreground)]">LIVE</span>
        </div>

        <Control label="SEED" hint="same seed = same face">
          <div className="flex gap-2">
            <ZineInput
              value={seed}
              onChange={(e) => onSeedChange(e.target.value)}
              placeholder="Type any name…"
              aria-label="Avatar seed"
              className="min-h-10 flex-1"
            />
            <ZineButton
              tone="pink"
              onClick={onRandomSeed}
              className="min-h-10 px-3 text-xs"
              aria-label="Random seed"
            >
              ⤳
            </ZineButton>
          </div>
        </Control>

        <Control label="PALETTE" hint={WITNESS_PALETTES[palette].label}>
          <div role="group" aria-label="Palette" className="grid grid-cols-2 gap-1.5">
            {PALETTES.map((name) => {
              const p = WITNESS_PALETTES[name];
              return (
                <Button
                  key={name}
                  type="button"
                  variant="plain"
                  onClick={() => onPaletteChange(name)}
                  aria-pressed={palette === name}
                  className={`flex min-h-10 items-center justify-start gap-2 border-2 px-2 text-[9px] font-bold tracking-wider transition-all ${
                    palette === name
                      ? "border-[var(--yellow)] bg-[var(--card)] text-[var(--foreground)]"
                      : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:border-[var(--pink)]"
                  }`}
                >
                  <span className="flex shrink-0 -space-x-1">
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black"
                      style={{ background: p.accent }}
                    />
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black"
                      style={{ background: p.accent2 }}
                    />
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black"
                      style={{ background: p.crown }}
                    />
                  </span>
                  {p.label.toUpperCase()}
                </Button>
              );
            })}
          </div>
        </Control>

        <Control label="BACKGROUND">
          <Segmented
            value={background}
            options={WITNESS_BACKGROUNDS}
            onChange={onBackgroundChange}
            ariaLabel="Background"
            render={(v) => BG_LABEL[v]}
          />
        </Control>

        <Control label="PREVIEW SIZE" hint={`${size}px`}>
          <Slider
            min={64}
            max={288}
            step={8}
            value={[size]}
            onValueChange={([v]) => onSizeChange(v ?? 64)}
            aria-label="Preview size"
            className="mt-2"
          />
        </Control>

        <Control label="CORNER CUT" hint={radius === 50 ? "CIRCLE" : `${radius}%`}>
          <Slider
            min={0}
            max={50}
            step={1}
            value={[radius]}
            onValueChange={([v]) => onRadiusChange(v ?? 0)}
            aria-label="Corner radius"
            className="mt-2"
          />
        </Control>

        <Control label="ZINE LAYERS">
          <div className="space-y-1.5">
            <LabSwitchToggle label="HALFTONE DOTS" checked={halftone} onChange={onHalftoneChange} />
            <LabSwitchToggle label="CROWN" checked={crown} onChange={onCrownChange} />
            <LabSwitchToggle label="BIG MOON" checked={moon} onChange={onMoonChange} />
            <LabSwitchToggle label="TAPE" checked={tape} onChange={onTapeChange} />
          </div>
        </Control>

        <div className="grid grid-cols-2 gap-2 px-4 py-4">
          <ZineButton tone="yellow" onClick={onRandomizeAll} className="min-h-11 text-sm">
            RANDOMIZE
          </ZineButton>
          <ZineButton tone="paper" onClick={onReset} className="min-h-11 text-sm">
            RESET PREVIEW
          </ZineButton>
          <ZineButton tone="pink" onClick={onApply} className="col-span-2 min-h-11 px-4 text-sm">
            GUNAKAN AVATAR
          </ZineButton>
          <ZineButton
            tone="paper"
            onClick={onResetToDefault}
            className="col-span-2 min-h-11 px-4 text-sm"
            disabled={!applied}
          >
            KEMBALI KE AVATAR DEFAULT
          </ZineButton>
        </div>

        <div className="border-t-2 border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                applied
                  ? "border-[var(--yellow)] bg-[var(--yellow)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${applied ? "bg-[var(--primary)]" : "bg-[var(--muted-foreground)]"}`}
              />
              {applied ? "TERPASANG" : "DRAFT"}
            </span>
            <span className="text-[9px] tracking-[0.2em] text-[var(--muted-foreground)]">
              LOKAL DI BROWSER
            </span>
          </div>
          <p className="mt-2 font-hand text-base leading-snug text-[var(--muted-foreground)]">
            {applied
              ? "Wajah ini yang tampil di topbar profilmu."
              : "Eksperimen di sini belum mengubah profilmu — tekan Gunakan Avatar untuk memasangnya."}
          </p>
          {!storageAvailable && (
            <p className="mt-2 border border-[var(--pink)]/60 bg-[var(--pink)]/10 px-3 py-2 text-xs text-[var(--primary)]">
              Penyimpanan lokal tidak tersedia — avatar tidak bisa disimpan di browser ini.
            </p>
          )}
        </div>
      </ZineCardRough>
      <p className="mt-3 px-1 font-hand text-lg leading-snug text-[var(--muted-foreground)]">
        Built on the DiceBear engine, redrawn in MoonWitness ink: halftone, torn edges, crowns and
        the big blue moon. One seed, one witness — everywhere in the empire.
      </p>
    </div>
  );
}
