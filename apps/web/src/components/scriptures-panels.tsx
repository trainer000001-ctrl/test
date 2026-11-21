"use client";

import {
  FOUR_CORPUS_CONCORDANCE,
  type ClassicalWitnessExcerpt,
  type FourCorpusConcordanceTheme,
} from "@moonwitness/canon";
import { DiamondStarOrnament, DnaButton, SacredCornerBrackets } from "@moonwitness/ui/imperium";
import type { Locale } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";

const PANELS_COPY: Record<
  Locale,
  {
    readonly classicalWitnessHeading: string;
    readonly provenanceLabel: string;
    readonly emptyPassages: string;
    readonly concordanceHeading: string;
    readonly concordanceTablistAria: string;
    readonly stewardshipActionLabel: string;
    readonly corpusLabels: Record<"TAURAT" | "ZABUR" | "INJĪL" | "AL-QUR’ĀN", string>;
  }
> = {
  en: {
    classicalWitnessHeading: "PRIMARY CLASSICAL WITNESS EXCERPTS (HEBREW · GREEK · ARABIC)",
    provenanceLabel: "OSHB WLC 4.20 · SBLGNT v1.2 · DIVINE-TEXT",
    emptyPassages: "No classical manuscript excerpts available.",
    concordanceHeading: "SHARED MORAL ROOTS // FOUR-CORPUS CONCORDANCE",
    concordanceTablistAria: "Shared moral roots concordance themes",
    stewardshipActionLabel: "STEWARDSHIP ACTION:",
    corpusLabels: {
      TAURAT: "TAURAT",
      ZABUR: "ZABUR",
      INJĪL: "INJĪL",
      "AL-QUR’ĀN": "AL-QUR’ĀN",
    },
  },
  id: {
    classicalWitnessHeading: "SAMPEL NASKAH KLASIK PRIMER (IBRANI · YUNANI · ARAB)",
    provenanceLabel: "OSHB WLC 4.20 · SBLGNT v1.2 · DIVINE-TEXT",
    emptyPassages: "Belum ada cuplikan naskah klasik yang tersedia.",
    concordanceHeading: "AKAR MORAL BERSAMA // KONKORDANSI EMPAT KITAB",
    concordanceTablistAria: "Tema konkordansi akar moral bersama",
    stewardshipActionLabel: "AKSI AMANAH:",
    corpusLabels: {
      TAURAT: "TAURAT",
      ZABUR: "ZABUR",
      INJĪL: "INJĪL",
      "AL-QUR’ĀN": "AL-QUR’ĀN",
    },
  },
  ar: {
    classicalWitnessHeading: "مقتطفات الشواهد الكلاسيكية الأولية (العبرية · اليونانية · العربية)",
    provenanceLabel: "OSHB WLC 4.20 · SBLGNT v1.2 · DIVINE-TEXT",
    emptyPassages: "لا تتوفر مقتطفات مخطوطات كلاسيكية حالياً.",
    concordanceHeading: "الجذور الأخلاقية المشتركة // التوافق بين الكتب الأربعة",
    concordanceTablistAria: "موضوعات التوافق الأخلاقي المشترك",
    stewardshipActionLabel: "الممارسة المسؤولة:",
    corpusLabels: {
      TAURAT: "التوراة",
      ZABUR: "الزبور",
      INJĪL: "الإنجيل",
      "AL-QUR’ĀN": "القرآن الكريم",
    },
  },
};

