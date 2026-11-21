export type ScriptureCorpusCode = "SRC-TOR" | "SRC-ZAB" | "SRC-INJ" | "SRC-QUR";
export type ScriptureCorpusFilter = "ALL" | ScriptureCorpusCode;

export type CompactQuranTuple = readonly [
  surah: number,
  ayah: number,
  surahName: string,
  textUthmani: string,
];

export type CompactScriptureTuple = readonly [
  book: string,
  chapter: number,
  verse: number,
  text: string,
];

export interface ClassicalWitnessExcerpt {
  readonly corpusCode: ScriptureCorpusCode;
  readonly corpusName: string;
  readonly reference: string;
  readonly language: "Hebrew" | "Koine Greek" | "Arabic";
  readonly dir: "rtl" | "ltr";
  readonly originalText: string;
  readonly summary: string;
}

export interface QuranSearchHit {
  readonly surah: number;
  readonly ayah: number;
  readonly surahName: string;
  readonly reference: string;
  readonly textUthmani: string;
}

export interface UnifiedScriptureHit {
  readonly corpusCode: ScriptureCorpusCode;
  readonly corpusLabel: string;
  readonly reference: string;
  readonly bookOrSurah: string;
  readonly chapterOrSurah: number;
  readonly verseOrAyah: number;
  readonly dir: "rtl" | "ltr";
  readonly language: "Hebrew" | "Koine Greek" | "Arabic";
  readonly text: string;
}

export interface FourCorpusEntry {
  readonly code: ScriptureCorpusCode;
  readonly name: string;
  readonly prophetAnchor: string;
  readonly classicalLanguage: string;
  readonly epistemicRole: string;
  readonly ethicalCore: string;
  readonly neutralSummary: string;
  readonly invariant: string;
}

export interface FourCorpusConcordanceTheme {
  readonly id: string;
  readonly title: string;
  readonly arabicRoot: string;
  readonly tauratWitness: string;
  readonly zaburWitness: string;
  readonly injilWitness: string;
  readonly quranWitness: string;
  readonly livedPractice: string;
}

export const FOUR_CORPUS_POLICY = {
  sourceRepo: "bjo163/moonwitness-corpus",
  invariant: "REVEALED SOURCE CATEGORY ≠ EXTANT TEXTUAL WITNESS",
  neutralityPrinciple:
    "All four revealed witnesses are studied side by side with equal scholarly dignity, explicit manuscript provenance, zero inter-religious ranking, and strict non-coercion of conscience (QS 2:256).",
  corpora: [
    {
      code: "SRC-TOR",
      name: "TAURAT",
      prophetAnchor: "Prophet Mūsā (AS)",
      classicalLanguage: "Biblical Hebrew (WLC 4.20)",
      epistemicRole: "Covenant Law & Moral Equity",
      ethicalCore: "Oneness of the Creator, impartial justice, and covenantal stewardship.",
      neutralSummary:
        "Indexed from the Westminster Leningrad Codex (OSHB WLC 4.20) across Genesis through Deuteronomy (5,853 verses) as an extant Hebrew textual witness.",
      invariant: "Manuscript witnesses are cited verbatim with zero sectarian polemics.",
    },
    {
      code: "SRC-ZAB",
      name: "ZABUR",
      prophetAnchor: "Prophet Dāwūd (AS)",
      classicalLanguage: "Biblical Hebrew (Psalms WLC)",
      epistemicRole: "Devotional Praise & Defense of the Vulnerable",
      ethicalCore: "Remembrance of the Creator, humility in leadership, and vindicating the oppressed.",
      neutralSummary:
        "Indexed from the Westminster Leningrad Codex Psalter (2,527 verses) preserving Hebrew poetic parallelisms for comparative ethical study.",
      invariant: "Devotional witness studied for shared mercy and accountability.",
    },
    {
      code: "SRC-INJ",
      name: "INJĪL",
      prophetAnchor: "Prophet ‘Īsā (AS)",
      classicalLanguage: "Koine Greek (SBLGNT v1.2)",
      epistemicRole: "Mercy, Peacemaking & Inner Integrity",
      ethicalCore: "Love of God and neighbor, forgiveness, peacemaking, and sincerity beyond outward show.",
      neutralSummary:
        "Indexed from the SBL Greek New Testament (Matthew, Mark, Luke, John — 3,768 verses) in Koine Greek for open philological inspection.",
      invariant: "Textual criticism remains transparent and never coerces personal faith.",
    },
    {
      code: "SRC-QUR",
      name: "AL-QUR’ĀN",
      prophetAnchor: "Prophet Muḥammad ﷺ",
      classicalLanguage: "Classical Arabic (Uthmani Script)",
      epistemicRole: "Tawhid Criterion, Balance (Mīzān) & Freedom of Conscience",
      ethicalCore: "Absolute Tawhid, zero compulsion in religion (2:256), and standing firm for justice.",
      neutralSummary:
        "Indexed in full Uthmani Arabic across all 114 surahs and 6,236 ayahs for direct reference, Arabic root lookup, and parallel ethical study.",
      invariant: "Zero compulsion in faith; human interpretation remains accountable and fallible.",
    },
  ] as readonly FourCorpusEntry[],
} as const;

