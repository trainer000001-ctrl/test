"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, type MouseEvent } from "react";
import { Button } from "@moonwitness/ui";
import {
  CrescentStarIcon,
  CrownEmblemIcon,
  DnaButton,
  PrimaryAction,
  SearchLensIcon,
  SecondaryAction,
  SiteNavigation,
} from "@moonwitness/ui/imperium";
import { i18n } from "@/configs/i18n";
import { NAVIGATION_TABS, type NavigationSectionId } from "@/data/empire-registry";
import { useTranslation } from "@/hocs/TranslationWrapper";
import type { SanctuaryLocale } from "@/lib/sanctuary-locale";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";
import { SanctuaryIdentityControl } from "./sanctuary-identity-control";

export interface EmpireNavigationProps {
  readonly locale?: SanctuaryLocale;
  readonly activeNavTab: NavigationSectionId;
  readonly sanctuaryRadianceActive: boolean;
  readonly quietMode: boolean;
  readonly mobileMenuOpen: boolean;
  readonly onNavigateToSection: (sectionId: NavigationSectionId) => void;
  readonly onOpenSearch: () => void;
  readonly onToggleRadiance: () => void;
  readonly onToggleLocale?: () => void;
  readonly onToggleQuietMode: () => void;
  readonly onToggleMobileMenu: () => void;
  readonly onCloseMobileMenu: () => void;
}

