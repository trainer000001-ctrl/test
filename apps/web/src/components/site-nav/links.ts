import type { Locale } from "@/configs/i18n";
import type { Dictionary } from "@/utils/getDictionary";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";

export interface NavLink {
  id: string;
  label: string;
}

export interface ChronicleLocaleOption {
  readonly locale: Locale;
  readonly code: string;
  readonly label: string;
}

export const CHRONICLE_LOCALES: readonly ChronicleLocaleOption[] = [
  { locale: "en", code: "EN", label: "English" },
  { locale: "id", code: "ID", label: "Bahasa Indonesia" },
  { locale: "ar", code: "AR", label: "العربية" },
];

export const links: NavLink[] = [
  { id: "home", label: "HOME" },
  { id: "signals", label: "SIGNALS" },
  { id: "storytelling", label: "STORIES" },
  { id: "shadow", label: "SHADOW" },
  { id: "crew", label: "CREW" },
  { id: "archive", label: "ARCHIVE" },
];

type ChronicleNavigationDict = Partial<Dictionary["chronicle"]["navigation"]>;

export function getChronicleNavLinks(navigation?: ChronicleNavigationDict): NavLink[] {
  return [
    { id: "home", label: navigation?.home ?? "HOME" },
    { id: "signals", label: navigation?.signals ?? "SIGNALS" },
    { id: "storytelling", label: navigation?.storytelling ?? "STORIES" },
    { id: "shadow", label: navigation?.shadow ?? "SHADOW" },
    { id: "crew", label: navigation?.crew ?? "CREW" },
    { id: "archive", label: navigation?.archive ?? "ARCHIVE" },
  ];
}

export function resolveChronicleHref(slug: string, pathname: string, locale: Locale): string {
  return getLocaleFromPath(pathname) !== null ? getLocalizedUrl(slug, locale) : slug;
}

export function buildArchiveSearchHref(query: string, pathname: string, locale: Locale): string {
  const trimmed = query.trim();
  const base = trimmed ? `/dock?q=${encodeURIComponent(trimmed)}` : "/dock";
  return resolveChronicleHref(base, pathname, locale);
}
