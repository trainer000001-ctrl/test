"use client";

import { useEffect, useState } from "react";

/**
 * Resolves the A-L-L-A-H Sanctuary gateway origin (defaults to same-origin root `/` in unified apps/web).
 */
export const IMPERIUM_GATE_URL = (process.env.NEXT_PUBLIC_ALLAH_URL ?? "").replace(/\/+$/, "");

const DEFAULT_SANCTUARY_ORIGIN = "https://a-l-l-a-h.com";
const MOONWITNESS_HOSTS = new Set(["moonwitness.biz.id", "www.moonwitness.biz.id"]);

/**
 * Computes the Sanctuary root href for the given runtime hostname.
 * Avoids a self-loop back into `/moonwitness` when visited on `moonwitness.biz.id`.
 */
export function resolveSanctuaryHref(hostname?: string): string {
  if (IMPERIUM_GATE_URL) {
    return IMPERIUM_GATE_URL;
  }
  const normalized = hostname?.trim().toLowerCase().replace(/\.+$/, "") ?? "";
  if (MOONWITNESS_HOSTS.has(normalized)) {
    return DEFAULT_SANCTUARY_ORIGIN;
  }
  return "/";
}

/**
 * Hydration-safe Sanctuary root href hook (`/` on SSR/localhost, `https://a-l-l-a-h.com` on `moonwitness.biz.id`).
 */
export function useSanctuaryHref(): string {
  const [href, setHref] = useState<string>(IMPERIUM_GATE_URL || "/");

  useEffect(() => {
    setHref(resolveSanctuaryHref(window.location.hostname));
  }, []);

  return href;
}
