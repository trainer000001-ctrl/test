import { i18n, type Direction, type Locale } from "@/configs/i18n";

export interface RequestLocaleInput {
  pathname?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}

export interface ResolvedLocale {
  lang: Locale;
  dir: Direction;
}

function splitPathAndSuffix(url: string): { pathname: string; suffix: string } {
  const queryIndex = url.indexOf("?");
  const hashIndex = url.indexOf("#");
  let splitIndex = -1;
  if (queryIndex !== -1 && hashIndex !== -1) {
    splitIndex = Math.min(queryIndex, hashIndex);
  } else if (queryIndex !== -1) {
    splitIndex = queryIndex;
  } else if (hashIndex !== -1) {
    splitIndex = hashIndex;
  }
  if (splitIndex === -1) {
    return { pathname: url, suffix: "" };
  }
  return {
    pathname: url.slice(0, splitIndex),
    suffix: url.slice(splitIndex),
  };
}

function extractPathname(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).pathname;
    } catch {
      return null;
    }
  }
  return splitPathAndSuffix(trimmed).pathname;
}

function negotiateAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const candidates: { locale: Locale; q: number; index: number }[] = [];

  const entries = header.split(",");
  for (let index = 0; index < entries.length; index++) {
    const rawEntry = entries[index]?.trim();
    if (!rawEntry) continue;
    const [rawTag, ...params] = rawEntry.split(";");
    const tag = rawTag?.trim().toLowerCase();
    if (!tag || tag === "*") continue;

    let q = 1;
    let invalidQ = false;
    for (const param of params) {
      const trimmedParam = param.trim().toLowerCase();
      if (trimmedParam.startsWith("q=")) {
        const parsed = Number.parseFloat(trimmedParam.slice(2));
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
          invalidQ = true;
        } else {
          q = parsed;
        }
        break;
      }
    }
    if (invalidQ || q <= 0) continue;

    const primary = tag.split("-")[0] ?? "";
    const normalized = primary === "in" ? "id" : primary;
    if (isValidLocale(normalized)) {
      candidates.push({ locale: normalized, q, index });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.q - a.q || a.index - b.index);
  return candidates[0]?.locale ?? null;
}

export function isValidLocale(value: string | null | undefined): value is Locale {
  if (!value) return false;
  return (i18n.locales as readonly string[]).includes(value);
}

export function getLocaleFromPath(pathname: string): Locale | null {
  const cleanPath = splitPathAndSuffix(pathname).pathname;
  const firstSegment = cleanPath.split("/").filter(Boolean)[0];
  return isValidLocale(firstSegment) ? firstSegment : null;
}

export function isUrlMissingLocale(url: string): boolean {
  return getLocaleFromPath(url) === null;
}

export function stripLocalePrefix(pathname: string): string {
  const { pathname: cleanPath, suffix } = splitPathAndSuffix(pathname);
  const locale = getLocaleFromPath(cleanPath);
  if (!locale) return pathname || "/";
  const stripped = cleanPath.slice(`/${locale}`.length);
  const normalized = stripped.startsWith("/") ? stripped : `/${stripped}`;
  return `${normalized}${suffix}`;
}

export function getLocalizedUrl(url: string, languageCode: string): string {
  if (!url) throw new Error("URL cannot be empty");
  const locale: Locale = isValidLocale(languageCode) ? languageCode : i18n.defaultLocale;
  if (/^https?:\/\//i.test(url) || url.startsWith("#")) {
    return url;
  }
  const { pathname, suffix } = splitPathAndSuffix(url);
  if (!pathname) {
    return `/${locale}${suffix}`;
  }
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const rest = isUrlMissingLocale(normalizedPath)
    ? normalizedPath
    : stripLocalePrefix(normalizedPath);
  const localizedPath = rest === "/" ? `/${locale}` : `/${locale}${rest}`;
  return `${localizedPath}${suffix}`;
}

export function getLocalePath(pathname: string, locale: Locale): string {
  return getLocalizedUrl(pathname, locale);
}

export function resolveRequestLocale(input: RequestLocaleInput): ResolvedLocale {
  const pathnameOnly = extractPathname(input.pathname);
  const pathLocale = pathnameOnly ? getLocaleFromPath(pathnameOnly) : null;
  if (pathLocale) {
    return { lang: pathLocale, dir: i18n.langDirection[pathLocale] };
  }

  const trimmedCookie = input.cookieLocale?.trim();
  if (isValidLocale(trimmedCookie)) {
    return { lang: trimmedCookie, dir: i18n.langDirection[trimmedCookie] };
  }

  const negotiated = negotiateAcceptLanguage(input.acceptLanguage);
  if (negotiated) {
    return { lang: negotiated, dir: i18n.langDirection[negotiated] };
  }

  return {
    lang: i18n.defaultLocale,
    dir: i18n.langDirection[i18n.defaultLocale],
  };
}