export const FOUR_CORPUS_CONCORDANCE: readonly FourCorpusConcordanceTheme[] = [
  {
    id: "oneness-tawhid",
    title: "ONENESS OF THE CREATOR",
    arabicRoot: "توحيد · ו-ח-ד · εἷς",
    tauratWitness: "Deuteronomy 6:4 — Hear, O Israel: the Creator is One, worthy of undivided devotion.",
    zaburWitness: "Psalm 86:10 — You alone are God, performing wonders across creation.",
    injilWitness: "Mark 12:29 — The foremost command: the Lord our God is one Lord.",
    quranWitness: "Al-Ikhlāṣ 112:1–4 — Say: He is ALLAH, the One; none is comparable unto Him.",
    livedPractice: "Anchor ethics in humility before the One Creator rather than human ego or tribalism.",
  },
  {
    id: "impartial-justice",
    title: "IMPARTIAL JUSTICE (MĪZĀN)",
    arabicRoot: "قسط / ميزان · צֶדֶק · δικαιοσύνη",
    tauratWitness: "Deuteronomy 16:20 — Justice, pure justice shall you pursue without partiality.",
    zaburWitness: "Psalm 82:3 — Vindicate the weak and the orphan; maintain the rights of the afflicted.",
    injilWitness: "Matthew 23:23 — Uphold the weightier matters of the law: justice, mercy, and faithfulness.",
    quranWitness: "An-Nisā’ 4:135 & Ar-Raḥmān 55:7–9 — Stand firm as witnesses for justice, even against yourselves.",
    livedPractice: "Audit every claim, ledger, and decision with transparent evidence and zero bias.",
  },
  {
    id: "mercy-conscience",
    title: "MERCY & NON-COERCION",
    arabicRoot: "رحمة · חֶסֶד · ἔλεος",
    tauratWitness: "Leviticus 19:33–34 — Do not mistreat the stranger residing among you; treat them with dignity.",
    zaburWitness: "Psalm 145:9 — The Creator is good to all; His compassion rests over all He has made.",
    injilWitness: "Matthew 5:7–9 — Blessed are the merciful and the peacemakers.",
    quranWitness: "Al-Baqarah 2:256 — There is zero compulsion in religion; guidance stands distinct from error.",
    livedPractice: "Protect freedom of conscience and speak truth with clarity, never coercion.",
  },
  {
    id: "truthful-witness",
    title: "TRUTHFUL WITNESS & AMANAH",
    arabicRoot: "شهادة / أمانة · אֱמֶת · ἀλήθεια",
    tauratWitness: "Exodus 20:16 — Do not bear false witness against your neighbor.",
    zaburWitness: "Psalm 15:1–2 — Walk with integrity, act justly, and speak truth from the heart.",
    injilWitness: "John 8:32 — Know the truth, and truth frees human judgment from illusion.",
    quranWitness: "Al-Aḥzāb 33:70 & Al-Isrā’ 17:36 — Speak words straight to the point; pursue not what you lack knowledge of.",
    livedPractice: "Distinguish verified witness from unverified speculation; mark missing evidence UNKNOWN.",
  },
];

