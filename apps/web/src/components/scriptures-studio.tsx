"use client";

import { requestApiResponse } from "@moonwitness/contracts/sdk";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FOUR_CORPUS_CONCORDANCE,
  FOUR_CORPUS_POLICY,
  type ClassicalWitnessExcerpt,
  type QuranSearchHit,
  type ScriptureCorpusFilter,
  type UnifiedScriptureHit,
} from "@moonwitness/canon";
import { Button, CutoutArtwork, DnaBrandLogo, Input } from "@moonwitness/ui";
import { DnaBadge, DnaButton, DnaChamber, SearchLensIcon } from "@moonwitness/ui/imperium";
import type { Locale } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { ClassicalWitnessPanel, MoralRootsConcordancePanel } from "./scriptures-panels";
import { SiteSubpageHeader } from "./site-subpage-header";

interface ScripturesApiResponse {
  readonly corpusStatus: "LIVE_INDEXED" | "UNAVAILABLE";
  readonly corpusFilter?: ScriptureCorpusFilter;
  readonly totalAyahs: number;
  readonly totalSurahs: number;
  readonly corpusCounts?: {
    readonly taurat: number;
    readonly zabur: number;
    readonly injil: number;
    readonly quran: number;
    readonly totalVerses: number;
  };
  readonly query: string;
  readonly hits: readonly QuranSearchHit[];
  readonly unifiedHits?: readonly UnifiedScriptureHit[];
  readonly crosswalk: {
    readonly invariant: string;
    readonly note: string;
    readonly passages: readonly ClassicalWitnessExcerpt[];
  } | null;
}

const CORPUS_TABS: readonly {
  readonly id: ScriptureCorpusFilter;
  readonly labels: Record<Locale, string>;
  readonly countKey: "totalVerses" | "taurat" | "zabur" | "injil" | "quran";
}[] = [
  {
    id: "ALL",
    labels: {
      en: "ALL FOUR CORPORA",
      id: "EMPAT KITAB PENUH",
      ar: "جميع المدونات الأربع",
    },
    countKey: "totalVerses",
  },
  {
    id: "SRC-TOR",
    labels: {
      en: "TAURAT · WLC",
      id: "TAURAT · WLC",
      ar: "التوراة · WLC",
    },
    countKey: "taurat",
  },
  {
    id: "SRC-ZAB",
    labels: {
      en: "ZABUR · PSALMS",
      id: "ZABUR · MAZMUR",
      ar: "الزبور · المزامير",
    },
    countKey: "zabur",
  },
  {
    id: "SRC-INJ",
    labels: {
      en: "INJĪL · SBLGNT",
      id: "INJĪL · SBLGNT",
      ar: "الإنجيل · SBLGNT",
    },
    countKey: "injil",
  },
  {
    id: "SRC-QUR",
    labels: {
      en: "AL-QUR’ĀN · UTHMANI",
      id: "AL-QUR’ĀN · UTSMANI",
      ar: "القرآن الكريم · العثماني",
    },
    countKey: "quran",
  },
];

const PRESET_QUERIES: readonly {
  readonly q: string;
  readonly corpus: ScriptureCorpusFilter;
  readonly labels: Record<Locale, string>;
}[] = [
  {
    q: "Gen 1:1",
    corpus: "SRC-TOR",
    labels: {
      en: "Taurat · Gen 1:1",
      id: "Taurat · Kej 1:1",
      ar: "التوراة · Gen 1:1",
    },
  },
  {
    q: "Deut 6:4",
    corpus: "SRC-TOR",
    labels: {
      en: "Taurat · Deut 6:4",
      id: "Taurat · Ul 6:4",
      ar: "التوراة · Deut 6:4",
    },
  },
  {
    q: "Ps 23:1",
    corpus: "SRC-ZAB",
    labels: {
      en: "Zabur · Ps 23:1",
      id: "Zabur · Mzm 23:1",
      ar: "الزبور · Ps 23:1",
    },
  },
  {
    q: "John 1:1",
    corpus: "SRC-INJ",
    labels: {
      en: "Injīl · John 1:1",
      id: "Injīl · Yoh 1:1",
      ar: "الإنجيل · John 1:1",
    },
  },
  {
    q: "θεος",
    corpus: "SRC-INJ",
    labels: {
      en: "Greek · θεός",
      id: "Yunani · θεός",
      ar: "اليونانية · θεός",
    },
  },
  {
    q: "2:256",
    corpus: "SRC-QUR",
    labels: {
      en: "Qur’ān · 2:256",
      id: "Qur’ān · 2:256",
      ar: "القرآن · 2:256",
    },
  },
  {
    q: "55:7",
    corpus: "SRC-QUR",
    labels: {
      en: "Qur’ān · 55:7 (Mīzān)",
      id: "Qur’ān · 55:7 (Mīzān)",
      ar: "القرآن · 55:7 (الميزان)",
    },
  },
  {
    q: "الله",
    corpus: "SRC-QUR",
    labels: {
      en: "Arabic · الله",
      id: "Arab · الله",
      ar: "العربية · الله",
    },
  },
];

