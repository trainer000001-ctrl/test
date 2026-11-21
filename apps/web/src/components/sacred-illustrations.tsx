import type { ReactNode } from "react";
import Image from "next/image";
import { Button } from "@moonwitness/ui";
import { WORLD_ART_PLATES as ASSET_WORLD_PLATES, type WorldPlateKey } from "@moonwitness/assets";
import {
  DoorPortalVector,
  GatewayWaveformVector,
  MeridianArcLines,
  SacredCornerBrackets,
} from "@moonwitness/ui/imperium";
import type { EntryDoorId } from "@/data/empire-canon-codex";
import type { DockNodeTelemetry, WorldIdentifier } from "@/data/empire-registry";
import { artPlateSrc } from "@/lib/art";

export { SacredCornerBrackets };

/**
 * Architectural fine-art plate for the 4 DX Narrative Panels (Zero Human Faces).
 */
export function StoryPlateGeometrySvg({
  panelNumber,
  accentHex,
}: {
  readonly panelNumber: string;
  readonly accentHex: string;
}) {
  const plateKey: WorldPlateKey = panelNumber.includes("01")
    ? "story-plate-01"
    : panelNumber.includes("02")
      ? "story-plate-02"
      : panelNumber.includes("03")
        ? "story-plate-03"
        : "story-plate-04";
  const plateSrc = artPlateSrc(plateKey);

  return (
    <div
      aria-hidden="true"
      className="relative aspect-[16/9] w-full overflow-hidden border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] shadow-[inset_0_0_22px_rgba(0,0,0,0.85)]"
    >
      <Image
        src={plateSrc}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 42%, transparent 38%, rgba(4,5,9,0.78) 100%), linear-gradient(180deg, rgba(4,5,9,0.28) 0%, transparent 40%, rgba(4,5,9,0.82) 100%)`,
          boxShadow: `inset 0 0 0 1px ${accentHex}26`,
        }}
      />
      <span
        className="pointer-events-none absolute top-1.5 left-1.5 h-2 w-2 border-t border-l"
        style={{ borderColor: accentHex }}
      />
      <span
        className="pointer-events-none absolute right-1.5 bottom-1.5 h-2 w-2 border-r border-b"
        style={{ borderColor: accentHex }}
      />
    </div>
  );
}

/**
 * Interactive 99 + 1 = 100CENTER concentric orbital artwork (Monocentric Tawhid Topology).
 */
export function Monocentric100CenterSvg({
  selectedClusterIndex,
}: {
  readonly selectedClusterIndex: number;
}) {
  const ringTier = Math.min(2, Math.max(0, Math.floor(selectedClusterIndex / 3)));
  const activeInsetClass =
    ringTier === 0
      ? "inset-12 border-[var(--dna-text)]/75"
      : ringTier === 1
        ? "inset-8 border-[var(--dna-text)]/75"
        : "inset-3.5 border-[var(--dna-text)]/75";

  return (
    <div
      role="img"
      aria-label="100CENTER orbital artwork showing 99 ethical reflections orbiting 1 Tawhid center"
      className="relative h-48 w-48 shrink-0 overflow-hidden rounded-full border border-[var(--dna-accent)]/45 bg-[var(--dna-canvas)] shadow-[0_0_38px_rgba(223,192,123,0.16)]"
    >
      <Image
        src={artPlateSrc("tawhid-100center-orb")}
        alt="100CENTER concentric pearl orb surrounded by three rings of 99 reflections"
        fill
        sizes="192px"
        className="object-cover scale-[1.08]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,transparent_48%,rgba(5,7,14,0.68)_88%,rgba(5,7,14,0.96)_100%)]"
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute rounded-full border shadow-[0_0_18px_rgba(255,244,210,0.45)] transition-all duration-500 ${activeInsetClass}`}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full border border-[var(--dna-accent)]/40 bg-[var(--dna-canvas)]/90 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-[var(--dna-text)] uppercase whitespace-nowrap"
      >
        RING 0{ringTier + 1} · {selectedClusterIndex + 1}/9
      </div>
    </div>
  );
}

/**
 * Interactive Meridian Constellation celestial horizon plate for Moonwitness Observatory corridors.
 */
