"use client";

import { moonwitnessSdk } from "@moonwitness/contracts/sdk";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConsoleShell, Input, NativeSelect, type HudNavItem } from "@moonwitness/ui";
import { Crown, SearchIcon } from "@moonwitness/ui/icons";
import { ConsoleCommandPalette } from "@/components/console-command-palette";
import { LanguageDropdown } from "@/components/layout/shared/LanguageDropdown";
import { ShortcutsDropdown } from "@/components/layout/shared/ShortcutsDropdown";
import { SanctuaryGateLink } from "@/components/sanctuary-gate-link";
import { SkinSwitcher } from "@/components/skin-switcher";
import { buildEnterpriseNavItems } from "@/data/navigation/verticalMenuData";
import { useOptionalTranslation, useTranslation } from "@/hocs/TranslationWrapper";
import { useCelestialNow, useCompaniesCatalog, useMetaNavigation } from "@/lib/api/meta-views";
import { useSavedAvatar } from "@/lib/avatar-store";
import { clearStoredMidSession } from "@/lib/mid-oidc";
import { markExplicitLogout, useCurrentIdentity } from "@/lib/session";
import { getLocaleFromPath, getLocalizedUrl, stripLocalePrefix } from "@/utils/i18n";
import {
  activeByPath,
  localizeNavItemLabels,
  navHref,
  navItems,
  operationsNavItems,
  type NavItem,
} from "./nav-items";
import { Notifications } from "./notifications";
import { ProfileMenu } from "./profile-menu";
import { useActiveSection } from "./use-active-section";

const FOOTER_LEFT = "MOONWITNESS XV /// DIFFERENT PEOPLE. SAME SKY. MANY STORIES.";
const FOOTER_RIGHT = "EMPIRE OF THE LIGHT";

function localizeNavItems(items: NavItem[], localePrefix: string): NavItem[] {
  if (!localePrefix) return items;
  return items.map((item) => {
    const rawHref = item.target.href.startsWith("/") ? item.target.href : `/${item.target.href}`;
    const unprefixedHref = stripLocalePrefix(rawHref) || "/";
    let mappedHref = unprefixedHref;
    if (unprefixedHref === "/control" || unprefixedHref.startsWith("/control?")) {
      mappedHref = `/apps${unprefixedHref}`;
    } else if (
      unprefixedHref === "/syslog" ||
      unprefixedHref === "/snmp" ||
      unprefixedHref === "/storage" ||
      unprefixedHref === "/radius" ||
      unprefixedHref === "/vpn"
    ) {
      mappedHref = `/apps/control?tab=${unprefixedHref.slice(1)}`;
    } else if (unprefixedHref.startsWith("/models/")) {
      const modelSlug = decodeURIComponent(unprefixedHref.slice("/models/".length));
      mappedHref = `/apps/addons?model=${encodeURIComponent(modelSlug)}`;
    }
    const href = getLocalizedUrl(mappedHref, localePrefix);
    return {
      ...item,
      target: { ...item.target, href },
    };
  });
}

