export const AVATAR_STORAGE_VERSION = 1 as const;

export const WITNESS_PALETTES = {
  street: { label: "Street", accent: "#ff2d78", accent2: "#2ea8ff", crown: "#ffd21f", ink: "#0b0d14", paper: "#f5efe6" },
  lunar: { label: "Lunar", accent: "#2ea8ff", accent2: "#a855f7", crown: "#ffd21f", ink: "#09101d", paper: "#eef6ff" },
  lumen: { label: "Lumen", accent: "#c9963b", accent2: "#0f766e", crown: "#f5c451", ink: "#121318", paper: "#fbf7ee" },
  signal: { label: "Signal", accent: "#3ddc84", accent2: "#2ea8ff", crown: "#ff2d78", ink: "#08120e", paper: "#ecfdf5" },
  crimson: { label: "Crimson", accent: "#ef4444", accent2: "#f59e0b", crown: "#ffd21f", ink: "#160a0d", paper: "#fff1f2" },
  violet: { label: "Violet", accent: "#a855f7", accent2: "#ff2d78", crown: "#38bdf8", ink: "#100a1a", paper: "#f5f3ff" },
} as const;

export type PaletteName = keyof typeof WITNESS_PALETTES;
export const PALETTES = Object.keys(WITNESS_PALETTES) as readonly PaletteName[];

export const WITNESS_BACKGROUNDS = ["ink", "paper", "transparent"] as const;
export type BackgroundName = (typeof WITNESS_BACKGROUNDS)[number];

export interface SavedAvatarOptions {
  palette: PaletteName;
  background: BackgroundName;
  radius: number;
  halftone: boolean;
  crown: boolean;
  moon: boolean;
  tape: boolean;
}

export interface SavedAvatar {
  version: typeof AVATAR_STORAGE_VERSION;
  identity: string;
  seed: string;
  options: SavedAvatarOptions;
  updatedAt: string;
}

export const DEFAULT_AVATAR_OPTIONS: SavedAvatarOptions = {
  palette: "street",
  background: "ink",
  radius: 18,
  halftone: true,
  crown: true,
  moon: true,
  tape: false,
};

export function normalizeSeed(raw: string): string {
  const trimmed = (raw ?? "").trim();
  return trimmed.length > 0 ? trimmed.slice(0, 64) : "Rezza";
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function validateSavedAvatar(value: unknown): SavedAvatar | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<SavedAvatar>;
  if (v.version !== AVATAR_STORAGE_VERSION) return null;
  if (typeof v.identity !== "string" || !v.identity.trim()) return null;
  if (typeof v.seed !== "string") return null;
  const o = v.options as Partial<SavedAvatarOptions> | undefined;
  if (!o || typeof o !== "object") return null;
  const palette = PALETTES.includes(o.palette as PaletteName) ? (o.palette as PaletteName) : DEFAULT_AVATAR_OPTIONS.palette;
  const background = WITNESS_BACKGROUNDS.includes(o.background as BackgroundName)
    ? (o.background as BackgroundName)
    : DEFAULT_AVATAR_OPTIONS.background;
  const radius = typeof o.radius === "number" && Number.isFinite(o.radius) ? Math.max(0, Math.min(50, Math.round(o.radius))) : DEFAULT_AVATAR_OPTIONS.radius;
  return {
    version: AVATAR_STORAGE_VERSION,
    identity: v.identity,
    seed: normalizeSeed(v.seed),
    options: {
      palette,
      background,
      radius,
      halftone: typeof o.halftone === "boolean" ? o.halftone : true,
      crown: typeof o.crown === "boolean" ? o.crown : true,
      moon: typeof o.moon === "boolean" ? o.moon : true,
      tape: typeof o.tape === "boolean" ? o.tape : false,
    },
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : new Date().toISOString(),
  };
}

export function buildSavedAvatar(
  identity: string,
  seed: string,
  options: SavedAvatarOptions,
): SavedAvatar | null {
  if (!identity || !identity.trim()) return null;
  return validateSavedAvatar({
    version: AVATAR_STORAGE_VERSION,
    identity,
    seed: normalizeSeed(seed),
    options,
    updatedAt: new Date().toISOString(),
  });
}

export interface CreateAvatarParams extends Partial<SavedAvatarOptions> {
  seed?: string;
  size?: number;
}

