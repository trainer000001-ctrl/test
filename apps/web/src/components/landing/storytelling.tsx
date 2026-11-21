"use client";

import Image from "next/image";
import { ARTWORK } from "@moonwitness/assets";
import type { ArtKey } from "@moonwitness/contracts/types";
import { SprayCan } from "@moonwitness/ui/icons";
import {
  Halftone,
  Staple,
  TactileTape,
  ScenePage,
  ScenePanel,
  ChapterBanner,
  FilmStrip,
} from "@moonwitness/ui";
import type { Locale } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { artSrc } from "@/lib/art";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

interface StoryUnit {
  id: "s1" | "s2" | "s3" | "s4";
  tag: string;
  tagColor: string;
  title: string;
  excerpt: string;
  art: ArtKey;
  marginalia: string;
  rotation: number;
}

const STORYTELLING_EXTRAS: Record<
  Locale,
  {
    filmStripLabel: string;
    marginalia: Record<StoryUnit["id"], string>;
  }
> = {
  en: {
    filmStripLabel: "Story chapters",
    marginalia: {
      s1: "// jakarta // night session",
      s2: "// skyline // 3am frequency",
      s3: "// prayer × radio // malay realm",
      s4: "// urban legend or // field report?",
    },
  },
  id: {
    filmStripLabel: "Bab kisah",
    marginalia: {
      s1: "// jakarta // sesi malam",
      s2: "// cakrawala // frekuensi 3 pagi",
      s3: "// doa × radio // alam melayu",
      s4: "// legenda kota atau // laporan lapangan?",
    },
  },
  ar: {
    filmStripLabel: "فصول القصص",
    marginalia: {
      s1: "// جاكرتا // جلسة ليلية",
      s2: "// أفق المدينة // تردد الثالثة فجراً",
      s3: "// دعاء × مذياع // عالم الملايو",
      s4: "// أسطورة حضرية أم // تقرير ميداني؟",
    },
  },
};

const SETTLE_S = 0.55;
const STAGGER_S = 0.1;