const STUDIO_COPY: Record<
  Locale,
  {
    readonly eyebrow: string;
    readonly neutralityExplanation: string;
    readonly versesIndexedSuffix: string;
    readonly ayahsIndexedLabel: string;
    readonly surahsIndexedLabel: string;
    readonly loadingCorpusIndex: string;
    readonly engineHeadingPrefix: string;
    readonly engineHeadingUnit: string;
    readonly engineDescription: string;
    readonly copyDeepLink: string;
    readonly linkCopied: string;
    readonly copyDeepLinkTitle: string;
    readonly doorLink: string;
    readonly filterTablistAria: string;
    readonly searchAria: string;
    readonly searchPlaceholder: string;
    readonly presetsAria: string;
    readonly probingIndexPrefix: string;
    readonly probingIndexSuffix: string;
    readonly shareHit: string;
    readonly copiedHit: string;
    readonly shareHitAria: string;
    readonly errorBannerTitle: string;
    readonly emptyResultPrefix: string;
    readonly resultsRegionAria: string;
  }
> = {
  en: {
    eyebrow: "FOUR-SCRIPTURE PARALLEL STUDIO · NEUTRAL & SOURCE-GROUNDED",
    neutralityExplanation: FOUR_CORPUS_POLICY.neutralityPrinciple,
    versesIndexedSuffix: "VERSE RECORDS INDEXED ACROSS ALL 4 CORPORA",
    ayahsIndexedLabel: "AYAH",
    surahsIndexedLabel: "SURAH INDEXED",
    loadingCorpusIndex: "LOADING CORPUS INDEX…",
    engineHeadingPrefix: "FOUR-CORPUS WITNESS ENGINE",
    engineHeadingUnit: "ORIGINAL VERSES",
    engineDescription:
      "Search directly across Taurat (WLC 5,853), Zabur (Psalms 2,527), Injīl (SBLGNT 3,768), and Al-Qur’ān (Uthmani 6,236) by ref or root script.",
    copyDeepLink: "COPY DEEP LINK",
    linkCopied: "LINK COPIED",
    copyDeepLinkTitle: "Copy shareable link preserving active corpus and search query",
    doorLink: "DOOR II EPISTEMIC SPINE ›",
    filterTablistAria: "Filter revealed scripture corpora",
    searchAria: "Search across Taurat, Zabur, Injil, and Quran corpora",
    searchPlaceholder: "Gen 1:1, Ps 23:1, John 1:1, 2:256, الله, θεος...",
    presetsAria: "Quick reference presets across the four corpora",
    probingIndexPrefix: "PROBING FOUR-CORPUS INDEX",
    probingIndexSuffix: "VERSES",
    shareHit: "SHARE",
    copiedHit: "COPIED",
    shareHitAria: "Copy deep link for this verse citation",
    errorBannerTitle: "Failed to load scripture witness index.",
    emptyResultPrefix: "NO MATCHING WITNESS RECORD FOR",
    resultsRegionAria: "Scripture witness search results",
  },
  id: {
    eyebrow: "PUSAT KAJIAN EMPAT KITAB · NETRAL & TERBUKA",
    neutralityExplanation:
      "Meneliti empat korpus teks klasik penuh—Taurat Ibrani (WLC), Zabur (Mazmur WLC), Injīl Yunani Koine (SBLGNT), dan Al-Qur’ān Arab Utsmani (6.236 ayat)—secara jujur, netral, tanpa peringkat agama, dan tanpa paksaan.",
    versesIndexedSuffix: "REKAMAN AYAT TERINDEKS DI 4 KORPUS",
    ayahsIndexedLabel: "AYAT",
    surahsIndexedLabel: "SURAH TERINDEKS",
    loadingCorpusIndex: "MEMUAT INDEKS KORPUS…",
    engineHeadingPrefix: "MESIN PENCARI EMPAT KITAB",
    engineHeadingUnit: "AYAT ASLI",
    engineDescription:
      "Cari langsung lintas Taurat (Gen/Exod/Lev/Num/Deut 5.853), Zabur (Ps 2.527), Injīl (Matt-John 3.768), dan Al-Qur’ān (6.236 ayat).",
    copyDeepLink: "SALIN TAUTAN",
    linkCopied: "TAUTAN DISALIN",
    copyDeepLinkTitle: "Salin tautan langsung yang mempertahankan filter korpus dan kueri aktif",
    doorLink: "PINTU II TULANG EPISTEMIK ›",
    filterTablistAria: "Saring korpus kitab suci",
    searchAria: "Cari di seluruh korpus Taurat, Zabur, Injil, dan Al-Qur'an",
    searchPlaceholder: "Gen 1:1, Ps 23:1, John 1:1, 2:256, الله, θεος...",
    presetsAria: "Prasetel rujukan cepat lintas empat kitab",
    probingIndexPrefix: "MEMINDAI INDEKS EMPAT KITAB",
    probingIndexSuffix: "AYAT",
    shareHit: "BAGIKAN",
    copiedHit: "DISALIN",
    shareHitAria: "Salin tautan langsung untuk sitasi ayat ini",
    errorBannerTitle: "Gagal memuat indeks saksi kitab.",
    emptyResultPrefix: "TIDAK ADA REKAMAN SAKSI YANG COCOK UNTUK",
    resultsRegionAria: "Hasil pencarian saksi kitab suci",
  },
  ar: {
    eyebrow: "استوديو الكتب الأربعة المتوازي · دراسة محايدة وموثقة",
    neutralityExplanation:
      "بحث مقارن أمين عبر المدونات الكلاسيكية الأربع — التوراة العبرية (WLC)، والزبور (المزامير WLC)، والإنجيل باليونانية الكوينية (SBLGNT)، والقرآن الكريم بالرسم العثماني (6,236 آية) — دون تفاضل طائفي ودون إكراه في الدين.",
    versesIndexedSuffix: "سجل آية مفهرس عبر المدونات الأربع",
    ayahsIndexedLabel: "آية",
    surahsIndexedLabel: "سورة مفهرسة",
    loadingCorpusIndex: "جارٍ تحميل فهرس المدونات…",
    engineHeadingPrefix: "محرك الشواهد للكتب الأربعة",
    engineHeadingUnit: "آية أصلية",
    engineDescription:
      "ابحث مباشرة عبر التوراة (5,853) والزبور (2,527) والإنجيل (3,768) والقرآن الكريم (6,236 آية) بالمرجع أو النص الأصلي.",
    copyDeepLink: "نسخ الرابط المباشر",
    linkCopied: "تم نسخ الرابط",
    copyDeepLinkTitle: "نسخ رابط مباشر يحفظ المدونة المحددة ونص البحث الحالي",
    doorLink: "الباب الثاني: العمود المعرفي ›",
    filterTablistAria: "تصفية المدونات المنزلة",
    searchAria: "البحث في مدونات التوراة والزبور والإنجيل والقرآن",
    searchPlaceholder: "Gen 1:1, Ps 23:1, John 1:1, 2:256, الله, θεος...",
    presetsAria: "استعلامات مرجعية سريعة عبر الكتب الأربعة",
    probingIndexPrefix: "جارٍ فحص فهرس الكتب الأربعة",
    probingIndexSuffix: "آية",
    shareHit: "مشاركة",
    copiedHit: "تم النسخ",
    shareHitAria: "نسخ الرابط المباشر لتوثيق هذه الآية",
    errorBannerTitle: "تعذر تحميل فهرس شواهد الكتب.",
    emptyResultPrefix: "لا يوجد سجل شاهد مطابق للاستعلام",
    resultsRegionAria: "نتائج البحث في شواهد الكتب الأربعة",
  },
};

