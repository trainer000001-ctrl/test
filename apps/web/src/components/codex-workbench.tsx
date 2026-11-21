"use client";

import { useMemo, useState } from "react";
import {
  evaluateDhgsAssuranceLoop,
  evaluateSrgblModel,
  evaluateWsiSemanticFrame,
  queryOxDxHierarchy,
  tokenizeAndParseAqel,
  type SrgblCriterionWeight,
} from "@moonwitness/canon";
import { Input, RadialGauge, SkinOrnament, Slider, Textarea } from "@moonwitness/ui";
import { ScriptureFolio } from "@moonwitness/ui/icons";
import { DnaButton, DnaChamber, SacredCornerBrackets } from "@moonwitness/ui/imperium";
import { useSanctuaryLocale } from "@/lib/sanctuary-locale";
import { MizanLiveTabPanel, WitnessEngineLiveTabPanel } from "./codex-workbench-live-tabs";
import { AqelTabPanel, OxDxDhgsTabPanel } from "./codex-workbench-tabs";

type WorkbenchTab = "wsi" | "srgbl" | "oxdx" | "aqel" | "wx-engine" | "mizan";

const DEFAULT_AQEL_SOURCE = `# نظام التحقق المعرفي — عقد الصدق
عرّف المعيار = "الميزان"
حقيقة الشاهد = "2:256"
قاعدة العدل
تحقق "لا إكراه في الدين"
استنتج الأمانة`;

const INITIAL_SRGBL_ROWS: readonly SrgblCriterionWeight[] = [
  { weight: 1.0, confidence: 0.95, intensity: 1.0, direction: 1.5 },
  { weight: 0.85, confidence: 0.9, intensity: 1.0, direction: 1.0 },
  { weight: 0.7, confidence: 0.8, intensity: 0.9, direction: 0.5 },
];

