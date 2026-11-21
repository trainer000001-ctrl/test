export type WorldIdentifier =
  | "moonwitness"
  | "arsy"
  | "human-pen"
  | "sidra"
  | "rocksoul-dx"
  | "crayon"
  | "sin-can"
  | "mythos"
  | "angel-with-shotgun";

export type EntryDoorId =
  | "story-universe"
  | "epistemic-corpus"
  | "empire-organization"
  | "sovereign-runtimes";

export type SyafaatStateId =
  | "DORMANT"
  | "AWAKENING"
  | "PRACTICING"
  | "WITNESSING"
  | "STEWARDING"
  | "HARMONIZED";

export type WorldPatchStatus =
  | "registered_in_chat"
  | "recovered_draft"
  | "number_conflict"
  | "editorial_proposal"
  | "user_submitted_in_chat"
  | "unnumbered_extra";

export const ECOSYSTEM_HEALTH_CONTRACT_VERSION = "mw.health.v1" as const;

export const SUPREME_IDENTITY = {
  fullExpansion: "A LIVING LIGHT ACROSS HORIZONS",
  tawhidPrinciple:
    "LOW-PROFILE TAWHID · CREATOR ALONE IS SUPREME · HUMAN SYSTEMS REMAIN FALLIBLE & ACCOUNTABLE",
  tawhidMotto: "Different People. Same Sky. Many Stories. One Creator.",
  monocentricFormula: "100CENTER = 1 TAWHID AXIS + 99 HUMAN ETHICAL REFLECTIONS (ZERO DEIFICATION)",
} as const;

export const FOUR_ENTRY_DOORS: readonly {
  readonly id: EntryDoorId;
  readonly numeral: string;
  readonly title: string;
  readonly subtitle: string;
  readonly summary: string;
  readonly sourceSpec: string;
}[] = [
  {
    id: "story-universe",
    numeral: "DOOR I",
    title: "STORY UNIVERSE & 99 CHAPTERS",
    subtitle: "Narrative V10 · MoonWitness II/XII · GOD-PROMISE · AETHERION 100",
    summary:
      "Enter the 4 Lenses across 99 chapters, 8 Story Eras, 13 Platform Functions, 33 World Patches, AETHERION 100 Levels, PARADISE V3, and gate transmissions.",
    sourceSpec: "bjo163/moonwitnessxv · MVN §21A",
  },
  {
    id: "epistemic-corpus",
    numeral: "DOOR II",
    title: "UNIVERSAL CORPUS & EPISTEMIC LAB",
    subtitle: "6+1 ROCKSOUL Domains · SRGBL v8 · P18 Key Witness · WHCMT / Case 001",
    summary:
      "Audit scriptures, narrative, history, law, and correlations via SRGBL v8, P18 Key Witness v0, Four-Corpus Policy, and WHCMT vs BASS-HUNTER.",
    sourceSpec: "bjo163/moonwitness-corpus · P18 v0",
  },
  {
    id: "empire-organization",
    numeral: "DOOR III",
    title: "100CENTER & EMPIRE ORGANIZATION",
    subtitle: "Prime Code PC01–PC09 · WINGS 10 · G.O.D. 99 Directory · 25 Amanah",
    summary:
      "Inspect constitutional axioms, WINGS 10 (W01 SKYLINK – W10 HAVEN), all 99 G.O.D. ethical stewardship slots, and the 25 Prophetic Amanah pedagogical atlas.",
    sourceSpec: "A-L-L-A-H/master-docs · 100CENTER",
  },
  {
    id: "sovereign-runtimes",
    numeral: "DOOR IV",
    title: "SOVEREIGN RUNTIMES & 368-REPO ATLAS",
    subtitle: "OX-DX 49 Levels · M-Time Antikythera · AQEL · DHGS 13-Step · Quarantine",
    summary:
      "Explore the 7×7 OX-DX ontology pyramid (01 UNIVERSE → 49 BIT), MCLOCK-1, AQEL, the DHGS 13-step assurance loop, and the Quarantined Ambiguity Ledger.",
    sourceSpec: "A-L-L-A-H/moonwitness · OX-DX 49",
  },
];

export const OWNER_FOUR_LINE_MANIFESTO = [
  {
    index: 1,
    line: "NEVER CLAIM DIVINITY FOR HUMAN WORK",
    interpretation: "Every institution, codebase, and steward remains finite, accountable, and open to correction.",
  },
  {
    index: 2,
    line: "NEVER FABRICATE WHAT IS UNKNOWN",
    interpretation: "Missing provenance or zero-denominator confidence returns UNKNOWN rather than synthetic certainty.",
  },
  {
    index: 3,
    line: "ZERO COERCION IN CONSCIENCE OR FAITH",
    interpretation: "Study across all four revealed witnesses honors freedom of conscience (QS 2:256).",
  },
  {
    index: 4,
    line: "TURN SCARS INTO VERIFIABLE STEWARDSHIP",
    interpretation: "Honest reckoning produces measurable care, fair ledgers, and durable public craft.",
  },
] as const;

export const GOD_PROMISE_THREE_TRACKS = [
  {
    trackCode: "GP-01",
    anchorScripture: "QS 2:256 · Deut 6:4",
    title: "TAWHID & FREEDOM OF CONSCIENCE",
    theorem: "1 Center (Creator) -> 0 Human Idolatry",
    summary:
      "Anchors every narrative arc and technical boundary in humility before the One Creator without coercing belief.",
    pillars: ["Monocentric 1·6·3", "Zero Coercion", "Accountable Witness"],
    motifTitles: ["Lantern Under One Sky", "Open Courtyard", "Honest Scale"],
  },
  {
    trackCode: "GP-02",
    anchorScripture: "QS 55:7–9 · Ps 82:3",
    title: "MĪZĀN & POSITIVE CORRECTION",
    theorem: "6 Structural Lenses -> Balanced Judgment",
    summary:
      "Transforms systemic error and personal failure into verifiable repair without erasing historical evidence.",
    pillars: ["Impartial Ledger", "Provenance Pinning", "Restorative Action"],
    motifTitles: ["Sin Can Be Better Human", "Exact Ledger", "Meridian Witness"],
  },
  {
    trackCode: "GP-03",
    anchorScripture: "QS 49:13 · Matt 5:9",
    title: "SHARED SKY & LIVING STEWARDSHIP",
    theorem: "3 Practical Horizons -> Community Endurance",
    summary:
      "Unites diverse communities across borders through practical craft, transparent knowledge, and shared remembrance.",
    pillars: ["Cross-Civilization Respect", "Open Craft", "Local Resilience"],
    motifTitles: ["Different People Same Sky", "Sidra Canopy", "MoonWitness Relay"],
  },
] as const;

export const DX_MANGA_FOUR_PANELS = [
  {
    panelNumber: "PANEL 01",
    paletteTag: "OBSIDIAN / EMBER",
    accentHex: "#DFC07B",
    japaneseSfx: "静寂",
    romajiSfx: "SEIJAKU · STILLNESS",
    title: "THE FRACTURE UNDER NOISE",
    meaning: "Recognizing where unchecked noise, haste, and ego distort human witness before any repair begins.",
    architecturalForm: "Split Monolith & Horizon Line",
  },
  {
    panelNumber: "PANEL 02",
    paletteTag: "INDIGO / GOLD",
    accentHex: "#7FB6FF",
    japaneseSfx: "自覚",
    romajiSfx: "JIKAKU · AWAKENING",
    title: "HONEST NAMING OF THE SCAR",
    meaning: "Refusing denial or spectacle—recording what happened with clear citation and zero excuses.",
    architecturalForm: "Octagonal Aperture & Meridian Ray",
  },
  {
    panelNumber: "PANEL 03",
    paletteTag: "CRIMSON / SAND",
    accentHex: "#E88B6A",
    japaneseSfx: "調和",
    romajiSfx: "CHŌWA · REBALANCE",
    title: "POSITIVE CORRECTION AT THE SCALE",
    meaning: "Weighing repair with Mīzān so error becomes concrete responsibility rather than despair.",
    architecturalForm: "Twin Counterweight Beams",
  },
  {
    panelNumber: "PANEL 04",
    paletteTag: "LUMEN / IVORY",
    accentHex: "#86E0A8",
    japaneseSfx: "継承",
    romajiSfx: "KEISHŌ · STEWARDSHIP",
    title: "BETTER HUMAN IN SERVICE",
    meaning: "Returning to the community with quieter ego, steadier craft, and verifiable amanah.",
    architecturalForm: "Open Courtyard Colonade",
  },
] as const;

