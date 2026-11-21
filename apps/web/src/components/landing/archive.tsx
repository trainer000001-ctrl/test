"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { artSrc } from "@/lib/art";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";
import { ArrowRight, CassetteTape, Smiley } from "@moonwitness/ui/icons";
import { DistressedSticker, Staple, kindColors } from "@moonwitness/ui";
import { Button } from "@moonwitness/ui";
import { useTimelineEvents } from "@/lib/api/timeline";

function ArchiveStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const { locale, dictionary } = useTranslation();
  const archive = dictionary.chronicle.landing.archive;
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);
  const toHref = (slug: string) => (pathLocale ? getLocalizedUrl(slug, pathLocale) : slug);
  const evidencePrefix = locale === "id" ? "BUKTI" : locale === "ar" ? "دليل" : "EVIDENCE";
  const { data, isPending, isError, isFetching, errorUpdateCount, refetch } = useTimelineEvents({
    limit: 8,
  });
  const showError = isError || (isPending && errorUpdateCount > 0);
  const items = data?.data ?? [];
  const [edges, setEdges] = useState({ left: true, right: true });
  useEffect(() => {
    const strip = ref.current;
    if (!strip) return;
    const measure = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      setEdges({ left: strip.scrollLeft <= 1, right: max <= 1 || strip.scrollLeft >= max - 1 });
    };
    measure();
    strip.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    for (const child of strip.children) observer.observe(child);
    window.addEventListener("resize", measure);
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      if (motionPreference.matches) {
        strip.scrollTo({ left: strip.scrollLeft, behavior: "instant" });
      }
    };
    motionPreference.addEventListener("change", handleMotionChange);
    return () => {
      strip.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      motionPreference.removeEventListener("change", handleMotionChange);
      observer.disconnect();
    };
  }, [data, isPending, isError]);
  const scroll = (dir: number) => {
    const strip = ref.current;
    if (!strip) return;
    strip.scrollBy({
      left: dir * strip.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  const unavailable = isPending || showError || !items.length;

  return (
    <div className="relative">
      {showError ? (
        <div className="min-h-44 py-8">
          <p role="alert" className="text-sm text-[var(--foreground)]">
            {archive.unavailable}
          </p>
          <Button
            type="button"
            variant="plain"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="archive-control mt-4 min-h-11 border-2 border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]"
          >
            {isFetching ? archive.retrying : archive.retry}
          </Button>
        </div>
      ) : isPending ? (
        <p role="status" className="min-h-44 py-8 text-sm text-[var(--foreground)]">
          {archive.loading}
        </p>
      ) : !items.length ? (
        <p role="status" className="min-h-44 py-8 text-sm text-[var(--foreground)]">
          {archive.empty}
        </p>
      ) : null}
      <div
        ref={ref}
        className="flex snap-x snap-proximity gap-5 overflow-x-auto pb-6 pt-2"
        aria-label={archive.title}
        style={{ scrollbarWidth: "thin" }}
      >
        {!unavailable &&
          items.map((ev, index) => (
            <Link
              key={ev.id}
              href={toHref(`/dock?event=${encodeURIComponent(ev.id)}`)}
              className="archive-preview photocopy-grit group relative w-64 shrink-0 snap-start overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:rotate-1"
            >
              <Staple className="top-1 left-2 -rotate-12" />
              <div className="relative h-32 overflow-hidden bg-[var(--background)]">
                <Image
                  src={artSrc(ev.image)}
                  alt=""
                  fill
                  className="object-cover grayscale contrast-125 transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0"
                  style={{ objectPosition: ev.imagePosition ?? "center" }}
                  sizes="260px"
                />
                <span
                  className="absolute left-2 top-2 border border-[var(--border)] border-l-4 bg-[var(--card)]/95 px-2 py-0.5 font-brush text-[11px] text-[var(--foreground)] shadow-[2px_2px_0_rgba(0,0,0,0.45)]"
                  style={{ borderLeftColor: kindColors[ev.kind] }}
                >
                  {ev.kind}
                </span>
                <span className="absolute bottom-1 right-2 border border-[var(--border)] bg-[var(--card)]/90 px-1.5 py-0.5 font-mono text-[9px] text-[var(--foreground)]">
                  {ev.date}
                </span>
              </div>
              <div className="bg-[var(--card)] p-3.5 text-[var(--card-foreground)]">
                <div className="font-mono text-[10px] text-[var(--primary)] flex items-center gap-1">
                  <CassetteTape aria-hidden="true" className="h-3 w-4 text-[var(--primary)]" />{" "}
                  {evidencePrefix} #{index + 101}
                </div>
                <div className="cmyk-slip mt-1 font-brush text-base uppercase leading-snug text-[var(--card-foreground)] group-hover:text-[var(--primary)]">
                  {ev.title}
                </div>
              </div>
            </Link>
          ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
        <Link href={toHref("/dock")}>
          <Button className="min-h-11 px-4 py-3 text-sm">
            {archive.openDock} <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="plain"
            disabled={unavailable || edges.left}
            onClick={() => scroll(-1)}
            aria-label={archive.previous}
            className="archive-control flex min-h-11 min-w-11 items-center justify-center font-mono font-bold text-[var(--foreground)]"
          >
            ←
          </Button>
          <Button
            type="button"
            variant="plain"
            disabled={unavailable || edges.right}
            onClick={() => scroll(1)}
            aria-label={archive.next}
            className="archive-control flex min-h-11 min-w-11 items-center justify-center font-mono font-bold text-[var(--foreground)]"
          >
            →
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Archive() {
  const { dictionary } = useTranslation();
  const archive = dictionary.chronicle.landing.archive;

  return (
    <section
      id="archive"
      aria-labelledby="archive-heading"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <DistressedSticker variant="hazard" text={archive.eyebrow} className="mb-3" />
          <h2
            id="archive-heading"
            className="cmyk-slip font-brush text-4xl text-[var(--foreground)] sm:text-5xl"
          >
            {archive.title}
          </h2>
          <p className="mt-2 font-mono text-xs text-[var(--muted-foreground)]">
            {archive.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DistressedSticker variant="barcode" code="REEL-882-ARCH" className="-rotate-3" />
          <Smiley
            aria-hidden="true"
            className="hidden h-12 w-12 rotate-12 text-[var(--pink)] sm:block"
          />
        </div>
      </div>
      <ArchiveStrip />
    </section>
  );
}
