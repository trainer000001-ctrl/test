import { DHGS_13_STEPS, OX_DX_SEVEN_ZONES, SWING_SWING_KEY_ROTATIONS } from "./codex-data";

export interface SrgblCriterionWeight {
  readonly weight: number;
  readonly confidence: number;
  readonly intensity: number;
  readonly direction: number;
}

export interface WsiSemanticFrameInput {
  readonly statement: string;
  readonly sourceRef: string;
  readonly agent: string;
  readonly recipient: string;
  readonly domain: string;
  readonly scope: string;
  readonly genre: string;
  readonly swingDepth: number;
}

export interface WsiRotationHop {
  readonly hop: number;
  readonly operator: string;
  readonly status: "CANDIDATE_ROTATION" | "BOUNDED";
  readonly prompt: string;
}

export interface WsiSemanticFrameResult {
  readonly frameStatus: "ONSIDE" | "OFFSIDE";
  readonly missingDimensions: readonly string[];
  readonly boundedDepth: number;
  readonly rotations: readonly WsiRotationHop[];
  readonly invariant: string;
}

export function evaluateWsiSemanticFrame(input: WsiSemanticFrameInput): WsiSemanticFrameResult {
  const missing: string[] = [];
  if (!input.agent.trim()) missing.push("AGENT");
  if (!input.recipient.trim()) missing.push("RECIPIENT");
  if (!input.domain.trim()) missing.push("DOMAIN");
  if (!input.scope.trim()) missing.push("SCOPE");
  if (!input.genre.trim()) missing.push("GENRE");
  if (!input.sourceRef.trim()) missing.push("SOURCE_REF");

  const boundedDepth = Math.max(0, Math.min(3, Math.round(input.swingDepth)));
  const rotations: WsiRotationHop[] = [];
  for (let i = 0; i < boundedDepth; i++) {
    const operator = SWING_SWING_KEY_ROTATIONS[i] ?? `ROTATION_${i + 1}`;
    rotations.push({
      hop: i + 1,
      operator,
      status: "CANDIDATE_ROTATION",
      prompt: `Inspect "${input.statement.slice(0, 64)}" via ${operator} within scope "${input.scope || "UNSPECIFIED"}" (${input.sourceRef || "NO_SOURCE"}).`,
    });
  }

  return {
    frameStatus: missing.length === 0 ? "ONSIDE" : "OFFSIDE",
    missingDimensions: missing,
    boundedDepth,
    rotations,
    invariant:
      "P18 INVARIANT: All 5 frame dimensions must be explicitly populated before ONSIDE status; Swing rotations never exceed 3 hops.",
  };
}

export interface SrgblModelInput {
  readonly question: string;
  readonly observations: readonly string[];
  readonly governanceRules: readonly string[];
  readonly actorsAndMeanings: readonly string[];
  readonly responsibleActions: readonly string[];
  readonly weightedCriteria: readonly SrgblCriterionWeight[];
}

export interface SrgblModelResult {
  readonly question: string;
  readonly stages: {
    readonly R1_Reality: readonly string[];
    readonly G2_GoverningOrder: readonly string[];
    readonly B3_Being: readonly string[];
    readonly L4_Light: readonly string[];
  };
  readonly completeness: {
    readonly filledLevels: number;
    readonly ratio: number;
  };
  readonly weightedScore: number | "UNKNOWN";
  readonly neutralityInvariant: string;
}

function cleanLines(lines: readonly string[]): readonly string[] {
  return lines.map((l) => l.trim()).filter(Boolean);
}

export function evaluateSrgblModel(input: SrgblModelInput): SrgblModelResult {
  const r1 = cleanLines(input.observations);
  const g2 = cleanLines(input.governanceRules);
  const b3 = cleanLines(input.actorsAndMeanings);
  const l4 = cleanLines(input.responsibleActions);

  const filledLevels = [r1, g2, b3, l4].filter((arr) => arr.length > 0).length;
  const ratio = filledLevels / 4;

  let numerator = 0;
  let denominator = 0;
  for (const row of input.weightedCriteria) {
    const w = Math.max(0, Number(row.weight) || 0);
    const c = Math.max(0, Math.min(1, Number(row.confidence) || 0));
    const intensity = Math.max(0, Number(row.intensity) || 0);
    const dir = Math.max(-2, Math.min(2, Number(row.direction) || 0));
    numerator += w * c * intensity * dir;
    denominator += w * c * intensity;
  }

  const weightedScore: number | "UNKNOWN" =
    denominator === 0 ? "UNKNOWN" : Number((numerator / denominator).toFixed(3));

  return {
    question: input.question.trim(),
    stages: {
      R1_Reality: r1,
      G2_GoverningOrder: g2,
      B3_Being: b3,
      L4_Light: l4,
    },
    completeness: {
      filledLevels,
      ratio,
    },
    weightedScore,
    neutralityInvariant:
      "SRGBL v8 ZERO-DENOMINATOR GUARD: When weighted confidence denominator equals 0, output MUST return UNKNOWN rather than fabricated certainty.",
  };
}