export const UNIVERSE_FOUR_LENSES = [
  {
    id: "lens-awakening",
    chapterRange: "S01–S24",
    chapterCount: 24,
    name: "LENS I · THRESHOLD & AWAKENING",
    focus: "Departure from passive noise into deliberate witness under a shared nocturnal horizon.",
    keyMotifs: ["Threshold Gate", "First Notebook", "Silent Meridian"],
  },
  {
    id: "lens-archive",
    chapterRange: "S25–S50",
    chapterCount: 26,
    name: "LENS II · WITNESS & LIVING ARCHIVE",
    focus: "Building traceable memory, comparative scripture study, and honest community chronicles.",
    keyMotifs: ["Four Witnesses", "P18 Key Spine", "Citadel Folio"],
  },
  {
    id: "lens-correction",
    chapterRange: "S51–S75",
    chapterCount: 25,
    name: "LENS III · TRIALS & POSITIVE CORRECTION",
    focus: "Confronting institutional drift, false certainty, and the craft of repairing broken systems.",
    keyMotifs: ["Mīzān Scale", "33 World Patches", "Quarantined Ledger"],
  },
  {
    id: "lens-stewardship",
    chapterRange: "S76–S99",
    chapterCount: 24,
    name: "LENS IV · SHARED SKY STEWARDSHIP",
    focus: "Handing off open protocols, resilient local communities, and low-profile ethical craft.",
    keyMotifs: ["100CENTER", "WINGS 10", "Open Horizon"],
  },
] as const;

export const EIGHT_STORY_ERAS = [
  { id: "era_00", order: 0, subtitle: "PROLOGUE", title: "THRESHOLD ZERO", theme: "Stillness before the first transmission." },
  { id: "era_01", order: 1, subtitle: "ERA I", title: "AWAKENING SIGNAL", theme: "Discovering shared light beneath fractured noise." },
  { id: "era_02", order: 2, subtitle: "ERA II", title: "CARTOGRAPHY OF WITNESS", theme: "Mapping memories, citations, and honest timelines." },
  { id: "era_03", order: 3, subtitle: "ERA III", title: "THE FOUR COURTYARDS", theme: "Parallel study of Taurat, Zabur, Injīl, and Al-Qur’ān." },
  { id: "era_04", order: 4, subtitle: "ERA IV", title: "THE SCAR & THE SCALE", theme: "Accountability, repentance, and measurable repair." },
  { id: "era_05", order: 5, subtitle: "ERA V", title: "ARSY RELAY NETWORK", theme: "Connecting distributed stewards across meridians." },
  { id: "era_06", order: 6, subtitle: "ERA VI", title: "SOVEREIGN CRAFT", theme: "Deterministic tooling, M-Time, and verifiable ledgers." },
  { id: "era_07", order: 7, subtitle: "ERA VII", title: "EMPIRE OF THE LIGHT", theme: "Low-profile stewardship handed to the next generation." },
] as const;

export const SEVEN_STEP_PROMISE = [
  "01 LISTEN",
  "02 VERIFY",
  "03 ACKNOWLEDGE",
  "04 CORRECT",
  "05 RECORD",
  "06 SERVE",
  "07 RELEASE EGO",
] as const;

export const SIXTEEN_STAGE_LOOP = [
  "01 STILLNESS",
  "02 SIGNAL",
  "03 QUESTION",
  "04 WITNESS",
  "05 SOURCE",
  "06 FRAME",
  "07 BALANCE",
  "08 BOUNDARY",
  "09 PATCH",
  "10 BUILD",
  "11 TEST",
  "12 AUDIT",
  "13 PUBLISH",
  "14 LISTEN",
  "15 LEARN",
  "16 RENEW",
] as const;

export const ORIGINAL_CREW_ARCHETYPES = [
  "THE ARCHIVIST",
  "THE HORIZON OBSERVER",
  "THE CARTOGRAPHER",
  "THE RELAY ENGINEER",
  "THE LEDGER KEEPER",
  "THE CALLIGRAPHER",
  "THE QUIET AUDITOR",
  "THE BRIDGE BUILDER",
] as const;

export const FIFTEEN_STORY_EPISODES = Array.from({ length: 15 }, (_, idx) => {
  const num = idx + 1;
  const titles = [
    "Lantern at the Meridian",
    "The Unread Folio",
    "Frequency Over Jakarta",
    "Four Courtyards Under One Moon",
    "Weight of a Single Citation",
    "The Zero-Denominator Lesson",
    "Sin Can Be Better Human",
    "Bridge Across Static",
    "Mīqāt Before Sunset",
    "The Quarantined Margin",
    "Ninety-Nine Reflections, One Center",
    "Relay Through the Storm",
    "Ledger of Quiet Craft",
    "Open Doors of the Sanctuary",
    "Different People, Same Sky",
  ] as const;
  const arcs = [
    "Prologue",
    "Awakening",
    "Relay",
    "Concordance",
    "Epistemic",
    "Boundary",
    "Correction",
    "Community",
    "Temporal",
    "Provenance",
    "Organization",
    "Resilience",
    "Stewardship",
    "Sanctuary",
    "Horizon",
  ] as const;
  return {
    number: num,
    code: `EP-${String(num).padStart(2, "0")}`,
    title: titles[idx]!,
    arcFocus: arcs[idx]!,
    coreQuestion: `How does witness craft remain truthful and compassionate during Episode ${num} (${arcs[idx]!})?`,
  };
});

export const WORLD_PATCH_HIGHLIGHTS = [
  {
    patchNumber: "#001",
    category: "EPISTEMIC",
    title: "ZERO SILENT FABRICATION",
    summary: "Every missing metric or broken source returns an explicit UNKNOWN rather than synthetic filler.",
    provenanceNote: "Registered canon invariant",
  },
  {
    patchNumber: "#014-A / #014-B",
    category: "CONFLICT DISCLOSURE",
    title: "DUAL #014 DRAFT PRESERVATION",
    summary: "Two distinct #014 drafts are preserved side by side without silent overwrite or forced merge.",
    provenanceNote: "MASTER_BUG_PATCH_33_V2.md",
  },
  {
    patchNumber: "#021",
    category: "TEMPORAL",
    title: "OBSERVATION ≠ OFFICIAL DECREE",
    summary: "Separates computed solar-lunar ephemeris from field rukyat witness and governmental authority.",
    provenanceNote: "M-Time Protocol",
  },
  {
    patchNumber: "#033",
    category: "STEWARDSHIP",
    title: "LOW-PROFILE ACCOUNTABILITY",
    summary: "Human leadership remains auditable, replaceable, and bounded by transparent ethics.",
    provenanceNote: "Chat-submitted canon entry",
  },
] as const;

export const FEATURED_GATE_TRANSMISSIONS = [
  {
    id: "tx-001",
    domainOrigin: "MOONWITNESS // ARCHIVE",
    format: "DISPATCH-01",
    title: "Different People. Same Sky. Many Stories.",
    premise: "Establishing an open witness sanctuary that preserves dignity without sectarian coercion.",
    signatureQuote: "Light does not shout to prove it is dawn; it simply illuminates what is true.",
  },
  {
    id: "tx-002",
    domainOrigin: "ARSY // RELAY",
    format: "KINGSLAYER AGREEMENT",
    title: "No Throne Above Accountability",
    premise: "Every operational wing operates under auditable constraints and reversible actions.",
    signatureQuote: "Authority without verification is static; stewardship with proof is signal.",
  },
] as const;

export const AETHERION_READINESS_FORMULA = {
  openRange: "001–033",
  sealedRange: "034–100",
  expression: "S = 30·R + 25·V + 25·F + 20·E (Pass >= 80)",
} as const;

