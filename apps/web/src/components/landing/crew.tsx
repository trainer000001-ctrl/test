"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { witnesses } from "@/lib/data";
import { artSrc } from "@/lib/art";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";
import { ArrowRight, SkullCrossbonesFunky } from "@moonwitness/ui/icons";
import { CrewConstellation, Halftone, Staple, TactileTape, Button } from "@moonwitness/ui";

export function Crew() {
  const { dictionary } = useTranslation();
  const crew = dictionary.chronicle.landing.crew;
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);
  const toHref = (slug: string) => (pathLocale ? getLocalizedUrl(slug, pathLocale) : slug);

  return (
    <section
      id="crew"
      aria-labelledby="crew-heading"
      className="relative scroll-mt-20 border-y-2 border-[var(--border)] bg-[var(--muted)]/35 py-24"
    >
      <Halftone tone="pink" className="pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b-2 border-dashed border-[var(--border)] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <SkullCrossbonesFunky aria-hidden="true" className="h-5 w-5 text-[var(--primary)]" />
              <span className="font-mono text-xs font-black tracking-widest text-[var(--primary)]">
                {crew.eyebrow}
              </span>
            </div>
            <h2
              id="crew-heading"
              className="cmyk-slip font-brush text-4xl text-[var(--foreground)] sm:text-5xl"
            >
              {crew.titlePrefix} <span className="text-[var(--accent)]">{crew.titleAccent}</span>
            </h2>
            <p className="mt-2 max-w-xl font-mono text-xs text-[var(--foreground)]">
              {crew.subtitle}
            </p>
          </div>
          <div className="relative hidden h-32 w-64 overflow-hidden border-2 border-[var(--border)] bg-[var(--card)] shadow-[6px_6px_0_rgba(0,0,0,0.8)] md:block rotate-1">
            <Image
              src={artSrc("crew-wall")}
              alt={crew.collageLabel}
              fill
              className="object-cover contrast-125"
              sizes="256px"
            />
            <TactileTape
              variant="yellow"
              label={crew.collageLabel}
              width={110}
              className="-top-2 right-2 rotate-6 text-[9px]"
            />
            <Staple className="bottom-2 left-2 -rotate-45" />
          </div>
        </div>
        <CrewConstellation
          witnesses={witnesses}
          stats={[]}
          demo
          stickerText={crew.sticker}
          cta={
            <Link href={toHref("/shadow")}>
              <Button className="px-6 py-3.5 text-base">
                {crew.cta} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </Link>
          }
        />
      </div>
    </section>
  );
}
