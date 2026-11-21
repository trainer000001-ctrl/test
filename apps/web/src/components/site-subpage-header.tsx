"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { DnaButton } from "@moonwitness/ui/imperium";
import { SanctuaryGateLink } from "@/components/sanctuary-gate-link";
import { i18n } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";
import { OctagramMandalaIcon } from "./sacred-icons";
import { SanctuaryIdentityControl } from "./sanctuary-identity-control";

export function SiteSubpageHeader({
  activeRoute,
}: {
  readonly activeRoute: "scriptures" | "codex" | "mtime";
}) {
  const { locale, dictionary, setLocale } = useTranslation();
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);

  const sanctuaryNav = dictionary.sanctuary.navigation;
  const sanctuarySubpages = dictionary.sanctuary.subpages;
  const sanctuaryA11y = dictionary.sanctuary.a11y;

  const localizeHref = (path: string) => (pathLocale ? getLocalizedUrl(path, pathLocale) : path);

  const links = [
    { href: localizeHref("/"), id: "home", label: sanctuarySubpages.backToGate },
    { href: localizeHref("/scriptures"), id: "scriptures", label: sanctuaryNav.scriptures },
    { href: localizeHref("/codex"), id: "codex", label: sanctuaryNav.codex },
    { href: localizeHref("/mtime"), id: "mtime", label: sanctuaryNav.mtime },
    {
      href: localizeHref("/moonwitness"),
      id: "moonwitness",
      label: locale === "ar" ? "شاهد القمر" : "MOONWITNESS",
    },
  ] as const;

  const handleCycleLocale = useCallback(() => {
    const order = i18n.locales;
    const next = order[(order.indexOf(locale) + 1) % order.length] ?? i18n.defaultLocale;
    setLocale(next);

    if (typeof window !== "undefined") {
      const currentPath = pathname || window.location.pathname;
      if (getLocaleFromPath(currentPath) !== null) {
        const search = window.location.search ?? "";
        const hash = window.location.hash ?? "";
        window.location.assign(getLocalizedUrl(`${currentPath}${search}${hash}`, next));
      }
    }
  }, [locale, pathname, setLocale]);

  const brandContent = (
    <>
      <OctagramMandalaIcon className="h-8 w-8 shrink-0" />
      <div className="flex flex-col">
        <span className="font-monument text-sm tracking-[0.16em] text-[var(--dna-text)]">
          {sanctuarySubpages.gateBreadcrumb}
        </span>
        <span className="font-mono text-[9.5px] tracking-[0.2em] text-[var(--dna-accent)] uppercase">
          {locale === "id"
            ? "KERAJAAN CAHAYA"
            : locale === "ar"
              ? "مملكة النور"
              : "EMPIRE OF THE LIGHT"}
        </span>
      </div>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
        {pathLocale ? (
          <Link
            href={localizeHref("/")}
            aria-label={sanctuarySubpages.backToGate}
            className="flex min-h-[44px] items-center gap-3 focus:outline-none"
          >
            {brandContent}
          </Link>
        ) : (
          <SanctuaryGateLink
            aria-label={sanctuarySubpages.backToGate}
            className="flex min-h-[44px] items-center gap-3 focus:outline-none"
          >
            {brandContent}
          </SanctuaryGateLink>
        )}

        <nav aria-label={sanctuaryA11y.primaryNav} className="flex flex-wrap items-center gap-2">
          {links.map((item) => {
            const isCurrent = item.id === activeRoute;
            const linkClass = `min-h-0 inline-flex items-center px-3.5 py-1.5 font-mono text-[10px] tracking-[0.16em] uppercase ${
              isCurrent
                ? "text-[var(--dna-text)]"
                : "text-[var(--dna-muted)] hover:text-[var(--dna-text)]"
            }`;
            if (item.id === "home" && !pathLocale) {
              return (
                <DnaButton key={item.id} asChild tone="secondary" className={linkClass}>
                  <SanctuaryGateLink data-active={isCurrent ? "true" : "false"}>
                    {item.label}
                  </SanctuaryGateLink>
                </DnaButton>
              );
            }
            return (
              <DnaButton key={item.id} asChild tone="secondary" className={linkClass}>
                <Link
                  href={item.href}
                  data-active={isCurrent ? "true" : "false"}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </DnaButton>
            );
          })}
          <DnaButton
            type="button"
            tone="secondary"
            onClick={handleCycleLocale}
            aria-label={sanctuaryA11y.toggleLocaleLabel.replace("{locale}", locale.toUpperCase())}
            title={sanctuaryNav.switchLanguage}
            className="min-h-0 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-[var(--dna-accent)] uppercase"
          >
            {locale.toUpperCase()}
          </DnaButton>
          <SanctuaryIdentityControl />
        </nav>
      </div>
    </header>
  );
}