export function Storytelling() {
  const [revealRef, revealed] = useScrollReveal(0.1, "0px 0px -40px 0px");
  const { dictionary, locale, direction } = useTranslation();
  const copy = dictionary?.chronicle?.landing?.storytelling;
  const extras = STORYTELLING_EXTRAS[locale] ?? STORYTELLING_EXTRAS.en;

  const stories: StoryUnit[] = [
    {
      id: "s1",
      tag: copy?.peopleTag ?? "PEOPLE",
      tagColor: "var(--pink)",
      title: copy?.peopleTitle ?? "THE BATTERIES",
      excerpt:
        copy?.peopleExcerpt ??
        "A garage band in Jakarta channels frequencies older than electricity.",
      art: "night-shift",
      marginalia: extras.marginalia.s1,
      rotation: -1.5,
    },
    {
      id: "s2",
      tag: copy?.placesTag ?? "PLACES",
      tagColor: "var(--blue)",
      title: copy?.placesTitle ?? "NEON CITIES",
      excerpt:
        copy?.placesExcerpt ??
        "Mapping the underground circuit of cities that never sleep at 3 AM.",
      art: "city-shadow",
      marginalia: extras.marginalia.s2,
      rotation: 1,
    },
    {
      id: "s3",
      tag: copy?.storiesTag ?? "STORIES",
      tagColor: "var(--yellow)",
      title: copy?.storiesTitle ?? "PENDETA ONLINE",
      excerpt:
        copy?.storiesExcerpt ??
        "A spiritual guide in rural Malaysia receives what he calls ‘signals from the other side’ — transmitted through prayer and radio static.",
      art: "signal-sky",
      marginalia: extras.marginalia.s3,
      rotation: -0.8,
    },
    {
      id: "s4",
      tag: copy?.worldsTag ?? "WORLDS",
      tagColor: "var(--purple)",
      title: copy?.worldsTitle ?? "ZILL",
      excerpt:
        copy?.worldsExcerpt ?? "A fiction project documented like an eyewitness field report.",
      art: "mirror-archive",
      marginalia: extras.marginalia.s4,
      rotation: 1.2,
    },
  ];

  return (
    <section
      id="storytelling"
      dir={direction}
      className="relative scroll-mt-20 overflow-x-clip bg-[var(--background)] py-24"
    >
      <Halftone tone="pink" className="pointer-events-none absolute inset-0 opacity-20" />

      <div ref={revealRef} className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <ScenePage>
          <ChapterBanner
            chapter="01"
            meta={
              <span className="flex items-center gap-2">
                <SprayCan className="h-5 w-5 text-[var(--pink)]" />
                {copy?.eyebrow ?? "CHRONICLE CHAPTERS"}
              </span>
            }
            title={copy?.title ?? "STORIES IN ORBIT"}
          />
          <p className="mt-4 font-mono text-xs tracking-wide text-[var(--muted-foreground)]">
            {copy?.subtitle ?? "Four narrative coordinates from the MoonWitness storyworld."}
          </p>
          <FilmStrip label={extras.filmStripLabel}>
            {stories.map((story, i) => (
              <a
                key={story.id}
                href={`#story-${story.id}`}
                className="group block border border-[var(--border)] bg-[var(--card)] focus-visible:outline-2 focus-visible:outline-[var(--yellow)]"
              >
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={artSrc(story.art)}
                    alt=""
                    fill
                    sizes="224px"
                    className="object-cover grayscale transition-[filter] group-hover:grayscale-0 motion-reduce:transition-none"
                  />
                </div>
                <span className="block min-h-11 px-3 py-3 font-mono text-xs text-[var(--card-foreground)]">
                  0{i + 1} / {story.title}
                </span>
              </a>
            ))}
          </FilmStrip>
          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-5">
            {stories.map((story, i) => {
              const artRight = i % 2 === 1;
              const art = ARTWORK[story.art];
              return (
                <div
                  key={story.id}
                  data-story-unit
                  className={`min-w-0 transition-[opacity,transform] ease-[var(--ease-ink-out)] motion-reduce:transition-none ${i === 0 ? "lg:col-span-3" : ""}`}
                  style={{
                    transitionDuration: `${SETTLE_S}s`,
                    transitionDelay: `${i * STAGGER_S}s`,
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? "none" : `translateX(${artRight ? 40 : -40}px)`,
                  }}
                >
                  <div style={{ transform: `rotate(${story.rotation}deg)` }}>
                    <ScenePanel
                      id={`story-${story.id}`}
                      aria-labelledby={`story-title-${story.id}`}
                      scrim={artRight ? "left" : "right"}
                      className="group scroll-mt-28"
                      art={
                        <Image
                          src={artSrc(story.art)}
                          alt=""
                          fill
                          sizes={
                            i === 0
                              ? "(min-width: 1280px) 1200px, 100vw"
                              : "(min-width: 1024px) 33vw, 100vw"
                          }
                          className="object-cover"
                          style={{ objectPosition: art.position }}
                        />
                      }
                      effects={
                        <>
                          <Staple className="-top-1 left-5 z-10 -rotate-12" />
                          <TactileTape
                            variant="black"
                            label={story.tag}
                            width={70}
                            className="-top-2 right-4 z-10 rotate-3 text-[9px]"
                          />
                        </>
                      }
                    >
                      <div
                        className={`flex min-h-[26rem] flex-col justify-end px-6 py-8 @[40rem]:min-h-[30rem] @[40rem]:px-10 ${artRight ? "" : "@[40rem]:items-end"}`}
                      >
                        <div className="max-w-md">
                          <span
                            className="font-mono text-xs font-black tracking-widest"
                            style={{ color: story.tagColor }}
                          >
                            [{story.tag}] / 0{i + 1}
                          </span>
                          <h3
                            id={`story-title-${story.id}`}
                            className="cmyk-slip mt-3 font-brush text-4xl leading-tight text-[var(--paper)] @[40rem]:text-5xl"
                          >
                            {story.title}
                          </h3>
                          <p className="mt-4 font-mono text-sm leading-relaxed text-[var(--paper)]">
                            {story.excerpt}
                          </p>
                          <p
                            aria-hidden="true"
                            className="mt-6 font-hand text-sm text-[var(--yellow)]"
                          >
                            {story.marginalia}
                          </p>
                        </div>
                      </div>
                    </ScenePanel>
                  </div>
                </div>
              );
            })}
          </div>
        </ScenePage>
      </div>
    </section>
  );
}
