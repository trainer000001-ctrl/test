"use client";

import { useState } from "react";
import { LUMINOUS_NAMES_OF_ALLAH } from "@/data/remembrance-sanctuary";
import type { WorldIdentifier } from "@/data/empire-registry";
import { useSanctuaryLocale } from "@/lib/sanctuary-locale";
import { SacredCornerBrackets } from "@moonwitness/ui/imperium";
import { ScrollChapterReveal } from "./motion-primitives";
import { LuminousNamesWheel } from "./remembrance/luminous-names-wheel";
import { TasbihSakinahChamber } from "./remembrance/tasbih-sakinah-chamber";

export function RemembranceSanctuary({
  quietMode = false,
  onNavigateToWorld,
}: {
  readonly quietMode?: boolean;
  readonly onNavigateToWorld?: (worldId: WorldIdentifier) => void;
}) {
  const { locale } = useSanctuaryLocale();
  const [selectedNameId, setSelectedNameId] = useState<string>(LUMINOUS_NAMES_OF_ALLAH[0]!.id);

  return (
    <div
      id="remembrance-sanctuary"
      className="relative mt-16 border border-[var(--dna-accent)]/35 bg-[var(--dna-canvas)]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.82)] sm:p-10"
    >
      <SacredCornerBrackets />

      <ScrollChapterReveal quietMode={quietMode}>
        <div className="flex flex-col items-center border-b border-[var(--dna-accent)]/20 pb-8 text-center">
          <div
            dir="rtl"
            lang="ar"
            className="text-2xl tracking-wide text-[var(--dna-accent)] sm:text-3xl"
          >
            بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ
          </div>
          <div className="mt-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--dna-accent)]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--dna-accent)]" />
            <span>MĪZĀN AL-QALB · CONTEMPLATIVE STILLNESS</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[var(--dna-accent)]" />
          </div>
          <h3 className="font-monument text-gold-gradient mt-3 text-2xl uppercase tracking-[0.16em] sm:text-3xl">
            CONTEMPLATION, GRATITUDE &amp; STILLNESS
          </h3>
          <p className="mt-2.5 max-w-2xl font-serif text-base leading-relaxed text-[var(--dna-muted)]">
            A quiet, non-sectarian chamber honoring One Creator—reflecting on universal virtues of
            Light, Mercy, Wisdom, Gratitude, and Peace while centering conscience before every act
            of building.
          </p>
        </div>
      </ScrollChapterReveal>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <LuminousNamesWheel
          selectedNameId={selectedNameId}
          onSelectName={setSelectedNameId}
          quietMode={quietMode}
          onNavigateToWorld={onNavigateToWorld}
        />
        <TasbihSakinahChamber locale={locale === "id" ? "id" : "en"} quietMode={quietMode} />
      </div>
    </div>
  );
}