export interface OxDxHierarchyHit {
  readonly zoneIndex: number;
  readonly zoneName: string;
  readonly levelRange: string;
  readonly level: string;
}

export function queryOxDxHierarchy(query: string): readonly OxDxHierarchyHit[] {
  const needle = query.trim().toLowerCase();
  const out: OxDxHierarchyHit[] = [];
  OX_DX_SEVEN_ZONES.forEach((zone, idx) => {
    for (const level of zone.levels) {
      if (
        !needle ||
        zone.zoneName.toLowerCase().includes(needle) ||
        zone.levelRange.toLowerCase().includes(needle) ||
        level.toLowerCase().includes(needle)
      ) {
        out.push({
          zoneIndex: idx + 1,
          zoneName: zone.zoneName,
          levelRange: zone.levelRange,
          level,
        });
      }
    }
  });
  return out;
}

export interface DhgsEvaluationResult {
  readonly completedCount: number;
  readonly totalSteps: number;
  readonly status: "VERIFIED_LOOP" | "IN_PROGRESS";
  readonly nextRequiredStep: string | null;
}

export function evaluateDhgsAssuranceLoop(
  completedCodes: readonly string[],
): DhgsEvaluationResult {
  const doneSet = new Set(completedCodes.map((c) => c.trim().toUpperCase()));
  let completedCount = 0;
  let nextRequiredStep: string | null = null;

  for (const step of DHGS_13_STEPS) {
    if (doneSet.has(step.code.toUpperCase())) {
      completedCount += 1;
    } else if (nextRequiredStep === null) {
      nextRequiredStep = `${String(step.stepNumber).padStart(2, "0")} · ${step.code}`;
    }
  }

  return {
    completedCount,
    totalSteps: DHGS_13_STEPS.length,
    status: completedCount === DHGS_13_STEPS.length ? "VERIFIED_LOOP" : "IN_PROGRESS",
    nextRequiredStep,
  };
}

export interface AqelToken {
  readonly kind: "KEYWORD" | "IDENTIFIER" | "STRING" | "OPERATOR" | "COMMENT";
  readonly value: string;
  readonly line: number;
}

export interface AqelStatement {
  readonly line: number;
  readonly keyword: string;
  readonly target: string;
}

export interface AqelParseResult {
  readonly tokens: readonly AqelToken[];
  readonly statements: readonly AqelStatement[];
  readonly diagnostics: readonly string[];
}

const AQEL_KEYWORDS = new Set([
  "عرّف",
  "عرف",
  "حقيقة",
  "قاعدة",
  "تحقق",
  "استنتج",
  "شاهد",
  "DEFINE",
  "FACT",
  "RULE",
  "VERIFY",
  "INFER",
]);

export function tokenizeAndParseAqel(source: string): AqelParseResult {
  const tokens: AqelToken[] = [];
  const statements: AqelStatement[] = [];
  const diagnostics: string[] = [];

  const lines = source.split(/\r?\n/);
  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
      tokens.push({ kind: "COMMENT", value: trimmed, line: lineNum });
      return;
    }

    const parts = trimmed.match(/"[^"]*"|=|[^\s=]+/g) ?? [];
    if (parts.length === 0) return;

    const first = parts[0]!;
    const isKw = AQEL_KEYWORDS.has(first);
    for (const part of parts) {
      if (part.startsWith('"') && part.endsWith('"')) {
        tokens.push({ kind: "STRING", value: part, line: lineNum });
      } else if (part === "=") {
        tokens.push({ kind: "OPERATOR", value: part, line: lineNum });
      } else if (AQEL_KEYWORDS.has(part)) {
        tokens.push({ kind: "KEYWORD", value: part, line: lineNum });
      } else {
        tokens.push({ kind: "IDENTIFIER", value: part, line: lineNum });
      }
    }

    if (isKw) {
      const target = parts.slice(1).join(" ").trim();
      if (!target) {
        diagnostics.push(`Line ${lineNum}: Keyword "${first}" requires a target expression.`);
      } else {
        statements.push({ line: lineNum, keyword: first, target });
      }
    } else {
      diagnostics.push(`Line ${lineNum}: Unexpected leading token "${first}".`);
    }
  });

  return { tokens, statements, diagnostics };
}
