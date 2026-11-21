"use client";

import NextImage from "next/image";
import type { RefObject } from "react";
import { type BackgroundName, type PaletteName } from "@moonwitness/avatars";
import {
  Button,
  CutoutArtwork,
  SkinBackdrop,
  Tape,
  WitnessAvatar,
  ZineButton,
  ZineCard,
  ZineCardRough,
} from "@moonwitness/ui";
import { Crown } from "@moonwitness/ui/icons";

export const SEED_POOL = [
  "Zill",
  "Mara",
  "Kenji",
  "Amara",
  "Elias",
  "Nadia",
  "Ravi",
  "Rezza",
  "Bulan",
  "Saksi",
  "Neon Kid",
  "Fog Voice",
  "Night Shift",
  "Mirror",
  "Skyline",
  "Static",
] as const;

export interface AvatarDraftOptions {
  palette: PaletteName;
  background: BackgroundName;
  radius: number;
  halftone: boolean;
  crown: boolean;
  moon: boolean;
  tape: boolean;
}

interface IdLabPreviewStageProps {
  seed: string;
  effectiveSeed: string;
  size: number;
  svg: string;
  options: AvatarDraftOptions;
  previewRef: RefObject<HTMLImageElement | null>;
  onSelectSeed: (seed: string) => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onCopySvg: () => void;
}

export function IdLabPreviewStage({
  seed,
  effectiveSeed,
  size,
  svg,
  options,
  previewRef,
  onSelectSeed,
  onExportSvg,
  onExportPng,
  onCopySvg,
}: IdLabPreviewStageProps) {
  return (
    <div className="space-y-6">
      <ZineCardRough className="relative overflow-hidden p-6">
        <Tape className="-top-3 left-10 -rotate-3" />
        <div className="halftone relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-md bg-[var(--ink)] p-8">
          <SkinBackdrop seed={effectiveSeed.length} />
          <CutoutArtwork
            id="hardware-key"
            decorative
            className="pointer-events-none absolute right-3 bottom-3 h-20 w-20 text-[var(--primary)]/20"
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(46,168,255,0.16), transparent 55%), radial-gradient(circle at 75% 80%, rgba(255,45,120,0.14), transparent 55%)",
            }}
          />
          <NextImage
            ref={previewRef as React.Ref<HTMLImageElement>}
            key={`${effectiveSeed}-${options.palette}-${options.background}-${options.radius}-${options.halftone}-${options.crown}-${options.moon}-${options.tape}`}
            src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
            alt={`Preview avatar ${effectiveSeed}`}
            width={size}
            height={size}
            unoptimized
            className="avatar-pop relative drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)]"
            style={{ width: size, height: size }}
            draggable={false}
          />
          <span className="sticker sticker-pink absolute bottom-3 left-3 -rotate-2 px-3 py-1 font-hand text-base font-bold">
            {effectiveSeed.toUpperCase()}
          </span>
          <span className="absolute right-3 top-3 border border-[var(--border)] bg-[var(--card)]/90 px-2 py-1 text-[10px] tracking-widest text-[var(--muted-foreground)]">
            {size}×{size}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ZineButton tone="yellow" onClick={onExportSvg} className="min-h-11 px-4 text-sm">
            DOWNLOAD SVG
          </ZineButton>
          <ZineButton tone="blue" onClick={onExportPng} className="min-h-11 px-4 text-sm">
            DOWNLOAD PNG
          </ZineButton>
          <ZineButton tone="paper" onClick={onCopySvg} className="min-h-11 px-4 text-sm">
            COPY SVG
          </ZineButton>
          <span className="ml-auto hidden items-center gap-1.5 text-[10px] tracking-wider text-[var(--muted-foreground)] sm:flex">
            <Crown className="h-3 w-5 text-[var(--primary)]" />
            DETERMINISTIC BY SEED
          </span>
        </div>
      </ZineCardRough>

      <ZineCard className="p-5">
        <h2 className="mb-3 font-brush text-lg text-[var(--foreground)]">
          IN THE <span className="text-[var(--primary)]">WILD</span>
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="border border-[var(--border)] bg-[var(--muted)] p-3">
            <p className="mb-2 text-[9px] tracking-[0.2em] text-[var(--muted-foreground)]">
              TOPBAR
            </p>
            <div className="flex items-center gap-2">
              <WitnessAvatar
                seed={effectiveSeed}
                size={32}
                options={{ ...options, radius: 50 }}
                className="rounded-full border-2 border-[var(--pink)]"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[var(--foreground)]">
                  {effectiveSeed}
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Authorized crew</p>
              </div>
            </div>
          </div>
          <div className="border border-[var(--border)] bg-[var(--muted)] p-3">
            <p className="mb-2 text-[9px] tracking-[0.2em] text-[var(--muted-foreground)]">
              CREW CARD
            </p>
            <div className="flex items-center gap-2">
              <WitnessAvatar
                seed={effectiveSeed}
                size={44}
                options={{ ...options, radius: 50 }}
                className="rounded-full border-2 border-[var(--pink)]"
              />
              <div className="min-w-0">
                <p className="truncate font-brush text-sm text-[var(--foreground)]">
                  {effectiveSeed}
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Same sky</p>
              </div>
            </div>
          </div>
          <div className="border border-[var(--border)] bg-[var(--muted)] p-3">
            <p className="mb-2 text-[9px] tracking-[0.2em] text-[var(--muted-foreground)]">SIZES</p>
            <div className="flex items-end gap-2">
              {[20, 32, 48].map((s) => (
                <WitnessAvatar
                  key={s}
                  seed={effectiveSeed}
                  size={s}
                  options={{ ...options, radius: 50 }}
                  className="rounded-full"
                />
              ))}
            </div>
          </div>
        </div>
      </ZineCard>

      <ZineCard className="p-5">
        <h2 className="mb-3 font-brush text-lg text-[var(--foreground)]">
          CREW <span className="text-[var(--primary)]">ROLL</span>
          <span className="ml-2 font-hand text-base text-[var(--muted-foreground)]">
            tap a face to wear it
          </span>
        </h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {SEED_POOL.map((name) => (
            <Button
              key={name}
              type="button"
              variant="plain"
              onClick={() => onSelectSeed(name)}
              aria-pressed={seed === name}
              className={`group flex h-auto flex-col items-center gap-1 border-2 p-2 transition-all ${
                seed === name
                  ? "border-[var(--yellow)] bg-[var(--card)]"
                  : "border-transparent hover:border-[var(--pink)] hover:bg-[var(--muted)]"
              }`}
            >
              <WitnessAvatar
                seed={name}
                size={44}
                options={{ radius: 50 }}
                className="rounded-full transition-transform group-hover:scale-110"
              />
              <span className="w-full truncate text-center text-[9px] tracking-wider text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]">
                {name.toUpperCase()}
              </span>
            </Button>
          ))}
        </div>
      </ZineCard>
    </div>
  );
}
