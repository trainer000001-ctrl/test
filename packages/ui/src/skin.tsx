"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { HUD_NAV_ICON_PATHS } from "./icons";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SkinName =
  | "default"
  | "riot"
  | "editorial"
  | "technical"
  | "archive"
  | "transmission"
  | "sanctuary"
  | "atelier"
  | "mycelium"
  | "monolith";

export type MasterDnaId =
  | "01-imperium-lumen"
  | "02-codex-scriptorium"
  | "03-meridian-observatory"
  | "04-arsy-control"
  | "05-riot-anarchy"
  | "06-mycelium-garden"
  | "07-obsidian-monolith";

export type ThemeMode = "dark" | "light" | "system";
export type CanonicalDensity = "compact" | "comfortable" | "spacious";

export const BRAND_LOGO_IDS = [
  "01-imperium-lumen",
  "02-codex-scriptorium",
  "03-meridian-observatory",
  "04-arsy-control",
  "05-riot-anarchy",
  "06-mycelium-garden",
  "07-obsidian-monolith",
  "moonwitness",
  "noc-gateway",
  "arsy-radio",
  "human-pen",
  "sidra-graph",
  "rocksoul-dx",
  "crayon-rgbl",
  "sin-can",
  "mythos-mftl",
  "aws-law",
  "empire-seal",
] as const;

export type BrandLogoId = (typeof BRAND_LOGO_IDS)[number] | (string & {});

export const CUTOUT_ARTWORK_IDS = [
  "server-rack",
  "codex-scroll",
  "rooftop-antenna",
  "cassette-deck",
  "lunar-astrolabe",
  "compass-rose",
  "satellite-dish",
  "brass-lantern",
  "qalam-nib",
  "star-octagram",
  "tape-reel",
  "radio-tower",
  "prism-crystal",
  "balance-scales",
  "mycelium-spore",
  "archway-portal",
  "signal-oscilloscope",
  "manuscript-folio",
  "moon-crescent",
  "circuit-node",
  "wax-seal",
  "crown-emblem",
  "shield-crest",
  "observatory-dome",
] as const;

export type CutoutArtworkId = (typeof CUTOUT_ARTWORK_IDS)[number] | (string & {});

export interface SkinPresetMeta {
  readonly id: SkinName;
  readonly label: string;
  readonly description: string;
}

export const skinPresets: Record<SkinName, SkinPresetMeta> = {
  default: { id: "default", label: "Default", description: "Balanced MoonWitness workspace surface" },
  riot: { id: "riot", label: "Riot", description: "High-contrast zine & comic punk aesthetic" },
  editorial: { id: "editorial", label: "Editorial", description: "Warm gold & serif manuscript tone" },
  technical: { id: "technical", label: "Technical", description: "Crisp telemetry grid & cyan accents" },
  archive: { id: "archive", label: "Archive", description: "Quiet parchment & obsidian archival contrast" },
  transmission: { id: "transmission", label: "Transmission", description: "Broadcast console & signal wave highlights" },
  sanctuary: { id: "sanctuary", label: "Sanctuary", description: "Imperium Lumen golden observatory" },
  atelier: { id: "atelier", label: "Atelier", description: "Tactile studio paper & craft borders" },
  mycelium: { id: "mycelium", label: "Mycelium", description: "Organic emerald & forest spore nodes" },
  monolith: { id: "monolith", label: "Monolith", description: "Architectural monochrome high-contrast frame" },
};

export function listPresets(): SkinName[] {
  return Object.keys(skinPresets) as SkinName[];
}

export interface DnaPalette {
  readonly canvas: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly text: string;
  readonly mutedText: string;
  readonly border: string;
  readonly accent: string;
  readonly accentSecondary: string;
}

export interface DnaWorldSpec {
  readonly id: MasterDnaId;
  readonly numeral: string;
  readonly name: string;
  readonly primaryIdentity: string;
  readonly metaphor: string;
  readonly shapeLanguage: string;
  readonly motionGrammar: string;
  readonly mappedSkinPreset: SkinName;
  readonly cardClass: string;
  readonly badgeClass: string;
  readonly buttonClass: string;
  readonly inputClass: string;
  readonly palette: DnaPalette;
}

