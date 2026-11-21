import { useEffect, useState } from "react";
import {
  AVATAR_STORAGE_VERSION,
  AVATAR_STORE_KEY,
  DEFAULT_AVATAR_OPTIONS,
  applyAvatarToStore,
  normalizeSeed,
  readAvatarStore,
  resetAvatarInStore,
  savedAvatarOptions,
  savedAvatarSeed,
  writeAvatarStore,
  type SavedAvatar,
  type SavedAvatarOptions,
} from "@moonwitness/avatars";

export const STORE_KEY = AVATAR_STORE_KEY;
export const readStore = readAvatarStore;
export const writeStore = writeAvatarStore;
export const applyToStore = applyAvatarToStore;
export const resetInStore = resetAvatarInStore;
export const savedSeed = savedAvatarSeed;
export const savedOptions = savedAvatarOptions;

export interface AvatarStore {
  saved: SavedAvatar | null;
  /** True ketika storage tidak tersedia atau write gagal — state tidak pernah optimis. */
  storageAvailable: boolean;
  apply: (seed: string, options: SavedAvatarOptions) => boolean;
  reset: () => boolean;
}

/**
 * React hook wrapper over centralized `@moonwitness/avatars` persistence helpers.
 * Syncs across tabs via `storage` event.
 */
export function useAvatarStore(identity: string): AvatarStore {
  const [store, setStore] = useState<Record<string, SavedAvatar>>({});
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    setStore(readAvatarStore());
    setStorageAvailable(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onStorage(e: StorageEvent) {
      if (e.key !== AVATAR_STORE_KEY) return;
      setStore(readAvatarStore());
      setStorageAvailable(true);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saved = store[identity] ?? null;

  function apply(seed: string, options: SavedAvatarOptions): boolean {
    const { next, ok } = applyAvatarToStore(store, identity, seed, options);
    if (ok) {
      setStore(next);
    } else {
      setStorageAvailable(false);
    }
    return ok;
  }

  function reset(): boolean {
    const { next, ok } = resetAvatarInStore(store, identity);
    if (ok) {
      setStore(next);
    } else {
      setStorageAvailable(false);
    }
    return ok;
  }

  return { saved, storageAvailable, apply, reset };
}

export function useSavedAvatar(identity: string): {
  seed: string;
  options: SavedAvatarOptions;
} {
  const { saved } = useAvatarStore(identity);
  return { seed: savedAvatarSeed(saved), options: savedAvatarOptions(saved) };
}

export const MW_AVATAR_STORE_VERSION = AVATAR_STORAGE_VERSION;
export { normalizeSeed, DEFAULT_AVATAR_OPTIONS, type SavedAvatar, type SavedAvatarOptions };