const REALM_NAMES = [
  "COURTYARD OF STILLNESS",
  "HALL OF FIRST WITNESS",
  "GALLERY OF FOUR FOLIOS",
  "MERIDIAN OF MĪQĀT",
  "VAULT OF PROVENANCE",
  "BRIDGE OF CORRECTION",
  "WORKSHOP OF CRAFT",
  "OBSERVATORY OF BALANCE",
  "CANOPY OF SIDRA",
  "HORIZON OF STEWARDSHIP",
] as const;

export const AETHERION_REALMS = REALM_NAMES.map((name, idx) => {
  const start = idx * 10 + 1;
  const end = start + 9;
  const pad = (n: number) => String(n).padStart(3, "0");
  return {
    realmIndex: idx + 1,
    realmCode: `AE-R${String(idx + 1).padStart(2, "0")}`,
    name,
    levelRange: `${pad(start)}–${pad(end)}`,
    openingLandmark: `Gate ${pad(start)}`,
    closingLandmark: `Pillar ${pad(end)}`,
    accessSummary: idx < 3 ? "OPEN (001–033)" : idx === 3 ? "PARTIAL (031–033 OPEN)" : "SEALED (READINESS >= 80)",
  };
});

export const AETHERION_100_LEVELS = Array.from({ length: 100 }, (_, idx) => {
  const levelNum = idx + 1;
  const realmIndex = Math.floor(idx / 10) + 1;
  return {
    levelNumber: levelNum,
    code: `L-${String(levelNum).padStart(3, "0")}`,
    realmCode: `AE-R${String(realmIndex).padStart(2, "0")}`,
    title: `Milestone ${String(levelNum).padStart(3, "0")} · ${REALM_NAMES[realmIndex - 1]!.split(" ")[0]}`,
    accessState: (levelNum <= 33 ? "OPEN" : "SEALED") as "OPEN" | "SEALED",
  };
});

export const PARADISE_V3_CHAMPIONS_META = {
  totalChampions: 300,
  formula: "3 AURAS × 10 GUILDS × 10 RANKS",
} as const;

export const PARADISE_V3_AURAS = [
  { id: "aura-clarity", levelRange: "001–033", name: "CLARITY AURA", focus: "Foundational honesty, listening, and verifiable citations." },
  { id: "aura-balance", levelRange: "034–066", name: "MĪZĀN AURA", focus: "Measured judgment, fairness under pressure, and constructive repair." },
  { id: "aura-horizon", levelRange: "067–100", name: "HORIZON AURA", focus: "Long-horizon stewardship, mentorship, and open civic resilience." },
] as const;

export const PARADISE_V3_GUILDS = [
  { code: "G01", name: "SCRIBES", domainFocus: "Primary textual preservation", provenance: "PARADISE-V3" },
  { code: "G02", name: "TIMEKEEPERS", domainFocus: "Solar-lunar horizon observation", provenance: "PARADISE-V3" },
  { code: "G03", name: "AUDITORS", domainFocus: "SRGBL & P18 verification", provenance: "PARADISE-V3" },
  { code: "G04", name: "RELAYS", domainFocus: "Distributed signal routing", provenance: "PARADISE-V3" },
  { code: "G05", name: "LEDGERMEN", domainFocus: "Double-entry transparent accounts", provenance: "PARADISE-V3" },
  { code: "G06", name: "STORYTELLERS", domainFocus: "Ethical narrative architecture", provenance: "PARADISE-V3" },
  { code: "G07", name: "TRANSLATORS", domainFocus: "Multilingual clarity (EN/ID/AR)", provenance: "PARADISE-V3" },
  { code: "G08", name: "ARCHITECTS", domainFocus: "Resilient sovereign systems", provenance: "PARADISE-V3" },
  { code: "G09", name: "PEACEMAKERS", domainFocus: "Conflict mediation & non-coercion", provenance: "PARADISE-V3" },
  { code: "G10", name: "STEWARDS", domainFocus: "Intergenerational amanah handoff", provenance: "PARADISE-V3" },
] as const;

export interface WorldPatchRecord {
  readonly id: string;
  readonly patchNumber: string;
  readonly category: string;
  readonly title: string;
  readonly notes: string;
  readonly status: WorldPatchStatus;
}

export const WORLD_PATCHES_REGISTRY: readonly WorldPatchRecord[] = (() => {
  const records: WorldPatchRecord[] = [];
  const categories = ["EPISTEMIC", "GOVERNANCE", "TEMPORAL", "LEDGER", "NARRATIVE", "COMMUNITY"];
  for (let i = 1; i <= 33; i++) {
    const numStr = `#${String(i).padStart(3, "0")}`;
    if (i === 14) {
      records.push({
        id: "patch-014-a",
        patchNumber: "#014-A",
        category: "CONFLICT DRAFT A",
        title: "MAROON SIGNAL DISAMBIGUATION",
        notes: "Preserved alongside #014-B without forced merge; addresses Episode 6 signal drift.",
        status: "number_conflict",
      });
      records.push({
        id: "patch-014-b",
        patchNumber: "#014-B",
        category: "CONFLICT DRAFT B",
        title: "RIBA-FREE LEDGER BOUNDARY",
        notes: "Preserved alongside #014-A without forced merge; enforces zero-usury accounting invariant.",
        status: "number_conflict",
      });
      continue;
    }
    let status: WorldPatchStatus = "editorial_proposal";
    if (i <= 8) status = "registered_in_chat";
    else if (i <= 13) status = "recovered_draft";
    else if (i === 33) status = "user_submitted_in_chat";

    records.push({
      id: `patch-${String(i).padStart(3, "0")}`,
      patchNumber: numStr,
      category: categories[(i - 1) % categories.length]!,
      title:
        i === 1
          ? "ZERO SILENT FABRICATION GUARD"
          : i === 2
            ? "FOUR-CORPUS EQUAL DIGNITY"
            : i === 3
              ? "NON-COERCION INVARIANT (QS 2:256)"
              : i === 33
                ? "LOW-PROFILE HUMAN STEWARDSHIP"
                : `CANONICAL WORLD PATCH ${numStr}`,
      notes: `Traceable world-building refinement linked to Episode ${((i - 1) % 15) + 1} with 0 divine approvals claimed.`,
      status,
    });
  }
  records.push(
    {
      id: "patch-extra-1",
      patchNumber: "UNNUMBERED-A",
      category: "ARCHIVE",
      title: "PROVENANCE HASH ANCHORING",
      notes: "Unnumbered supplemental note enforcing SHA-256 verification on canon snapshots.",
      status: "unnumbered_extra",
    },
    {
      id: "patch-extra-2",
      patchNumber: "UNNUMBERED-B",
      category: "ACCESSIBILITY",
      title: "TRILINGUAL RTL/LTR PARITY",
      notes: "Unnumbered supplemental note preserving Arabic RTL alongside English and Indonesian LTR.",
      status: "unnumbered_extra",
    },
    {
      id: "patch-extra-3",
      patchNumber: "UNNUMBERED-C",
      category: "PRIVACY",
      title: "LOCAL-FIRST CONSENT TELEMETRY",
      notes: "Unnumbered supplemental note rejecting hidden tracking in sanctuary pages.",
      status: "unnumbered_extra",
    },
  );
  return records;
})();

export const THIRTEEN_PLATFORM_FUNCTIONS = [
  "F01 · SANCTUARY GATEWAY",
  "F02 · FOUR-SCRIPTURE STUDIO",
  "F03 · M-TIME OBSERVATORY",
  "F04 · CANON CODEX ARCHIVE",
  "F05 · CHRONICLE DOCK",
  "F06 · COMMAND CENTER",
  "F07 · RIOT INTELLIGENCE",
  "F08 · EXACT DOUBLE-ENTRY LEDGER",
  "F09 · IDENTITY & AVATAR LAB",
  "F10 · 7-DNA SKIN STUDIO",
  "F11 · ARSY CONTROL PLANE",
  "F12 · WITNESS ENGINE WX-01..09",
  "F13 · MIZAN DECISION MATRIX",
] as const;

