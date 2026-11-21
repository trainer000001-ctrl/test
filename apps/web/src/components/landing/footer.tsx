"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown } from "@moonwitness/ui/icons";
import { SanctuaryGateLink } from "@/components/sanctuary-gate-link";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";

export function LandingFooter() {
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);
  const { locale, dictionary } = useTranslation();
  const footer = dictionary.chronicle.landing.footer;
  const toHref = (slug: string) => (pathLocale ? getLocalizedUrl(slug, pathLocale) : slug);
  const navLabel =
    locale === "id" ? "Navigasi footer" : locale === "ar" ? "تنقل التذييل" : "Footer";

  return (
    <footer className="border-t-2 border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2">
          <Crown aria-hidden="true" className="h-4 w-6 text-[var(--accent)]" />
          <span className="font-brush text-sm text-[var(--card-foreground)]">
            MOON<span className="text-[var(--primary)]">WITNESS</span>
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">{footer.tagline}</span>
        </div>
        <nav
          className="flex flex-wrap gap-5 text-xs text-[var(--muted-foreground)]"
          aria-label={navLabel}
        >
          <SanctuaryGateLink className="hover:text-[var(--yellow)] max-lg:min-h-11">
            {footer.sanctuary}
          </SanctuaryGateLink>
          <Link href={toHref("/dock")} className="hover:text-[var(--pink)] max-lg:min-h-11">
            {footer.archive}
          </Link>
          <Link href={toHref("/shadow")} className="hover:text-[var(--pink)] max-lg:min-h-11">
            {footer.shadow}
          </Link>
          <Link
            href={toHref("/mission-control")}
            className="hover:text-[var(--pink)] max-lg:min-h-11"
          >
            {footer.missionControl}
          </Link>
          <a href="#home" className="hover:text-[var(--pink)] max-lg:min-h-11">
            {footer.backToTop}
          </a>
        </nav>
      </div>
    </footer>
  );
}
