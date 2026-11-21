"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HERO_LAYERS } from "@moonwitness/assets";
import {
  ArrowRight,
  BarbedWire,
  Bolt,
  Crown,
  SafetyPin,
  Splatter,
  Star4,
} from "@moonwitness/ui/icons";
import { DistressedSticker, Grain, SkinArtworkFrame, ZineButton, useSkin } from "@moonwitness/ui";
import { AtmosphereField } from "@/components/atmosphere";
import { useParallax } from "@/lib/motion/use-parallax";
import { useHeroIntro } from "@/lib/motion/use-hero-intro";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";
import { artSrc } from "@/lib/art";

export function Hero() {
  const root = useHeroIntro();
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);
  const { dictionary } = useTranslation();
  const { skin } = useSkin();
  const characterParallax = useParallax(0.12);
  const moonParallax = useParallax(0.08);
  const dockHref = pathLocale ? getLocalizedUrl("/dock", pathLocale) : "/dock";
  return (
    <section ref={root} id="home" data-hero-root className="hero-scene">
      <link
        rel="preload"
        as="image"
        href="/_next/image?url=%2Fart%2Fcrowd-moon-1440.webp&w=1440&q=75"
        media="(min-width: 768px)"
      />
      <link
        rel="preload"
        as="image"
        href="/_next/image?url=%2Fart%2Fhero-character-v2.png&w=240&q=75"
        media="(max-width: 767px)"
      />
      <div className="hero-city" aria-hidden="true">
        <Image data-hero-layer="city" src={artSrc("crowd-moon")} fill alt="" sizes="100vw" />
      </div>
      {skin !== "default" && (
        <SkinArtworkFrame
          skin={skin}
          showCutout={false}
          className="pointer-events-none absolute inset-0 z-[1]"
          plateClassName="opacity-65"
          sizes="100vw"
        />
      )}
      <div className="hero-shade" />
      <Grain />
      <Star4
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-20 z-[4] h-5 w-5 text-[var(--pink)] animate-spin motion-reduce:animate-none"
        style={{ animationDuration: "12s" }}
      />
      <AtmosphereField
        variant="hero"
        interactive
        className="inset-0 z-[1] mix-blend-screen opacity-40"
      />
      <AtmosphereField
        variant="brush"
        seed={7}
        className="inset-0 z-[2] mix-blend-screen opacity-30"
      />
      <Splatter
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 top-20 z-[2] h-64 w-64 text-[var(--pink)] opacity-25"
      />
      <SafetyPin
        aria-hidden="true"
        className="pointer-events-none absolute left-[38%] top-28 z-[4] h-10 w-10 -rotate-45 text-[var(--foreground)]/45"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[4] flex overflow-hidden opacity-30"
      >
        {[...Array(6)].map((_, i) => (
          <BarbedWire key={i} className="h-6 w-60 shrink-0 text-[var(--foreground)]" />
        ))}
      </div>
      <div className="hero-layout">
        <div className="hero-heading-placement">
          <div data-hero-headline>
            <DistressedSticker variant="classified" className="mb-2" />
            <p className="hero-frequency font-mono">
              {dictionary.chronicle.landing.hero.frequency}
            </p>
            <div className="hero-title-paper">
              <Crown aria-hidden="true" className="hero-crown" />
              <h1 className="font-brush">MOONWITNESS</h1>
            </div>
            <p className="hero-tagline font-hand">{dictionary.chronicle.landing.hero.tagline}</p>
            <p className="hero-subline font-hand">{dictionary.chronicle.landing.hero.subline}</p>
          </div>
        </div>
        <div className="hero-stage" aria-hidden="true">
          <div className="hero-moon-placement">
            <div ref={moonParallax}>
              <Image
                data-hero-layer="moon"
                src={HERO_LAYERS.moon.source}
                width={HERO_LAYERS.moon.width}
                height={HERO_LAYERS.moon.height}
                alt=""
                sizes="(min-width: 768px) 28vw, 48vw"
              />
            </div>
          </div>
          <div className="hero-character-placement">
            <div ref={characterParallax} data-hero-parallax>
              <div data-hero-character-reveal>
                <Image
                  data-hero-layer="character"
                  src={HERO_LAYERS.character.source}
                  width={HERO_LAYERS.character.width}
                  height={HERO_LAYERS.character.height}
                  alt=""
                  sizes="(min-width: 1440px) 600px, (min-width: 768px) 48vw, 240px"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="hero-copy-placement">
          <div className="hero-copy-paper">
            <p
              className="font-hand"
              dangerouslySetInnerHTML={{
                __html: dictionary.chronicle.landing.hero.copy.replace(/\n/g, "<br />"),
              }}
            />
          </div>
          <ZineButton asChild className="hero-cta">
            <Link data-hero-cta href={dockHref}>
              {dictionary.chronicle.landing.hero.cta}{" "}
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </ZineButton>
        </div>
        <div className="hero-note-placement" aria-hidden="true">
          <div data-hero-annotations className="hero-notes font-hand">
            <p
              className="hero-note-paper"
              dangerouslySetInnerHTML={{
                __html: dictionary.chronicle.landing.hero.notePaper.replace(/\n/g, "<br />"),
              }}
            />
            <Bolt className="hero-bolt" />
            <p
              className="hero-note-ink"
              dangerouslySetInnerHTML={{
                __html: dictionary.chronicle.landing.hero.noteInk.replace(/\n/g, "<br />"),
              }}
            />
          </div>
        </div>
      </div>
      <style jsx>{`
        .hero-scene {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          padding-top: 64px;
          background: var(--ink);
          border-bottom: var(--hero-rule);
        }
        .hero-city,
        .hero-shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .hero-city :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 65% 70%;
        }
        .hero-shade {
          background: linear-gradient(
            90deg,
            rgba(11, 11, 16, 0.86),
            rgba(11, 11, 16, 0.12) 65%,
            rgba(11, 11, 16, 0.25)
          );
        }
        .hero-layout {
          position: relative;
          z-index: 3;
          max-width: 1440px;
          margin: auto;
          min-height: 500px;
        }
        .hero-heading-placement {
          position: relative;
          z-index: 5;
          padding: 35px 0 0 4%;
          width: 57%;
        }
        .hero-frequency {
          display: table;
          padding: 2px 8px;
          background: var(--card);
          border: 1px solid var(--border);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--card-foreground);
          margin-bottom: 12px;
        }
        .hero-title-paper {
          position: relative;
          background: var(--hero-headline-paper);
          transform: rotate(-3deg);
          padding: 8px 12px 0;
          box-shadow: var(--hero-print-shadow);
        }
        h1 {
          font-size: clamp(40px, 6.6vw, 94px);
          line-height: 1;
          color: var(--ink);
          margin: 0;
          white-space: nowrap;
          letter-spacing: -0.025em;
        }
        .hero-title-paper :global(.hero-crown) {
          position: absolute;
          left: -28px;
          top: -24px;
          width: 38px;
          height: 38px;
          color: var(--yellow);
          transform: rotate(-12deg);
        }
        .hero-tagline {
          display: table;
          margin: 10px 0 0 24px;
          background: var(--yellow);
          color: var(--ink);
          padding: 3px 10px;
          font-weight: 900;
          font-size: clamp(18px, 2.2vw, 29px);
          transform: rotate(-2deg);
        }
        .hero-subline {
          display: table;
          margin: 6px 0 0 32px;
          padding: 3px 10px;
          background: var(--card);
          border: 1px solid var(--border);
          font-size: 18px;
          font-weight: 700;
          color: var(--card-foreground);
        }
        .hero-stage {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .hero-moon-placement {
          position: absolute;
          width: 28%;
          right: 9%;
          top: 10px;
        }
        .hero-moon-placement :global(img) {
          width: 100%;
          height: auto;
        }
        .hero-character-placement {
          position: absolute;
          width: 48%;
          max-width: 600px;
          right: 28%;
          top: -70px;
          z-index: 2;
        }
        .hero-character-placement :global(img) {
          width: 100%;
          height: auto;
        }
        .hero-copy-placement {
          position: relative;
          z-index: 5;
          margin: 27px 0 34px 5%;
          width: 34%;
          max-width: 400px;
        }
        .hero-copy-paper {
          background: var(--card);
          color: var(--card-foreground);
          padding: 12px 16px;
          transform: rotate(-1deg);
          box-shadow: var(--hero-print-shadow);
          border: 1.5px solid var(--border);
        }
        .hero-copy-paper p {
          font-size: 21px;
          line-height: 1.15;
          margin: 0;
          font-weight: 700;
        }
        .hero-copy-placement :global(.hero-cta) {
          display: inline-flex;
          min-height: 48px;
          margin-top: 16px;
          padding: 10px 16px;
          font-size: 18px;
          box-shadow: var(--hero-print-shadow);
        }
        .hero-note-placement {
          position: absolute;
          z-index: 4;
          right: 3%;
          top: 70px;
          width: 16%;
        }
        .hero-note-paper {
          background: var(--paper);
          color: var(--ink);
          display: inline-block;
          padding: 12px;
          font-size: 23px;
          line-height: 1;
          font-weight: 900;
          transform: rotate(7deg);
          box-shadow: var(--hero-print-shadow);
        }
        .hero-notes :global(.hero-bolt) {
          color: var(--yellow);
          width: 40px;
          height: 60px;
          margin: 25px 0 15px 35%;
          transform: rotate(12deg);
        }
        .hero-note-ink {
          background: var(--ink);
          border-left: 3px solid var(--yellow);
          padding: 8px;
          font-size: 20px;
          line-height: 1.1;
          color: var(--paper);
          font-weight: 700;
          transform: rotate(-6deg);
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .hero-layout {
            min-height: 470px;
          }
          h1 {
            font-size: 6.3vw;
          }
          .hero-heading-placement {
            width: 61%;
          }
          .hero-character-placement {
            right: 8%;
            top: 70px;
            width: 48%;
          }
          .hero-moon-placement {
            right: 3%;
            width: 32%;
          }
          .hero-copy-placement {
            width: 43%;
          }
          .hero-note-placement {
            display: none;
          }
          .hero-copy-paper p {
            font-size: 19px;
          }
        }
        @media (max-width: 767px) {
          .hero-layout {
            min-height: 0;
            display: flex;
            flex-direction: column;
            padding: 20px 16px 28px;
          }
          .hero-shade {
            background: linear-gradient(
              180deg,
              rgba(11, 11, 16, 0.7),
              rgba(11, 11, 16, 0.15) 55%,
              rgba(11, 11, 16, 0.9)
            );
          }
          .hero-heading-placement {
            padding: 0;
            width: 100%;
          }
          .hero-frequency {
            font-size: 8px;
            margin-bottom: 12px;
          }
          .hero-title-paper {
            padding: 6px 8px 0;
          }
          h1 {
            font-size: 10.4vw;
          }
          .hero-title-paper :global(.hero-crown) {
            width: 25px;
            height: 25px;
            left: -9px;
            top: -20px;
          }
          .hero-tagline {
            margin: 8px 0 0 4px;
            font-size: 20px;
            padding: 2px 6px;
          }
          .hero-subline {
            font-size: 15px;
            margin: 5px 0 0 10px;
          }
          .hero-stage {
            position: relative;
            inset: auto;
            height: 360px;
            margin-top: 4px;
          }
          .hero-character-placement {
            width: 240px;
            max-width: 100%;
            top: 0;
            right: calc(50% - 120px);
          }
          .hero-moon-placement {
            width: 54%;
            max-width: 200px;
            top: 5px;
            right: 0;
          }
          .hero-copy-placement {
            margin: 8px 0 0;
            width: 100%;
            max-width: none;
          }
          .hero-copy-paper {
            padding: 10px 12px;
          }
          .hero-copy-paper p {
            font-size: 19px;
          }
          .hero-copy-placement :global(.hero-cta) {
            font-size: 17px;
            margin-top: 12px;
          }
          .hero-note-placement {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