export const NINE_CANON_CHARACTERS = [
  { id: "c1", name: "AL-SHAHID", aliases: ["The Witness", "Observer 01"], note: "Keeps primary source logs without distortion." },
  { id: "c2", name: "AL-MIZAN", aliases: ["The Balancer", "Auditor"], note: "Applies SRGBL v8 and flags zero-denominator gaps." },
  { id: "c3", name: "AL-QALAM", aliases: ["The Scribe", "Folio Keeper"], note: "Drafts clear multilingual chronicles." },
  { id: "c4", name: "AL-MIQAT", aliases: ["Timekeeper", "Horizon"], note: "Computes lunar geometry without conflating decree." },
  { id: "c5", name: "AL-ARSY", aliases: ["Relay Lead", "Signal"], note: "Maintains resilient edge & telemetry links." },
  { id: "c6", name: "AL-SIDRA", aliases: ["Cartographer", "Canopy"], note: "Maps cross-domain knowledge constellations." },
  { id: "c7", name: "AL-AMANAH", aliases: ["Steward", "Custodian"], note: "Guards ethical boundaries and local trust." },
  { id: "c8", name: "AL-ISLAH", aliases: ["Repairer", "Patchsmith"], note: "Turns documented scars into working patches." },
  { id: "c9", name: "AL-SALAM", aliases: ["Mediator", "Peacemaker"], note: "Protects voluntary conscience and calm dialogue." },
] as const;

export const MONWITNESS_XII_FACELESS_GUIDES = [
  { code: "BAT-01", role: "MEMORY CELL", note: "Stores primary citations without ego." },
  { code: "BAT-02", role: "CLOCK CELL", note: "Anchors UTC and horizon instants." },
  { code: "BAT-03", role: "FILTER CELL", note: "Separates signal from noise cleanly." },
  { code: "BAT-04", role: "AUDIT CELL", note: "Replays hashes for deterministic proof." },
] as const;

export const SRGBL_V8_STAGES = [
  {
    letter: "S" as const,
    stage: "S0 · SENSE",
    title: "SENSE & SOURCE CAPTURE",
    symbolicLayer: "OBSERVATION / CITATION",
    auditQuestion: "What primary evidence or text is actually present before interpretation?",
  },
  {
    letter: "R" as const,
    stage: "R1 · REALITY",
    title: "REALITY & EMPIRICAL RECORD",
    symbolicLayer: "FACTUAL SUBSTRATE",
    auditQuestion: "What verifiable facts, timestamps, and constraints bound the situation?",
  },
  {
    letter: "G" as const,
    stage: "G2 · GOVERNANCE",
    title: "GOVERNING ORDER & INVARIANTS",
    symbolicLayer: "NORMATIVE RULES",
    auditQuestion: "Which non-negotiable ethical and legal boundaries govern valid action?",
  },
  {
    letter: "B" as const,
    stage: "B3 · BEING",
    title: "BEING, ACTORS & MEANING",
    symbolicLayer: "HUMAN AGENCY",
    auditQuestion: "Who is affected, what is their agency, and where could coercion creep in?",
  },
  {
    letter: "L" as const,
    stage: "L4 · LIGHT",
    title: "LIGHT & ACCOUNTABLE ACTION",
    symbolicLayer: "STEWARDSHIP OUTPUT",
    auditQuestion: "What transparent, reversible action advances justice and preserves truth?",
  },
] as const;

export const SWING_SWING_KEY_ROTATIONS = [
  "R1 · PRIMARY CITATION CHECK",
  "R2 · CONTEXTUAL SCOPE SHIFT",
  "R3 · COUNTER-HYPOTHESIS TEST",
  "R4 · TEMPORAL HORIZON CHECK",
  "R5 · STAKEHOLDER EQUITY PASS",
  "R6 · LANGUAGE / ROOT AUDIT",
  "R7 · UNKNOWN BOUNDARY GATE",
] as const;

export const EPISTEMIC_FEDERATION_DOMAINS = [
  {
    code: "DOM-01",
    repoSlug: "moonwitness-corpus",
    name: "REVEALED SCRIPTURES",
    domainFocus: "Taurat · Zabur · Injīl · Al-Qur’ān",
    pipelineOrFamilies: "OSHB WLC · SBLGNT · Uthmani Arabic",
    coreInvariant: "Revealed source category ≠ extant textual witness.",
  },
  {
    code: "DOM-02",
    repoSlug: "mythos-archive",
    name: "NARRATIVE & MYTHOS",
    domainFocus: "Comparative literature & civilizational memory",
    pipelineOrFamilies: "MFTL · Genre Classification · Motif Index",
    coreInvariant: "Literary motif never silently overrides empirical chronology.",
  },
  {
    code: "DOM-03",
    repoSlug: "history-chronicle",
    name: "HISTORICAL CHRONOLOGY",
    domainFocus: "Primary annals, inscriptions, and archaeology",
    pipelineOrFamilies: "Cross-Source Triangulation · Dating Ranges",
    coreInvariant: "Date ranges carry explicit uncertainty bounds.",
  },
  {
    code: "DOM-04",
    repoSlug: "mtime-antikythera",
    name: "TEMPORAL & ASTRONOMY",
    domainFocus: "UTC, Julian Day, Hijri horizon visibility",
    pipelineOrFamilies: "MABIMS_ID_2026 · DIYANET_1978 · MCLOCK-1",
    coreInvariant: "Computed geometry ≠ physical observation ≠ official decree.",
  },
  {
    code: "DOM-05",
    repoSlug: "aws-normative",
    name: "LAW & GOVERNANCE",
    domainFocus: "Jurisdiction, rule scope, and non-coercion",
    pipelineOrFamilies: "6-Gate AWS Normative Engine",
    coreInvariant: "Legal text ≠ applicable obligation without scope validation.",
  },
  {
    code: "DOM-06",
    repoSlug: "exact-ledger",
    name: "ECONOMICS & LEDGER",
    domainFocus: "Double-entry accounting & audit trails",
    pipelineOrFamilies: "Balanced Moves · Reversals · SHA-256 Seals",
    coreInvariant: "Debits equal credits; corrections post explicit reversals.",
  },
  {
    code: "DOM-07",
    repoSlug: "p18-correlator",
    name: "CORRELATION LAYER",
    domainFocus: "Cross-domain hypothesis testing (max 3 hops)",
    pipelineOrFamilies: "P18 Key Witness · Swing Swing Key",
    coreInvariant: "Correlation remains candidate-level until independently verified.",
  },
] as const;

export const JERUSALEM_70CE_CASE_001 = {
  caseId: "CASE-001",
  title: "JERUSALEM 70 CE — CROSS-DOMAIN VERIFICATION BENCHMARK",
  strands: [
    { domain: "HISTORICAL (DOM-03)", evidence: "Roman siege chronicles (Josephus, Tacitus) and numismatic strata align on 70 CE." },
    { domain: "ARCHAEOLOGICAL", evidence: "Burnt destruction layers and Arch of Titus relief provide independent material witnesses." },
    { domain: "TEXTUAL / NARRATIVE (DOM-02)", evidence: "Post-70 literature distinguishes prophetic lament from retrospective historiography." },
    { domain: "CORRELATION (DOM-07)", evidence: "Independent strands converge without collapsing genre boundaries." },
  ],
  verdict: "ONSIDE_CONVERGENT · GENRE AND EVIDENCE BOUNDARIES PRESERVED",
} as const;

