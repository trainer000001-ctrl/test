import { WORLD_ART_PLATES } from "@moonwitness/assets";
import type { WorldIdentifier } from "@moonwitness/canon";

export type { WorldIdentifier };

export type NavigationSectionId = "the-gate" | "the-worlds" | "the-codex" | "the-dock" | "about";

export interface WorldArtifactRecord {
  readonly code: string;
  readonly title: string;
  readonly classification: string;
  readonly summary: string;
  readonly timestampLabel: string;
}

export interface WorldDomainEntry {
  readonly id: WorldIdentifier;
  readonly name: string;
  readonly tagline: string;
  readonly pillars: readonly [string, string, string];
  readonly arabicEpithet: string;
  readonly transliteration: string;
  readonly citadelSector: string;
  readonly harmonicFrequency: string;
  readonly primaryDirective: string;
  readonly architecturalDescription: string;
  readonly accentColor: string;
  readonly statusLabel: string;
  readonly implementationState: "ACTIVE_CONSOLE" | "CANON_EXPLORER";
  readonly canonicalAlias?: string;
  readonly summaryLabel: string;
  readonly artifacts: readonly WorldArtifactRecord[];
}

export interface DockNodeTelemetry {
  readonly nodeCode: string;
  readonly worldId: WorldIdentifier;
  readonly designation: string;
  readonly protocol: string;
  readonly latencyMs: number | null;
  readonly integrityPercent: number | null;
  readonly runtimeTargetId:
    "web" | "api" | "arsy" | "memory" | "codex-edge" | "community" | "radio" | "igate" | null;
  readonly orbitalBearing: string;
  readonly state: "SYNCHRONIZED" | "LUMINOUS" | "BROADCASTING" | "CANON_EXPLORER";
}

export interface SidraKnowledgeAxiom {
  readonly id: string;
  readonly title: string;
  readonly discipline: string;
  readonly coordinateX: number;
  readonly coordinateY: number;
  readonly exposition: string;
  readonly geometricRatio: string;
  readonly connectedIds: readonly string[];
}

export interface CovenantPillar {
  readonly numeral: string;
  readonly heading: string;
  readonly subtitle: string;
  readonly statement: string;
}

export const NAVIGATION_TABS: readonly {
  readonly id: NavigationSectionId;
  readonly label: string;
}[] = [
  { id: "the-gate", label: "THE GATE" },
  { id: "the-worlds", label: "THE WORLDS" },
  { id: "the-codex", label: "THE CODEX" },
  { id: "the-dock", label: "THE DOCK" },
  { id: "about", label: "ABOUT" },
] as const;

export const WORLD_ART: Readonly<
  Record<WorldIdentifier, { readonly src: string; readonly subject: string }>
> = {
  moonwitness: {
    src: WORLD_ART_PLATES["world-moonwitness"].fallback,
    subject: "An illustrated archive hall beneath a moonlit sky",
  },
  arsy: {
    src: WORLD_ART_PLATES["world-arsy"].fallback,
    subject: "A radio relay dish overlooking a twilight skyline",
  },
  "human-pen": {
    src: WORLD_ART_PLATES["world-qalam"].fallback,
    subject: "An illuminated writing pen over editorial panels",
  },
  sidra: {
    src: WORLD_ART_PLATES["world-sidra"].fallback,
    subject: "A luminous tree of connected knowledge",
  },
  "rocksoul-dx": {
    src: WORLD_ART_PLATES["world-rocksoul"].fallback,
    subject: "A playful creative studio controller over vibrant color",
  },
  crayon: {
    src: WORLD_ART_PLATES["world-crayon"].fallback,
    subject: "A bright spectrum of illustrated editorial crayons",
  },
  "sin-can": {
    src: WORLD_ART_PLATES["world-sincan"].fallback,
    subject: "A luminous scarlet archway leading into honest self-reflection",
  },
  mythos: {
    src: WORLD_ART_PLATES["world-mythos"].fallback,
    subject: "Historic stone colonnades preserving ancient human memory",
  },
  "angel-with-shotgun": {
    src: WORLD_ART_PLATES["world-angel"].fallback,
    subject: "A winged guardian silhouette under dramatic golden-violet sky light",
  },
};