export function createAvatar(params: CreateAvatarParams = {}): { toString(): string; toDataUri(): string } {
  const seed = normalizeSeed(params.seed ?? "Witness");
  const h = hashSeed(seed);
  const size = params.size ?? 256;
  const paletteName: PaletteName =
    params.palette && params.palette in WITNESS_PALETTES ? params.palette : "street";
  const pal = WITNESS_PALETTES[paletteName];
  const bg = params.background ?? "ink";
  const radius = Math.max(0, Math.min(50, params.radius ?? 18));
  const rx = (radius / 100) * 100;
  const bgFill = bg === "transparent" ? "none" : bg === "paper" ? pal.paper : pal.ink;
  const strokeColor = bg === "paper" ? pal.ink : pal.paper;
  const eyeStyle = h % 3;
  const mouthStyle = (h >> 3) % 3;
  const hoodHue = (h >> 6) % 2 === 0 ? pal.accent : pal.accent2;
  const initials = seed
    .split(/\s+/)
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const eyesSvg =
    eyeStyle === 0
      ? `<circle cx="40" cy="52" r="3.4" fill="${pal.ink}"/><circle cx="60" cy="52" r="3.4" fill="${pal.ink}"/>`
      : eyeStyle === 1
        ? `<rect x="35" y="49" width="10" height="4" rx="2" fill="${pal.ink}"/><rect x="55" y="49" width="10" height="4" rx="2" fill="${pal.ink}"/>`
        : `<path d="M35 52 Q40 47 45 52" stroke="${pal.ink}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M55 52 Q60 47 65 52" stroke="${pal.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;

  const mouthSvg =
    mouthStyle === 0
      ? `<path d="M42 63 Q50 69 58 63" stroke="${pal.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      : mouthStyle === 1
        ? `<line x1="43" y1="64" x2="57" y2="64" stroke="${pal.ink}" stroke-width="2.6" stroke-linecap="round"/>`
        : `<path d="M43 65 Q50 61 57 65" stroke="${pal.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Witness avatar ${seed}">
  <defs>
    <clipPath id="clip-${h}"><rect x="0" y="0" width="100" height="100" rx="${rx}"/></clipPath>
    <pattern id="dots-${h}" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.9" fill="${pal.accent2}" fill-opacity="0.28"/></pattern>
  </defs>
  <g clip-path="url(#clip-${h})">
    ${bgFill !== "none" ? `<rect width="100" height="100" fill="${bgFill}"/>` : ""}
    ${params.halftone !== false ? `<rect width="100" height="100" fill="url(#dots-${h})"/>` : ""}
    ${params.moon !== false ? `<circle cx="75" cy="26" r="18" fill="${pal.accent2}" opacity="0.88"/><circle cx="81" cy="22" r="15" fill="${bg === "paper" ? pal.paper : pal.ink}" opacity="0.72"/>` : ""}
    <path d="M18 100 C20 75 32 68 50 68 C68 68 80 75 82 100 Z" fill="${hoodHue}" stroke="${strokeColor}" stroke-width="2.5"/>
    <circle cx="50" cy="52" r="21" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="3"/>
    ${eyesSvg}
    ${mouthSvg}
    ${params.crown !== false ? `<path d="M34 31 L39 18 L50 26 L61 18 L66 31 Z" fill="${pal.crown}" stroke="${pal.ink}" stroke-width="2.2" stroke-linejoin="round"/>` : ""}
    ${params.tape ? `<rect x="-6" y="79" width="44" height="10" transform="rotate(-14 14 84)" fill="${pal.crown}" fill-opacity="0.86" stroke="${pal.ink}" stroke-width="1.5"/>` : ""}
    <text x="50" y="92" text-anchor="middle" font-family="monospace" font-size="8" font-weight="700" fill="${pal.ink}">${initials}</text>
  </g>
</svg>`;

  return {
    toString: () => svg,
    toDataUri: () => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  };
}

export const AVATAR_STORE_KEY = "mw-avatars";

export function readAvatarStore(storageKey = AVATAR_STORE_KEY): Record<string, SavedAvatar> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, SavedAvatar> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const validated = validateSavedAvatar(v);
      if (validated && validated.identity === k) out[k] = validated;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeAvatarStore(
  map: Record<string, SavedAvatar>,
  storageKey = AVATAR_STORE_KEY,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function applyAvatarToStore(
  store: Record<string, SavedAvatar>,
  identity: string,
  seed: string,
  options: SavedAvatarOptions,
  storageKey = AVATAR_STORE_KEY,
): { next: Record<string, SavedAvatar>; ok: boolean } {
  const built = buildSavedAvatar(identity, seed, options);
  if (!built) return { next: store, ok: false };
  const next = { ...store, [identity]: built };
  return { next, ok: writeAvatarStore(next, storageKey) };
}

export function resetAvatarInStore(
  store: Record<string, SavedAvatar>,
  identity: string,
  storageKey = AVATAR_STORE_KEY,
): { next: Record<string, SavedAvatar>; ok: boolean } {
  const next = { ...store };
  delete next[identity];
  return { next, ok: writeAvatarStore(next, storageKey) };
}

export function savedAvatarSeed(saved: SavedAvatar | null): string {
  return saved ? saved.seed : normalizeSeed("");
}

export function savedAvatarOptions(saved: SavedAvatar | null): SavedAvatarOptions {
  return saved ? saved.options : DEFAULT_AVATAR_OPTIONS;
}