export function ConsoleShellAdapter({
  breadcrumb,
  search,
  onNavigate,
  plane = "creator",
  activeOverride,
  children,
}: {
  breadcrumb: string;
  search: { value: string; onChange: (v: string) => void; placeholder: string };
  onNavigate?: () => void;
  plane?: "creator" | "operations";
  activeOverride?: string;
  children: ReactNode;
}) {
  const operations = plane === "operations";
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const urlLocale = getLocaleFromPath(pathname);
  const { locale, dictionary } = useTranslation();
  const hasTranslationProvider = useOptionalTranslation() !== null;
  const session = useCurrentIdentity();

  const staticItems = useMemo(() => {
    if (urlLocale) {
      return buildEnterpriseNavItems(plane, dictionary, urlLocale, session?.role);
    }
    const unprefixed = operations ? operationsNavItems : navItems;
    return hasTranslationProvider ? localizeNavItemLabels(unprefixed, dictionary) : unprefixed;
  }, [dictionary, hasTranslationProvider, operations, plane, session?.role, urlLocale]);

  const rawItems = useMetaNavigation(plane, staticItems, Boolean(session));
  const items = useMemo(
    () => (urlLocale ? localizeNavItems(rawItems, urlLocale) : rawItems),
    [rawItems, urlLocale],
  );

  const rootHref = urlLocale
    ? getLocalizedUrl(operations ? "/apps/control" : "/", urlLocale)
    : operations
      ? "/control"
      : "/";
  const moonwitnessHref = urlLocale ? getLocalizedUrl("/moonwitness", urlLocale) : "/moonwitness";
  const active = activeOverride ?? activeByPath(pathname);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const activeSection = useActiveSection(items, pathname);
  const identity = session?.identity ?? "Creator // Empire";
  const role = session?.role ?? "Empire crew";
  const { seed: avatarSeed } = useSavedAvatar(identity);
  const { companies, activeTenant, setActiveTenant } = useCompaniesCatalog(Boolean(session));
  const celestial = useCelestialNow(Boolean(session));

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function exitShadow() {
    clearStoredMidSession();
    moonwitnessSdk.auth
      .logout()
      .catch(() => {})
      .finally(() => {
        markExplicitLogout();
      });
    router.push(urlLocale ? getLocalizedUrl("/", urlLocale) : "/");
  }

  const hudItems: HudNavItem[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    iconPath: item.icon,
    href: navHref(item),
    kind: item.target.kind,
  }));

  return (
    <ConsoleShell
      title={breadcrumb}
      brandHref={rootHref}
      subtitle={
        operations ? dictionary.operations.workspace.planeLabel : dictionary.shell.theEmpire
      }
      navLabel={operations ? dictionary.shell.operations : dictionary.shell.theEmpire}
      items={hudItems}
      active={active}
      activeSection={activeSection}
      onNavigate={() => {
        setNotifOpen(false);
        setProfileOpen(false);
        onNavigate?.();
      }}
      linkAs={Link}
      headerStart={
        <>
          <Link href={rootHref} className="inline-flex min-h-11 items-center hover:underline">
            <span>{operations ? dictionary.shell.operations : dictionary.shell.theEmpire}</span>
          </Link>
          <span aria-hidden>›</span>
        </>
      }
      headerSearch={
        <div className="relative min-w-0 w-full">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            aria-label={search.placeholder}
            className="min-h-11 w-full ps-9"
          />
        </div>
      }
      headerActions={
        <div
          ref={popRef}
          className="relative flex max-w-full flex-wrap items-center justify-end gap-1.5"
        >
          {celestial?.aeq4?.formatted && celestial?.hijri && celestial?.lunar ? (
            <span
              dir="ltr"
              title={celestial.aeq4.formatted}
              className="hidden 2xl:inline-flex shrink-0 whitespace-nowrap items-center border border-[var(--border)] px-2 py-1 font-mono text-[10px] text-[var(--muted-foreground)]"
            >
              {celestial.hijri.day} {celestial.hijri.monthName} {celestial.hijri.year}H ·{" "}
              {celestial.lunar.illumination}%
            </span>
          ) : null}
          {companies.length > 0 ? (
            <NativeSelect
              aria-label={dictionary.shell.activeTenant}
              value={activeTenant}
              onChange={(e) => {
                setActiveTenant(e.target.value);
                window.dispatchEvent(new Event("mw:navigation-changed"));
              }}
              className="h-8 max-w-[125px] shrink-0 font-mono text-[11px] sm:min-w-[130px] sm:max-w-[160px]"
            >
              {companies.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <LanguageDropdown />
          <ShortcutsDropdown />
          <SkinSwitcher />
          <Notifications
            open={notifOpen}
            authenticated={Boolean(session)}
            onToggle={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
          />
          <ProfileMenu
            open={profileOpen}
            onToggle={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            identity={identity}
            role={role}
            onExit={exitShadow}
            avatarSeed={avatarSeed}
          />
        </div>
      }
      railFooter={
        operations ? (
          <div className="font-mono text-[10px] leading-relaxed text-[var(--muted-foreground)]">
            <strong className="text-[var(--primary)]">
              {dictionary.shell.operations.toUpperCase()}
            </strong>
            <div>{dictionary.operations.workspace.planeLabel}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 font-mono text-[10px] tracking-wider">
            <SanctuaryGateLink className="flex min-h-9 items-center justify-between border border-[var(--border)] px-2.5 py-1 text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]">
              <span>{dictionary.navigation.imperiumGate.toUpperCase()}</span>
              <span aria-hidden="true">↗</span>
            </SanctuaryGateLink>
            <Link
              href={moonwitnessHref}
              className="flex min-h-9 items-center justify-between border border-[var(--border)] px-2.5 py-1 text-[var(--foreground)] transition-colors hover:border-[var(--primary)]"
            >
              <span>{dictionary.navigation.moonwitnessPortal.toUpperCase()}</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        )
      }
      commandLeft={operations ? dictionary.operations.workspace.planeLabel : FOOTER_LEFT}
      commandRight={
        <>
          <Crown className="h-3 w-5 text-[var(--primary)]" />{" "}
          {operations
            ? locale === "en"
              ? "ARSY CONTROL PLANE"
              : dictionary.navigation.controlPlane.toUpperCase()
            : FOOTER_RIGHT}
        </>
      }
    >
      <ConsoleCommandPalette plane={plane} />
      {children}
    </ConsoleShell>
  );
}