const DNA_WORLDS: readonly DnaWorldSpec[] = [
  {
    id: "01-imperium-lumen",
    numeral: "I",
    name: "IMPERIUM LUMEN",
    primaryIdentity: "A-L-L-A-H.COM Sanctuary",
    metaphor: "Brass astrolabe suspended in midnight obsidian",
    shapeLanguage: "Octagonal bevels, 1px hairline gold fillets",
    motionGrammar: "Measured celestial drift (420ms ease-out)",
    mappedSkinPreset: "sanctuary",
    cardClass: "border border-[#dfc07b]/35 bg-[#101420] text-[#f7f2e3]",
    badgeClass: "border border-[#dfc07b]/50 bg-[#dfc07b]/15 px-2 py-0.5 font-mono text-[10px] text-[#dfc07b]",
    buttonClass: "border-2 border-[#070910] bg-[#dfc07b] text-[#070910] font-bold hover:bg-[#f7f2e3]",
    inputClass: "border border-[#dfc07b]/40 bg-[#070910] text-[#f7f2e3]",
    palette: {
      canvas: "#070910",
      surface: "#101420",
      surfaceElevated: "#181e30",
      text: "#f7f2e3",
      mutedText: "#b8b09c",
      border: "#5c4d2d",
      accent: "#dfc07b",
      accentSecondary: "#4f8cff",
    },
  },
  {
    id: "02-codex-scriptorium",
    numeral: "II",
    name: "CODEX SCRIPTORIUM",
    primaryIdentity: "Human-Pen & Four Scriptures",
    metaphor: "Illuminated folio with crisp marginalia",
    shapeLanguage: "Ruled columns, serif drop-caps, archival seams",
    motionGrammar: "Page-turn crossfade (280ms cubic)",
    mappedSkinPreset: "editorial",
    cardClass: "border border-[#d6b87c]/35 bg-[#131217] text-[#f5efe2]",
    badgeClass: "border border-[#d6b87c]/50 bg-[#d6b87c]/15 px-2 py-0.5 font-mono text-[10px] text-[#e8cf97]",
    buttonClass: "border border-[#e8cf97] bg-[#e8cf97] text-[#131217] font-semibold",
    inputClass: "border border-[#d6b87c]/35 bg-[#0d0c10] text-[#f5efe2]",
    palette: {
      canvas: "#0d0c10",
      surface: "#15131a",
      surfaceElevated: "#1f1c26",
      text: "#f5efe2",
      mutedText: "#bcb3a2",
      border: "#4f4433",
      accent: "#e8cf97",
      accentSecondary: "#93c5fd",
    },
  },
  {
    id: "03-meridian-observatory",
    numeral: "III",
    name: "MERIDIAN OBSERVATORY",
    primaryIdentity: "M-Time & Moonwitness",
    metaphor: "Lunar horizon ephemeris dial & star telemetry",
    shapeLanguage: "Concentric orbital rings, calibrated degree ticks",
    motionGrammar: "Harmonic sweep (360ms sine)",
    mappedSkinPreset: "transmission",
    cardClass: "border border-[#38bdf8]/35 bg-[#0b1320] text-[#ebf4ff]",
    badgeClass: "border border-[#38bdf8]/50 bg-[#38bdf8]/15 px-2 py-0.5 font-mono text-[10px] text-[#7dd3fc]",
    buttonClass: "border border-[#38bdf8] bg-[#38bdf8] text-[#07101c] font-bold",
    inputClass: "border border-[#38bdf8]/35 bg-[#07101c] text-[#ebf4ff]",
    palette: {
      canvas: "#060d17",
      surface: "#0b1524",
      surfaceElevated: "#132238",
      text: "#ebf4ff",
      mutedText: "#9db7d4",
      border: "#26486b",
      accent: "#38bdf8",
      accentSecondary: "#dfc07b",
    },
  },
  {
    id: "04-arsy-control",
    numeral: "IV",
    name: "ARSY CONTROL",
    primaryIdentity: "Operations & NOC Plane",
    metaphor: "Zero-drift infrastructure oscilloscope",
    shapeLanguage: "Strict 1px telemetry grid, tabular monospace",
    motionGrammar: "Snappy mechanical detent (160ms linear)",
    mappedSkinPreset: "technical",
    cardClass: "border border-[#34d399]/35 bg-[#0a1312] text-[#e7faf3]",
    badgeClass: "border border-[#34d399]/50 bg-[#34d399]/15 px-2 py-0.5 font-mono text-[10px] text-[#6ee7b7]",
    buttonClass: "border border-[#34d399] bg-[#34d399] text-[#06120f] font-bold",
    inputClass: "border border-[#34d399]/35 bg-[#06120f] text-[#e7faf3]",
    palette: {
      canvas: "#060e0d",
      surface: "#0b1715",
      surfaceElevated: "#122421",
      text: "#e7faf3",
      mutedText: "#9bc4b6",
      border: "#225245",
      accent: "#34d399",
      accentSecondary: "#38bdf8",
    },
  },
  {
    id: "05-riot-anarchy",
    numeral: "V",
    name: "RIOT ZINE",
    primaryIdentity: "MoonWitness Chronicle & Dock",
    metaphor: "Xeroxed underground zine with hard comic shadows",
    shapeLanguage: "2px hard ink borders, offset drop shadows, taped corners",
    motionGrammar: "Punchy spring snap (210ms spring)",
    mappedSkinPreset: "riot",
    cardClass: "border-2 border-[#ff4f9a] bg-[#140e1c] text-[#fdf7ff] shadow-[4px_4px_0_#facc15]",
    badgeClass: "border border-[#facc15] bg-[#facc15] px-2 py-0.5 font-mono text-[10px] font-bold text-[#09070d]",
    buttonClass: "border-2 border-[#09070d] bg-[#ff4f9a] text-[#09070d] font-black shadow-[3px_3px_0_#facc15]",
    inputClass: "border-2 border-[#4c3566] bg-[#0c0812] text-[#fdf7ff]",
    palette: {
      canvas: "#0c0812",
      surface: "#160f21",
      surfaceElevated: "#211730",
      text: "#fdf7ff",
      mutedText: "#c7b8db",
      border: "#684491",
      accent: "#ff4f9a",
      accentSecondary: "#facc15",
    },
  },
  {
    id: "06-mycelium-garden",
    numeral: "VI",
    name: "MYCELIUM GARDEN",
    primaryIdentity: "Sidra Knowledge Graph",
    metaphor: "Bioluminescent root network linking living ideas",
    shapeLanguage: "Soft node pills, subtle organic gradients",
    motionGrammar: "Breathe & bloom (340ms ease-in-out)",
    mappedSkinPreset: "mycelium",
    cardClass: "border border-[#a3e635]/35 bg-[#0e140c] text-[#f2fae8]",
    badgeClass: "border border-[#a3e635]/50 bg-[#a3e635]/15 px-2 py-0.5 font-mono text-[10px] text-[#bef264]",
    buttonClass: "border border-[#a3e635] bg-[#a3e635] text-[#0c1209] font-bold",
    inputClass: "border border-[#a3e635]/35 bg-[#0a0f08] text-[#f2fae8]",
    palette: {
      canvas: "#090e08",
      surface: "#10190e",
      surfaceElevated: "#182615",
      text: "#f2fae8",
      mutedText: "#b1c99e",
      border: "#3e5928",
      accent: "#a3e635",
      accentSecondary: "#34d399",
    },
  },
  {
    id: "07-obsidian-monolith",
    numeral: "VII",
    name: "OBSIDIAN MONOLITH",
    primaryIdentity: "AWS Law & Archive Vault",
    metaphor: "Monolithic slate tablet with surgical contrast",
    shapeLanguage: "Zero-radius slabs, stark hairline rules",
    motionGrammar: "Crisp architectural reveal (240ms ease)",
    mappedSkinPreset: "monolith",
    cardClass: "border border-[#a1a1aa]/40 bg-[#111113] text-[#fafafa]",
    badgeClass: "border border-[#fafafa]/40 bg-[#fafafa]/10 px-2 py-0.5 font-mono text-[10px] text-[#fafafa]",
    buttonClass: "border border-[#fafafa] bg-[#fafafa] text-[#09090b] font-bold",
    inputClass: "border border-[#52525b] bg-[#09090b] text-[#fafafa]",
    palette: {
      canvas: "#09090b",
      surface: "#121215",
      surfaceElevated: "#1c1c21",
      text: "#fafafa",
      mutedText: "#b4b4bd",
      border: "#3f3f46",
      accent: "#e4e4e7",
      accentSecondary: "#dfc07b",
    },
  },
];

