"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { WorldPlateKey } from "@moonwitness/assets";
import { FOUR_CORPUS_CONCORDANCE, FOUR_CORPUS_POLICY } from "@/data/empire-canon-codex";
import { artPlateSrc } from "@/lib/art";
import { useSanctuaryLocale } from "@/lib/sanctuary-locale";
import {
  ScrollChapterReveal,
  SpatialTiltCard,
  triggerSacredViewTransition,
} from "./motion-primitives";
import {
  DiamondStarOrnament,
  DnaButton,
  DnaPortalArch,
  SacredCornerBrackets,
} from "@moonwitness/ui/imperium";

export function FourScripturesSanctum({
  quietMode = false,
  onInspectCorpusDoor,
}: {
  readonly quietMode?: boolean;
  readonly onInspectCorpusDoor?: () => void;
}) {
  const { locale } = useSanctuaryLocale();
  const [selectedCode, setSelectedCode] =
    useState<(typeof FOUR_CORPUS_POLICY.corpora)[number]["code"]>("SRC-TOR");
  const [selectedThemeId, setSelectedThemeId] = useState<string>(FOUR_CORPUS_CONCORDANCE[0]!.id);
  const selectedCorpus =
    FOUR_CORPUS_POLICY.corpora.find((entry) => entry.code === selectedCode) ??
    FOUR_CORPUS_POLICY.corpora[0]!;
  const selectedTheme =
    FOUR_CORPUS_CONCORDANCE.find((theme) => theme.id === selectedThemeId) ??
    FOUR_CORPUS_CONCORDANCE[0]!;

  return (
    <div
      id="four-scriptures"
      className="scroll-mt-20 mt-16 border border-[var(--dna-accent)]/35 bg-[var(--dna-canvas)]/95 p-6 sm:p-10 shadow-[0_24px_70px_rgba(0,0,0,0.82)] relative"
    >
      <SacredCornerBrackets />

      <ScrollChapterReveal quietMode={quietMode}>
        <div className="flex flex-col items-center text-center border-b border-[var(--dna-accent)]/20 pb-8">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.26em] text-[var(--dna-accent)] uppercase">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--dna-accent)]" />
            <span>FOUR REVEALED WITNESSES · NEUTRAL MONOCENTRIC ARCHIVE</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[var(--dna-accent)]" />
          </div>
          <h3 className="font-monument mt-3 text-2xl sm:text-3xl tracking-[0.16em] text-gold-gradient uppercase">
            TAURAT · ZABUR · INJĪL · AL-QUR’ĀN
          </h3>
          <p className="mt-3 max-w-3xl font-serif text-base text-[var(--dna-muted)] leading-relaxed">
            {locale === "id"
              ? "Keempat kitab suci bersumber dari Pencipta Yang Esa (ALLAH). Kajian perbandingan meneliti saksi teks tanpa merasa paling unggul, menghormati nurani tanpa paksaan (QS 2:256), dan menjaga kesetaraan antarumat."
              : FOUR_CORPUS_POLICY.neutralityPrinciple}
          </p>
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] px-4 py-1.5 font-mono text-[10.5px] tracking-[0.14em] text-[var(--dna-accent)]">
            <span>{FOUR_CORPUS_POLICY.invariant}</span>
            <span className="text-[var(--dna-accent)]" aria-hidden="true">
              ·
            </span>
            <span>ZERO RELIGION RANKING · NO COMPULSION IN FAITH</span>
          </div>
        </div>
      </ScrollChapterReveal>

      {/* Equal-Stature Four-Scripture Pillars */}
      <div
        role="tablist"
        aria-label="Inspect the Four Revealed Scriptural Witnesses"
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FOUR_CORPUS_POLICY.corpora.map((corpus, idx) => {
          const isSelected = corpus.code === selectedCorpus.code;
          return (
            <SpatialTiltCard key={corpus.code} disabled={quietMode} maxTiltDeg={3}>
              <DnaPortalArch
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() =>
                  triggerSacredViewTransition(() => {
                    setSelectedCode(corpus.code);
                  }, quietMode)
                }
                className={`relative flex h-full w-full min-h-[168px] flex-col justify-between border px-5 pt-7 pb-5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[var(--dna-text)] bg-gradient-to-b from-[var(--dna-accent)]/20 via-[var(--dna-surface)] to-[var(--dna-canvas)] shadow-[0_0_28px_rgba(223,192,123,0.2)]"
                    : "border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)]/90 hover:border-[var(--dna-accent)]/60 hover:bg-[var(--dna-surface)]"
                }`}
              >
                <div>
                  <div className="relative mb-3 h-24 w-full overflow-hidden border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)]">
                    <Image
                      src={artPlateSrc(`story-plate-0${idx + 1}` as WorldPlateKey)}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 90vw, (max-width: 1023px) 45vw, 22vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10.5px] text-[var(--dna-accent)]">
                    <span>
                      0{idx + 1} · {corpus.code}
                    </span>
                    <span className="text-[var(--dna-muted)]">{corpus.classicalLanguage}</span>
                  </div>
                  <h4 className="font-monument mt-2.5 text-lg tracking-[0.14em] text-[var(--dna-text)]">
                    {corpus.name}
                  </h4>
                  <div className="mt-1 font-mono text-[11px] text-[var(--dna-accent)]">
                    {corpus.prophetAnchor}
                  </div>
                </div>
                <p className="mt-3 border-t border-[var(--dna-accent)]/15 pt-2.5 font-serif text-xs leading-relaxed text-[var(--dna-muted)]">
                  {corpus.ethicalCore}
                </p>
              </DnaPortalArch>
            </SpatialTiltCard>
          );
        })}
      </div>

      {/* Selected Scripture Deep Inspection Bay */}
      <div className="mt-6 border border-[var(--dna-accent)]/35 bg-[var(--dna-canvas)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dna-accent)]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <DiamondStarOrnament className="h-4 w-4 text-[var(--dna-accent)]" />
            <span className="font-monument text-base sm:text-lg tracking-[0.14em] text-[var(--dna-text)]">
              {selectedCorpus.name} · {selectedCorpus.prophetAnchor}
            </span>
          </div>
          <span className="border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)] px-3 py-1 font-mono text-[10.5px] text-[var(--dna-accent)]">
            {selectedCorpus.epistemicRole}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-2">
            <div className="font-mono text-[10.5px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
              ETHICAL WITNESS FOCUS ({selectedCorpus.classicalLanguage})
            </div>
            <p className="font-serif text-base leading-relaxed text-[var(--dna-text)]">
              {selectedCorpus.neutralSummary}
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-col justify-between gap-3 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4">
            <div>
              <div className="font-mono text-[10.5px] tracking-[0.14em] text-[var(--dna-accent)] uppercase">
                EPISTEMIC DISCIPLINE
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--dna-muted)]">
                {selectedCorpus.invariant}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <DnaButton
                asChild
                tone="secondary"
                className="min-h-0 inline-flex w-full items-center justify-center px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-[var(--dna-accent)] uppercase hover:text-[var(--dna-text)]"
              >
                <Link href="/scriptures">
                  {locale === "id"
                    ? "BUKA STUDIO 4 KITAB & PENCARI AYAT ›"
                    : "OPEN 4-SCRIPTURE PARALLEL STUDIO ›"}
                </Link>
              </DnaButton>
              {onInspectCorpusDoor && (
                <DnaButton
                  type="button"
                  tone="secondary"
                  onClick={onInspectCorpusDoor}
                  className="min-h-0 w-full px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-[var(--dna-text)] uppercase hover:opacity-90"
                >
                  INSPECT P18 CORPUS SPINE IN DOOR II &rsaquo;
                </DnaButton>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shared Moral Roots · Four-Scripture Ethical Concordance */}
      <div className="mt-6 border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)]/90 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-[var(--dna-accent)] uppercase">
            <DiamondStarOrnament className="h-3.5 w-3.5 text-[var(--dna-accent)]" />
            <span>SHARED MORAL ROOTS · FOUR-CORPUS CONCORDANCE</span>
          </div>
          <span className="font-mono text-[10.5px] text-[var(--dna-muted)]">
            {selectedTheme.arabicRoot}
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Select a Shared Ethical Theme across all Four Scriptures"
          className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FOUR_CORPUS_CONCORDANCE.map((theme) => {
            const active = theme.id === selectedTheme.id;
            return (
              <DnaButton
                key={theme.id}
                type="button"
                tone="secondary"
                role="tab"
                aria-selected={active}
                onClick={() =>
                  triggerSacredViewTransition(() => {
                    setSelectedThemeId(theme.id);
                  }, quietMode)
                }
                className={`min-h-0 justify-start px-3.5 py-2 text-left font-mono text-[10.5px] tracking-[0.1em] uppercase ${
                  active
                    ? "text-[var(--dna-text)]"
                    : "text-[var(--dna-muted)] hover:text-[var(--dna-text)]"
                }`}
              >
                {theme.title}
              </DnaButton>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { code: "TAURAT", body: selectedTheme.tauratWitness },
            { code: "ZABUR", body: selectedTheme.zaburWitness },
            { code: "INJĪL", body: selectedTheme.injilWitness },
            { code: "AL-QUR’ĀN", body: selectedTheme.quranWitness },
          ].map((witness) => (
            <div
              key={witness.code}
              className="border border-[var(--dna-accent)]/20 bg-[var(--dna-surface)]/90 p-3.5 shadow-[inset_0_1px_0_rgba(255,244,210,0.08)]"
            >
              <div className="font-monument text-xs tracking-[0.16em] text-[var(--dna-accent)]">
                {witness.code}
              </div>
              <p className="mt-1.5 font-serif text-xs leading-relaxed text-[var(--dna-muted)]">
                {witness.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-[var(--dna-accent)]/15 pt-3 font-mono text-[11px] text-[var(--dna-muted)]">
          <span className="text-[var(--dna-accent)]">LIVED STEWARDSHIP:</span>{" "}
          {selectedTheme.livedPractice}
        </div>
      </div>
    </div>
  );
}