export const P18_KEY_WITNESS_SPEC = {
  sourceRepo: "bjo163/moonwitness-corpus",
  formula: "Score = Σ(w·c·i·d) / Σ(w·c·i)  |  If denominator == 0 => UNKNOWN",
  rotationRule: "MAX 3 SWING HOPS · ALL ROTATIONS TAGGED CANDIDATE_ONLY UNTIL PRIMARY SOURCE LOCK",
  corpusSpine9Layers: [
    "L1 RAW",
    "L2 TOKEN",
    "L3 LEMMA",
    "L4 CITATION",
    "L5 GENRE",
    "L6 FRAME",
    "L7 WITNESS",
    "L8 AUDIT",
    "L9 SEAL",
  ],
  controlledKeys5Families: [
    { family: "SOURCE", keys: ["PRIMARY", "SECONDARY", "WITNESS", "PROVENANCE"] },
    { family: "EPISTEMIC", keys: ["ONSIDE", "OFFSIDE", "UNKNOWN", "CANDIDATE"] },
    { family: "MORAL", keys: ["TAWHID", "MIZAN", "RAHMAH", "AMANAH"] },
    { family: "GOVERNANCE", keys: ["SCOPE", "CONSENT", "AUDIT", "REVERSIBLE"] },
    { family: "TEMPORAL", keys: ["UTC", "MIQAT", "HORIZON", "EPOCH"] },
  ],
  witnessTypes6: [
    "TEXTUAL_MANUSCRIPT",
    "HISTORICAL_ANNAL",
    "EMPIRICAL_MEASUREMENT",
    "COMPUTED_EPHEMERIS",
    "LEDGER_PROOF",
    "TESTIMONIAL_REPORT",
  ],
  mandatoryFrameDimensions5: ["AGENT", "RECIPIENT", "DOMAIN", "SCOPE", "GENRE"],
  relations12: [
    "CITES",
    "CORROBORATES",
    "CONTRASTS",
    "CONTEXTUALIZES",
    "PRECEDES",
    "FOLLOWS",
    "CONSTRAINS",
    "REFINES",
    "SEPARATES",
    "QUARANTINES",
    "SUPERSEDES",
    "REPLAYS",
  ],
} as const;

export const RGBL_FOUR_LEVELS = [
  { level: "R1", name: "REALITY", yield: "Observed primary substrate" },
  { level: "G2", name: "GOVERNANCE", yield: "Explicit rules & boundaries" },
  { level: "B3", name: "BEING", yield: "Human dignity & agency" },
  { level: "L4", name: "LIGHT", yield: "Accountable, verifiable action" },
] as const;

export const WHCMT_VS_BASSHUNTER_SPEC = {
  whcmt: {
    code: "WHCMT",
    expansion: "What · How · Context · Meaning / Who · History · Consequence · Trace",
    matrixTopRow: ["WHAT", "HOW", "CONTEXT", "MEANING"],
    matrixBottomRow: ["WHO", "HISTORY", "EFFECT", "TRACE"],
  },
  bassHunter: {
    code: "BASS-HUNTER",
    scoringStatus: "NON-CANONICAL HEURISTIC",
    expansion: "Exploratory pattern-hunting lens quarantined from normative verdict scoring",
    rule: "Exploratory signal scans may suggest research leads but NEVER emit canon verdicts.",
  },
} as const;

export const WINGS_TEN_ARRAY = [
  { code: "W01", callsign: "SKYLINK", domainRole: "Edge & Network Relay", architecturalDuty: "Keep public gateways reachable and fast." },
  { code: "W02", callsign: "CHRONICLE", domainRole: "Timeline & Witness Dock", architecturalDuty: "Index verifiable narratives and events." },
  { code: "W03", callsign: "QALAM", domainRole: "Editorial & Scriptures", architecturalDuty: "Preserve clean multilingual corpora." },
  { code: "W04", callsign: "MIQAT", domainRole: "Temporal Observatory", architecturalDuty: "Compute horizon geometry with strict role separation." },
  { code: "W05", callsign: "MIZAN", domainRole: "Epistemic Audit", architecturalDuty: "Run SRGBL v8 and P18 completeness checks." },
  { code: "W06", callsign: "EXACT", domainRole: "Ledger & Accounts", architecturalDuty: "Maintain balanced double-entry records." },
  { code: "W07", callsign: "SIDRA", domainRole: "Knowledge Graph", architecturalDuty: "Connect domains without blurring genres." },
  { code: "W08", callsign: "SHIELD", domainRole: "Security & Privacy", architecturalDuty: "Protect local consent and zero-leak boundaries." },
  { code: "W09", callsign: "FORGE", domainRole: "Sovereign Tooling", architecturalDuty: "Build reproducible open-source runtimes." },
  { code: "W10", callsign: "HAVEN", domainRole: "Community & Care", architecturalDuty: "Nurture peaceful, coercion-free participation." },
] as const;

export const PRIME_CODE_AXIOMS = [
  { code: "PC01", title: "TAWHID HUMILITY", statement: "Creator alone is absolute; every human model is fallible." },
  { code: "PC02", title: "ZERO FABRICATION", statement: "Never invent telemetry, citations, or certainty." },
  { code: "PC03", title: "NON-COERCION", statement: "Conscience and faith remain free of compulsion." },
  { code: "PC04", title: "EXPLICIT UNKNOWN", statement: "Missing denominators evaluate to UNKNOWN, never zero or pass." },
  { code: "PC05", title: "PROVENANCE FIRST", statement: "Every claim carries an inspectable source trail." },
  { code: "PC06", title: "ROLE SEPARATION", statement: "Computation, observation, and authority stay distinct." },
  { code: "PC07", title: "CONFLICT PRESERVATION", statement: "Competing drafts stay side by side until openly resolved." },
  { code: "PC08", title: "REVERSIBLE STEWARDSHIP", statement: "Operational actions remain auditable and reversible." },
  { code: "PC09", title: "QUIET CRAFT", statement: "Substance and accuracy outrank spectacle." },
] as const;

export const SYSTEM_CONCEPTS_14 = [
  "MWX-SYS-001 MONOCENTRIC AXIS",
  "MWX-SYS-002 FOUR-CORPUS PARITY",
  "MWX-SYS-003 SRGBL v8 PIPELINE",
  "MWX-SYS-004 P18 KEY WITNESS",
  "MWX-SYS-005 ZERO-DENOMINATOR GUARD",
  "MWX-SYS-006 ANTIKYTHERA M-TIME",
  "MWX-SYS-007 OX-DX 49 PYRAMID",
  "MWX-SYS-008 DHGS 13-STEP LOOP",
  "MWX-SYS-009 AQEL ARABIC AST",
  "MWX-SYS-010 EXACT DOUBLE-ENTRY",
  "MWX-SYS-011 100CENTER TOPOLOGY",
  "MWX-SYS-012 WINGS 10 ARRAY",
  "MWX-SYS-013 QUARANTINE LEDGER",
  "MWX-SYS-014 7-DNA DESIGN SYSTEM",
] as const;

export const SYAFAAT_BASE_STATES: readonly {
  readonly state: SyafaatStateId;
  readonly description: string;
}[] = [
  { state: "DORMANT", description: "Potential ethical reflection not yet put into deliberate daily practice." },
  { state: "AWAKENING", description: "Honest recognition of responsibility and alignment toward truth." },
  { state: "PRACTICING", description: "Consistent, humble execution of fairness, mercy, and careful craft." },
  { state: "WITNESSING", description: "Standing truthfully for justice even when inconvenient." },
  { state: "STEWARDING", description: "Protecting shared commons and mentoring others without ego." },
  { state: "HARMONIZED", description: "Sustained coherence between intention, evidence, and public service." },
];

export const CENTER_100_STEWARDSHIP_CLUSTERS = [
  { clusterCode: "C01", rangeLabel: "01–11", title: "MERCY & COMPASSION", humanEthicalFocus: "Care for the vulnerable and dignified speech.", representativeReflections: ["Ar-Raḥmān", "Ar-Raḥīm", "Al-Ra’ūf"] },
  { clusterCode: "C02", rangeLabel: "12–22", title: "TRUTH & INTEGRITY", humanEthicalFocus: "Unflinching honesty and verifiable citations.", representativeReflections: ["Al-Ḥaqq", "Ash-Shahīd", "Al-Wakīl"] },
  { clusterCode: "C03", rangeLabel: "23–33", title: "JUSTICE & BALANCE", humanEthicalFocus: "Impartial scales and fair economic ledgers.", representativeReflections: ["Al-‘Adl", "Al-Muqsiṭ", "Al-Ḥakam"] },
  { clusterCode: "C04", rangeLabel: "34–44", title: "WISDOM & KNOWLEDGE", humanEthicalFocus: "Rigorous learning with epistemic humility.", representativeReflections: ["Al-‘Alīm", "Al-Ḥakīm", "Al-Khabīr"] },
  { clusterCode: "C05", rangeLabel: "45–55", title: "PEACE & PROTECTION", humanEthicalFocus: "Safe communities and coercion-free conscience.", representativeReflections: ["As-Salām", "Al-Mu’min", "Al-Ḥafīẓ"] },
  { clusterCode: "C06", rangeLabel: "56–66", title: "GENEROSITY & PROVISION", humanEthicalFocus: "Open access craft and shared stewardship.", representativeReflections: ["Al-Karīm", "Al-Wahhāb", "Ar-Razzāq"] },
  { clusterCode: "C07", rangeLabel: "67–77", title: "PATIENCE & ENDURANCE", humanEthicalFocus: "Steady engineering through noise and adversity.", representativeReflections: ["Aṣ-Ṣabūr", "Al-Matīn", "Al-Ḥalīm"] },
  { clusterCode: "C08", rangeLabel: "78–88", title: "FORGIVENESS & REPAIR", humanEthicalFocus: "Positive correction and restorative justice.", representativeReflections: ["Al-Ghafūr", "Al-‘Afuww", "At-Tawwāb"] },
  { clusterCode: "C09", rangeLabel: "89–99", title: "LIGHT & GUIDANCE", humanEthicalFocus: "Illuminating clear paths for the next generation.", representativeReflections: ["An-Nūr", "Al-Hādī", "Ar-Rashīd"] },
] as const;