export function listDnaWorlds(): readonly DnaWorldSpec[] {
  return DNA_WORLDS;
}

export function getDnaWorld(id: string): DnaWorldSpec {
  return DNA_WORLDS.find((w) => w.id === id) ?? DNA_WORLDS[0]!;
}

function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0]! + clean[0]!, 16),
      parseInt(clean[1]! + clean[1]!, 16),
      parseInt(clean[2]! + clean[2]!, 16),
    ];
  }
  if (clean.length >= 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return [128, 128, 128];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHexColor(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export interface DnaContrastPair {
  readonly pairName: string;
  readonly ratio: number;
  readonly passed: boolean;
}

export interface DnaContrastAudit {
  readonly passed: boolean;
  readonly pairs: readonly DnaContrastPair[];
}

export function auditDnaContrast(world: DnaWorldSpec): DnaContrastAudit {
  const p = world.palette;
  const pairs: DnaContrastPair[] = [
    { pairName: "text / canvas", ratio: contrastRatio(p.text, p.canvas), passed: contrastRatio(p.text, p.canvas) >= 4.5 },
    { pairName: "text / surface", ratio: contrastRatio(p.text, p.surface), passed: contrastRatio(p.text, p.surface) >= 4.5 },
    { pairName: "muted / canvas", ratio: contrastRatio(p.mutedText, p.canvas), passed: contrastRatio(p.mutedText, p.canvas) >= 4.5 },
    { pairName: "accent / canvas", ratio: contrastRatio(p.accent, p.canvas), passed: contrastRatio(p.accent, p.canvas) >= 4.5 },
  ];
  return {
    passed: pairs.every((pair) => pair.passed),
    pairs,
  };
}

export interface SkinContextValue {
  skin: SkinName;
  setSkin: (skin: SkinName) => void;
  dnaId: MasterDnaId;
  setDna: (dnaId: MasterDnaId) => void;
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  density: CanonicalDensity;
  setDensity: (density: CanonicalDensity) => void;
}

const SkinContext = createContext<SkinContextValue>({
  skin: "default",
  setSkin: () => {},
  dnaId: "01-imperium-lumen",
  setDna: () => {},
  mode: "dark",
  resolvedMode: "dark",
  setMode: () => {},
  density: "comfortable",
  setDensity: () => {},
});

export function SkinProvider({
  children,
  initialSkin,
  defaultSkin,
  initialDnaId = "01-imperium-lumen",
  initialMode = "dark",
  initialDensity = "comfortable",
}: {
  children: ReactNode;
  initialSkin?: SkinName;
  defaultSkin?: SkinName | string;
  initialDnaId?: MasterDnaId;
  initialMode?: ThemeMode;
  initialDensity?: CanonicalDensity;
}) {
  const resolvedInitial = (initialSkin ?? defaultSkin ?? "default") as SkinName;
  const [skin, setSkinState] = useState<SkinName>(resolvedInitial);
  const [dnaId, setDnaState] = useState<MasterDnaId>(initialDnaId);
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [density, setDensityState] = useState<CanonicalDensity>(initialDensity);
  const [systemPrefersLight, setSystemPrefersLight] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    setSystemPrefersLight(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemPrefersLight(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolvedMode: "light" | "dark" =
    mode === "system" ? (systemPrefersLight ? "light" : "dark") : mode;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-skin", skin);
    document.documentElement.setAttribute("data-dna", dnaId);
    document.documentElement.setAttribute("data-mode", resolvedMode);
    document.documentElement.setAttribute("data-density", density);
  }, [skin, dnaId, resolvedMode, density]);

  const setSkin = useCallback((next: SkinName) => setSkinState(next), []);
  const setDna = useCallback((next: MasterDnaId) => setDnaState(next), []);
  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const setDensity = useCallback((next: CanonicalDensity) => setDensityState(next), []);

  const value = useMemo<SkinContextValue>(
    () => ({
      skin,
      setSkin,
      dnaId,
      setDna,
      mode,
      resolvedMode,
      setMode,
      density,
      setDensity,
    }),
    [skin, setSkin, dnaId, setDna, mode, resolvedMode, setMode, density, setDensity],
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin(): SkinContextValue {
  return useContext(SkinContext);
}

export function SkinScope({
  dnaId,
  skin,
  className,
  style,
  children,
}: {
  dnaId?: MasterDnaId;
  skin?: SkinName;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const world = dnaId ? getDnaWorld(dnaId) : undefined;
  const scopedStyle: CSSProperties = {
    ...(world
      ? ({
          backgroundColor: world.palette.canvas,
          color: world.palette.text,
          borderColor: world.palette.border,
          "--dna-canvas": world.palette.canvas,
          "--dna-surface": world.palette.surface,
          "--dna-surface-elevated": world.palette.surfaceElevated,
          "--dna-text": world.palette.text,
          "--dna-muted": world.palette.mutedText,
          "--dna-border": world.palette.border,
          "--dna-accent": world.palette.accent,
          "--dna-accent-secondary": world.palette.accentSecondary,
        } as CSSProperties)
      : {}),
    ...style,
  };
  return (
    <div data-dna={dnaId} data-skin={skin} className={className} style={scopedStyle}>
      {children}
    </div>
  );
}

export const defaultTheme = {
  background: "#0b0d14",
  foreground: "#f4f1e8",
  primary: "#dfc07b",
  accent: "#38bdf8",
  border: "#2a3147",
} as const;

export function applyTheme(theme: Record<string, string> = defaultTheme): void {
  if (typeof document === "undefined") return;
  for (const [key, val] of Object.entries(theme)) {
    document.documentElement.style.setProperty(key.startsWith("--") ? key : `--${key}`, val);
  }
}

export const kindColors: Record<string, string> = {
  canon: "#dfc07b",
  story: "#ff4f9a",
  event: "#38bdf8",
  release: "#34d399",
  world: "#a78bfa",
  law: "#f59e0b",
  archive: "#94a3b8",
  default: "#dfc07b",
};

export function resolveNavIconPath(key?: string): string {
  if (!key) return HUD_NAV_ICON_PATHS.dashboard;
  const lookup = HUD_NAV_ICON_PATHS as Record<string, string>;
  if (lookup[key]) return lookup[key];
  if (/^[Mm]\s*-?\d/.test(key)) return key;
  return HUD_NAV_ICON_PATHS.dashboard;
}
