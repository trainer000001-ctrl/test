import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  AETHERION_100_LEVELS,
  AMANAH_25_ATLAS,
  DHGS_13_STEPS,
  GOD_99_DIRECTORY,
  MTIME_OBSERVER_SITES,
  WORLD_PATCHES_REGISTRY,
  computeMTimeSolarLunarEstimate,
  evaluateDhgsAssuranceLoop,
  evaluateMTimeCriterion,
  evaluateSrgblModel,
  evaluateWsiSemanticFrame,
  queryOxDxHierarchy,
  searchCompactQuranTuples,
  searchFourCorpora,
  tokenizeAndParseAqel,
  type CompactQuranTuple,
  type CompactScriptureTuple,
} from "./index";
import { parseEnv, sanitizeRedirectPath, z } from "../../core/src/index";

const dataDir = resolve(process.cwd(), "apps/web/public/data");

test("Four primary scripture JSON corpora load and support exact reference + diacritic-insensitive search", () => {
  const quran = JSON.parse(readFileSync(resolve(dataDir, "quran-uthmani.json"), "utf8")) as CompactQuranTuple[];
  const taurat = JSON.parse(readFileSync(resolve(dataDir, "taurat-wlc.json"), "utf8")) as CompactScriptureTuple[];
  const zabur = JSON.parse(readFileSync(resolve(dataDir, "zabur-wlc.json"), "utf8")) as CompactScriptureTuple[];
  const injil = JSON.parse(readFileSync(resolve(dataDir, "injil-sblgnt.json"), "utf8")) as CompactScriptureTuple[];

  assert.equal(quran.length, 6236);
  assert.ok(taurat.length > 5800);
  assert.ok(zabur.length > 2500);
  assert.ok(injil.length > 3700);

  const qHit = searchCompactQuranTuples(quran, "2:256", 5);
  assert.equal(qHit.length, 1);
  assert.equal(qHit[0]?.reference, "2:256");

  const multi = searchFourCorpora({ quran, taurat, zabur, injil }, "Gen 1:1", "ALL", 4);
  assert.ok(multi.some((h) => h.corpusCode === "SRC-TOR" && h.chapterOrSurah === 1 && h.verseOrAyah === 1));
});

test("M-Time ephemeris computes valid lunar phase and enforces MABIMS semantic elongation guard", () => {
  const jakarta = MTIME_OBSERVER_SITES[0]!;
  const est = computeMTimeSolarLunarEstimate("2026-03-19T11:00:00Z", jakarta);
  assert.ok(est.moonAgeDays >= 0 && est.moonAgeDays <= 30);
  assert.ok(est.illuminatedPercent >= 0 && est.illuminatedPercent <= 100);

  const met = evaluateMTimeCriterion("MABIMS_ID_2026", {
    moonAltitudeDeg: 4.5,
    elongationDeg: 7.2,
    semantics: { altitudeBasis: "TOPOCENTRIC", elongationBasis: "GEOCENTRIC_CENTER_TO_CENTER" },
  });
  assert.equal(met.verdict, "CRITERION_MET");

  const mismatch = evaluateMTimeCriterion("MABIMS_ID_2026", {
    moonAltitudeDeg: 5.0,
    elongationDeg: 8.5,
    semantics: { altitudeBasis: "TOPOCENTRIC", elongationBasis: "GEOCENTRIC_APPARENT" },
  });
  assert.equal(mismatch.verdict, "UNKNOWN_SEMANTIC_MISMATCH");
});

test("SRGBL v8 enforces zero-denominator UNKNOWN guard and computes bounded scores", () => {
  const zero = evaluateSrgblModel({
    question: "Zero confidence check",
    observations: ["Fact A"],
    governanceRules: ["Rule B"],
    actorsAndMeanings: [],
    responsibleActions: [],
    weightedCriteria: [{ weight: 1, confidence: 0, intensity: 2, direction: 1 }],
  });
  assert.equal(zero.weightedScore, "UNKNOWN");
  assert.equal(zero.completeness.filledLevels, 2);

  const scored = evaluateSrgblModel({
    question: "Balanced decision",
    observations: ["Obs 1"],
    governanceRules: ["Rule 1"],
    actorsAndMeanings: ["Actor 1"],
    responsibleActions: ["Act 1"],
    weightedCriteria: [
      { weight: 2, confidence: 0.8, intensity: 1, direction: 1 },
      { weight: 1, confidence: 0.8, intensity: 1, direction: -1 },
    ],
  });
  assert.equal(scored.completeness.ratio, 1);
  assert.equal(typeof scored.weightedScore, "number");
  assert.ok((scored.weightedScore as number) > 0);
});

test("WSI semantic frame, OX-DX hierarchy, DHGS-13 loop, and AQEL Arabic lexer", () => {
  const offside = evaluateWsiSemanticFrame({
    statement: "Unbounded claim",
    sourceRef: "",
    agent: "Witness",
    recipient: "",
    domain: "Law",
    scope: "Local",
    genre: "Normative",
    swingDepth: 9,
  });
  assert.equal(offside.frameStatus, "OFFSIDE");
  assert.equal(offside.boundedDepth, 3);
  assert.ok(offside.missingDimensions.includes("RECIPIENT"));

  const oxdx = queryOxDxHierarchy("Z");
  assert.ok(oxdx.length > 0);

  const partialLoop = evaluateDhgsAssuranceLoop(["QUESTION", "PRIMARY_SOURCES"]);
  assert.equal(partialLoop.status, "IN_PROGRESS");
  assert.equal(partialLoop.completedCount, 2);
  assert.equal(partialLoop.nextRequiredStep, "03 · TRACEABLE_WITNESS");

  const fullLoop = evaluateDhgsAssuranceLoop(DHGS_13_STEPS.map((s) => s.code));
  assert.equal(fullLoop.status, "VERIFIED_LOOP");

  const aqel = tokenizeAndParseAqel('عرّف الحق = "Mizan"\nتحقق الحق\n');
  assert.equal(aqel.statements.length, 2);
  assert.equal(aqel.diagnostics.length, 0);
});

test("Canon registries maintain structural invariants and @moonwitness/core sanitizes redirects", () => {
  assert.equal(AETHERION_100_LEVELS.length, 100);
  assert.equal(GOD_99_DIRECTORY.length, 99);
  assert.equal(AMANAH_25_ATLAS.length, 25);
  assert.equal(WORLD_PATCHES_REGISTRY.length, 37);

  assert.equal(sanitizeRedirectPath("/codex?tab=1"), "/codex?tab=1");
  assert.equal(sanitizeRedirectPath("https://evil.example/phish", "/"), "/");
  assert.equal(sanitizeRedirectPath("//evil.example/phish", "/"), "/");

  const env = parseEnv({ PORT: z.string().default("3000") }, {});
  assert.equal(env.PORT, "3000");
});