const BOOK_ALIASES: Readonly<Record<string, string>> = {
  gen: "gen",
  genesis: "gen",
  kej: "gen",
  ex: "exod",
  exo: "exod",
  exod: "exod",
  exodus: "exod",
  kel: "exod",
  lev: "lev",
  leviticus: "lev",
  im: "lev",
  num: "num",
  numbers: "num",
  bil: "num",
  deut: "deut",
  dt: "deut",
  deuteronomy: "deut",
  ul: "deut",
  ps: "ps",
  psa: "ps",
  psalm: "ps",
  psalms: "ps",
  mzm: "ps",
  zabur: "ps",
  matt: "matt",
  mat: "matt",
  mt: "matt",
  matthew: "matt",
  matius: "matt",
  mark: "mark",
  mk: "mark",
  mrk: "mark",
  markus: "mark",
  luke: "luke",
  lk: "luke",
  luk: "luke",
  lukas: "luke",
  john: "john",
  jn: "john",
  jhn: "john",
  yoh: "john",
  yohanes: "john",
};

function stripDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ς/g, "σ")
    .toLowerCase();
}

function parseChapterVerseRef(raw: string): { book?: string; chapter: number; verse?: number } | null {
  const cleaned = raw.trim().replace(/^qs\.?\s*/i, "");
  const bookMatch = cleaned.match(/^([a-zA-Z]+)\.?\s+(\d+)(?::(\d+))?$/);
  if (bookMatch) {
    const rawBook = bookMatch[1]!.toLowerCase();
    const book = BOOK_ALIASES[rawBook] ?? rawBook;
    return {
      book,
      chapter: Number(bookMatch[2]),
      verse: bookMatch[3] ? Number(bookMatch[3]) : undefined,
    };
  }
  const numMatch = cleaned.match(/^(\d+):(\d+)$/);
  if (numMatch) {
    return {
      chapter: Number(numMatch[1]),
      verse: Number(numMatch[2]),
    };
  }
  return null;
}

export function searchCompactQuranTuples(
  tuples: readonly CompactQuranTuple[],
  query: string,
  limit = 12,
): readonly QuranSearchHit[] {
  if (tuples.length === 0) return [];
  const trimmed = query.trim();
  const maxResults = Math.max(1, Math.min(100, limit));

  if (!trimmed) {
    const featuredRefs: readonly [number, number][] = [
      [1, 1],
      [2, 256],
      [4, 135],
      [55, 7],
      [112, 1],
    ];
    const results: QuranSearchHit[] = [];
    for (const [s, a] of featuredRefs) {
      const hit = tuples.find((t) => t[0] === s && t[1] === a);
      if (hit) {
        results.push({
          surah: hit[0],
          ayah: hit[1],
          surahName: hit[2],
          reference: `${hit[0]}:${hit[1]}`,
          textUthmani: hit[3],
        });
      }
    }
    return results.slice(0, maxResults);
  }

  const parsed = parseChapterVerseRef(trimmed);
  if (parsed && !parsed.book) {
    const matches = tuples.filter(
      (t) => t[0] === parsed.chapter && (parsed.verse === undefined || t[1] === parsed.verse),
    );
    return matches.slice(0, maxResults).map((t) => ({
      surah: t[0],
      ayah: t[1],
      surahName: t[2],
      reference: `${t[0]}:${t[1]}`,
      textUthmani: t[3],
    }));
  }

  const normQuery = stripDiacritics(trimmed);
  const results: QuranSearchHit[] = [];
  for (const t of tuples) {
    const ref = `${t[0]}:${t[1]}`;
    if (
      ref === trimmed ||
      stripDiacritics(t[2]).includes(normQuery) ||
      stripDiacritics(t[3]).includes(normQuery)
    ) {
      results.push({
        surah: t[0],
        ayah: t[1],
        surahName: t[2],
        reference: ref,
        textUthmani: t[3],
      });
      if (results.length >= maxResults) break;
    }
  }
  return results;
}