export function ClassicalWitnessPanel({
  locale: localeOverride,
  passages,
}: {
  readonly locale?: Locale;
  readonly passages: readonly ClassicalWitnessExcerpt[];
}) {
  const { locale: contextLocale, dictionary } = useTranslation();
  const locale = localeOverride ?? contextLocale;
  const copy = PANELS_COPY[locale];

  return (
    <section
      aria-label={copy.classicalWitnessHeading}
      className="relative border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)]/95 p-6 sm:p-8"
    >
      <SacredCornerBrackets />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <h2 className="font-monument text-base sm:text-lg tracking-[0.16em] text-[var(--dna-text)] uppercase">
          {copy.classicalWitnessHeading}
        </h2>
        <span dir="ltr" data-ltr="true" className="font-mono text-[10px] text-[var(--dna-accent)]">
          {copy.provenanceLabel}
        </span>
      </div>

      {passages.length === 0 ? (
        <div className="mt-5 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 font-mono text-xs text-[var(--dna-muted)]">
          {copy.emptyPassages}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {passages.map((item) => (
            <article
              key={item.corpusCode}
              data-source-corpus={item.corpusCode}
              className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10.5px]">
                <span dir="ltr" data-ltr="true" className="text-[var(--dna-accent)] font-bold">
                  {item.corpusCode} · {item.corpusName}
                </span>
                <span className="text-[var(--dna-muted)]">{item.language}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-[var(--dna-accent)]">
                <span className="text-[var(--dna-muted)]">
                  {dictionary.sanctuary.scriptures.citationLabel}:
                </span>
                <span dir="ltr" data-ltr="true">
                  {item.reference}
                </span>
              </div>
              <p
                dir={item.dir}
                lang={item.language === "Arabic" ? "ar" : item.language === "Hebrew" ? "he" : "el"}
                data-source-passage={item.corpusCode}
                className="border-y border-[var(--dna-accent)]/15 py-3 font-serif text-base sm:text-lg leading-loose text-[var(--dna-text)]"
              >
                {item.originalText}
              </p>
              <p className="font-serif text-xs text-[var(--dna-muted)] leading-relaxed">
                {item.summary}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function MoralRootsConcordancePanel({
  activeTheme,
  onSelectTheme,
}: {
  readonly activeTheme: FourCorpusConcordanceTheme;
  readonly onSelectTheme: (id: string) => void;
}) {
  const { locale } = useTranslation();
  const copy = PANELS_COPY[locale];

  return (
    <section
      aria-label={copy.concordanceHeading}
      className="relative border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] p-6 sm:p-8 space-y-5"
    >
      <SacredCornerBrackets />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-[var(--dna-accent)] uppercase">
          <DiamondStarOrnament className="h-3.5 w-3.5 text-[var(--dna-accent)]" />
          <span>{copy.concordanceHeading}</span>
        </div>
        <span className="font-mono text-[10.5px] text-[var(--dna-muted)]">
          {activeTheme.arabicRoot}
        </span>
      </div>

      <div
        role="tablist"
        aria-label={copy.concordanceTablistAria}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FOUR_CORPUS_CONCORDANCE.map((theme) => (
          <DnaButton
            key={theme.id}
            type="button"
            role="tab"
            tone="secondary"
            aria-selected={theme.id === activeTheme.id}
            onClick={() => onSelectTheme(theme.id)}
            className="min-h-0 justify-start px-3.5 py-2 text-start font-mono text-[10.5px] text-[var(--dna-text)] uppercase"
          >
            {theme.title}
          </DnaButton>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            { code: "TAURAT", body: activeTheme.tauratWitness },
            { code: "ZABUR", body: activeTheme.zaburWitness },
            { code: "INJĪL", body: activeTheme.injilWitness },
            { code: "AL-QUR’ĀN", body: activeTheme.quranWitness },
          ] as const
        ).map((item) => (
          <div
            key={item.code}
            className="border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] p-4"
          >
            <div className="font-monument text-xs tracking-[0.16em] text-[var(--dna-accent)]">
              {copy.corpusLabels[item.code]}
            </div>
            <p className="mt-2 font-serif text-xs leading-relaxed text-[var(--dna-muted)]">
              {item.body}
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--dna-accent)]/15 pt-3 font-mono text-[11px] text-[var(--dna-muted)]">
        <span className="text-[var(--dna-accent)]">{copy.stewardshipActionLabel}</span>{" "}
        {activeTheme.livedPractice}
      </div>
    </section>
  );
}