export function CodexWorkbench() {
  const { locale } = useSanctuaryLocale();
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("wsi");

  // 1. WSI Semantic & 7-Swing State (#32)
  const [wsiStatement, setWsiStatement] = useState<string>(
    "All primary witness claims require explicit attribution and zero coercion.",
  );
  const [wsiSourceRef, setWsiSourceRef] = useState<string>("QS 2:256 / SRC-QUR");
  const [wsiAgent, setWsiAgent] = useState<string>("Steward / Witness");
  const [wsiRecipient, setWsiRecipient] = useState<string>("Human Community");
  const [wsiDomain, setWsiDomain] = useState<string>("Moral Governance");
  const [wsiScope, setWsiScope] = useState<string>("Universal Voluntary Covenant");
  const [wsiGenre, setWsiGenre] = useState<string>("Primary Normative Invariant");
  const [wsiDepth, setWsiDepth] = useState<number>(2);

  const wsiResult = useMemo(
    () =>
      evaluateWsiSemanticFrame({
        statement: wsiStatement,
        sourceRef: wsiSourceRef,
        agent: wsiAgent,
        recipient: wsiRecipient,
        domain: wsiDomain,
        scope: wsiScope,
        genre: wsiGenre,
        swingDepth: wsiDepth,
      }),
    [wsiStatement, wsiSourceRef, wsiAgent, wsiRecipient, wsiDomain, wsiScope, wsiGenre, wsiDepth],
  );

  // 2. SRGBL v8 State (#33)
  const [srgblQuestion, setSrgblQuestion] = useState<string>(
    "How should an architectural steward resolve competing witness claims?",
  );
  const [r1Text, setR1Text] = useState<string>(
    "Primary classical corpus tuples\nTimestamped build & edge telemetry",
  );
  const [g2Text, setG2Text] = useState<string>(
    "Zero fabricated data invariant\nExplicit UNKNOWN gate on missing evidence",
  );
  const [b3Text, setB3Text] = useState<string>(
    "Auditors, readers, and local communities\nFull agency without coercion",
  );
  const [l4Text, setL4Text] = useState<string>(
    "Publish reproducible source citations\nAudit privacy on-device before deploy",
  );
  const [srgblRows, setSrgblRows] = useState<readonly SrgblCriterionWeight[]>(INITIAL_SRGBL_ROWS);

  const srgblResult = useMemo(
    () =>
      evaluateSrgblModel({
        question: srgblQuestion,
        observations: r1Text.split("\n"),
        governanceRules: g2Text.split("\n"),
        actorsAndMeanings: b3Text.split("\n"),
        responsibleActions: l4Text.split("\n"),
        weightedCriteria: srgblRows,
      }),
    [srgblQuestion, r1Text, g2Text, b3Text, l4Text, srgblRows],
  );

  // 3. OX-DX 49 & DHGS-13 State (#34)
  const [oxdxQuery, setOxdxQuery] = useState<string>("");
  const [doneDhgsCodes, setDoneDhgsCodes] = useState<readonly string[]>([
    "QUESTION",
    "PRIMARY_SOURCES",
    "TRACEABLE_WITNESS",
  ]);
  const oxdxHits = useMemo(() => queryOxDxHierarchy(oxdxQuery), [oxdxQuery]);
  const dhgsResult = useMemo(() => evaluateDhgsAssuranceLoop(doneDhgsCodes), [doneDhgsCodes]);

  // 4. AQEL v0.1 State (#35)
  const [aqelSource, setAqelSource] = useState<string>(DEFAULT_AQEL_SOURCE);
  const aqelResult = useMemo(() => tokenizeAndParseAqel(aqelSource), [aqelSource]);

  const tabs: readonly { id: WorkbenchTab; code: string; label: string }[] = [
    { id: "wsi", code: "WSI-P18", label: "WSI SEMANTIC & SWING" },
    { id: "srgbl", code: "SRGBL-v8", label: "SRGBL v8 EVALUATOR" },
    { id: "oxdx", code: "OX-DX/DHGS", label: "OX-DX 49 & DHGS-13" },
    { id: "aqel", code: "AQEL-v0.1", label: "AQEL ARABIC LEXER" },
    { id: "wx-engine", code: "WX-01..09", label: "9-MODULE WITNESS ENGINE" },
    { id: "mizan", code: "MIZAN-MCDA", label: "MIZAN DECISION ENGINE" },
  ];

  const toggleDhgsStep = (code: string) => {
    setDoneDhgsCodes((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  return (
    <DnaChamber cornerBrackets className="mt-8 p-6 sm:p-8 space-y-6">
      <SacredCornerBrackets />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dna-accent)]/25 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-[var(--dna-accent)] uppercase">
            <ScriptureFolio className="h-4 w-4" />
            <span>@MOONWITNESS/CANON · DETERMINISTIC CLIENT ENGINE WORKBENCH</span>
            <SkinOrnament slot="tag" label="EPISTEMIC KERNEL" />
          </div>
          <h3 className="mt-1 font-monument text-base sm:text-lg tracking-[0.14em] text-[var(--dna-text)] uppercase">
            {locale === "id"
              ? "LABORATORIUM EKSEKUSI WSI · SRGBL v8 · OX-DX 49 · AQEL"
              : "LIVE EXECUTION BENCH: WSI · SRGBL v8 · OX-DX 49 · AQEL"}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <DnaButton
                key={tab.id}
                type="button"
                tone="secondary"
                aria-pressed={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-0 px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase ${
                  selected
                    ? "border border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                    : "text-[var(--dna-muted)]"
                }`}
              >
                {tab.code} · {tab.label}
              </DnaButton>
            );
          })}
        </div>
      </div>

      {/* TAB 1: WSI SEMANTIC & SWING (#32) */}
      {activeTab === "wsi" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block font-mono text-[10px] text-[var(--dna-accent)]">
              CLAIM STATEMENT
              <Textarea
                rows={2}
                value={wsiStatement}
                onChange={(e) => setWsiStatement(e.target.value)}
                className="mt-1 min-h-0 w-full border border-[var(--dna-accent)]/35 bg-[var(--dna-canvas)] p-2.5 font-serif text-xs text-[var(--dna-text)] focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                { label: "SOURCE REF", val: wsiSourceRef, set: setWsiSourceRef },
                { label: "1. AGENT", val: wsiAgent, set: setWsiAgent },
                { label: "2. RECIPIENT", val: wsiRecipient, set: setWsiRecipient },
                { label: "3. DOMAIN", val: wsiDomain, set: setWsiDomain },
                { label: "4. SCOPE", val: wsiScope, set: setWsiScope },
                { label: "5. GENRE", val: wsiGenre, set: setWsiGenre },
              ].map((field) => (
                <label
                  key={field.label}
                  className="block font-mono text-[10px] text-[var(--dna-muted)]"
                >
                  {field.label}
                  <Input
                    type="text"
                    value={field.val}
                    onChange={(e) => field.set(e.target.value)}
                    className="mt-1 min-h-0 w-full border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--dna-text)] focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <label className="block font-mono text-[10px] text-[var(--dna-accent)]">
              BOUNDED SWING DEPTH (MAX 3 HOPS): {wsiDepth}
              <Slider
                min={0}
                max={3}
                step={1}
                value={[wsiDepth]}
                onValueChange={([v]) => setWsiDepth(v ?? 0)}
                aria-label="Bounded swing depth"
                className="mt-2"
              />
            </label>
          </div>

          <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-2.5">
              <div className="flex items-center gap-3">
                <RadialGauge
                  value={wsiDepth}
                  max={3}
                  size={52}
                  label="HOP"
                  unit="/3"
                  colorVar="var(--dna-accent)"
                />
                <span className="font-mono text-[10.5px] text-[var(--dna-accent)]">
                  P18 AUDIT VERDICT
                </span>
              </div>
              <span
                className={`border px-2.5 py-0.5 font-mono text-[11px] font-bold ${
                  wsiResult.frameStatus === "ONSIDE"
                    ? "border-[var(--dna-success)]/50 bg-[var(--dna-success)]/10 text-[var(--dna-success)]"
                    : "border-[var(--dna-danger)]/60 bg-[var(--dna-danger)]/15 text-[var(--dna-danger)]"
                }`}
              >
                {wsiResult.frameStatus}
              </span>
            </div>
            <div className="font-mono text-[10.5px] text-[var(--dna-muted)]">
              MISSING DIMENSIONS:{" "}
              {wsiResult.missingDimensions.length === 0
                ? "NONE (ALL 5 MANDATORY SLOTS POPULATED)"
                : wsiResult.missingDimensions.join(", ")}
            </div>
            <div className="space-y-2">
              {wsiResult.rotations.map((rot) => (
                <div
                  key={rot.hop}
                  className="border border-[var(--dna-accent)]/20 bg-[var(--dna-surface)] p-3"
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                    <span>
                      HOP {rot.hop} · {rot.operator}
                    </span>
                    <span className="text-[var(--dna-accent)]">{rot.status}</span>
                  </div>
                  <p className="mt-1 font-serif text-xs text-[var(--dna-muted)]">{rot.prompt}</p>
                </div>
              ))}
            </div>
            <div className="font-mono text-[10px] text-[var(--dna-muted)]">
              {wsiResult.invariant}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SRGBL v8 EVALUATOR (#33) */}
      {activeTab === "srgbl" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block font-mono text-[10px] text-[var(--dna-accent)]">
              INQUIRY QUESTION
              <Input
                type="text"
                value={srgblQuestion}
                onChange={(e) => setSrgblQuestion(e.target.value)}
                className="mt-1 min-h-0 w-full border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] px-3 py-1.5 font-serif text-xs text-[var(--dna-text)] focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                { label: "R1 REALITY (ONE PER LINE)", val: r1Text, set: setR1Text },
                { label: "G2 GOVERNING ORDER", val: g2Text, set: setG2Text },
                { label: "B3 BEING & AGENTS", val: b3Text, set: setB3Text },
                { label: "L4 LIGHT & ACTION", val: l4Text, set: setL4Text },
              ].map((stage) => (
                <label
                  key={stage.label}
                  className="block font-mono text-[10px] text-[var(--dna-muted)]"
                >
                  {stage.label}
                  <Textarea
                    rows={2}
                    value={stage.val}
                    onChange={(e) => stage.set(e.target.value)}
                    className="mt-1 min-h-0 w-full border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] p-2 font-serif text-xs text-[var(--dna-text)] focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <DnaButton
                tone="secondary"
                onClick={() =>
                  setSrgblRows([{ weight: 0, confidence: 0, intensity: 0, direction: 1 }])
                }
                className="px-3 py-1 font-mono text-[10px] text-[var(--dna-danger)]"
              >
                TEST ZERO-DENOMINATOR GUARD (0/0 &rarr; UNKNOWN)
              </DnaButton>
              <DnaButton
                tone="secondary"
                onClick={() => setSrgblRows(INITIAL_SRGBL_ROWS)}
                className="px-3 py-1 font-mono text-[10px] text-[var(--dna-muted)]"
              >
                RESET BALANCED WEIGHTS
              </DnaButton>
            </div>
          </div>

          <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-2.5">
              <span className="font-mono text-[10.5px] text-[var(--dna-accent)]">
                CUMULATIVE COMPLETENESS: {srgblResult.completeness.filledLevels}/4 (
                {Math.round(srgblResult.completeness.ratio * 100)}%)
              </span>
              <span className="border border-[var(--dna-accent)]/40 bg-[var(--dna-accent)]/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[var(--dna-text)]">
                SCORE: {srgblResult.weightedScore}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { key: "R1 REALITY", items: srgblResult.stages.R1_Reality },
                { key: "G2 GOVERNANCE", items: srgblResult.stages.G2_GoverningOrder },
                { key: "B3 BEING", items: srgblResult.stages.B3_Being },
                { key: "L4 LIGHT", items: srgblResult.stages.L4_Light },
              ].map((block) => (
                <div
                  key={block.key}
                  className="border border-[var(--dna-accent)]/20 bg-[var(--dna-surface)] p-3"
                >
                  <div className="font-mono text-[10px] text-[var(--dna-accent)]">{block.key}</div>
                  <ul className="mt-1 space-y-1 font-serif text-xs text-[var(--dna-muted)]">
                    {block.items.map((line, idx) => (
                      <li key={idx}>• {line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="font-mono text-[10px] text-[var(--dna-muted)]">
              {srgblResult.neutralityInvariant}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OX-DX 49 & DHGS-13 (#34) */}
      {activeTab === "oxdx" && (
        <OxDxDhgsTabPanel
          oxdxQuery={oxdxQuery}
          oxdxHits={oxdxHits}
          doneDhgsCodes={doneDhgsCodes}
          dhgsResult={dhgsResult}
          onQueryChange={setOxdxQuery}
          onToggleStep={toggleDhgsStep}
        />
      )}

      {/* TAB 4: AQEL v0.1 ARABIC LEXER / AST (#35) */}
      {activeTab === "aqel" && (
        <AqelTabPanel
          aqelSource={aqelSource}
          aqelResult={aqelResult}
          onSourceChange={setAqelSource}
        />
      )}

      {/* TAB 5: 9-MODULE WITNESS ENGINE (WX-01..09) */}
      {activeTab === "wx-engine" && <WitnessEngineLiveTabPanel />}

      {/* TAB 6: MIZAN MULTI-CRITERIA DECISION ENGINE */}
      {activeTab === "mizan" && <MizanLiveTabPanel />}
    </DnaChamber>
  );
}
