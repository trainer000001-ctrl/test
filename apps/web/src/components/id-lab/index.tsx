"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createAvatar,
  PALETTES,
  WITNESS_BACKGROUNDS,
  type BackgroundName,
  type PaletteName,
} from "@moonwitness/avatars";
import { DnaBrandLogo, SkinOrnament, Sticker } from "@moonwitness/ui";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";
import { savedOptions, savedSeed, useAvatarStore } from "@/lib/avatar-store";
import { useCurrentIdentity } from "@/lib/session";
import { IdLabControlDeck } from "./id-lab-control-deck";
import { IdLabPreviewStage, SEED_POOL } from "./id-lab-preview";

function slugify(seed: string): string {
  return (
    seed
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "witness"
  );
}

export function IdLab() {
  const [seed, setSeed] = useState("Rezza");
  const [palette, setPalette] = useState<PaletteName>("street");
  const [background, setBackground] = useState<BackgroundName>("ink");
  const [size, setSize] = useState(192);
  const [radius, setRadius] = useState(18);
  const [halftone, setHalftone] = useState(true);
  const [crown, setCrown] = useState(true);
  const [moon, setMoon] = useState(true);
  const [tape, setTape] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const previewRef = useRef<HTMLImageElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = useCurrentIdentity();
  const identity = session?.identity ?? "Creator // Empire";
  const { saved, storageAvailable, apply, reset: resetStore } = useAvatarStore(identity);

  useEffect(() => {
    const s = savedSeed(saved);
    const o = savedOptions(saved);
    setSeed(s);
    setPalette(o.palette);
    setBackground(o.background);
    setRadius(o.radius);
    setHalftone(o.halftone);
    setCrown(o.crown);
    setMoon(o.moon);
    setTape(o.tape);
    setApplied(saved !== null);
  }, [saved]);

  const options = useMemo(
    () => ({ palette, background, radius, halftone, crown, moon, tape }),
    [palette, background, radius, halftone, crown, moon, tape],
  );

  const svg = useMemo(
    () => createAvatar({ seed, size: 512, ...options }).toString(),
    [seed, options],
  );

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const effectiveSeed = seed.trim() === "" ? "WITNESS" : seed;

  function randomSeed() {
    const next = SEED_POOL[Math.floor(Math.random() * SEED_POOL.length)] ?? "Witness";
    setSeed(`${next} ${Math.floor(Math.random() * 900 + 100)}`);
  }

  function randomizeAll() {
    randomSeed();
    setPalette(PALETTES[Math.floor(Math.random() * PALETTES.length)] ?? "street");
    setBackground(
      WITNESS_BACKGROUNDS[Math.floor(Math.random() * WITNESS_BACKGROUNDS.length)] ?? "ink",
    );
    setHalftone(Math.random() > 0.25);
    setCrown(Math.random() > 0.3);
    setMoon(Math.random() > 0.25);
    setTape(Math.random() > 0.55);
    setRadius([0, 12, 24, 50][Math.floor(Math.random() * 4)] ?? 0);
    flash("NEW FACE ROLLED");
  }

  function reset() {
    setSeed("Rezza");
    setPalette("street");
    setBackground("ink");
    setSize(192);
    setRadius(18);
    setHalftone(true);
    setCrown(true);
    setMoon(true);
    setTape(false);
    flash("BACK TO DEFAULT");
  }

  function applyAvatar() {
    const ok = apply(seed, {
      palette,
      background,
      radius,
      halftone,
      crown,
      moon,
      tape,
    });
    if (ok) {
      setApplied(true);
      flash("AVATAR SAVED TO PROFILE");
    } else {
      flash("STORAGE BLOCKED \u2014 AVATAR NOT SAVED");
    }
  }

  function resetToDefault() {
    const ok = resetStore();
    if (ok) {
      setSeed(savedSeed(null));
      const o = savedOptions(null);
      setPalette(o.palette);
      setBackground(o.background);
      setRadius(o.radius);
      setHalftone(o.halftone);
      setCrown(o.crown);
      setMoon(o.moon);
      setTape(o.tape);
      setApplied(false);
      flash("BACK TO DEFAULT");
    } else {
      flash("STORAGE BLOCKED \u2014 CANNOT RESET");
    }
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function exportSvg() {
    download(new Blob([svg], { type: "image/svg+xml" }), `witness-${slugify(effectiveSeed)}.svg`);
    flash("SVG EXPORTED");
  }

  function exportPng() {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 1024, 1024);
      canvas.toBlob((blob) => {
        if (!blob) return;
        download(blob, `witness-${slugify(effectiveSeed)}.png`);
        flash("PNG EXPORTED — 1024px");
      }, "image/png");
    };
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  async function copySvg() {
    try {
      await navigator.clipboard.writeText(svg);
      flash("SVG COPIED TO CLIPBOARD");
    } catch {
      flash("CLIPBOARD BLOCKED — USE DOWNLOAD");
    }
  }

  return (
    <ConsoleShellAdapter
      plane="creator"
      breadcrumb="ID Lab"
      search={{ value: query, onChange: setQuery, placeholder: "Search the lab notes…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <DnaBrandLogo id="id-lab" variant="stamp" size={32} decorative />
            <h1 className="font-brush text-3xl text-[var(--foreground)] sm:text-4xl">
              ID <span className="text-[var(--primary)]">LAB</span>
            </h1>
            <p className="mt-1 max-w-xl font-hand text-xl text-[var(--muted-foreground)]">
              Every witness gets a face. Same seed, same face — printed in our own ink.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SkinOrnament slot="tag" label={`${PALETTES.length} PALETTES`} />
            <Sticker tone="yellow" className="-rotate-2 px-3 py-1 font-brush text-xs">
              DICEBEAR ENGINE × MOONWITNESS DNA
            </Sticker>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <IdLabPreviewStage
            seed={seed}
            effectiveSeed={effectiveSeed}
            size={size}
            svg={svg}
            options={options}
            previewRef={previewRef}
            onSelectSeed={setSeed}
            onExportSvg={exportSvg}
            onExportPng={exportPng}
            onCopySvg={copySvg}
          />
          <IdLabControlDeck
            seed={seed}
            palette={palette}
            background={background}
            size={size}
            radius={radius}
            halftone={halftone}
            crown={crown}
            moon={moon}
            tape={tape}
            applied={applied}
            storageAvailable={storageAvailable}
            onSeedChange={setSeed}
            onRandomSeed={randomSeed}
            onPaletteChange={setPalette}
            onBackgroundChange={setBackground}
            onSizeChange={setSize}
            onRadiusChange={setRadius}
            onHalftoneChange={setHalftone}
            onCrownChange={setCrown}
            onMoonChange={setMoon}
            onTapeChange={setTape}
            onRandomizeAll={randomizeAll}
            onReset={reset}
            onApply={applyAvatar}
            onResetToDefault={resetToDefault}
          />
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="sticker sticker-yellow fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-5 py-2.5 font-brush text-sm"
        >
          {toast}
        </div>
      )}
    </ConsoleShellAdapter>
  );
}
