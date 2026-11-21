"use client";

import { useCallback, useState, type ReactNode } from "react";
import { i18n, type Direction, type Locale } from "@/configs/i18n";
import {
  TranslationWrapper,
  useOptionalTranslation,
  useTranslation,
} from "@/hocs/TranslationWrapper";
import { isValidLocale } from "@/utils/i18n";

export type SanctuaryLocale = Locale;

interface SanctuaryLocaleContextValue {
  readonly locale: SanctuaryLocale;
  readonly dir: Direction;
  readonly setLocale: (next: SanctuaryLocale) => void;
  readonly toggleLocale: () => void;
}

export function SanctuaryLocaleProvider({
  initialLocale,
  children,
}: {
  readonly initialLocale?: SanctuaryLocale;
  readonly children: ReactNode;
}) {
  const outerTranslation = useOptionalTranslation();
  const hasInitialLocale = initialLocale !== undefined;
  const resolvedInitial: Locale | undefined = hasInitialLocale
    ? isValidLocale(initialLocale)
      ? initialLocale
      : i18n.defaultLocale
    : undefined;

  const [bridgedOnMount] = useState<boolean>(() =>
    Boolean(outerTranslation && (!hasInitialLocale || resolvedInitial === outerTranslation.locale)),
  );

  if (
    outerTranslation &&
    (bridgedOnMount || !hasInitialLocale || resolvedInitial === outerTranslation.locale)
  ) {
    return <>{children}</>;
  }

  return <TranslationWrapper lang={resolvedInitial}>{children}</TranslationWrapper>;
}

export function useSanctuaryLocale(): SanctuaryLocaleContextValue {
  const { locale, direction, setLocale } = useTranslation();

  const toggleLocale = useCallback(() => {
    const order = i18n.locales;
    const currentIndex = order.indexOf(locale);
    const next = order[(currentIndex + 1) % order.length] ?? i18n.defaultLocale;
    setLocale(next);
  }, [locale, setLocale]);

  return {
    locale,
    dir: direction,
    setLocale,
    toggleLocale,
  };
}
