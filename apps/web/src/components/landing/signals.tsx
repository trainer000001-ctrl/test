"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Crown, SafetyPin, SprayCan } from "@moonwitness/ui/icons";
import { Button, DistressedSticker, Staple, TactileTape, ZineCardRough } from "@moonwitness/ui";
import type { Locale } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { artSrc } from "@/lib/art";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";

const SIGNALS_EXTRAS: Record<
  Locale,
  {
    storyTape: string;
    storyAlt: string;
    collabTape: string;
    collabAlt: string;
    collabTag: string;
    portalTape: string;
    portalAlt: string;
    portalFooterTag: string;
  }
> = {
  en: {
    storyTape: "STORYWORLD",
    storyAlt: "Illustrated tunnel scene from a fictional Moonwitness story",
    collabTape: "COLLAB_WALL",
    collabAlt: "Three friends on a rooftop under the same moon",
    collabTag: "TAG: #ROOFTOP",
    portalTape: "SEALED",
    portalAlt: "A hooded witness overlooking the city at night",
    portalFooterTag: "STORYWORLD ARCHIVE",
  },
  id: {
    storyTape: "DUNIA CERITA",
    storyAlt: "Ilustrasi adegan terowongan dari kisah fiksi MoonWitness",
    collabTape: "DINDING_KOLAB",
    collabAlt: "Tiga sahabat di atap bangunan di bawah bulan yang sama",
    collabTag: "TAG: #ATAP",
    portalTape: "TERSEGEL",
    portalAlt: "Seorang saksi berkerudung memandangi kota pada malam hari",
    portalFooterTag: "ARSIP DUNIA CERITA",
  },
  ar: {
    storyTape: "عالم القصة",
    storyAlt: "رسم توضيحي لمشهد نفق من قصة خيالية في عالم شاهد القمر",
    collabTape: "جدار_التعاون",
    collabAlt: "ثلاثة أصدقاء على سطح مبنى تحت القمر نفسه",
    collabTag: "وسم: #السطح",
    portalTape: "مختوم",
    portalAlt: "شاهد مقنع يطل على المدينة ليلاً",
    portalFooterTag: "أرشيف عالم القصة",
  },
};

