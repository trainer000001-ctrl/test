import { ARTWORK, WORLD_ART_PLATES, type WorldPlateKey } from "@moonwitness/assets";
import type { ArtKey } from "@moonwitness/contracts/types";

/** Resolves an optimized responsive WebP fallback path for `next/image` consumers. */
export function artSrc(key: ArtKey): string {
  return ARTWORK[key].fallback;
}

/** Resolves a standalone world/sanctuary illustration plate via canonical asset manifest. */
export function artPlateSrc(key: WorldPlateKey): string {
  return WORLD_ART_PLATES[key].fallback;
}