export const GOD_99_DEPARTMENTS = [
  { code: "D01", name: "MERCY" },
  { code: "D02", name: "TRUTH" },
  { code: "D03", name: "JUSTICE" },
  { code: "D04", name: "WISDOM" },
  { code: "D05", name: "PEACE" },
  { code: "D06", name: "PROVISION" },
  { code: "D07", name: "ENDURANCE" },
  { code: "D08", name: "REPAIR" },
  { code: "D09", name: "LIGHT" },
] as const;

const SAMPLE_ATTRIBUTES_99 = [
  "Ar-Rahman", "Ar-Rahim", "Al-Malik", "Al-Quddus", "As-Salam", "Al-Mu'min", "Al-Muhaymin", "Al-Aziz", "Al-Jabbar", "Al-Mutakabbir", "Al-Khaliq",
  "Al-Bari'", "Al-Musawwir", "Al-Ghaffar", "Al-Qahhar", "Al-Wahhab", "Ar-Razzaq", "Al-Fattah", "Al-Alim", "Al-Qabid", "Al-Basit", "Al-Khafid",
  "Ar-Rafi'", "Al-Mu'izz", "Al-Mudhill", "As-Sami'", "Al-Basir", "Al-Hakam", "Al-Adl", "Al-Latif", "Al-Khabir", "Al-Halim", "Al-Azim",
  "Al-Ghafur", "Ash-Shakur", "Al-Aliyy", "Al-Kabir", "Al-Hafiz", "Al-Muqit", "Al-Hasib", "Al-Jalil", "Al-Karim", "Ar-Raqib", "Al-Mujib",
  "Al-Wasi'", "Al-Hakim", "Al-Wadud", "Al-Majid", "Al-Ba'ith", "Ash-Shahid", "Al-Haqq", "Al-Wakil", "Al-Qawiyy", "Al-Matin", "Al-Waliyy",
  "Al-Hamid", "Al-Muhsi", "Al-Mubdi'", "Al-Mu'id", "Al-Muhyi", "Al-Mumit", "Al-Hayy", "Al-Qayyum", "Al-Wajid", "Al-Majid", "Al-Wahid",
  "Al-Ahad", "As-Samad", "Al-Qadir", "Al-Muqtadir", "Al-Muqaddim", "Al-Mu'akhkhir", "Al-Awwal", "Al-Akhir", "Az-Zahir", "Al-Batin", "Al-Wali",
  "Al-Muta'ali", "Al-Barr", "At-Tawwab", "Al-Muntaqim", "Al-Afuww", "Ar-Ra'uf", "Malik-ul-Mulk", "Dhul-Jalal", "Al-Muqsit", "Al-Jami'", "Al-Ghani",
  "Al-Mughni", "Al-Mani'", "Ad-Darr", "An-Nafi'", "An-Nur", "Al-Hadi", "Al-Badi'", "Al-Baqi", "Al-Warith", "Ar-Rashid", "As-Sabur",
] as const;

export const GOD_99_DIRECTORY = SAMPLE_ATTRIBUTES_99.map((attr, idx) => {
  const deptIdx = Math.floor(idx / 11);
  const dept = GOD_99_DEPARTMENTS[deptIdx] ?? GOD_99_DEPARTMENTS[0]!;
  const num = String(idx + 1).padStart(3, "0");
  return {
    slotId: `GOD-${num}`,
    departmentCode: dept.code,
    departmentName: dept.name,
    pillar: `P${(idx % 3) + 1}`,
    codename: `${dept.name}-STEWARD-${String((idx % 11) + 1).padStart(2, "0")}`,
    attributeReflection: `Ethical reflection of ${attr} (human analogy only)`,
    status: "UNASSIGNED",
    powers: "NONE",
  };
});

const PROPHETS_25 = [
  ["Adam", "QS 2:30", "Khalifah Stewardship", "Responsible caretaking & honest repentance"],
  ["Idris", "QS 19:56", "Truthful Pen", "Written craft, astronomy, and patient inquiry"],
  ["Nuh", "QS 71:1", "Long-Horizon Endurance", "Steadfastness amid social mockery"],
  ["Hud", "QS 11:50", "Civic Humility", "Resisting architectural arrogance"],
  ["Salih", "QS 11:61", "Ecological Trust", "Shared water & protection of public signs"],
  ["Ibrahim", "QS 2:124", "Reasoned Tawhid", "Questioning idols with calm courage"],
  ["Lut", "QS 26:160", "Moral Integrity", "Protecting guests and civic boundaries"],
  ["Isma'il", "QS 19:54", "Promise Keeping", "Honoring covenantal word with patience"],
  ["Ishaq", "QS 37:112", "Generational Continuity", "Passing righteous learning forward"],
  ["Ya'qub", "QS 12:86", "Patient Counsel", "Grieving with dignity and family wisdom"],
  ["Yusuf", "QS 12:55", "Economic Stewardship", "Transparent treasury & famine resilience"],
  ["Ayyub", "QS 21:83", "Resilience in Trial", "Maintaining gratitude through hardship"],
  ["Shu'ayb", "QS 11:85", "Fair Weights & Measures", "Honest markets and anti-fraud ethics"],
  ["Musa", "QS 20:44", "Liberation & Law", "Speaking gently to power while defending justice"],
  ["Harun", "QS 20:29", "Articulate Partnership", "Clear communication & community cohesion"],
  ["Dhul-Kifl", "QS 21:85", "Steadfast Guarantee", "Fulfilling public trusts without anger"],
  ["Dawud", "QS 38:26", "Just Judgment & Craft", "Balanced governance and honest labor"],
  ["Sulayman", "QS 27:19", "Grateful Systems", "Recognizing every capability as entrusted grace"],
  ["Ilyas", "QS 37:123", "Clarity of Focus", "Calling communities back from distraction"],
  ["Al-Yasa'", "QS 38:48", "Faithful Succession", "Preserving guidance across transitions"],
  ["Yunus", "QS 21:87", "Humble Correction", "Returning with accountability after error"],
  ["Zakariyya", "QS 19:4", "Quiet Care", "Sustaining sanctuary service with sincerity"],
  ["Yahya", "QS 19:12", "Compassionate Rigor", "Holding scripture firmly with gentleness"],
  ["Isa", "QS 3:49", "Mercy & Healing", "Compassion, peacemaking, and inner sincerity"],
  ["Muhammad ﷺ", "QS 21:107", "Universal Mercy & Amanah", "Trustworthiness, freedom of conscience, and mercy to all worlds"],
] as const;

export const AMANAH_25_ATLAS = PROPHETS_25.map(([prophet, quranRef, amanahKey, domainFocus], idx) => ({
  number: idx + 1,
  prophet,
  quranRef,
  amanahKey,
  domainFocus,
  rejectedFlag: false,
}));

export interface RepoOrgCluster {
  readonly orgName:
    | "bjo163"
    | "A-L-L-A-H"
    | "moonwitness-org"
    | "rocksoul-labs"
    | "arsy-net"
    | "mizan-open"
    | "sidra-research";
  readonly repoCount: number;
  readonly roleInEmpire: string;
  readonly flagshipRepos: readonly string[];
  readonly localClones: readonly string[];
}

