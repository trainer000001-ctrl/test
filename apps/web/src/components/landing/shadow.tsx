"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowRight, SkullCrossbonesFunky, SprayCan } from "@moonwitness/ui/icons";
import { Button, DistressedSticker, Grain, Staple, ZineCardRough } from "@moonwitness/ui";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { artSrc } from "@/lib/art";
import { useTimelineEvents } from "@/lib/api/timeline";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";

export function Shadow() {
  const { dictionary } = useTranslation();
  const shadow = dictionary.chronicle.landing.shadow;
  const archive = dictionary.chronicle.landing.archive;
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);
  const toHref = (slug: string) => (pathLocale ? getLocalizedUrl(slug, pathLocale) : slug);
  const { data, isPending, isError, isFetching, errorUpdateCount, refetch } = useTimelineEvents({
    limit: 1,
  });
  const showError = isError || (isPending && errorUpdateCount > 0);
  const event = data?.data[0];
  const sectionRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const paraRef = useRef<HTMLParagraphElement | null>(null);
  const wipeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const showReduced = () => {
      if (!media.matches) return;
      observer?.disconnect();
      [titleRef.current, paraRef.current].forEach((el) => {
        if (!el) return;
        el.style.transition = "none";
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry || !entry.isIntersecting) return;

        const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
        if (titleRef.current) {
          titleRef.current.style.transition = `opacity 0.8s ${ease}, transform 0.8s ${ease}`;
          titleRef.current.style.opacity = "1";
          titleRef.current.style.transform = "none";
        }
        if (paraRef.current) {
          paraRef.current.style.transition = `opacity 0.6s ${ease} 0.2s, transform 0.6s ${ease} 0.2s`;
          paraRef.current.style.opacity = "1";
          paraRef.current.style.transform = "none";
        }
        wipeRef.current?.classList.add("light-wipe");

        observer?.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );

    showReduced();
    media.addEventListener("change", showReduced);
    const el = sectionRef.current;
    if (el && !media.matches) observer.observe(el);
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", showReduced);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="shadow"
      aria-labelledby="shadow-heading"
      className="relative scroll-mt-20 overflow-hidden bg-[var(--background)] py-28"
    >
      <Grain />
      <Image
        src={artSrc("fog-voices")}
        alt=""
        fill
        className="absolute inset-0 object-cover opacity-20 mix-blend-overlay"
        sizes="100vw"
        loading="lazy"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--background)] via-[color-mix(in_srgb,var(--background)_78%,transparent)] to-[var(--background)]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[var(--pink)] opacity-20 pulse-glow"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-12 flex items-center gap-3">
          <SkullCrossbonesFunky
            aria-hidden="true"
            className="h-6 w-6 text-[var(--red)] opacity-70"
          />
          <span className="font-mono text-xs font-black tracking-[0.25em] text-[var(--red)] opacity-80">
            {shadow.restrictedTag}
          </span>
          <SprayCan
            aria-hidden="true"
            className="ml-auto h-5 w-5 text-[var(--red)] opacity-50 rotate-12"
          />
        </div>

        <span
          ref={wipeRef}
          data-shadow-wipe
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 block h-40 origin-left bg-gradient-to-r from-transparent via-[rgba(255,59,59,0.35)] to-transparent opacity-0 sm:h-56"
        />

        <h2
          ref={titleRef}
          id="shadow-heading"
          className="cmyk-slip font-brush text-5xl leading-none text-[var(--foreground)] drop-shadow-[6px_6px_0_rgba(255,59,59,0.3)] sm:text-7xl md:text-8xl opacity-0"
          style={{ transform: "translateY(50px) scale(0.95)" }}
        >
          {shadow.title}
        </h2>

        <p
          ref={paraRef}
          className="mt-8 max-w-2xl font-hand text-xl leading-relaxed text-[var(--muted-foreground)] opacity-0"
          style={{ transform: "translateX(-30px)" }}
        >
          {shadow.description}
        </p>

        <div className="mt-12 relative w-full max-w-2xl">
          <Staple className="-top-1 left-10 -rotate-12" />
          <ZineCardRough className="relative overflow-hidden border-[var(--red)]/40">
            <div className="p-5 font-mono text-xs tracking-widest text-[var(--red)]">
              {shadow.liveSignalLabel}
            </div>
            {showError ? (
              <div className="p-5">
                <p role="alert" className="font-mono text-sm text-[var(--muted-foreground)]">
                  {shadow.unavailable}
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isFetching}
                  onClick={() => void refetch()}
                  className="mt-4 min-h-11 min-w-11 px-4 py-3"
                >
                  {isFetching ? archive.retrying : archive.retry}
                </Button>
              </div>
            ) : isPending ? (
              <p role="status" className="p-5 font-mono text-sm text-[var(--muted-foreground)]">
                {archive.loading}
              </p>
            ) : event ? (
              <Link
                href={toHref(`/dock?event=${encodeURIComponent(event.id)}`)}
                className="block min-h-11 break-words"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-[var(--ink)]">
                  <Image
                    src={artSrc(event.image)}
                    alt=""
                    fill
                    className="object-cover grayscale contrast-[1.3] brightness-75"
                    style={{ objectPosition: event.imagePosition ?? "center" }}
                    sizes="(max-width: 768px) 100vw, 720px"
                  />
                </div>
                <div className="border-t border-[var(--red)]/30 bg-[var(--card)] p-5 text-[var(--card-foreground)]">
                  <span className="font-mono text-xs text-[var(--muted-foreground)]">
                    {event.kind} // {event.date}
                  </span>
                  <h3 className="mt-2 font-brush text-2xl text-[var(--card-foreground)]">
                    {event.title}
                  </h3>
                </div>
              </Link>
            ) : (
              <p role="status" className="p-5 font-mono text-sm text-[var(--muted-foreground)]">
                {archive.empty}
              </p>
            )}
          </ZineCardRough>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-5">
          <Link href={toHref("/shadow")}>
            <Button variant="destructive" size="lg" className="px-8 py-4 text-xl">
              {shadow.cta} <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Button>
          </Link>
          <DistressedSticker variant="barcode" code="SHD-LEVEL-4" className="rotate-[-2deg]" />
        </div>
      </div>
    </section>
  );
}