export function Signals() {
  const { dictionary, locale, direction } = useTranslation();
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);
  const dockHref = pathLocale ? getLocalizedUrl("/dock", pathLocale) : "/dock";
  const copy = dictionary?.chronicle?.landing?.signals;
  const extras = SIGNALS_EXTRAS[locale] ?? SIGNALS_EXTRAS.en;

  return (
    <section
      id="signals"
      dir={direction}
      className="relative mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6"
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b-2 border-dashed border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <SprayCan className="h-5 w-5 text-[var(--pink)]" />
            <span className="font-mono text-xs font-black tracking-widest text-[var(--accent)]">
              {copy?.badge ?? "FREQUENCY LOGS // PIRATE FEED"}
            </span>
          </div>
          <h2 className="cmyk-slip font-brush text-4xl text-[var(--foreground)] sm:text-5xl">
            {copy?.titlePrefix ?? "THE"}{" "}
            <span className="brush-underline text-[var(--primary)]">
              {copy?.titleAccent ?? "SIGNALS"}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <DistressedSticker
            variant="foil"
            text={copy?.sticker ?? "FICTIONAL STORIES"}
            className="rotate-2"
          />
          <Crown className="h-8 w-11 text-[var(--yellow)] rotate-6" />
        </div>
      </div>

      {/* Street Flyer Paste-Up Grid: Asymmetric offsets with tactiles */}
      <div className="grid gap-8 md:grid-cols-3">
        <ZineCardRough
          asChild
          className="photocopy-grit group relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:rotate-[-0.5deg] md:-rotate-1"
        >
          <article>
            <Staple className="top-2 left-3 -rotate-12" />
            <TactileTape
              variant="yellow"
              label={extras.storyTape}
              width={90}
              className="-top-1 -right-4 rotate-12 text-[9px]"
            />
            <div className="relative h-48 overflow-hidden bg-[var(--muted)]">
              <Image
                src={artSrc("signal-tunnel")}
                alt={extras.storyAlt}
                fill
                className="duo-img object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <span className="sticker sticker-pink absolute left-3 top-3 px-3 py-1 font-brush text-xs rotate-[-2deg] shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
                {copy?.storyCardLabel ?? "FICTIONAL SIGNAL"}
              </span>
            </div>
            <div className="flex flex-1 flex-col bg-[var(--card)] p-5 text-[var(--card-foreground)]">
              <h3 className="cmyk-slip font-brush text-2xl leading-tight text-[var(--card-foreground)] tracking-wide">
                {copy?.storyCardTitle ?? "A SIGNAL FROM BELOW"}
              </h3>
              <p className="mt-2 flex-1 font-mono text-xs leading-relaxed text-[var(--muted-foreground)]">
                {copy?.storyCardDesc ??
                  "A story from the MoonWitness storyworld. Strange sounds and a deeper current carried across the night."}
              </p>
              <Link href={dockHref} className="mt-4 inline-block">
                <Button className="min-h-11 px-5 py-2.5 text-sm">
                  {copy?.storyCardCta ?? "READ SIGNAL STORY"}{" "}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </Link>
            </div>
          </article>
        </ZineCardRough>

        <ZineCardRough
          asChild
          className="photocopy-grit group relative flex flex-col overflow-hidden transition-all duration-300 md:rotate-1 hover:rotate-0 hover:-translate-y-2"
        >
          <article>
            <Staple className="top-2 left-3 -rotate-12" />
            <TactileTape
              variant="yellow"
              label={extras.collabTape}
              width={95}
              className="-top-1 -right-3 rotate-12 text-[9px]"
            />

            <div className="relative h-48 overflow-hidden bg-[var(--muted)]">
              <Image
                src={artSrc("crew-rooftop")}
                alt={extras.collabAlt}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <span className="sticker sticker-yellow absolute left-3 top-3 px-3 py-1 font-brush text-xs rotate-[-3deg] shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
                {copy?.collabCardLabel ?? "STORYTELLING"}
              </span>
              <SafetyPin className="absolute bottom-2 right-2 h-7 w-7 text-[var(--foreground)]/45 rotate-45" />
            </div>
            <div className="flex flex-1 flex-col bg-[var(--card)] p-5 text-[var(--card-foreground)]">
              <h3 className="cmyk-slip font-brush text-2xl leading-tight text-[var(--card-foreground)]">
                {copy?.collabCardTitle ?? "SAME MOON, DIFFERENT ROOFTOPS"}
              </h3>
              <p className="mt-2 flex-1 font-mono text-xs leading-relaxed text-[var(--muted-foreground)]">
                {copy?.collabCardDesc ??
                  "Field notes from intersecting lives across cities sharing one sky."}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
                <Link href={dockHref}>
                  <Button className="min-h-11 px-5 py-2.5 text-sm">
                    {copy?.collabCardCta ?? "EXPLORE STORIES"}{" "}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </Link>
                <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                  {extras.collabTag}
                </span>
              </div>
            </div>
          </article>
        </ZineCardRough>

        <ZineCardRough
          asChild
          className="photocopy-grit group relative flex flex-col overflow-hidden transition-all duration-300 md:-rotate-1 hover:rotate-0 hover:-translate-y-2"
        >
          <article>
            <Staple className="top-2 right-3 rotate-45" />
            <TactileTape
              variant="black"
              label={extras.portalTape}
              width={80}
              className="-top-1 left-2 -rotate-12 text-[9px]"
            />

            <div className="relative h-48 overflow-hidden bg-[var(--muted)]">
              <Image
                src={artSrc("city-shadow")}
                alt={extras.portalAlt}
                fill
                className="object-cover object-[70%_center] transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <span className="sticker sticker-pink absolute left-3 top-3 px-3 py-1 font-brush text-xs rotate-2 shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
                {copy?.portalCardLabel ?? "ARCHIVE DOCK"}
              </span>
            </div>
            <div className="flex flex-1 flex-col bg-[var(--card)] p-5 text-[var(--card-foreground)]">
              <h3 className="cmyk-slip font-brush text-2xl leading-tight text-[var(--card-foreground)]">
                {copy?.portalCardTitle ?? "SIGNAL TRANSMISSIONS"}
              </h3>
              <p className="mt-2 flex-1 font-mono text-xs leading-relaxed text-[var(--muted-foreground)]">
                {copy?.portalCardDesc ??
                  "Browse indexed timeline dispatches and field recordings from the dock."}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
                <Link href={dockHref}>
                  <Button className="min-h-11 px-5 py-2.5 text-sm">
                    {copy?.portalCardCta ?? "OPEN ARCHIVE"}{" "}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </Link>
                <span className="font-mono text-[10px] text-[var(--red)] font-bold">
                  {extras.portalFooterTag}
                </span>
              </div>
            </div>
          </article>
        </ZineCardRough>
      </div>
    </section>
  );
}
