"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Slider } from "@moonwitness/ui";

const ROCKSOUL_PRESETS = [
  { label: "Octagram 8", points: 8, radius: 52, speed: 20 },
  { label: "Lote Rose 12", points: 12, radius: 62, speed: 28 },
  { label: "Crown 18", points: 18, radius: 74, speed: 38 },
] as const;

export function RocksoulMandalaConsole({ quietMode }: { quietMode: boolean }) {
  const [symmetryPoints, setSymmetryPoints] = useState<number>(12);
  const [orbitalRadiusRatio, setOrbitalRadiusRatio] = useState<number>(62);
  const [rotationSpeed, setRotationSpeed] = useState<number>(28);
  const rocksoulCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = rocksoulCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationId = 0;
    let phase = 0;

    const drawMandala = () => {
      const freezeMotion = quietMode || reducedMotionQuery.matches;
      if (!freezeMotion) {
        phase += rotationSpeed * 0.00045;
      }

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * (orbitalRadiusRatio / 185);

      ctx.clearRect(0, 0, width, height);

      const radialGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        4,
        centerX,
        centerY,
        baseRadius * 1.4,
      );
      radialGlow.addColorStop(0, "rgba(255, 241, 200, 0.26)");
      radialGlow.addColorStop(0.55, "rgba(214, 180, 108, 0.09)");
      radialGlow.addColorStop(1, "rgba(8, 10, 18, 0)");
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(phase);

      for (let i = 0; i < symmetryPoints; i += 1) {
        const angle = (i * Math.PI * 2) / symmetryPoints;
        ctx.save();
        ctx.rotate(angle);

        ctx.strokeStyle = "rgba(238, 208, 142, 0.58)";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.ellipse(baseRadius * 0.48, 0, baseRadius * 0.48, baseRadius * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();

        const nextAngle = ((i + 2) * Math.PI * 2) / symmetryPoints;
        ctx.strokeStyle = "rgba(255, 244, 214, 0.36)";
        ctx.beginPath();
        ctx.moveTo(baseRadius, 0);
        ctx.lineTo(
          Math.cos(nextAngle - angle) * baseRadius,
          Math.sin(nextAngle - angle) * baseRadius,
        );
        ctx.stroke();

        ctx.restore();
      }

      ctx.strokeStyle = "rgba(248, 234, 198, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(214, 180, 108, 0.42)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-phase * 0.7);
      const innerCount = Math.max(6, Math.floor(symmetryPoints / 2));
      for (let j = 0; j < innerCount; j += 1) {
        ctx.rotate((Math.PI * 2) / innerCount);
        ctx.strokeStyle = "rgba(255, 248, 230, 0.38)";
        ctx.lineWidth = 0.9;
        ctx.strokeRect(
          -baseRadius * 0.22,
          -baseRadius * 0.22,
          baseRadius * 0.44,
          baseRadius * 0.44,
        );
      }
      ctx.fillStyle = "rgba(255, 248, 230, 0.9)";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (!freezeMotion) {
        animationId = window.requestAnimationFrame(drawMandala);
      }
    };

    drawMandala();
    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [symmetryPoints, orbitalRadiusRatio, rotationSpeed, quietMode]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm uppercase tracking-[0.18em] text-[var(--dna-accent)]">
          ROCKSOUL DX · ASTROLABE DREAMFORGE ENGINE
        </span>
        <span className="font-mono text-xs text-[var(--dna-accent)]">
          {symmetryPoints}-FOLD GIRIH SYMMETRY
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 items-center gap-5 sm:grid-cols-12">
        <div className="flex justify-center sm:col-span-6">
          <canvas
            ref={rocksoulCanvasRef}
            width={440}
            height={320}
            aria-label="Rocksoul DX Generative Mandala Studio Canvas"
            className="h-52 w-full max-w-[280px] border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)]"
          />
        </div>
        <div className="space-y-4 sm:col-span-6">
          <div className="flex flex-wrap gap-1.5">
            {ROCKSOUL_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="plain"
                onClick={() => {
                  setSymmetryPoints(preset.points);
                  setOrbitalRadiusRatio(preset.radius);
                  setRotationSpeed(preset.speed);
                }}
                className={`min-h-[44px] cursor-pointer border px-3 py-1.5 font-mono text-[10px] uppercase transition-colors ${
                  symmetryPoints === preset.points && orbitalRadiusRatio === preset.radius
                    ? "border-[var(--dna-text)] bg-[var(--dna-accent)]/25 text-[var(--dna-text)]"
                    : "border-[var(--dna-accent)]/25 text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/60"
                }`}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div>
            <div className="flex justify-between font-mono text-xs text-[var(--dna-accent)]">
              <label htmlFor="symmetry-slider">Symmetry Fold</label>
              <span>{symmetryPoints} Points</span>
            </div>
            <Slider
              id="symmetry-slider"
              min={6}
              max={24}
              step={2}
              value={[symmetryPoints]}
              onValueChange={([v]) => setSymmetryPoints(v ?? 6)}
              aria-label="Symmetry Fold"
              className="mt-2"
            />
          </div>
          <div>
            <div className="flex justify-between font-mono text-xs text-[var(--dna-accent)]">
              <label htmlFor="radius-slider">Harmonic Aperture</label>
              <span>{orbitalRadiusRatio}%</span>
            </div>
            <Slider
              id="radius-slider"
              min={35}
              max={80}
              step={1}
              value={[orbitalRadiusRatio]}
              onValueChange={([v]) => setOrbitalRadiusRatio(v ?? 35)}
              aria-label="Harmonic Aperture"
              className="mt-2"
            />
          </div>
          <div>
            <div className="flex justify-between font-mono text-xs text-[var(--dna-accent)]">
              <label htmlFor="velocity-slider">Sidereal Velocity</label>
              <span>{rotationSpeed} rad/s</span>
            </div>
            <Slider
              id="velocity-slider"
              min={0}
              max={80}
              step={1}
              value={[rotationSpeed]}
              onValueChange={([v]) => setRotationSpeed(v ?? 0)}
              aria-label="Sidereal Velocity"
              className="mt-2"
            />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--dna-accent)]/15 pt-3 font-mono text-[10px] text-[var(--dna-muted)]">
        <span className="text-[var(--dna-accent)]">
          DESKTOP WORKBENCH · LOCAL SQLITE ENGINE · SPATIAL STAGE
        </span>
        <span>SSOT: @MOONWITNESS/CANON</span>
      </div>
    </div>
  );
}
