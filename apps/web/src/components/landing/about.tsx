"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { ArrowRight, Crown } from "@moonwitness/ui/icons";
import { Grain, Button } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";

const EASE = "var(--ease-ink-out)";

function layerStyle(
  revealed: boolean,
  duration: number,
  delay: number,
  hidden: string,
): CSSProperties {
  return {
    transition: `opacity ${duration}s ${EASE} ${delay}s, transform ${duration}s ${EASE} ${delay}s`,
    opacity: revealed ? 1 : 0,
    transform: revealed ? "none" : hidden,
  };
}

export function About() {
  const [ref, revealed] = useScrollReveal(0.2);
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);
  const { locale, dictionary } = useTranslation();
  const about = dictionary.chronicle.landing.about;
  const toHref = (slug: string) => (pathLocale ? getLocalizedUrl(slug, pathLocale) : slug);
  const stickerLine =
    locale === "id"
      ? "KISAH TERUS MENGORBIT."
      : locale === "ar"
        ? "القصص تواصل الدوران."
        : "STORIES KEEP ORBITING.";

  return (
    <section
      ref={ref}
      id="about"
      aria-labelledby="about-heading"
      className="relative scroll-mt-20 overflow-hidden border-t-2 border-[var(--border)]"
    >
      <div
        data-join-layer="paper"
        aria-hidden="true"
        className="absolute inset-0 motion-reduce:!transition-none"
        style={layerStyle(revealed, 0.7, 0, "scale(1.06)")}
      >
        <Grain />
        <Image
          src={artSrc("crowd-moon")}
          alt=""
          fill
          className="object-cover object-[50%_35%] opacity-60"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[color-mix(in_srgb,var(--background)_75%,transparent)] to-[color-mix(in_srgb,var(--background)_92%,transparent)]" />
      </div>
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
        <div
          data-join-layer="type"
          className="motion-reduce:!transition-none"
          style={layerStyle(revealed, 0.55, 0.25, "translateY(28px)")}
        >
          <Crown aria-hidden="true" className="mx-auto mb-4 h-10 w-14 text-[var(--yellow)]" />
          <h2
            id="about-heading"
            className="font-brush text-5xl leading-tight text-[var(--pink)] drop-shadow-[3px_3px_0_rgba(0,0,0,0.9)] sm:text-7xl"
          >
            {about.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-hand text-2xl text-[var(--foreground)]">
            {about.subtitle}
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href={toHref("/shadow")}>
            <Button size="lg" className="px-8 py-4 text-xl">
              {about.joinCta} <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Button>
          </Link>
          <Link href={toHref("/mission-control")}>
            <Button variant="outline" size="lg" className="px-8 py-4 text-xl">
              {about.missionControlCta}
            </Button>
          </Link>
        </div>
        <div
          data-join-layer="ink"
          aria-hidden="true"
          className="mt-10 motion-reduce:!transition-none"
          style={layerStyle(revealed, 0.45, 0.5, "rotate(-8deg) scale(0.8)")}
        >
          <div className="sticker sticker-yellow mx-auto inline-block rotate-2 px-4 py-2 font-hand text-lg font-bold">
            {stickerLine}
          </div>
        </div>
      </div>
    </section>
  );
}