export function EmpireNavigation({
  locale: propLocale,
  activeNavTab,
  sanctuaryRadianceActive,
  quietMode,
  mobileMenuOpen,
  onNavigateToSection,
  onOpenSearch,
  onToggleRadiance,
  onToggleLocale,
  onToggleQuietMode,
  onToggleMobileMenu,
  onCloseMobileMenu,
}: EmpireNavigationProps) {
  const { locale: contextLocale, dictionary, setLocale } = useTranslation();
  const locale = propLocale ?? contextLocale;
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);
  const localizedMoonwitnessHref = pathLocale
    ? getLocalizedUrl("/moonwitness", pathLocale)
    : "/moonwitness";
  const menuTriggerRef = useRef<HTMLElement>(null);

  const sanctuaryNav = dictionary.sanctuary.navigation;
  const sanctuarySubpages = dictionary.sanctuary.subpages;
  const sanctuaryA11y = dictionary.sanctuary.a11y;

  const tabLabels: Readonly<Record<NavigationSectionId, string>> = {
    "the-gate": sanctuaryNav.gate,
    "the-worlds": sanctuaryNav.worlds,
    "the-codex": sanctuaryNav.codex,
    "the-dock": dictionary.navigation.archive,
    about: locale === "id" ? "TENTANG" : locale === "ar" ? "حول" : "ABOUT",
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseMobileMenu();
        menuTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, onCloseMobileMenu]);

  const handleCycleLocale = useCallback(() => {
    if (onToggleLocale) {
      onToggleLocale();
      return;
    }
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
  }, [locale, onToggleLocale, pathname, setLocale]);

  const localeButtonAriaLabel = sanctuaryA11y.toggleLocaleLabel.replace(
    "{locale}",
    locale.toUpperCase(),
  );
  const mobileMenuAriaLabel =
    locale === "en"
      ? "Toggle Empire Navigation Menu"
      : mobileMenuOpen
        ? dictionary.chronicle.navigation.closeMenu
        : dictionary.chronicle.navigation.openMenu;

  return (
    <SiteNavigation
      navLabel={sanctuaryA11y.primaryNav}
      mobileMenuOpen={mobileMenuOpen}
      brand={
        <a
          href="#the-gate"
          onClick={(event) => {
            event.preventDefault();
            onNavigateToSection("the-gate");
            onCloseMobileMenu();
          }}
          className="home-header-brand group flex min-h-[44px] items-center gap-2.5 sm:gap-3"
        >
          <CrownEmblemIcon className="h-8 w-8 shrink-0 text-[var(--dna-accent)]" />
          <div className="flex flex-col leading-tight">
            <span className="home-brand-wordmark text-base sm:text-lg font-bold tracking-[0.06em] text-[var(--dna-text)]">
              {sanctuarySubpages.gateBreadcrumb}
            </span>
            <span className="home-brand-tagline text-[11px] font-bold tracking-[0.12em] text-[var(--dna-accent)] uppercase">
              {locale === "id"
                ? "KERAJAAN CAHAYA"
                : locale === "ar"
                  ? "مملكة النور"
                  : "EMPIRE OF THE LIGHT"}
            </span>
          </div>
        </a>
      }
      items={[
        ...NAVIGATION_TABS.map((navTab) => ({
          id: navTab.id,
          label: tabLabels[navTab.id] ?? navTab.label,
          href: `#${navTab.id}`,
          active: activeNavTab === navTab.id,
          onSelect: (event: MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            onNavigateToSection(navTab.id);
          },
        })),
        {
          id: "moonwitness",
          label: locale === "ar" ? "شاهد القمر" : "MOONWITNESS",
          href: localizedMoonwitnessHref,
          active: false,
        },
      ]}
      actions={
        <>
          <Button
            type="button"
            variant="plain"
            onClick={() => {
              onCloseMobileMenu();
              onOpenSearch();
            }}
            aria-label={sanctuaryNav.search}
            title={`${sanctuaryNav.search} (Ctrl+K)`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--dna-text)] hover:text-[var(--dna-accent)] transition-colors cursor-pointer"
          >
            <SearchLensIcon className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="plain"
            aria-pressed={sanctuaryRadianceActive}
            onClick={onToggleRadiance}
            aria-label={
              locale === "id"
                ? "Aktifkan/Matikan Cahaya Sanctuary"
                : locale === "ar"
                  ? "تبديل إشراق المحراب"
                  : "Toggle Sanctuary Radiance Mode"
            }
            title={
              locale === "id"
                ? "Cahaya Sanctuary"
                : locale === "ar"
                  ? "إشراق المحراب"
                  : "Toggle Sanctuary Radiance"
            }
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center transition-colors cursor-pointer ${
              sanctuaryRadianceActive
                ? "text-[var(--dna-accent)]"
                : "text-[var(--dna-text)] hover:text-[var(--dna-accent)]"
            }`}
          >
            <CrescentStarIcon className="h-5 w-5" />
          </Button>

          <SecondaryAction
            onClick={handleCycleLocale}
            aria-label={localeButtonAriaLabel}
            title={sanctuaryNav.switchLanguage}
            className="hidden sm:inline-flex font-mono text-xs"
          >
            {locale.toUpperCase()}
          </SecondaryAction>

          <div className="hidden xl:inline-flex">
            <SanctuaryIdentityControl />
          </div>

          <SecondaryAction
            aria-pressed={quietMode}
            onClick={onToggleQuietMode}
            aria-label={sanctuaryNav.quietMode}
            title={sanctuaryNav.quietMode}
            className="hidden xl:inline-flex font-mono text-xs"
          >
            {quietMode
              ? sanctuaryNav.quietMode
              : locale === "id"
                ? "CAHAYA"
                : locale === "ar"
                  ? "نور"
                  : "LIGHT"}
          </SecondaryAction>

          <PrimaryAction
            onClick={() => onNavigateToSection("the-dock")}
            className="hidden 2xl:inline-flex px-3.5 py-1.5 text-xs"
          >
            <span>
              {locale === "id" ? "GABUNG KRU" : locale === "ar" ? "انضمّ للطاقم" : "JOIN THE CREW"}
            </span>
            <span aria-hidden="true">&rarr;</span>
          </PrimaryAction>

          <CrownEmblemIcon
            className="hidden 2xl:block h-7 w-7 shrink-0 text-[var(--dna-accent)]"
            aria-hidden="true"
          />

          <SecondaryAction
            ref={menuTriggerRef}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-sanctuary-nav"
            aria-label={mobileMenuAriaLabel}
            onClick={onToggleMobileMenu}
            className="flex min-w-[44px] px-3 lg:hidden"
          >
            <span className="font-mono text-sm" aria-hidden="true">
              {mobileMenuOpen ? "✕" : "☰"}
            </span>
          </SecondaryAction>
        </>
      }
      mobileDrawer={
        <div
          id="mobile-sanctuary-nav"
          role="region"
          aria-label={sanctuaryA11y.primaryNav}
          className="mx-3 mb-3 max-w-full overflow-x-hidden border-2 border-[var(--dna-accent)] bg-[var(--dna-canvas)] p-3.5 shadow-[4px_4px_0_var(--dna-accent-secondary)] sm:mx-4 sm:p-4 lg:hidden"
        >
          <div className="grid grid-cols-2 gap-2">
            {NAVIGATION_TABS.map((navTab) => {
              const isTabActive = activeNavTab === navTab.id;
              return (
                <SecondaryAction
                  key={navTab.id}
                  data-active={isTabActive ? "true" : "false"}
                  onClick={() => {
                    onNavigateToSection(navTab.id);
                    onCloseMobileMenu();
                  }}
                  className="min-w-0 w-full justify-center px-2.5 text-center text-xs leading-tight whitespace-normal break-words"
                >
                  {tabLabels[navTab.id] ?? navTab.label}
                </SecondaryAction>
              );
            })}
            <DnaButton
              asChild
              tone="secondary"
              className="mw-secondary-action inline-flex min-h-[44px] min-w-0 w-full items-center justify-center gap-2 px-2.5 py-2 text-center text-xs leading-tight font-medium uppercase whitespace-normal break-words"
            >
              <Link href={localizedMoonwitnessHref} onClick={onCloseMobileMenu}>
                {locale === "ar" ? "شاهد القمر" : "MOONWITNESS"}
              </Link>
            </DnaButton>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--dna-accent)]/25 pt-3">
            <SecondaryAction
              aria-pressed={quietMode}
              onClick={onToggleQuietMode}
              className="min-w-0 flex-1 px-2.5 text-xs leading-tight whitespace-normal"
            >
              {quietMode
                ? locale === "id"
                  ? "PULIHKAN GERAK"
                  : locale === "ar"
                    ? "استعادة الحركة"
                    : "RESTORE MOTION"
                : sanctuaryNav.quietMode}
            </SecondaryAction>
            <SecondaryAction
              onClick={handleCycleLocale}
              aria-label={localeButtonAriaLabel}
              title={sanctuaryNav.switchLanguage}
              className="shrink-0 px-3 text-xs"
            >
              {locale.toUpperCase()}
            </SecondaryAction>
            <div className="min-w-0">
              <SanctuaryIdentityControl compact />
            </div>
          </div>
        </div>
      }
    />
  );
}
