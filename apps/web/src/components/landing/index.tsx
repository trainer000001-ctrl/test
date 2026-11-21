"use client";

import { useState } from "react";
import { Marquee } from "@moonwitness/ui";
import { Button } from "@moonwitness/ui";
import { MotionPauseContext } from "@/lib/motion/motion-pause";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { Star4 } from "@moonwitness/ui/icons";
import { SiteNav } from "../site-nav";
import { About } from "./about";
import { Archive } from "./archive";
import { Crew } from "./crew";
import { Entrance } from "./entrance";
import { LandingFooter } from "./footer";
import { Hero } from "./hero";
import { Shadow } from "./shadow";
import { Signals } from "./signals";
import { Storytelling } from "./storytelling";
import { Transmission } from "./transmission";

export function Landing() {
  const [paused, setPaused] = useState(false);
  const { dictionary } = useTranslation();
  const marqueeItems = dictionary.chronicle.landing.marquee;

  return (
    <MotionPauseContext.Provider value={paused}>
      <div className="relative" data-motion-paused={paused ? "" : undefined}>
        {/* Scene 01 — Entrance: brief decorative ink stamp */}
        <Entrance />

        <SiteNav />

        {/* Scene 02 — MoonWitness Universe: hero */}
        <Hero />

        <main id="main">
          <Marquee className="border-y-2 border-[var(--border)] bg-[var(--primary)] py-2.5 font-brush text-lg text-[var(--primary-foreground)]">
            {Object.values(marqueeItems).map((t) => (
              <span key={t} className="flex items-center gap-8">
                {t} <Star4 className="h-4 w-4 text-[var(--primary-foreground)]" />
              </span>
            ))}
          </Marquee>

          {/* Scene 03 — Transmission 001: featured editorial panel */}
          <Transmission />

          {/* Scene 04 — Storytelling: editorial grid */}
          <Storytelling />

          {/* Existing: Signals section (frequency logs) */}
          <Signals />

          {/* Scene 05 — The Shadow: dark narrative layer */}
          <Shadow />

          {/* Scene 06 — Crew Constellation */}
          <Crew />

          {/* Scene 07 — Signal Archive */}
          <Archive />
        </main>

        {/* Scene 08 — Join the Crew: closing CTA */}
        <About />

        <LandingFooter />

        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className="fixed bottom-6 left-6 z-40 hidden min-h-11 px-4 py-2 font-mono text-xs sm:[@media(prefers-reduced-motion:no-preference)]:inline-flex"
        >
          {paused
            ? dictionary.chronicle.landing.index.resumeMotion
            : dictionary.chronicle.landing.index.pauseMotion}
        </Button>
      </div>
    </MotionPauseContext.Provider>
  );
}