export const WORLD_DOMAINS: readonly WorldDomainEntry[] = [
  {
    id: "moonwitness",
    name: "MOONWITNESS",
    tagline: "Stories · Knowledge · Archive",
    pillars: ["Stories", "Knowledge", "Archive"],
    arabicEpithet: "شَاهِدُ القَمَر",
    transliteration: "Shāhid al-Qamar",
    citadelSector: "Western Spire of Testimony",
    harmonicFrequency: "1420.405 MHz · Hydrogen Line",
    primaryDirective: "Preserve human testimony and luminous narratives across borders.",
    architecturalDescription:
      "An observatory and living archive where dispatches from every meridian converge under one sky. Stories, eyewitness chronicles, and verifiable memories are indexed side by side.",
    accentColor: "#f6d438",
    statusLabel: "ARCHIVE ACTIVE",
    implementationState: "ACTIVE_CONSOLE",
    canonicalAlias: "MoonWitness II / XII / XV",
    summaryLabel: "99 Chapters · 4 Lenses",
    artifacts: [
      {
        code: "MW-0114",
        title: "The Meridian of Silent Lanterns",
        classification: "Field Testimony · Cairo — Bukhara",
        summary:
          "Oral histories of nocturnal astronomers who mapped trade routes using brass astrolabes and lunar mansions.",
        timestampLabel: "Lens 01 · Witness",
      },
      {
        code: "MW-0209",
        title: "Codex of the Glass Horizon",
        classification: "Archival Monograph · Andalusia",
        summary:
          "Architectural treatise on water-mirror courtyards designed to reflect starfields onto stone colonnades.",
        timestampLabel: "Lens 02 · Archive",
      },
      {
        code: "MW-0341",
        title: "Voices Above the Cloud Sea",
        classification: "Expedition Log · High Pamirs",
        summary:
          "High-altitude acoustic recordings and manuscript fragments gathered from mountain sanctuaries.",
        timestampLabel: "Lens 04 · Research",
      },
    ],
  },
  {
    id: "arsy",
    name: "ARSY",
    tagline: "Radio · Technology · Infrastructure",
    pillars: ["Radio", "Technology", "Infrastructure"],
    arabicEpithet: "العَرْشُ النُّورَانِي",
    transliteration: "Al-‘Arsh al-Nūrānī",
    citadelSector: "Zenith Crown Relay Array",
    harmonicFrequency: "432.000 Hz · Harmonic Carrier",
    primaryDirective: "Sustain zero-drift audio broadcasts and transparent communication lattices.",
    architecturalDescription:
      "The public acoustic broadcast and relay wing of the Empire of the Light. ARSY Radio (harmonic audio and broadcast edge) remains conceptually distinct from the internal ARSY Host Control Plane reconciler (`cp/arsy`).",
    accentColor: "#2ea8ff",
    statusLabel: "RADIO & INFRA",
    implementationState: "ACTIVE_CONSOLE",
    canonicalAlias: "ARSY Radio · Distinct from cp/arsy Host Control Plane",
    summaryLabel: "Harmonic Synthesizer",
    artifacts: [
      {
        code: "AR-0800",
        title: "Zenith Harmonic Beacon (ARSY Radio)",
        classification: "Acoustic Broadcast · Channel 01",
        summary:
          "Public harmonic radio synthesizer and broadcast telemetry edge (`moonwitness-radio.bjo163.workers.dev`).",
        timestampLabel: "432 Hz Foundation",
      },
      {
        code: "AR-1024",
        title: "ARSY Host Control Plane Boundary",
        classification: "Infrastructure Plane · cp/arsy",
        summary:
          "Private Go/Rust WireGuard and DNS reconciler layer kept separate from public radio listening.",
        timestampLabel: "Plane Separated",
      },
      {
        code: "AR-1440",
        title: "Ionospheric Mirror Protocol",
        classification: "Radio Propagation · Deep Sky",
        summary:
          "Adaptive broadcast relay bridge engineered for resilient cross-continental audio delivery.",
        timestampLabel: "Signal Relay",
      },
    ],
  },
  {
    id: "human-pen",
    name: "HUMAN-PEN",
    tagline: "Think · Write · Create · Share",
    pillars: ["Think", "Write", "Share"],
    arabicEpithet: "نُون وَالقَلَم",
    transliteration: "Nūn wa-al-Qalam · Manusia Pulpen",
    citadelSector: "Central Scriptorium & Inkwell",
    harmonicFrequency: "528.000 Hz · Inscription Resonance",
    primaryDirective: "Publish accountable authorship, editorial essays, and Qalam folios.",
    architecturalDescription:
      "Reconciling the classic Qalam Scriptorium with the featured MANUSIA PULPEN gate transmission: HUMAN-PEN is where thoughtful writing, local folio drafting, and visual storytelling meet.",
    accentColor: "#ed149b",
    statusLabel: "SCRIPTORIUM OPEN",
    implementationState: "ACTIVE_CONSOLE",
    canonicalAlias: "MANUSIA PULPEN · Reconciles QALAM Scriptorium",
    summaryLabel: "Folio Editor Active",
    artifacts: [
      {
        code: "HP-0001",
        title: "Manusia Pulpen & The First Inscription",
        classification: "Gate Transmission · Scriptorium",
        summary:
          "Translating reflection into accountable writing—bridging the Qalam folio heritage with HUMAN-PEN authorship.",
        timestampLabel: "Folio I · Canon",
      },
      {
        code: "HP-0068",
        title: "Letters of the First Dawn",
        classification: "Calligraphic Anthology · Editorial",
        summary:
          "Essays on clarity, gratitude, and disciplined craftsmanship as everyday acts of stewardship.",
        timestampLabel: "Folio IV · Public",
      },
      {
        code: "HP-0096",
        title: "The Architecture of Clear Reading",
        classification: "Editorial Essay · Sanctuary Design",
        summary:
          "Designing illustrated pages that welcome readers of all ages without visual fatigue.",
        timestampLabel: "Folio IX · Featured",
      },
    ],
  },
  {
    id: "sidra",
    name: "SIDRA",
    tagline: "Connect · Explore · Learn",
    pillars: ["Connect", "Explore", "Learn"],
    arabicEpithet: "سِدْرَةُ المُنْتَهَى",
    transliteration: "Sidrat al-Muntahā",
    citadelSector: "Eastern Observatory Dome",
    harmonicFrequency: "639.000 Hz · Lattice Synthesis",
    primaryDirective: "Map interconnected knowledge across ethics, science, and geometry.",
    architecturalDescription:
      "Inspired by the Lote Tree of the Utmost Boundary, Sidra organizes interconnected inquiry into an interactive knowledge graph where each discipline illuminates its neighbors.",
    accentColor: "#3ddc84",
    statusLabel: "KNOWLEDGE GRAPH",
    implementationState: "ACTIVE_CONSOLE",
    canonicalAlias: "SIDRA TREE Knowledge Graph",
    summaryLabel: "6 Core Axioms",
    artifacts: [
      {
        code: "SD-0310",
        title: "Atlas of Celestial Mechanics",
        classification: "Curriculum · Astrometry",
        summary:
          "Interactive study of orbital resonances, spherical trigonometry, and twilight horizon optics.",
        timestampLabel: "18 Modules",
      },
      {
        code: "SD-0512",
        title: "Ethics of Autonomous Craft",
        classification: "Symposium · Philosophy of Tech",
        summary:
          "Engineering standards aligning computational systems with human dignity and verifiable truth.",
        timestampLabel: "12 Seminars",
      },
      {
        code: "SD-0777",
        title: "The Polyhedral Tessellation Lab",
        classification: "Interactive Study · Mathematics",
        summary:
          "Quasicrystalline symmetries and golden-ratio projections in classical and modern design.",
        timestampLabel: "24 Proofs",
      },
    ],
  },
  {
    id: "rocksoul-dx",
    name: "ROCKSOUL DX",
    tagline: "Play · Create · Dream",
    pillars: ["Play", "Create", "Dream"],
    arabicEpithet: "رُوحُ الإِبْدَاع",
    transliteration: "Rūḥ al-Ibdā‘",
    citadelSector: "Horizon Mirror Plaza",
    harmonicFrequency: "888.000 Hz · Prismatic Engine",
    primaryDirective: "Simulate interactive worlds, acoustic instruments, and generative geometry.",
    architecturalDescription:
      "Maintaining its dedicated product boundary (`apps/rocksoul` / NOISE × SILENCE), ROCKSOUL DX bridges procedural mandala geometry, acoustic synthesis, and playable worldbuilding.",
    accentColor: "#f5b027",
    statusLabel: "WORKBENCH BOUNDARY",
    implementationState: "ACTIVE_CONSOLE",
    canonicalAlias: "apps/rocksoul · NOISE × SILENCE",
    summaryLabel: "Interactive Studio",
    artifacts: [
      {
        code: "RX-0001",
        title: "Astrolabe of Light Engine",
        classification: "Interactive Sandbox · Canvas",
        summary:
          "Real-time geometry generator allowing creators to sculpt radial star mandalas and orbital symmetries.",
        timestampLabel: "Generator Active",
      },
      {
        code: "RX-0042",
        title: "Citadel Walk: Reflections",
        classification: "Spatial Experience · Horizon",
        summary:
          "Acoustic-visual journey framed by the ROCKSOUL NOISE × SILENCE narrative contract.",
        timestampLabel: "Product Boundary",
      },
      {
        code: "RX-0099",
        title: "Harmonic Prism Sequencer",
        classification: "Audio-Visual Instrument · DX",
        summary: "Polyrhythmic chime matrix tuned to pure ratios and celestial orbital periods.",
        timestampLabel: "Interactive",
      },
    ],
  },
  {
    id: "crayon",
    name: "CRAYON",
    tagline: "Biar Hidup Lebih Berwarna!",
    pillars: ["Source", "Reality", "Light"],
    arabicEpithet: "سِرَاجُ الأَلْوَان",
    transliteration: "SRGBL v8 · Crayon RGBL",
    citadelSector: "Prismatic Hermeneutics Studio",
    harmonicFrequency: "RGBL · 4-Layer Lens",
    primaryDirective: "Illuminate meaning through the 5-stage SRGBL v8 hermeneutic spectrum.",
    architecturalDescription:
      "Anchored in `ALLAH-CRAYON-RGBL-ENGINE` and kept distinct from SIN CAN: CRAYON examines text and lived experience across five structured lenses—Source & Sense, Reality, Governing Order, Being, and Light.",
    accentColor: "#2ea8ff",
    statusLabel: "CANON EXPLORER",
    implementationState: "CANON_EXPLORER",
    canonicalAlias: "bjo163/ALLAH-CRAYON-RGBL-ENGINE · SRGBL v8",
    summaryLabel: "5 SRGBL Stages",
    artifacts: [
      {
        code: "CR-S1R2",
        title: "S1 Source & R2 Reality Grounding",
        classification: "SRGBL v8 · Primary Lenses",
        summary:
          "Anchors interpretation in verbatim primary passages and observable physical/historical facts.",
        timestampLabel: "Stage S1–R2",
      },
      {
        code: "CR-G3B4",
        title: "G3 Governing Order & B4 Being",
        classification: "SRGBL v8 · Ethical Bridge",
        summary:
          "Connects invariant creation laws with mercy, conscience, and practical moral transformation.",
        timestampLabel: "Stage G3–B4",
      },
      {
        code: "CR-L5",
        title: "L5 Living Illuminated Output",
        classification: "SRGBL v8 · Action",
        summary:
          "Turns understanding into reproducible, honest creative work that serves fellow travelers.",
        timestampLabel: "Stage L5",
      },
    ],
  },
  {
    id: "sin-can",
    name: "SIN CAN",
    tagline: "Reflect · Question · Understand",
    pillars: ["Reflect", "Question", "Understand"],
    arabicEpithet: "تَوْبَةٌ وَبِنَاء",
    transliteration: "Sin Can Be Better Human",
    citadelSector: "Editorial Reflection Hall",
    harmonicFrequency: "6-State Syafaat Reflection",
    primaryDirective: "Transform human imperfection and honest scars into responsible growth.",
    architecturalDescription:
      "Strictly distinct from CRAYON: SIN CAN centers on the `SIN CAN BE BETTER HUMAN` four-panel storyboard and six Syafaat reflection states—welcoming flawed humans toward humility and craft without false perfection.",
    accentColor: "#ed149b",
    statusLabel: "CANON EXPLORER",
    implementationState: "CANON_EXPLORER",
    canonicalAlias: "SIN CAN BE BETTER HUMAN · DX 4-Panel Arc",
    summaryLabel: "4 Story Panels",
    artifacts: [
      {
        code: "SC-01",
        title: "Panel 01–02: From Scars to Low-Profile Refuge",
        classification: "DX Storyboard · GOGOGO → SHUUU",
        summary:
          "Drops masks of false holiness and steps into honest reflection before rebuilding.",
        timestampLabel: "Panels 01–02",
      },
      {
        code: "SC-02",
        title: "Panel 03–04: The Forge & Better Human",
        classification: "DX Storyboard · BAAAN → DODODO",
        summary:
          "Converts remorse and struggle into verifiable discipline, responsibility, and accountable service.",
        timestampLabel: "Panels 03–04",
      },
      {
        code: "SC-03",
        title: "Six Syafaat Reflection States",
        classification: "Practice Matrix · Unexplored → Revisit",
        summary:
          "Tracks human reflection from Unexplored and Discovered through Practicing, Reflected, Sustaining, and Revisit.",
        timestampLabel: "6 Reflection States",
      },
    ],
  },
  {
    id: "mythos",
    name: "MYTHOS",
    tagline: "Explore · Discover · Remember",
    pillars: ["Explore", "Discover", "Remember"],
    arabicEpithet: "قَصَصُ الحَقّ",
    transliteration: "MFTL · Where Myth Fades To Legend",
    citadelSector: "Archaeological & Story Vault",
    harmonicFrequency: "18 Families × 4 Layers",
    primaryDirective: "Distinguish folkloric motif from verifiable historical and moral core.",
    architecturalDescription:
      "Grounded in `DOM-02 STORY · MFTL (Where Myth Fades To Legend)` and `DOM-03 EVENT · LEGEND`, MYTHOS cross-examines narrative traditions, eyewitness chronicles, and material history—as benchmarked on Shared Case 001 (Jerusalem 70 CE).",
    accentColor: "#f6d438",
    statusLabel: "CANON EXPLORER",
    implementationState: "CANON_EXPLORER",
    canonicalAlias: "DOM-02 MFTL · DOM-03 LEGEND",
    summaryLabel: "Case 001 Benchmark",
    artifacts: [
      {
        code: "MY-01",
        title: "MFTL Four-Layer Audit",
        classification: "18 Record Families · Mizan",
        summary:
          "Separates Myth, Integrity, Deviation, and Mizan balance across classical narratives.",
        timestampLabel: "DOM-02 MFTL",
      },
      {
        code: "MY-02",
        title: "Shared Case 001: Jerusalem 70 CE",
        classification: "Multi-Domain Correlation · Verified",
        summary:
          "Aligns Mark 13:2, Flavius Josephus eyewitness chronicles, Arch of Titus relief, and Roman siege law.",
        timestampLabel: "DOM-03 Legend",
      },
      {
        code: "MY-03",
        title: "Material Strata Anchoring",
        classification: "Historical Reconstruction",
        summary:
          "Examines extraordinary historical claims through dateable inscriptions and physical evidence.",
        timestampLabel: "Verified Benchmark",
      },
    ],
  },
  {
    id: "angel-with-shotgun",
    name: "ANGEL WITH SHOTGUN",
    tagline: "Law · Justice · Society",
    pillars: ["Law", "Justice", "Society"],
    arabicEpithet: "المِيزَانُ وَالقَانُون",
    transliteration: "DOM-05 LAW · AWS Normative Engine",
    citadelSector: "Normative Jurisprudence Chamber",
    harmonicFrequency: "6-Gate Legal Scope Chain",
    primaryDirective: "Validate jurisdiction and scope before claiming any legal rule applies.",
    architecturalDescription:
      "Anchored in `DOM-05 LAW · AWS` (`bjo163/rocksoul-aws`): enforces the core legal invariant that LEGAL TEXT ≠ APPLICABLE LAW without full validation across Source, Rule, Jurisdiction, Applicability, Argument, and Review.",
    accentColor: "#2ea8ff",
    statusLabel: "CANON EXPLORER",
    implementationState: "CANON_EXPLORER",
    canonicalAlias: "DOM-05 LAW · AWS Normative Engine",
    summaryLabel: "6-Stage Legal Gate",
    artifacts: [
      {
        code: "AWS-01",
        title: "SOURCE → RULE → JURISDICTION",
        classification: "Normative Gate · Scope I",
        summary:
          "Verifies primary statutory authority and territorial/temporal jurisdiction before interpreting obligations.",
        timestampLabel: "Gates 01–03",
      },
      {
        code: "AWS-02",
        title: "APPLICABILITY → ARGUMENT → REVIEW",
        classification: "Normative Gate · Scope II",
        summary:
          "Requires bounded applicability testing, structured argument, and human appeal/review.",
        timestampLabel: "Gates 04–06",
      },
      {
        code: "AWS-03",
        title: "AngelWithShotgun Ch.01 & Kingslayer Pact",
        classification: "Gate Transmission · Story × Law",
        summary:
          "Connects narrative explorations of accountability with rigorous normative verification.",
        timestampLabel: "Canon Contract",
      },
    ],
  },
] as const;