function searchScriptureTuples(
  tuples: readonly CompactScriptureTuple[],
  corpusCode: Exclude<ScriptureCorpusCode, "SRC-QUR">,
  corpusLabel: string,
  language: "Hebrew" | "Koine Greek",
  dir: "rtl" | "ltr",
  query: string,
  limit: number,
): readonly UnifiedScriptureHit[] {
  if (tuples.length === 0) return [];
  const trimmed = query.trim();
  const parsed = parseChapterVerseRef(trimmed);
  const results: UnifiedScriptureHit[] = [];

  if (!trimmed) {
    for (const t of tuples.slice(0, limit)) {
      results.push({
        corpusCode,
        corpusLabel,
        reference: `${t[0]} ${t[1]}:${t[2]}`,
        bookOrSurah: t[0],
        chapterOrSurah: t[1],
        verseOrAyah: t[2],
        dir,
        language,
        text: t[3],
      });
    }
    return results;
  }

  if (parsed?.book) {
    for (const t of tuples) {
      const tupleBook = BOOK_ALIASES[t[0].toLowerCase()] ?? t[0].toLowerCase();
      if (
        tupleBook === parsed.book &&
        t[1] === parsed.chapter &&
        (parsed.verse === undefined || t[2] === parsed.verse)
      ) {
        results.push({
          corpusCode,
          corpusLabel,
          reference: `${t[0]} ${t[1]}:${t[2]}`,
          bookOrSurah: t[0],
          chapterOrSurah: t[1],
          verseOrAyah: t[2],
          dir,
          language,
          text: t[3],
        });
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  const normQuery = stripDiacritics(trimmed);
  for (const t of tuples) {
    const ref = `${t[0]} ${t[1]}:${t[2]}`;
    if (
      ref.toLowerCase().includes(normQuery) ||
      stripDiacritics(t[0]).includes(normQuery) ||
      stripDiacritics(t[3]).includes(normQuery)
    ) {
      results.push({
        corpusCode,
        corpusLabel,
        reference: ref,
        bookOrSurah: t[0],
        chapterOrSurah: t[1],
        verseOrAyah: t[2],
        dir,
        language,
        text: t[3],
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function searchFourCorpora(
  corpora: {
    readonly quran: readonly CompactQuranTuple[];
    readonly taurat: readonly CompactScriptureTuple[];
    readonly zabur: readonly CompactScriptureTuple[];
    readonly injil: readonly CompactScriptureTuple[];
  },
  query: string,
  filter: ScriptureCorpusFilter = "ALL",
  limitPerCorpus = 6,
): readonly UnifiedScriptureHit[] {
  const hits: UnifiedScriptureHit[] = [];

  if (filter === "ALL" || filter === "SRC-TOR") {
    hits.push(
      ...searchScriptureTuples(
        corpora.taurat,
        "SRC-TOR",
        "TAURAT (WLC 4.20)",
        "Hebrew",
        "rtl",
        query,
        limitPerCorpus,
      ),
    );
  }
  if (filter === "ALL" || filter === "SRC-ZAB") {
    hits.push(
      ...searchScriptureTuples(
        corpora.zabur,
        "SRC-ZAB",
        "ZABUR (Psalms WLC)",
        "Hebrew",
        "rtl",
        query,
        limitPerCorpus,
      ),
    );
  }
  if (filter === "ALL" || filter === "SRC-INJ") {
    hits.push(
      ...searchScriptureTuples(
        corpora.injil,
        "SRC-INJ",
        "INJĪL (SBLGNT v1.2)",
        "Koine Greek",
        "ltr",
        query,
        limitPerCorpus,
      ),
    );
  }
  if (filter === "ALL" || filter === "SRC-QUR") {
    const qHits = searchCompactQuranTuples(corpora.quran, query, limitPerCorpus);
    for (const h of qHits) {
      hits.push({
        corpusCode: "SRC-QUR",
        corpusLabel: "AL-QUR’ĀN (Uthmani)",
        reference: `QS ${h.reference}`,
        bookOrSurah: h.surahName,
        chapterOrSurah: h.surah,
        verseOrAyah: h.ayah,
        dir: "rtl",
        language: "Arabic",
        text: h.textUthmani,
      });
    }
  }

  return hits;
}