export function MeridianConstellationMapSvg({
  meridians,
  activeIndex,
  onSelectMeridian,
}: {
  readonly meridians: readonly {
    readonly code: string;
    readonly city: string;
    readonly x: number;
    readonly y: number;
  }[];
  readonly activeIndex: number;
  readonly onSelectMeridian: (idx: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Moonwitness Celestial Meridian Observatory Corridors"
      className="relative h-44 sm:h-48 w-full overflow-hidden border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] shadow-[inset_0_0_28px_rgba(0,0,0,0.9)]"
    >
      <Image
        src={artPlateSrc("meridian-sky-chart")}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 520px"
        className="object-cover opacity-90"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--dna-canvas)]/50 via-[var(--dna-canvas)]/15 to-[var(--dna-canvas)]/82"
      />
      <MeridianArcLines meridians={meridians} activeIndex={activeIndex} />

      {meridians.map((node, idx) => {
        const selected = idx === activeIndex;
        const placePillAbove = node.y < 60;
        return (
          <Button
            key={node.code}
            type="button"
            variant="plain"
            aria-label={`Select observatory ${node.city}`}
            aria-pressed={selected}
            onClick={() => onSelectMeridian(idx)}
            style={{
              left: `${(node.x / 360) * 100}%`,
              top: `${(node.y / 132) * 100}%`,
            }}
            className="group absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center focus:outline-none cursor-pointer"
          >
            <span
              className={`relative flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-all duration-300 ${
                selected
                  ? "scale-125 border-[var(--dna-text)] bg-[var(--dna-text)] shadow-[0_0_16px_rgba(255,244,210,0.95)]"
                  : "border-[var(--dna-canvas)] bg-[var(--dna-accent)] shadow-[0_0_8px_rgba(223,192,123,0.6)] group-hover:scale-110 group-hover:bg-[var(--dna-text)]"
              }`}
            >
              {selected && (
                <span className="absolute -inset-2 rounded-full border border-[var(--dna-text)]/60 animate-ping" />
              )}
            </span>
            <span
              className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors backdrop-blur-sm ${
                placePillAbove ? "bottom-[calc(50%+12px)]" : "top-[calc(50%+12px)]"
              } ${
                selected
                  ? "border-[var(--dna-text)]/70 bg-[var(--dna-canvas)]/90 text-[var(--dna-text)]"
                  : "border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)]/78 text-[var(--dna-muted)] group-hover:border-[var(--dna-accent)]/60"
              }`}
            >
              {node.city}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Compact harmonic waveform SVG badge for Dock gateway telemetry cards.
 */
export function GatewayWaveformSvg({ variant = 0 }: { readonly variant?: number }) {
  return <GatewayWaveformVector variant={variant} />;
}

export function SanctuarySectionBackdrop({ children }: { readonly children: ReactNode }) {
  return <div className="bg-girih-filigree relative">{children}</div>;
}

const ORRERY_BEARINGS: Record<
  WorldIdentifier,
  { angleDeg: number; orbitRadius: number; shortName: string }
> = {
  arsy: { angleDeg: 0, orbitRadius: 136, shortName: "ARSY" },
  crayon: { angleDeg: 40, orbitRadius: 142, shortName: "CRAYON" },
  sidra: { angleDeg: 80, orbitRadius: 146, shortName: "SIDRA" },
  "angel-with-shotgun": { angleDeg: 120, orbitRadius: 142, shortName: "AWS" },
  "rocksoul-dx": { angleDeg: 160, orbitRadius: 146, shortName: "ROCKSOUL" },
  "human-pen": { angleDeg: 200, orbitRadius: 136, shortName: "HUMAN-PEN" },
  "sin-can": { angleDeg: 240, orbitRadius: 142, shortName: "SIN CAN" },
  moonwitness: { angleDeg: 280, orbitRadius: 144, shortName: "MOONWITNESS" },
  mythos: { angleDeg: 320, orbitRadius: 140, shortName: "MYTHOS" },
};

/**
 * Astronomical Astrolabe Orrery plotting the five gateway satellites over the fine-art brass astrolabe plate
 * with a motorized optical sighting ray toward the active gateway.
 */
export function AstrolabeOrreryMap({
  nodes,
  visibleCodes,
  selectedCode,
  quietMode = false,
  onSelectNode,
}: {
  readonly nodes: readonly DockNodeTelemetry[];
  readonly visibleCodes: ReadonlySet<string>;
  readonly selectedCode: string;
  readonly quietMode?: boolean;
  readonly onSelectNode: (nodeCode: string) => void;
}) {
  const cx = 220;
  const cy = 220;
  const selectedNode = nodes.find((node) => node.nodeCode === selectedCode) ?? nodes[0];
  const activeBearing = selectedNode ? (ORRERY_BEARINGS[selectedNode.worldId]?.angleDeg ?? 0) : 0;

  return (
    <div
      role="group"
      aria-label="Astronomical Astrolabe Orrery of the Five Empire Gateways"
      className="relative mx-auto aspect-square w-full max-w-[440px] select-none"
    >
      {/* Subtle rotating outer conic aura (clipped strictly inside circular bounds) */}
      {!quietMode && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        >
          <div
            className="conic-halo-ring h-full w-full rounded-full opacity-40"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(245,223,166,0.28) 24deg, transparent 78deg, rgba(223,192,123,0.16) 200deg, transparent 360deg)",
              maskImage:
                "radial-gradient(circle, transparent 60%, black 63%, black 72%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 60%, black 63%, black 72%, transparent 75%)",
            }}
          />
        </div>
      )}

      {/* Hand-crafted Brass & Obsidian Astrolabe Art Dial */}
      <div className="relative h-full w-full overflow-hidden rounded-full border border-[var(--dna-accent)]/45 bg-[var(--dna-canvas)] shadow-[0_0_64px_rgba(223,192,123,0.14),inset_0_0_40px_rgba(0,0,0,0.92)]">
        <Image
          src={artPlateSrc("astrolabe-orrery-plate")}
          alt=""
          fill
          loading="eager"
          sizes="(max-width: 640px) 92vw, 440px"
          className="object-cover scale-[1.03] opacity-90"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(4,5,9,0.22)_18%,rgba(4,5,9,0.48)_66%,rgba(4,5,9,0.9)_98%)]"
        />

        {/* Rotating Optical Sighting Ray */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            transform: `rotate(${activeBearing}deg)`,
            transition: quietMode ? "none" : "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            className="absolute top-[7%] left-1/2 h-[43%] w-8 -translate-x-1/2"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,244,210,0.45) 0%, rgba(245,223,166,0.16) 55%, transparent 100%)",
              clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
            }}
          />
          <div className="absolute top-[7%] left-1/2 h-[33%] w-px -translate-x-1/2 bg-gradient-to-b from-[var(--dna-text)] via-[var(--dna-accent)]/70 to-transparent" />
        </div>
      </div>

      {/* Cardinal Bearing Annotations */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-sm border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)]/90 px-2 py-0.5 font-mono text-[8.5px] tracking-[0.16em] text-[var(--dna-accent)]"
      >
        000° ZENITH
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-sm border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)]/90 px-2 py-0.5 font-mono text-[8.5px] tracking-[0.16em] text-[var(--dna-muted)]"
      >
        180° SOUTH
      </span>

      {/* Center Monocentric Unity Hub */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[var(--dna-text)]/55 bg-[var(--dna-canvas)]/88 text-center shadow-[0_0_28px_rgba(223,192,123,0.22)] backdrop-blur-sm"
      >
        <span className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[var(--dna-text)]">
          AL-NŪR
        </span>
        <span className="mt-0.5 font-mono text-[7.5px] tracking-[0.14em] text-[var(--dna-accent)] uppercase">
          ONE SOURCE
        </span>
      </div>

      {/* Orbiting Gateway Satellite Pin Controls */}
      {nodes.map((node) => {
        const spec = ORRERY_BEARINGS[node.worldId];
        const rad = ((spec.angleDeg - 90) * Math.PI) / 180;
        const leftPct = ((cx + Math.cos(rad) * spec.orbitRadius) / 440) * 100;
        const topPct = ((cy + Math.sin(rad) * spec.orbitRadius) / 440) * 100;
        const isSelected = node.nodeCode === selectedCode;
        const isVisible = visibleCodes.has(node.nodeCode);
        const placePillAbove = spec.angleDeg === 180;

        return (
          <Button
            key={node.nodeCode}
            type="button"
            variant="plain"
            aria-label={`Select ${spec.shortName} orbital gateway (${node.nodeCode})`}
            aria-pressed={isSelected}
            onClick={() => onSelectNode(node.nodeCode)}
            style={{
              left: `${leftPct.toFixed(2)}%`,
              top: `${topPct.toFixed(2)}%`,
              opacity: isVisible ? 1 : 0.28,
            }}
            className="group absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-opacity duration-300 focus:outline-none cursor-pointer"
          >
            <span
              className={`relative flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300 ${
                isSelected
                  ? "scale-125 border-[var(--dna-text)] bg-[var(--dna-surface)] shadow-[0_0_18px_rgba(255,244,210,0.8)]"
                  : "border-[var(--dna-accent)]/85 bg-[var(--dna-canvas)] group-hover:scale-110 group-hover:border-[var(--dna-text)]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isSelected ? "bg-[var(--dna-text)]" : "bg-[var(--dna-accent)]"}`}
              />
            </span>
            <span
              className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.12em] uppercase backdrop-blur-sm transition-colors ${
                placePillAbove ? "bottom-[calc(50%+14px)]" : "top-[calc(50%+14px)]"
              } ${
                isSelected
                  ? "border-[var(--dna-text)]/75 bg-[var(--dna-canvas)]/92 text-[var(--dna-text)]"
                  : "border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)]/82 text-[var(--dna-muted)] group-hover:border-[var(--dna-accent)]/60"
              }`}
            >
              {spec.shortName}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Architectural miniature portal glyph for each of the four Canon Entry Doors.
 */
export function DoorPortalGlyph({
  doorId,
  active = false,
}: {
  readonly doorId: EntryDoorId;
  readonly active?: boolean;
}) {
  return <DoorPortalVector doorId={doorId} active={active} />;
}

const WORLD_ART_PLATES: Record<WorldIdentifier, string> = {
  moonwitness: ASSET_WORLD_PLATES["meridian-sky-chart"].fallback,
  arsy: ASSET_WORLD_PLATES["astrolabe-orrery-plate"].fallback,
  "human-pen": ASSET_WORLD_PLATES["nonagram-sanctuary-dial"].fallback,
  sidra: ASSET_WORLD_PLATES["sidra-lote-constellation"].fallback,
  "rocksoul-dx": ASSET_WORLD_PLATES["story-plate-03"].fallback,
  crayon: ASSET_WORLD_PLATES["story-plate-01"].fallback,
  "sin-can": ASSET_WORLD_PLATES["story-plate-02"].fallback,
  mythos: ASSET_WORLD_PLATES["story-plate-04"].fallback,
  "angel-with-shotgun": ASSET_WORLD_PLATES["celestial-gate-bg"].fallback,
};

/**
 * Illuminated rounded antique brass astrolabe medallion seal (zero wireframe SVG).
 */
export function AstrolabeSealMedallion({
  className = "h-20 w-20",
  spin = false,
}: {
  readonly className?: string;
  readonly spin?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-full border border-[var(--dna-accent)]/45 bg-[var(--dna-canvas)] shadow-[0_0_26px_rgba(223,192,123,0.26)] ${className}`}
    >
      <Image
        src={artPlateSrc("astrolabe-orrery-plate")}
        alt=""
        fill
        loading="eager"
        sizes="120px"
        className={`object-cover scale-[1.08] ${spin ? "animate-spin-slow" : ""}`}
      />
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,transparent_45%,rgba(5,7,14,0.68)_100%)]" />
    </div>
  );
}

/**
 * Whisper-quiet world-specific fine-art plate watermark inside each World Sanctum chamber.
 */
export function WorldChamberWatermarkSvg({ worldId }: { readonly worldId: WorldIdentifier }) {
  const plateSrc = WORLD_ART_PLATES[worldId];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-2 bottom-2 h-52 w-64 overflow-hidden opacity-[0.16] sm:h-64 sm:w-80"
      style={{
        maskImage: "radial-gradient(circle at 72% 72%, black 18%, transparent 74%)",
        WebkitMaskImage: "radial-gradient(circle at 72% 72%, black 18%, transparent 74%)",
      }}
    >
      <Image src={plateSrc} alt="" fill sizes="320px" className="object-cover" />
    </div>
  );
}