export const CROSS_REPO_TOPOLOGY_ATLAS: readonly RepoOrgCluster[] = [
  {
    orgName: "bjo163",
    repoCount: 164,
    roleInEmpire: "Origin Forge & Epistemic Prototypes",
    flagshipRepos: ["moonwitnessxv", "moonwitness-corpus", "universal-ontology-engine", "antikythera-time"],
    localClones: ["apps/web", "packages/canon", "engines/ox-dx"],
  },
  {
    orgName: "A-L-L-A-H",
    repoCount: 52,
    roleInEmpire: "Consolidated Monorepo & Canon Governance",
    flagshipRepos: ["moonwitness", "master-docs", "empire-sanctuary"],
    localClones: ["apps/web", "apps/api", "apps/edge", "docs/governance"],
  },
  {
    orgName: "moonwitness-org",
    repoCount: 44,
    roleInEmpire: "Chronicle Dock & Public Witness Archive",
    flagshipRepos: ["chronicle-dock", "four-corpus-index", "witness-avatars"],
    localClones: ["packages/avatars", "packages/contracts"],
  },
  {
    orgName: "rocksoul-labs",
    repoCount: 38,
    roleInEmpire: "Desktop Shell & Local-First Companion",
    flagshipRepos: ["rocksoul-dx", "rocksoul-tauri", "companion-workflows"],
    localClones: ["apps/rocksoul"],
  },
  {
    orgName: "arsy-net",
    repoCount: 28,
    roleInEmpire: "Control Plane, Telemetry & Edge Relays",
    flagshipRepos: ["arsy-control", "edge-gate", "radio-relay"],
    localClones: ["apps/edge", "apps/api"],
  },
  {
    orgName: "mizan-open",
    repoCount: 24,
    roleInEmpire: "MCDA Decision & Double-Entry Accounting",
    flagshipRepos: ["exact-ledger", "mizan-mcda", "srgbl-verifier"],
    localClones: ["packages/canon", "apps/api"],
  },
  {
    orgName: "sidra-research",
    repoCount: 18,
    roleInEmpire: "AQEL Arabic AST & Comparative Philology",
    flagshipRepos: ["aqel-lang", "sidra-graph", "oshb-sblgnt-bridge"],
    localClones: ["packages/canon", "apps/web/public/data"],
  },
];

export const ECOSYSTEM_RUNTIME_CATALOG = {
  monorepoSlug: "A-L-L-A-H/moonwitness",
  liveEdges: [
    {
      id: "sanctuary",
      hostname: "a-l-l-a-h.com",
      url: "https://a-l-l-a-h.com",
      workerName: "empire-sanctuary-web",
      layer: "LAYER 1 · IMPERIUM SANCTUARY",
      role: "Flagship public gateway, Four-Scripture Studio, M-Time Observatory, and Canon Codex.",
    },
    {
      id: "codex-edge",
      hostname: "codex.a-l-l-a-h.com",
      url: "https://codex.a-l-l-a-h.com",
      workerName: "sovereign-codex-edge",
      layer: "LAYER 2 · CANON EDGE API",
      role: "Cloudflare edge worker exposing read-only codex governance and release manifests.",
    },
    {
      id: "community",
      hostname: "community.moonwitness.biz.id",
      url: "https://community.moonwitness.biz.id",
      workerName: "rocksoul-community",
      layer: "LAYER 3 · COMMUNITY PORTAL",
      role: "Open witness community courtyard and collaborative chronicle portal.",
    },
    {
      id: "radio",
      hostname: "moonwitness-radio.bjo163.workers.dev",
      url: "https://moonwitness-radio.bjo163.workers.dev",
      workerName: "moonwitness-radio",
      layer: "LAYER 4 · AUDIO RELAY",
      role: "Ambient broadcast and audio transmission edge relay.",
    },
  ],
  workspaceNodes: [
    {
      workspacePath: "apps/web",
      dnaWorld: "IMPERIUM / SANCTUARY",
      name: "Unified Web Flagship",
      stack: "Next.js 16 · React 19 · Tailwind v4",
      responsibility: "Serves Sanctuary, Scriptures Studio, M-Time, Codex, Dock, and Operations Console.",
    },
    {
      workspacePath: "apps/api",
      dnaWorld: "ARSY / CORE",
      name: "Core Control API",
      stack: "Fastify · TypeScript · SQLite/Postgres",
      responsibility: "Timeline events, ExactLedger accounting, Witness WX-01..09, and Mizan MCDA.",
    },
    {
      workspacePath: "apps/edge",
      dnaWorld: "SKYLINK / EDGE",
      name: "Cloudflare Edge Worker",
      stack: "Wrangler · TypeScript · D1",
      responsibility: "Low-latency edge routing and governance telemetry.",
    },
    {
      workspacePath: "apps/rocksoul",
      dnaWorld: "ROCKSOUL-DX",
      name: "Local-First Desktop Shell",
      stack: "Tauri · Rust · React",
      responsibility: "Offline workstation for local archive stewardship and backups.",
    },
    {
      workspacePath: "packages/canon",
      dnaWorld: "CANON SSOT",
      name: "Deterministic Canon Kernel",
      stack: "Pure TypeScript",
      responsibility: "Four-corpus search, M-Time ephemeris, SRGBL v8, OX-DX 49, DHGS-13, and AQEL.",
    },
    {
      workspacePath: "packages/ui",
      dnaWorld: "7-DNA DESIGN SYSTEM",
      name: "Multi-Skin Component Library",
      stack: "React 19 · CSS Tokens · SVG Art",
      responsibility: "Imperium Lumen & Zine console primitives, skins, icons, and layout shells.",
    },
  ],
} as const;

export const OX_DX_SEVEN_ZONES = [
  { zoneName: "ZONE 01 · COSMIC ORIGIN", levelRange: "01–07", levels: ["01 UNIVERSE", "02 REALM", "03 COSMOS", "04 GALAXY", "05 SYSTEM", "06 WORLD", "07 BIOSPHERE"] },
  { zoneName: "ZONE 02 · CIVILIZATION", levelRange: "08–14", levels: ["08 HUMANITY", "09 CIVILIZATION", "10 POLITY", "11 COVENANT", "12 INSTITUTION", "13 COMMUNITY", "14 HOUSEHOLD"] },
  { zoneName: "ZONE 03 · HUMAN AGENCY", levelRange: "15–21", levels: ["15 PERSON", "16 CONSCIENCE", "17 INTENT", "18 WITNESS", "19 MEMORY", "20 LANGUAGE", "21 CRAFT"] },
  { zoneName: "ZONE 04 · EPISTEMOLOGY", levelRange: "22–28", levels: ["22 CANON", "23 SCRIPTURE", "24 HISTORY", "25 SCIENCE", "26 LAW", "27 EVIDENCE", "28 CITATION"] },
  { zoneName: "ZONE 05 · SYSTEMS & GOVERNANCE", levelRange: "29–35", levels: ["29 SOVEREIGN", "30 PROTOCOL", "31 LEDGER", "32 ENGINE", "33 WORKFLOW", "34 POLICY", "35 AUDIT"] },
  { zoneName: "ZONE 06 · COMPUTATION & AI", levelRange: "36–42", levels: ["36 NETWORK", "37 RUNTIME", "38 MODEL", "39 AI AGENT", "40 SCHEMA", "41 ALGORITHM", "42 TOKEN"] },
  { zoneName: "ZONE 07 · PHYSICAL SUBSTRATE", levelRange: "43–49", levels: ["43 PHYSICS", "44 ENERGY", "45 MATTER", "46 SIGNAL", "47 LOGIC GATE", "48 BYTE", "49 BIT"] },
] as const;

