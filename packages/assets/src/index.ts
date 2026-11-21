export interface ArtworkEntry {
  readonly fallback: string;
  readonly width?: number;
  readonly height?: number;
  readonly alt?: string;
  readonly position?: string;
}

export const ARTWORK: Record<string, ArtworkEntry> = {
  "city-shadow": { fallback: "/art/city-shadow.png", width: 1920, height: 1080 },
  "command-eye": { fallback: "/art/command-eye.png", width: 1920, height: 1080 },
  "crew-rooftop": { fallback: "/art/crew-rooftop.png", width: 1920, height: 1080 },
  "crew-wall": { fallback: "/art/crew-wall.png", width: 1920, height: 1080 },
  "crowd-moon": { fallback: "/art/crowd-moon.png", width: 1920, height: 1080 },
  "dna-lunar-observatory": { fallback: "/art/dna-lunar-observatory.png", width: 1920, height: 1080 },
  "dna-mycelium-spores": { fallback: "/art/dna-mycelium-spores.png", width: 1920, height: 1080 },
  "dna-nexus-hud": { fallback: "/art/dna-nexus-hud.png", width: 1920, height: 1080 },
  "dna-nusantara-nodes": { fallback: "/art/dna-nusantara-nodes.png", width: 1920, height: 1080 },
  "dock-chronicle-hero": { fallback: "/art/dock-chronicle-hero.png", width: 1920, height: 1080 },
  "editorial-light-plate": { fallback: "/art/editorial-light-plate.png", width: 1920, height: 1080 },
  "fog-voices": { fallback: "/art/fog-voices.png", width: 1920, height: 1080 },
  "hero-witness": { fallback: "/art/hero-witness.png", width: 1920, height: 1080 },
  "mirror-archive": { fallback: "/art/mirror-archive.png", width: 1920, height: 1080 },
  "night-shift": { fallback: "/art/night-shift.png", width: 1920, height: 1080 },
  "shadow-command": { fallback: "/art/shadow-command.png", width: 1920, height: 1080 },
  "shadow-command-hero": { fallback: "/art/shadow-command-hero.png", width: 1920, height: 1080 },
  "sidebar-witness": { fallback: "/art/sidebar-witness.png", width: 1920, height: 1080 },
  "signal-sky": { fallback: "/art/signal-sky.png", width: 1920, height: 1080 },
  "signal-tunnel": { fallback: "/art/signal-tunnel.png", width: 1920, height: 1080 },
  "wallpaper-atlas-orbit-wide": { fallback: "/art/wallpaper-atlas-orbit-wide.png", width: 1920, height: 1080 },
  "wallpaper-lunar-rooftop-wide": { fallback: "/art/wallpaper-lunar-rooftop-wide.png", width: 1920, height: 1080 },
  "wallpaper-night-transmission-wide": { fallback: "/art/wallpaper-night-transmission-wide.png", width: 1920, height: 1080 },
  "wallpaper-signal-city-wide": { fallback: "/art/wallpaper-signal-city-wide.png", width: 1920, height: 1080 },
  "world-map-atlas": { fallback: "/art/world-map-atlas.png", width: 1920, height: 1080 },
};

export const WORLD_ART_PLATES = {
  "astrolabe-orrery-plate": { fallback: "/art/astrolabe-orrery-plate.webp", width: 880, height: 880 },
  "celestial-gate-bg": { fallback: "/art/celestial-gate-bg.webp", width: 1600, height: 900 },
  "gate-crowd-moon": { fallback: "/art/gate-crowd-moon.webp", width: 1600, height: 900 },
  "meridian-sky-chart": { fallback: "/art/meridian-sky-chart.webp", width: 960, height: 960 },
  "nonagram-sanctuary-dial": { fallback: "/art/nonagram-sanctuary-dial.webp", width: 880, height: 880 },
  "sidra-lote-constellation": { fallback: "/art/sidra-lote-constellation.webp", width: 960, height: 960 },
  "story-plate-01": { fallback: "/art/story-plate-01.webp", width: 960, height: 640 },
  "story-plate-02": { fallback: "/art/story-plate-02.webp", width: 960, height: 640 },
  "story-plate-03": { fallback: "/art/story-plate-03.webp", width: 960, height: 640 },
  "story-plate-04": { fallback: "/art/story-plate-04.webp", width: 960, height: 640 },
  "tawhid-100center-orb": { fallback: "/art/tawhid-100center-orb.webp", width: 720, height: 720 },
  "world-angel": { fallback: "/art/world-angel.webp", width: 480, height: 640 },
  "world-arsy": { fallback: "/art/world-arsy.webp", width: 480, height: 640 },
  "world-crayon": { fallback: "/art/world-crayon.webp", width: 480, height: 640 },
  "world-moonwitness": { fallback: "/art/world-moonwitness.webp", width: 480, height: 640 },
  "world-mythos": { fallback: "/art/world-mythos.webp", width: 480, height: 640 },
  "world-qalam": { fallback: "/art/world-qalam.webp", width: 480, height: 640 },
  "world-rocksoul": { fallback: "/art/world-rocksoul.webp", width: 480, height: 640 },
  "world-sidra": { fallback: "/art/world-sidra.webp", width: 480, height: 640 },
  "world-sincan": { fallback: "/art/world-sincan.webp", width: 480, height: 640 },
} as const satisfies Record<string, ArtworkEntry>;

export type WorldPlateKey = keyof typeof WORLD_ART_PLATES;

export const HERO_LAYERS = {
  city: { source: "/art/hero-city-v2.png", width: 1344, height: 768 },
  moon: { source: "/art/hero-moon-v2.png", width: 1024, height: 1024 },
  character: { source: "/art/hero-character-v2.png", width: 832, height: 1248 },
} as const;
