"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CassetteTape, Star4 } from "@moonwitness/ui/icons";
import { DistressedSticker, Grain, Staple, TactileTape } from "@moonwitness/ui";
import type { Locale } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { artSrc } from "@/lib/art";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";

const TRANSMISSION_EXTRAS: Record<Locale, { imageAlt: string; quoteAttribution: string }> = {
  en: {
    imageAlt:
      "Illustration: fog rolling through a city street at night while a figure watches from the shadows",
    quoteAttribution: "Character dialogue, not a real account",
  },
  id: {
    imageAlt:
      "Ilustrasi: kabut menyelimuti jalanan kota pada malam hari sementara sesosok bayangan mengawasi",
    quoteAttribution: "Dialog tokoh fiksi, bukan kisah nyata",
  },
  ar: {
    imageAlt: "رسم توضيحي: ضباب يزحف عبر شارع مدينة ليلاً بينما يراقب طيف من الظلال",
    quoteAttribution: "حوار شخصية روائية، وليس رواية واقعية",
  },
};

export function Transmission() {
  const { dictionary, locale, direction } = useTranslation();
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);
  const dockHref = pathLocale ? getLocalizedUrl("/dock", pathLocale) : "/dock";
  const copy = dictionary?.chronicle?.landing?.transmission;
  const extras = TRANSMISSION_EXTRAS[locale] ?? TRANSMISSION_EXTRAS.en;

  return (
    <section
      id="transmission"
      dir={direction}
      className="relative scroll-mt-20 overflow-hidden border-y-2 border-[var(--border)] bg-[var(--background)] py-16 md:py-20"
    >
      <Grain />
      <div
        data-transmission-strip
        aria-hidden="true"
        className="transmission-strip absolute inset-x-0 top-0 h-2 origin-left bg-[var(--primary)]"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <header className="mb-8 flex flex-wrap items-end gap-x-6 gap-y-3 border-b-2 border-[var(--border)] pb-4">
          <span
            data-transmission-id
            className="ink-tick font-brush text-5xl leading-none text-[var(--accent)] sm:text-6xl"
          >
            {copy?.number ?? "001"}
          </span>
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-[var(--foreground)]">
              <CassetteTape aria-hidden className="h-3 w-4" />
              {copy?.eyebrow ?? "TRANSMISSION / STORY FILE"}
            </p>
            <h2 className="mt-1 font-brush text-3xl leading-tight text-[var(--foreground)] sm:text-4xl">
              {copy?.titlePrefix ?? "THE VOICES IN THE"}{" "}
              <span className="text-[var(--primary)]">{copy?.titleAccent ?? "FOG"}</span>
            </h2>
          </div>
          <DistressedSticker variant="hazard" text={copy?.badge ?? "FICTION"} className="ms-auto" />
          <Star4
            aria-hidden="true"
            className="h-6 w-6 animate-spin motion-reduce:animate-none text-[var(--pink)]"
            style={{ animationDuration: "8s" }}
          />
        </header>

        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-start">
          <figure className="relative border-2 border-[var(--border)] bg-[var(--card)]">
            <Staple className="-top-1 left-6 -rotate-12" />
            <TactileTape
              variant="yellow"
              label={copy?.tapeLabel ?? "STORY ART"}
              width={100}
              className="-top-2 right-4 rotate-3 text-[9px]"
            />
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={artSrc("fog-voices")}
                alt={extras.imageAlt}
                fill
                className="object-cover grayscale contrast-125"
                sizes="(max-width: 768px) 100vw, 58vw"
              />
              <div className="absolute inset-0 bg-[var(--pink)] opacity-25 mix-blend-color" />
            </div>
            <figcaption className="border-t-2 border-[var(--border)] px-4 py-2 font-mono text-[11px] text-[var(--muted-foreground)]">
              {copy?.figcaption ??
                "TRANSMISSION ARCHIVE // RECOVERED TAPE 001 · FICTIONAL STORY FILE"}
            </figcaption>
          </figure>

          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs tracking-widest text-[var(--accent)]">
              {copy?.narrativeTag ?? "FICTIONAL NARRATIVE · DEMO STORY"}
            </p>
            <p className="font-mono text-sm leading-relaxed text-[var(--foreground)]">
              {copy?.body ??
                "Three observers in the old textile district each hear the same frequency rise, fall, and answer back."}
            </p>
            <blockquote className="border-s-2 border-[var(--pink)] ps-4 font-hand text-lg italic text-[var(--foreground)]">
              &ldquo;
              {copy?.quote ?? "We kept the tape rolling until the fog cleared over the harbor."}
              &rdquo;
              <footer className="mt-1 font-mono text-[11px] not-italic text-[var(--muted-foreground)]">
                {extras.quoteAttribution}
              </footer>
            </blockquote>
            <Link
              href={dockHref}
              className="group mt-2 flex min-h-11 items-center justify-between gap-4 border-2 border-[var(--primary)] bg-[var(--card)] px-5 py-3 text-[var(--card-foreground)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
            >
              <span className="font-brush text-lg font-black">
                {copy?.readMore ?? "OPEN FULL DOSSIER"}
              </span>
              <ArrowRight
                aria-hidden
                className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover:-translate-x-1"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