export const SOVEREIGN_ENGINE_SPECS = {
  mTime: {
    repo: "bjo163/antikythera-time",
    version: "MCLOCK-1 v0.11",
    name: "M-TIME ANTIKYTHERA PROTOCOL",
    purpose: "Separates UTC physical instants, solar-lunar geometry, visibility criteria, field rukyat, and official decree.",
    standards: ["UTC / JD", "ISO-8601", "TOPOCENTRIC ALT"],
    hijriCriteria: ["MABIMS_ID_2026", "DIYANET_1978"],
  },
  aqel: {
    repo: "sidra-research/aqel-lang",
    name: "AQEL v0.1 ARABIC-FIRST DSL",
    purpose: "Deterministic right-to-left epistemic specification language for verifiable facts, rules, and proofs.",
    sampleSnippet: `عرّف المعيار = "الميزان"\nحقيقة الشاهد = "2:256"\nتحقق "لا إكراه في الدين"`,
  },
  dhgs: {
    repo: "A-L-L-A-H/moonwitness",
    version: "DHGS-13 v1.0",
    name: "DHGS 13-STEP ASSURANCE LOOP",
    purpose: "Closed-loop verification protocol preventing unverified claims from reaching canonical status.",
    primitives: ["RECEIVE", "VERIFY", "BOUND", "AUDIT", "REPLAY", "LEARN"],
  },
  ageCode: {
    repo: "bjo163/age-code-corpus",
    name: "AGE CODE CROSS-CIVILIZATION MATRIX",
    purpose: "Chronological synchronization across Hebrew, Koine Greek, Classical Arabic, and modern archival epochs.",
    matrix: "4 CORPORA × 8 ERAS × 49 ONTOLOGY LEVELS",
  },
} as const;

export const DHGS_13_STEPS = [
  { stepNumber: 1, code: "QUESTION", action: "State the inquiry clearly with explicit scope.", purpose: "Prevent vague or moving goalposts." },
  { stepNumber: 2, code: "PRIMARY_SOURCES", action: "Collect verbatim primary texts or measurements.", purpose: "Ground analysis in inspectable witnesses." },
  { stepNumber: 3, code: "TRACEABLE_WITNESS", action: "Attach immutable citation or hash provenance.", purpose: "Eliminate untraceable hearsay." },
  { stepNumber: 4, code: "FRAME_CHECK", action: "Populate all 5 P18 frame dimensions.", purpose: "Keep semantics ONSIDE before scoring." },
  { stepNumber: 5, code: "GENRE_SEPARATION", action: "Separate scripture, history, myth, and law.", purpose: "Prevent cross-genre conflation." },
  { stepNumber: 6, code: "COUNTER_EVIDENCE", action: "Actively seek falsifying observations.", purpose: "Counter confirmation bias." },
  { stepNumber: 7, code: "ZERO_DENOM_GUARD", action: "Verify weighted confidence denominator > 0.", purpose: "Return UNKNOWN when data is absent." },
  { stepNumber: 8, code: "NON_COERCION", action: "Audit impact on freedom of conscience.", purpose: "Enforce QS 2:256 boundary." },
  { stepNumber: 9, code: "QUARANTINE_GAPS", action: "Log unresolved conflicts side by side.", purpose: "Zero silent overwrite of competing drafts." },
  { stepNumber: 10, code: "DETERMINISTIC_RUN", action: "Execute reproducible pipeline evaluation.", purpose: "Guarantee repeatable outputs." },
  { stepNumber: 11, code: "PEER_AUDIT", action: "Expose inputs and trace to independent review.", purpose: "Remove single-point authority bias." },
  { stepNumber: 12, code: "PUBLISH_SEAL", action: "Emit signed output with explicit limitations.", purpose: "Preserve historical transparency." },
  { stepNumber: 13, code: "LEARN", action: "Feed verified corrections into the next cycle.", purpose: "Sustained humble improvement." },
] as const;

export const QUARANTINED_AMBIGUITY_LEDGER = [
  {
    id: "qal-001",
    classification: "NUMBER_CONFLICT",
    title: "DUAL WORLD PATCH #014 DRAFTS",
    detail: "Two separate #014 entries emerged across archive recovery (Maroon Signal vs Riba-Free Ledger).",
    rule: "Preserve both entries side by side (#014-A / #014-B); never silently overwrite.",
  },
  {
    id: "qal-002",
    classification: "SCORING_QUARANTINE",
    title: "BASS-HUNTER EXPLORATORY HEURISTIC",
    detail: "Pattern-hunting scan useful for early discovery but uncalibrated for canonical verdicts.",
    rule: "Tag outputs CANDIDATE_ONLY and block from SRGBL v8 verdict emission.",
  },
  {
    id: "qal-003",
    classification: "UNASSIGNED_ROLES",
    title: "G.O.D. 99 & WINGS 10 PLACEHOLDERS",
    detail: "All 99 stewardship slots and 10 wing designations remain architectural taxonomy only.",
    rule: "Status stays UNASSIGNED / PROPOSED_NOT_ASSIGNED with zero supernatural claim.",
  },
  {
    id: "qal-004",
    classification: "TEMPORAL_SEPARATION",
    title: "EPHEMERIS VS OFFICIAL HIJRI DECREE",
    detail: "Computed horizon visibility can diverge from local weather rukyat or national isbat.",
    rule: "Always display computed geometry separately from field observation and authority.",
  },
] as const;

export const CODEX_SEARCH_INDEX: readonly {
  readonly id: string;
  readonly doorId: EntryDoorId;
  readonly category: string;
  readonly title: string;
  readonly subtitle: string;
  readonly repoSource: string;
}[] = [
  { id: "idx-1", doorId: "story-universe", category: "DOOR I · NARRATIVE", title: "99-Chapter Master Vision & 4 Lenses", subtitle: "S01–S99 narrative arc across 8 story eras and 15 episodes", repoSource: "bjo163/moonwitnessxv" },
  { id: "idx-2", doorId: "story-universe", category: "DOOR I · ATLAS", title: "AETHERION 10 Realms & 100 Levels", subtitle: "Readiness calculator and PARADISE V3 3 Auras / 10 Guilds", repoSource: "bjo163/moonwitnessxv" },
  { id: "idx-3", doorId: "story-universe", category: "DOOR I · PATCHES", title: "33 World Patches & Dual #014 Disclosure", subtitle: "Complete patch registry with preserved conflict drafts", repoSource: "MASTER_BUG_PATCH_33_V2" },
  { id: "idx-4", doorId: "epistemic-corpus", category: "DOOR II · SCRIPTURES", title: "Four Revealed Scriptural Witnesses", subtitle: "Taurat (WLC), Zabur (Psalms), Injīl (SBLGNT), Al-Qur’ān (Uthmani)", repoSource: "bjo163/moonwitness-corpus" },
  { id: "idx-5", doorId: "epistemic-corpus", category: "DOOR II · VERIFICATION", title: "SRGBL v8 & P18 Key Witness Spine", subtitle: "5-stage witness pipeline, 20 controlled keys, zero-denominator UNKNOWN guard", repoSource: "bjo163/moonwitness-corpus" },
  { id: "idx-6", doorId: "epistemic-corpus", category: "DOOR II · BENCHMARK", title: "Shared Case 001: Jerusalem 70 CE", subtitle: "Cross-domain verification across history, archaeology, and genre boundaries", repoSource: "rocksoul-federation" },
  { id: "idx-7", doorId: "empire-organization", category: "DOOR III · CONSTITUTION", title: "Prime Code PC01–PC09 & WINGS 10", subtitle: "Low-profile Tawhid manifesto and operational stewardship taxonomy", repoSource: "A-L-L-A-H/master-docs" },
  { id: "idx-8", doorId: "empire-organization", category: "DOOR III · DIRECTORY", title: "100CENTER & G.O.D. 99 Directory", subtitle: "99 human ethical reflection slots (UNASSIGNED) + 25 Prophetic Amanah", repoSource: "A-L-L-A-H/master-docs" },
  { id: "idx-9", doorId: "sovereign-runtimes", category: "DOOR IV · ONTOLOGY", title: "OX-DX 49-Level Ontology Pyramid", subtitle: "7 Zones × 7 Levels from 01 UNIVERSE to 49 BIT", repoSource: "bjo163/universal-ontology-engine" },
  { id: "idx-10", doorId: "sovereign-runtimes", category: "DOOR IV · RUNTIMES", title: "M-Time Antikythera · AQEL · DHGS-13", subtitle: "Lunar visibility criteria, Arabic-first AST lexer, and 13-step assurance loop", repoSource: "A-L-L-A-H/moonwitness" },
];
