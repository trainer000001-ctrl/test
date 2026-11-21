"use client";

import Link from "next/link";
import { Crown, Splatter, Star4 } from "@moonwitness/ui/icons";
import {
  CutoutArtwork,
  DistressedSticker,
  DnaBrandLogo,
  SkinArtworkFrame,
  Staple,
  TactileTape,
  Button,
  CornerBrackets,
  Gauge,
  useSkin,
} from "@moonwitness/ui";
import type { Project } from "@moonwitness/contracts/types";
import { AtmosphereField } from "@/components/atmosphere";

export function CommandHero({ project }: { project: Project }) {
  const { skin } = useSkin();
  return (
    <div className="grain relative overflow-hidden border-b-2 border-[var(--border)] bg-[var(--ink)]">
      <SkinArtworkFrame
        skin={skin}
        artKey={skin === "default" ? "shadow-command-hero" : undefined}
        showCutout={false}
        eager
        sizes="(max-width: 1024px) 100vw, 80vw"
        className="pointer-events-none absolute inset-0"
        plateClassName="object-cover object-[72%_42%] opacity-85 filter contrast-110"
        scrimClassName="bg-transparent"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--ink)_96%,transparent)] via-[color-mix(in_srgb,var(--ink)_70%,transparent)] to-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--ink)_90%,transparent)] via-transparent to-transparent" />
      <AtmosphereField
        variant="hero"
        interactive
        className="inset-0 z-[1] mix-blend-screen opacity-40"
      />
      <Splatter className="absolute -left-6 top-6 h-40 w-40 text-[var(--primary)] opacity-70" />
      <Staple className="left-4 top-3 -rotate-45" />
      <TactileTape
        variant="yellow"
        label="EMPIRE OF THE LIGHT"
        width={190}
        className="-top-1 right-8 hidden rotate-2 text-[10px] sm:flex"
      />
      <Star4 className="absolute right-[34%] top-10 hidden h-6 w-6 text-[var(--primary)] opacity-70 lg:block" />
      <CutoutArtwork
        id="radar-sweep"
        decorative
        className="pointer-events-none absolute right-[24%] bottom-4 z-[2] hidden h-28 w-28 text-[var(--primary)] opacity-25 lg:block"
      />

      <div className="relative z-10 grid gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <DnaBrandLogo id="mission-control" variant="lockup" size={24} decorative />
            <DistressedSticker variant="hazard" text="SAME MOON DIFFERENT PEOPLE" />
            <DistressedSticker
              variant="barcode"
              code={`${project.progress}% COMPLETE`}
              className="rotate-2"
            />
          </div>
          <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[var(--primary)]">
            EMPIRE OF THE LIGHT // A-L-L-A-H
          </p>
          <h1
            id="cc-top"
            className="cmyk-slip mt-2 max-w-full scroll-mt-24 font-brush text-4xl leading-[0.95] tracking-tight text-[var(--paper)] sm:text-5xl xl:text-6xl"
          >
            <span className="block">SHADOW</span>
            <span className="block text-[var(--primary)]">COMMAND CENTER</span>
          </h1>
          <p className="mt-4 font-mono text-[11px] font-bold tracking-[0.18em] text-[var(--paper)]/90">
            MOONWITNESS // PRIVATE // CREATE · CURATE · DEPLOY
          </p>
        </div>

        <CornerBrackets className="min-w-0">
          <aside className="relative min-w-0 border-2 border-[var(--primary)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] p-4 text-[var(--card-foreground)] shadow-[var(--mw-card-shadow)]">
            <TactileTape
              variant="black"
              label="FEATURED PROJECT"
              width={150}
              className="-top-2 right-4 rotate-2 text-[9px]"
            />
            <div className="flex items-start justify-between gap-3 pt-2">
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold tracking-widest text-[var(--primary)]">
                  THE BATTERIES
                </p>
                <p className="mt-1 font-brush text-2xl leading-tight text-[var(--card-foreground)]">
                  {project.title.toUpperCase()}
                </p>
              </div>
              <Crown className="h-5 w-8 shrink-0 -rotate-12 text-[var(--primary)]" />
            </div>
            <p className="mt-2 font-mono text-[11px] tracking-widest text-[var(--muted-foreground)]">
              {project.status.toUpperCase()} // STORY WORLD
            </p>
            <Gauge
              className="mt-3"
              label="Story progress"
              value={`${project.progress}%`}
              percent={project.progress}
            />
            <Button
              asChild
              className="mt-4 min-h-11 w-full justify-between gap-2 px-4 py-2.5 text-sm"
            >
              <Link href={`/dock?q=${encodeURIComponent(project.title)}`}>
                OPEN PROJECT <span aria-hidden="true">→</span>
              </Link>
            </Button>
          </aside>
        </CornerBrackets>
      </div>

      <Crown className="absolute right-[6%] top-10 hidden h-10 w-14 -rotate-12 text-[var(--primary)] md:block" />
    </div>
  );
}
