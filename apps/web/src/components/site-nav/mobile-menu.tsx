"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@moonwitness/ui";
import { SanctuaryGateLink } from "@/components/sanctuary-gate-link";
import type { Locale } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";
import { CHRONICLE_LOCALES, resolveChronicleHref, type NavLink } from "./links";

export interface LocaleSelectorProps {
  locale: Locale;
  onSelectLocale: (nextLocale: Locale) => void;
  groupLabel: string;
  variant?: "desktop" | "mobile";
}

export function LocaleSelector({
  locale,
  onSelectLocale,
  groupLabel,
  variant = "desktop",
}: LocaleSelectorProps) {
  const isMobile = variant === "mobile";
  return (
    <div
      role="group"
      aria-label={groupLabel}
      className={
        isMobile
          ? "mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3"
          : "hidden items-center rounded-md border border-[var(--border)] bg-[var(--card)] p-0.5 sm:inline-flex"
      }
    >
      {CHRONICLE_LOCALES.map((option) => {
        const active = locale === option.locale;
        return (
          <Button
            key={option.locale}
            type="button"
            variant="plain"
            aria-pressed={active}
            title={option.label}
            onClick={() => onSelectLocale(option.locale)}
            className={
              isMobile
                ? `inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 py-2 font-mono text-xs font-bold tracking-wider transition-colors ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                  }`
                : `inline-flex min-h-8 items-center justify-center rounded px-2 py-1 font-mono text-[11px] font-bold tracking-wider transition-colors ${
                    active
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`
            }
          >
            {option.code}
          </Button>
        );
      })}
    </div>
  );
}

export interface MobileMenuProps {
  links: NavLink[];
  active: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  locale?: Locale;
  onSelectLocale?: (nextLocale: Locale) => void;
}

export function MobileMenu({
  links,
  active,
  onSelect,
  onClose,
  locale: propLocale,
  onSelectLocale: propOnSelectLocale,
}: MobileMenuProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { locale: contextLocale, setLocale, dictionary } = useTranslation();
  const locale = propLocale ?? contextLocale;

  const navDict = dictionary.chronicle?.navigation;
  const aboutDict = dictionary.chronicle?.landing?.about;
  const switchLanguageLabel =
    dictionary.sanctuary?.navigation?.switchLanguage ??
    dictionary.shell?.language ??
    "Switch Language";
  const sanctuaryLabel = navDict?.sanctuary ?? "A-L-L-A-H.COM";
  const joinCrewLabel = aboutDict?.title ?? "JOIN THE CREW";
  const shadowHref = resolveChronicleHref("/shadow", pathname, locale);

  const handleSelectLocale = useCallback(
    (nextLocale: Locale) => {
      if (propOnSelectLocale) {
        propOnSelectLocale(nextLocale);
        return;
      }
      setLocale(nextLocale);
      if (getLocaleFromPath(pathname) !== null) {
        const search = typeof window !== "undefined" ? window.location.search : "";
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        router.push(getLocalizedUrl(`${pathname}${search}${hash}`, nextLocale));
      }
    },
    [pathname, propOnSelectLocale, router, setLocale],
  );

  return (
    <nav
      className="border-t border-[var(--border)] bg-[var(--ink)] px-4 py-3 lg:hidden"
      aria-label="Mobile"
    >
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          onClick={() => {
            onSelect(link.id);
            onClose();
          }}
          aria-current={active === link.id ? "true" : undefined}
          className={`flex min-h-11 items-center px-2 py-2.5 font-brush text-lg ${active === link.id ? "text-[var(--pink)]" : "text-[var(--foreground)]"}`}
        >
          {link.label}
        </a>
      ))}
      <SanctuaryGateLink
        onClick={onClose}
        className="flex min-h-11 items-center px-2 py-2.5 font-brush text-lg text-[var(--yellow)]"
      >
        {sanctuaryLabel}
      </SanctuaryGateLink>
      <Link href={shadowHref} onClick={onClose} className="mt-2 inline-block">
        <Button className="px-5 py-2.5 text-base">{joinCrewLabel} →</Button>
      </Link>
      <LocaleSelector
        locale={locale}
        onSelectLocale={handleSelectLocale}
        groupLabel={switchLanguageLabel}
        variant="mobile"
      />
    </nav>
  );
}
