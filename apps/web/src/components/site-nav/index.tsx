"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlobeIcon, Menu, SearchIcon, X } from "@moonwitness/ui/icons";
import { Button, DnaBrandLogo, useSkin, type BrandLogoId } from "@moonwitness/ui";
import { SanctuaryGateLink } from "@/components/sanctuary-gate-link";
import { SkinSwitcher } from "@/components/skin-switcher";
import type { Locale } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";
import {
  buildArchiveSearchHref,
  getChronicleNavLinks,
  links as defaultLinks,
  resolveChronicleHref,
} from "./links";
import { LocaleSelector, MobileMenu } from "./mobile-menu";
import { SearchDialog } from "./search-dialog";

export function SiteNav() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { dnaId } = useSkin();
  const { dictionary, locale, setLocale } = useTranslation();
  const navDict = dictionary.chronicle?.navigation;
  const searchDict = dictionary.chronicle?.search;
  const aboutDict = dictionary.chronicle?.landing?.about;
  const navLinks = useMemo(() => getChronicleNavLinks(navDict), [navDict]);

  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dismissSearch = useCallback(() => {
    setSearchOpen(false);
    requestAnimationFrame(() => searchTriggerRef.current?.focus());
  }, []);

  const toHref = useCallback(
    (slug: string) => resolveChronicleHref(slug, pathname, locale),
    [locale, pathname],
  );

  const handleSelectLocale = useCallback(
    (nextLocale: Locale) => {
      setLocale(nextLocale);
      if (getLocaleFromPath(pathname) !== null) {
        const search = typeof window !== "undefined" ? window.location.search : "";
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        router.push(getLocalizedUrl(`${pathname}${search}${hash}`, nextLocale));
      }
    },
    [pathname, router, setLocale],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const link of defaultLinks) {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchOpen(false);
    router.push(buildArchiveSearchHref(query, pathname, locale));
  }

  const switchLanguageLabel =
    dictionary.sanctuary?.navigation?.switchLanguage ??
    dictionary.shell?.language ??
    "Switch Language";
  const sanctuaryLabel = navDict?.sanctuary ?? "A-L-L-A-H.COM";
  const searchAriaLabel = searchDict?.dialogTitle ?? navDict?.searchButton ?? "Search the archive";
  const searchButtonTitle = navDict?.searchButton ?? "Search signals";
  const missionControlLabel = navDict?.missionControl ?? "Mission Control";
  const joinCrewLabel = aboutDict?.title ?? "JOIN THE CREW";
  const openMenuText = navDict?.openMenu ?? "Open menu";
  const closeMenuText = navDict?.closeMenu ?? "Close menu";
  const menuToggleAriaLabel =
    locale === "en"
      ? menuOpen
        ? `Toggle menu (${closeMenuText})`
        : `Toggle menu (${openMenuText})`
      : menuOpen
        ? closeMenuText
        : openMenuText;

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 border-b-2 border-[var(--border)] bg-[var(--background)]/90 text-[var(--foreground)] backdrop-blur-md"
        onKeyDown={(event) => {
          if (menuOpen && event.key === "Escape") {
            event.preventDefault();
            setMenuOpen(false);
            menuToggleRef.current?.focus();
          }
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <Link
            href={toHref("/moonwitness")}
            className="flex items-center gap-2.5 max-lg:min-h-11"
            aria-label="Moonwitness home"
          >
            <DnaBrandLogo
              id={(dnaId as BrandLogoId) ?? "moonwitness"}
              variant="mark"
              size={28}
              decorative
            />
            <span className="font-brush text-xl tracking-wide text-[var(--foreground)] sm:text-2xl">
              MOON<span className="text-[var(--primary)]">WITNESS</span>
            </span>
          </Link>

          <nav className="ms-3 hidden items-center gap-1 lg:flex xl:ms-6" aria-label="Primary">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => setActive(link.id)}
                aria-current={active === link.id ? "true" : undefined}
                className={`whitespace-nowrap px-2 py-1.5 font-brush text-xs tracking-wider transition-colors xl:px-3 xl:text-sm ${
                  active === link.id
                    ? "text-[var(--primary)] underline decoration-[var(--primary)] decoration-4 underline-offset-8"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {link.label}
              </a>
            ))}
            <SanctuaryGateLink className="whitespace-nowrap px-2 py-1.5 font-brush text-xs tracking-wider text-[var(--primary)] transition-colors hover:text-[var(--foreground)] xl:px-3 xl:text-sm">
              {sanctuaryLabel}
            </SanctuaryGateLink>
          </nav>

          <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
            <LocaleSelector
              locale={locale}
              onSelectLocale={handleSelectLocale}
              groupLabel={switchLanguageLabel}
              variant="desktop"
            />
            <SkinSwitcher />
            <Button
              type="button"
              variant="plain"
              onClick={() => setSearchOpen(true)}
              ref={searchTriggerRef}
              aria-label={searchAriaLabel}
              title={searchButtonTitle}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              <SearchIcon className="h-5 w-5" />
            </Button>
            <Link
              href={toHref("/mission-control")}
              aria-label={missionControlLabel}
              title={missionControlLabel}
              className="hidden rounded-md p-2 text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] sm:block"
            >
              <GlobeIcon className="h-5 w-5" />
            </Link>
            <Link href={toHref("/shadow")} className="hidden sm:block">
              <Button
                variant="outline"
                size="sm"
                className="whitespace-nowrap px-3 py-2 text-xs xl:px-5 xl:text-sm"
              >
                {joinCrewLabel} →
              </Button>
            </Link>
            <Button
              type="button"
              variant="plain"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-[var(--foreground)] lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              ref={menuToggleRef}
              aria-label={menuToggleAriaLabel}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <MobileMenu
            links={navLinks}
            active={active}
            onSelect={setActive}
            onClose={() => setMenuOpen(false)}
            locale={locale}
            onSelectLocale={handleSelectLocale}
          />
        )}
      </header>

      {searchOpen && (
        <SearchDialog
          query={query}
          onQueryChange={setQuery}
          onSubmit={submitSearch}
          onClose={dismissSearch}
        />
      )}
    </>
  );
}
