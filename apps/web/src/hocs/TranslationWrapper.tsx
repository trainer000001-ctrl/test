"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { i18n, type Direction, type Locale } from "@/configs/i18n";
import themeConfig from "@/configs/themeConfig";
import { getDictionarySync, type Dictionary } from "@/utils/getDictionary";
import { getLocaleFromPath, isValidLocale } from "@/utils/i18n";

export interface TranslationContextValue {
  readonly locale: Locale;
  readonly direction: Direction;
  readonly dictionary: Dictionary;
  readonly setLocale: (next: Locale) => void;
}

const DEFAULT_DICT = getDictionarySync(i18n.defaultLocale);

const FALLBACK_TRANSLATION_CONTEXT: TranslationContextValue = {
  locale: i18n.defaultLocale,
  direction: i18n.langDirection[i18n.defaultLocale],
  dictionary: DEFAULT_DICT,
  setLocale: () => {},
};

export const TranslationContext = createContext<TranslationContextValue | null>(null);

const LOCALE_STORAGE_KEY = "allah-sanctuary-lang-v1";
const LOCALE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

function applyDocumentLocale(next: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = next;
  document.documentElement.dir = i18n.langDirection[next];
}

function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  try {
    const prefix = `${themeConfig.localeCookieName}=`;
    for (const part of document.cookie.split(";")) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        const raw = decodeURIComponent(trimmed.slice(prefix.length));
        return isValidLocale(raw) ? raw : null;
      }
    }
  } catch {
    // Ignore malformed cookie values
  }
  return null;
}

function writeLocaleCookie(next: Locale): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${themeConfig.localeCookieName}=${encodeURIComponent(next)}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  } catch {
    // Ignore cookie write failures
  }
}

export function TranslationWrapper({
  lang,
  dictionary: initialDictionary,
  children,
}: {
  lang?: string;
  dictionary?: Dictionary;
  children: ReactNode;
}) {
  const hasExplicitLang = lang !== undefined && lang !== "";
  const initialLocale: Locale = isValidLocale(lang) ? lang : i18n.defaultLocale;
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    if (hasExplicitLang) {
      const resolved: Locale = isValidLocale(lang) ? lang : i18n.defaultLocale;
      setLocaleState(resolved);
      applyDocumentLocale(resolved);
      return;
    }

    const pathLocale =
      typeof window !== "undefined" ? getLocaleFromPath(window.location.pathname) : null;
    if (pathLocale) {
      setLocaleState(pathLocale);
      applyDocumentLocale(pathLocale);
      return;
    }

    const cookieLocale = readLocaleCookie();
    if (cookieLocale) {
      setLocaleState(cookieLocale);
      applyDocumentLocale(cookieLocale);
      return;
    }

    let resolved: Locale = i18n.defaultLocale;
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved !== null) {
        resolved = isValidLocale(saved) ? saved : i18n.defaultLocale;
        writeLocaleCookie(resolved);
        window.localStorage.removeItem(LOCALE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access failure
    }

    setLocaleState(resolved);
    applyDocumentLocale(resolved);
  }, [hasExplicitLang, lang]);

  const setLocale = useCallback((next: Locale) => {
    const resolved: Locale = isValidLocale(next) ? next : i18n.defaultLocale;
    setLocaleState(resolved);
    writeLocaleCookie(resolved);
    applyDocumentLocale(resolved);
  }, []);

  const dictionary = useMemo(() => {
    if (initialDictionary && locale === initialLocale) {
      return initialDictionary;
    }
    return getDictionarySync(locale);
  }, [initialDictionary, initialLocale, locale]);

  const direction = i18n.langDirection[locale];

  const contextValue = useMemo<TranslationContextValue>(
    () => ({ locale, direction, dictionary, setLocale }),
    [locale, direction, dictionary, setLocale],
  );

  return <TranslationContext.Provider value={contextValue}>{children}</TranslationContext.Provider>;
}

export function useOptionalTranslation(): TranslationContextValue | null {
  return useContext(TranslationContext);
}

export function useTranslation(): TranslationContextValue {
  return useContext(TranslationContext) ?? FALLBACK_TRANSLATION_CONTEXT;
}