export const DOCK_TELEMETRY_NODES: readonly DockNodeTelemetry[] = [
  {
    nodeCode: "GATE-01",
    worldId: "moonwitness",
    designation: "Spire of Testimony Vault",
    protocol: "MW-CHRONICLE/TLS1.3",
    latencyMs: null,
    integrityPercent: null,
    runtimeTargetId: "web",
    orbitalBearing: "284° W · +19° Decl",
    state: "SYNCHRONIZED",
  },
  {
    nodeCode: "GATE-02",
    worldId: "arsy",
    designation: "Zenith Radio Relay Array",
    protocol: "ARSY-RADIO/QUIC",
    latencyMs: null,
    integrityPercent: null,
    runtimeTargetId: "arsy",
    orbitalBearing: "000° Z · +90° Apex",
    state: "BROADCASTING",
  },
  {
    nodeCode: "GATE-03",
    worldId: "human-pen",
    designation: "Human-Pen & Qalam Scriptorium",
    protocol: "QALAM-FOLIO/ED25519",
    latencyMs: null,
    integrityPercent: null,
    runtimeTargetId: "codex-edge",
    orbitalBearing: "180° S · +45° Gate",
    state: "LUMINOUS",
  },
  {
    nodeCode: "GATE-04",
    worldId: "sidra",
    designation: "Lote-Tree Knowledge Graph",
    protocol: "SIDRA-DAG/SPARQL",
    latencyMs: null,
    integrityPercent: null,
    runtimeTargetId: "api",
    orbitalBearing: "076° E · +33° Dome",
    state: "SYNCHRONIZED",
  },
  {
    nodeCode: "GATE-05",
    worldId: "rocksoul-dx",
    designation: "Rocksoul DX Spatial Studio",
    protocol: "ROCKSOUL-DX/CANVAS",
    latencyMs: null,
    integrityPercent: null,
    runtimeTargetId: "community",
    orbitalBearing: "142° SE · +12° Plaza",
    state: "LUMINOUS",
  },
  {
    nodeCode: "GATE-06",
    worldId: "crayon",
    designation: "SRGBL v8 Prismatic Spectrum",
    protocol: "CRAYON-SRGBL/SPEC",
    latencyMs: null,
    integrityPercent: null,
    runtimeTargetId: null,
    orbitalBearing: "045° NE · +28° Prism",
    state: "CANON_EXPLORER",
  },
  {
    nodeCode: "GATE-07",
    worldId: "sin-can",
    designation: "Sin Can Reflection Arc",
    protocol: "DX-SYAFAAT/SPEC",
    latencyMs: null,
    integrityPercent: null,
    runtimeTargetId: null,
    orbitalBearing: "210° SW · +16° Hall",
    state: "CANON_EXPLORER",
  },
  {
    nodeCode: "GATE-08",
    worldId: "mythos",
    designation: "MFTL & Legend Correlation",
    protocol: "MFTL-CASE001/SPEC",
    latencyMs: null,
    integrityPercent: null,
    runtimeTargetId: null,
    orbitalBearing: "315° NW · +40° Vault",
    state: "CANON_EXPLORER",
  },
  {
    nodeCode: "GATE-09",
    worldId: "angel-with-shotgun",
    designation: "AWS Normative Law Engine",
    protocol: "AWS-LAW-6GATE/SPEC",
    latencyMs: null,
    integrityPercent: null,
    runtimeTargetId: null,
    orbitalBearing: "110° E · +55° Bench",
    state: "CANON_EXPLORER",
  },
] as const;

