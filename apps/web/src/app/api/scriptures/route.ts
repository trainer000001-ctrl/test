import { type NextRequest, NextResponse } from "next/server";
import {
  searchCompactQuranTuples,
  searchFourCorpora,
  type ClassicalWitnessExcerpt,
  type CompactQuranTuple,
  type CompactScriptureTuple,
  type ScriptureCorpusFilter,
} from "@moonwitness/canon";
import { loadPublicJsonAsset } from "@/lib/public-assets";

interface WitnessCrosswalkPayload {
  readonly invariant: string;
  readonly note: string;
  readonly passages: readonly ClassicalWitnessExcerpt[];
}

let cachedQuranTuples: readonly CompactQuranTuple[] | null = null;
let cachedTauratTuples: readonly CompactScriptureTuple[] | null = null;
let cachedZaburTuples: readonly CompactScriptureTuple[] | null = null;
let cachedInjilTuples: readonly CompactScriptureTuple[] | null = null;
let cachedWitnessCrosswalk: WitnessCrosswalkPayload | null = null;

async function getCachedArrayAsset<T>(
  assetPath: string,
  getter: () => readonly T[] | null,
  setter: (val: readonly T[]) => void,
): Promise<readonly T[]> {
  const existing = getter();
  if (existing) return existing;
  const loaded = await loadPublicJsonAsset<readonly T[]>(assetPath);
  if (Array.isArray(loaded)) {
    setter(loaded);
    return loaded;
  }
  return [];
}

async function getWitnessCrosswalk(): Promise<WitnessCrosswalkPayload | null> {
  if (cachedWitnessCrosswalk) return cachedWitnessCrosswalk;
  const loaded = await loadPublicJsonAsset<WitnessCrosswalkPayload>(
    "/data/four-corpus-witnesses.json",
  );
  if (loaded) {
    cachedWitnessCrosswalk = loaded;
  }
  return loaded;
}

function normalizeCorpusFilter(raw: string | null): ScriptureCorpusFilter {
  const value = (raw ?? "ALL").trim().toUpperCase();
  switch (value) {
    case "SRC-TOR":
    case "TAURAT":
    case "TOR":
      return "SRC-TOR";
    case "SRC-ZAB":
    case "ZABUR":
    case "ZAB":
      return "SRC-ZAB";
    case "SRC-INJ":
    case "INJIL":
    case "INJ":
      return "SRC-INJ";
    case "SRC-QUR":
    case "QURAN":
    case "QUR":
      return "SRC-QUR";
    default:
      return "ALL";
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").slice(0, 120);
  const corpusFilter = normalizeCorpusFilter(searchParams.get("corpus"));
  const limitRaw = Number(searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(36, Math.round(limitRaw))) : 12;

  const [quran, taurat, zabur, injil, crosswalk] = await Promise.all([
    getCachedArrayAsset<CompactQuranTuple>(
      "/data/quran-uthmani.json",
      () => cachedQuranTuples,
      (val) => {
        cachedQuranTuples = val;
      },
    ),
    getCachedArrayAsset<CompactScriptureTuple>(
      "/data/taurat-wlc.json",
      () => cachedTauratTuples,
      (val) => {
        cachedTauratTuples = val;
      },
    ),
    getCachedArrayAsset<CompactScriptureTuple>(
      "/data/zabur-wlc.json",
      () => cachedZaburTuples,
      (val) => {
        cachedZaburTuples = val;
      },
    ),
    getCachedArrayAsset<CompactScriptureTuple>(
      "/data/injil-sblgnt.json",
      () => cachedInjilTuples,
      (val) => {
        cachedInjilTuples = val;
      },
    ),
    getWitnessCrosswalk(),
  ]);

  const limitPerCorpus =
    corpusFilter === "ALL" ? Math.max(3, Math.min(8, Math.ceil(limit / 2))) : limit;
  const hits = searchCompactQuranTuples(quran, query, limit);
  const unifiedHits = searchFourCorpora(
    { quran, taurat, zabur, injil },
    query,
    corpusFilter,
    limitPerCorpus,
  );
  const totalVerses = taurat.length + zabur.length + injil.length + quran.length;

  const payload = {
    corpusStatus: totalVerses > 0 ? "LIVE_INDEXED" : "UNAVAILABLE",
    corpusFilter,
    totalAyahs: quran.length,
    totalSurahs: quran.length > 0 ? 114 : 0,
    corpusCounts: {
      taurat: taurat.length,
      zabur: zabur.length,
      injil: injil.length,
      quran: quran.length,
      totalVerses,
    },
    query,
    hits,
    unifiedHits,
    crosswalk,
  };

  return NextResponse.json(payload, {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