export function ScripturesStudio() {
  const { locale, direction, dictionary } = useTranslation();
  const copy = STUDIO_COPY[locale];
  const [query, setQuery] = useState<string>("2:256");
  const [corpusFilter, setCorpusFilter] = useState<ScriptureCorpusFilter>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorKind, setErrorKind] = useState<"network" | "unexpected" | null>(null);
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const [payload, setPayload] = useState<ScripturesApiResponse | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string>(FOUR_CORPUS_CONCORDANCE[0]!.id);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQ = params.get("q")?.trim();
    const initialCorpus = params.get("corpus")?.trim().toUpperCase();
    if (initialQ) {
      setQuery(initialQ.slice(0, 120));
    }
    if (
      initialCorpus === "ALL" ||
      initialCorpus === "SRC-TOR" ||
      initialCorpus === "SRC-ZAB" ||
      initialCorpus === "SRC-INJ" ||
      initialCorpus === "SRC-QUR"
    ) {
      setCorpusFilter(initialCorpus);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) {
      url.searchParams.set("q", query.trim());
    } else {
      url.searchParams.delete("q");
    }
    if (corpusFilter !== "ALL") {
      url.searchParams.set("corpus", corpusFilter);
    } else {
      url.searchParams.delete("corpus");
    }
    window.history.replaceState(null, "", url.toString());
  }, [query, corpusFilter]);

  const copyShareUrl = useCallback(
    async (targetQuery?: string, targetCorpus?: ScriptureCorpusFilter) => {
      const url = new URL(window.location.href);
      if (targetQuery) {
        url.searchParams.set("q", targetQuery);
      }
      if (targetCorpus && targetCorpus !== "ALL") {
        url.searchParams.set("corpus", targetCorpus);
      } else if (!targetCorpus && corpusFilter === "ALL") {
        url.searchParams.delete("corpus");
      }
      const label = targetQuery ?? "search";
      try {
        await navigator.clipboard.writeText(url.toString());
        setCopiedLink(label);
        window.setTimeout(() => setCopiedLink(null), 2000);
      } catch {
        // Clipboard blocked in restricted context
      }
    },
    [corpusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    async function runSearch() {
      setLoading(true);
      setErrorKind(null);
      try {
        const res = await requestApiResponse(
          `/api/scriptures?corpus=${encodeURIComponent(corpusFilter)}&q=${encodeURIComponent(query)}&limit=12`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (res.ok) {
          const json = (await res.json()) as ScripturesApiResponse;
          setPayload(json);
        } else {
          setErrorKind("unexpected");
        }
      } catch {
        if (!controller.signal.aborted) {
          setErrorKind("network");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void runSearch();
    return () => controller.abort();
  }, [query, corpusFilter, retryNonce]);

  const activeTheme =
    FOUR_CORPUS_CONCORDANCE.find((item) => item.id === activeThemeId) ??
    FOUR_CORPUS_CONCORDANCE[0]!;

  const counts = payload?.corpusCounts;
  const displayedHits: readonly UnifiedScriptureHit[] =
    payload?.unifiedHits && payload.unifiedHits.length > 0
      ? payload.unifiedHits
      : (payload?.hits ?? []).map((h) => ({
          corpusCode: "SRC-QUR" as const,
          corpusLabel: "AL-QUR’ĀN (Uthmani)",
          reference: `QS ${h.reference}`,
          bookOrSurah: h.surahName,
          chapterOrSurah: h.surah,
          verseOrAyah: h.ayah,
          dir: "rtl" as const,
          language: "Arabic" as const,
          text: h.textUthmani,
        }));

  return (
    <div
      dir={direction}
      className="min-h-screen bg-[var(--dna-canvas)] text-[var(--dna-text)] bg-girih-filigree"
    >
      <SiteSubpageHeader activeRoute="scriptures" />

      <main id="main" className="relative mx-auto max-w-7xl px-4 py-12 sm:px-8 space-y-10">
        <CutoutArtwork
          id="codex-scroll"
          decorative
          className="pointer-events-none absolute right-6 top-8 hidden h-24 w-24 text-[var(--dna-accent)] opacity-20 md:block"
        />
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <DnaBrandLogo id="scriptures-codex" variant="stamp" size={32} decorative />
          </div>
          <div className="font-mono text-[11px] tracking-[0.26em] text-[var(--dna-accent)] uppercase">
            {dictionary.sanctuary.scriptures.compareMode} · {copy.eyebrow}
          </div>
          <h1 className="font-monument text-3xl sm:text-5xl tracking-[0.16em] text-gold-gradient uppercase">
            {dictionary.sanctuary.scriptures.heading}
          </h1>
          <p className="mx-auto max-w-3xl font-serif text-base text-[var(--dna-muted)] leading-relaxed">
            {dictionary.sanctuary.scriptures.subheading} {copy.neutralityExplanation}
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-2 border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] px-4 py-1.5 font-mono text-[10.5px] text-[var(--dna-accent)]">
            <span dir="ltr" data-ltr="true">
              {FOUR_CORPUS_POLICY.invariant}
            </span>
            <span>·</span>
            <span>
              {counts?.totalVerses ? (
                <>
                  <span dir="ltr" data-ltr="true">
                    {counts.totalVerses.toLocaleString("en-US")}
                  </span>{" "}
                  {copy.versesIndexedSuffix}
                </>
              ) : payload?.totalAyahs ? (
                <>
                  <span dir="ltr" data-ltr="true">
                    {payload.totalAyahs}
                  </span>{" "}
                  {copy.ayahsIndexedLabel} /{" "}
                  <span dir="ltr" data-ltr="true">
                    {payload.totalSurahs}
                  </span>{" "}
                  {copy.surahsIndexedLabel}
                </>
              ) : (
                copy.loadingCorpusIndex
              )}
            </span>
          </div>
        </div>

        {/* Classical Manuscript Witness Panel */}
        <ClassicalWitnessPanel locale={locale} passages={payload?.crosswalk?.passages ?? []} />

        {/* Live 18,384-Verse 4-Corpus Witness Search Console */}
        <DnaChamber cornerBrackets className="p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dna-accent)]/20 pb-4">
            <div>
              <h2 className="font-monument text-base sm:text-lg tracking-[0.16em] text-[var(--dna-text)] uppercase">
                {copy.engineHeadingPrefix} (
                <span dir="ltr" data-ltr="true">
                  18,384
                </span>{" "}
                {copy.engineHeadingUnit})
              </h2>
              <p className="mt-1 font-serif text-xs text-[var(--dna-muted)]">
                {copy.engineDescription}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DnaButton
                tone="secondary"
                title={copy.copyDeepLinkTitle}
                aria-label={copy.copyDeepLinkTitle}
                onClick={() => void copyShareUrl()}
                className="px-3.5 py-1.5 font-mono text-[10.5px] text-[var(--dna-muted)]"
              >
                {copiedLink === "search" ? copy.linkCopied : copy.copyDeepLink}
              </DnaButton>
              <DnaButton
                asChild
                tone="secondary"
                className="min-h-0 inline-flex items-center px-4 py-1.5 font-mono text-[10.5px] text-[var(--dna-accent)] uppercase"
              >
                <Link href="/codex?door=epistemic-corpus">{copy.doorLink}</Link>
              </DnaButton>
            </div>
          </div>

          {/* 4-Corpus Filter Tabs */}
          <div className="space-y-2">
            <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-muted)] uppercase">
              {dictionary.sanctuary.scriptures.corporaLabel}
            </div>
            <div
              role="tablist"
              aria-label={copy.filterTablistAria}
              className="flex flex-wrap gap-2"
            >
              {CORPUS_TABS.map((tab) => {
                const active = corpusFilter === tab.id;
                const num = counts ? counts[tab.countKey] : null;
                return (
                  <DnaButton
                    key={tab.id}
                    type="button"
                    role="tab"
                    tone="secondary"
                    aria-selected={active}
                    onClick={() => setCorpusFilter(tab.id)}
                    className={`min-h-0 px-3.5 py-2 font-mono text-[10.5px] tracking-[0.12em] uppercase transition-colors ${
                      active
                        ? "border border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                        : "text-[var(--dna-muted)]"
                    }`}
                  >
                    <span>{tab.labels[locale]}</span>
                    {num ? (
                      <span dir="ltr" data-ltr="true">
                        {" "}
                        ({num.toLocaleString("en-US")})
                      </span>
                    ) : null}
                  </DnaButton>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 border border-[var(--dna-accent)]/40 bg-[var(--dna-canvas)] px-4 py-2.5">
              <SearchLensIcon className="h-4 w-4 text-[var(--dna-accent)]" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={copy.searchAria}
                placeholder={copy.searchPlaceholder}
                className="min-h-0 w-full border-0 bg-transparent px-0 py-0 font-mono text-sm text-[var(--dna-text)] placeholder-[var(--dna-muted)] focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div role="group" aria-label={copy.presetsAria} className="flex flex-wrap gap-2">
            {PRESET_QUERIES.map((preset) => (
              <DnaButton
                key={`${preset.corpus}-${preset.q}`}
                tone="secondary"
                aria-pressed={query === preset.q && corpusFilter === preset.corpus}
                onClick={() => {
                  setCorpusFilter(preset.corpus);
                  setQuery(preset.q);
                }}
                className="px-3.5 py-1.5 text-[10px] text-[var(--dna-muted)]"
              >
                {preset.labels[locale]}
              </DnaButton>
            ))}
          </div>

          <div role="region" aria-label={copy.resultsRegionAria} className="space-y-2.5">
            {loading && !payload ? (
              <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 font-mono text-xs text-[var(--dna-muted)]">
                {dictionary.common.loading} {copy.probingIndexPrefix} (
                <span dir="ltr" data-ltr="true">
                  18,384
                </span>{" "}
                {copy.probingIndexSuffix})…
              </div>
            ) : errorKind ? (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 border border-[var(--dna-accent)]/35 bg-[var(--dna-canvas)] p-4 font-mono text-xs text-[var(--dna-text)]"
              >
                <span>
                  {copy.errorBannerTitle}{" "}
                  {errorKind === "network"
                    ? dictionary.errors.networkOffline
                    : dictionary.errors.unexpected}
                </span>
                <DnaButton
                  type="button"
                  tone="secondary"
                  onClick={() => setRetryNonce((n) => n + 1)}
                  className="px-3 py-1 text-[10px] text-[var(--dna-accent)]"
                >
                  {dictionary.common.refresh}
                </DnaButton>
              </div>
            ) : displayedHits.length > 0 ? (
              displayedHits.map((hit) => {
                const hitShareKey = hit.reference.replace(/^QS\s+/i, "");
                return (
                  <div
                    key={`${hit.corpusCode}-${hit.reference}`}
                    data-source-hit={`${hit.corpusCode}:${hit.reference}`}
                    className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)]/90 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10.5px] text-[var(--dna-accent)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <DnaBadge
                          dir="ltr"
                          data-ltr="true"
                          className="font-mono text-[10px] text-[var(--dna-accent)]"
                        >
                          {hit.corpusCode}
                        </DnaBadge>
                        <span>
                          {hit.corpusLabel} · {hit.bookOrSurah.toUpperCase()} ({hit.language})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--dna-muted)]">
                          {dictionary.sanctuary.scriptures.citationLabel}:
                        </span>
                        <DnaBadge
                          dir="ltr"
                          data-ltr="true"
                          className="font-mono text-[10px] text-[var(--dna-text)]"
                        >
                          {hit.reference}
                        </DnaBadge>
                        <Button
                          type="button"
                          variant="plain"
                          aria-label={`${copy.shareHitAria}: ${hit.reference}`}
                          title={`${copy.shareHitAria}: ${hit.reference}`}
                          onClick={() => void copyShareUrl(hitShareKey, hit.corpusCode)}
                          className="border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] px-2 py-0.5 text-[10px] text-[var(--dna-accent)] hover:text-[var(--dna-text)] cursor-pointer"
                        >
                          {copiedLink === hitShareKey ? copy.copiedHit : copy.shareHit}
                        </Button>
                      </div>
                    </div>
                    <p
                      dir={hit.dir}
                      lang={
                        hit.language === "Arabic" ? "ar" : hit.language === "Hebrew" ? "he" : "el"
                      }
                      data-source-passage={`${hit.corpusCode}:${hit.reference}`}
                      className={
                        hit.dir === "rtl"
                          ? "text-xl sm:text-2xl leading-loose text-[var(--dna-text)]"
                          : "font-serif text-lg sm:text-xl leading-relaxed text-[var(--dna-text)]"
                      }
                    >
                      {hit.text}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 font-mono text-xs text-[var(--dna-muted)]">
                {dictionary.common.noRecords} {copy.emptyResultPrefix} &ldquo;{query}&rdquo;.
              </div>
            )}
          </div>
        </DnaChamber>

        {/* Shared Moral Roots Concordance Matrix */}
        <MoralRootsConcordancePanel activeTheme={activeTheme} onSelectTheme={setActiveThemeId} />
      </main>
    </div>
  );
}