export const SIDRA_KNOWLEDGE_AXIOMS: readonly SidraKnowledgeAxiom[] = [
  {
    id: "noor-optics",
    title: "Optics of Al-Nūr",
    discipline: "Radiative Geometry",
    coordinateX: 50,
    coordinateY: 22,
    exposition:
      "Every ray emitted from the central meridian reflects across the obsidian basin according to inverse-square harmonic attenuation, uniting heaven and horizon.",
    geometricRatio: "φ = 1.6180339887",
    connectedIds: ["mizan-harmony", "qalam-codex", "falak-orbit"],
  },
  {
    id: "mizan-harmony",
    title: "Al-Mīzān Equilibrium",
    discipline: "Architectural Balance",
    coordinateX: 24,
    coordinateY: 48,
    exposition:
      "Twin citadels flank the central portal in exact bilateral symmetry, symbolizing the balance between outward technical mastery and inward spiritual stillness.",
    geometricRatio: "√2 = 1.4142135623",
    connectedIds: ["noor-optics", "hikmah-archive"],
  },
  {
    id: "falak-orbit",
    title: "Al-Falak Celestial Mechanics",
    discipline: "Astrometry",
    coordinateX: 76,
    coordinateY: 48,
    exposition:
      "Planetary rings and sidereal trajectories trace deterministic ellipses around the primary luminary, providing a universal clock for all worlds.",
    geometricRatio: "2π = 6.2831853071",
    connectedIds: ["noor-optics", "ibda-synthesis"],
  },
  {
    id: "hikmah-archive",
    title: "Bayt al-Ḥikmah Memory",
    discipline: "Epistemology",
    coordinateX: 34,
    coordinateY: 78,
    exposition:
      "Knowledge preserved with cryptographic provenance and scholarly rigor transforms fleeting human observations into an eternal inheritance.",
    geometricRatio: "3:4:5 Pythagorean",
    connectedIds: ["mizan-harmony", "qalam-codex"],
  },
  {
    id: "qalam-codex",
    title: "The First Inscription",
    discipline: "Calligraphic Ontology",
    coordinateX: 50,
    coordinateY: 56,
    exposition:
      "At the intersection of intention and form stands the Human-Pen (Qalam): translating unseen wisdom into visible proportion, letter, and law.",
    geometricRatio: "1 : √3 Octagram",
    connectedIds: ["noor-optics", "hikmah-archive", "ibda-synthesis"],
  },
  {
    id: "ibda-synthesis",
    title: "Ibdā‘ Creative Genesis",
    discipline: "Generative Systems",
    coordinateX: 66,
    coordinateY: 78,
    exposition:
      "From simple geometric seeds emerge infinite non-repeating star tessellations—demonstrating how finite rules yield boundless beauty.",
    geometricRatio: "12-Fold Girih",
    connectedIds: ["falak-orbit", "qalam-codex"],
  },
] as const;

export const COVENANT_PILLARS: readonly CovenantPillar[] = [
  {
    numeral: "I",
    heading: "A WORLD TO WITNESS",
    subtitle: "Truth · Testimony · Remembrance",
    statement:
      "To witness with clarity and reverence is the beginning of awareness. Through Moonwitness and Arsy, every signal of beauty, justice, and cosmic order is observed and preserved without distortion.",
  },
  {
    numeral: "II",
    heading: "A WORLD TO LEARN",
    subtitle: "Wisdom · Geometry · Inquiry",
    statement:
      "Creation is an open book of signs. Through Sidra, Crayon, and Mythos, mathematics, history, ethics, and engineering are studied as unified expressions of responsible inquiry.",
  },
  {
    numeral: "III",
    heading: "A WORLD TO BUILD",
    subtitle: "Craft · Excellence · Justice",
    statement:
      "Excellence (Iḥsān) demands that whatever we construct—whether a manuscript in Human-Pen, reflection in Sin Can, justice audit in Angel With Shotgun, or spatial art in Rocksoul DX—is built with beauty and integrity.",
  },
] as const;
