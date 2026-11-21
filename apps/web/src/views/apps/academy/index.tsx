"use client";

import { useEffect, useState, type FormEvent } from "react";
import { requestApiJson } from "@moonwitness/contracts/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CutoutArtwork,
  Input,
  SkinOrnament,
  Textarea,
} from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";
import { useTranslation } from "@/hocs/TranslationWrapper";

interface WitnessModuleEntry {
  code: string;
  version?: string;
  label: string;
}

interface WitnessRunResult {
  run?: {
    run_key?: string;
    module_code?: string;
    findings_count?: number;
    digest?: string;
    run_status?: string;
  };
  output?: {
    module?: string;
    summary?: string;
    findings?: Array<Record<string, unknown>>;
  };
}

interface MizanEvaluateResult {
  assessment?: {
    case_key?: string;
    method?: string;
    general_weight?: number;
    prophetic_reference_weight?: number;
    total_weight?: number;
    rating?: number;
    confidence?: string;
    limitation?: string | null;
  };
}

export function AcademyWitnessMizanView() {
  const { dictionary } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeModel, setActiveModel] = useState<string>("witness.claim");
  const [modules, setModules] = useState<WitnessModuleEntry[]>([]);
  const [selectedModule, setSelectedModule] = useState("revelation-query");
  const [claimText, setClaimText] = useState(
    "All primary witness testimonies require explicit provenance hashes and non-coercion.",
  );
  const [sourceRef, setSourceRef] = useState("QS 2:256 / P18-CANON");
  const [runResult, setRunResult] = useState<WitnessRunResult | null>(null);
  const [replayStatus, setReplayStatus] = useState<string | null>(null);
  const [mizanCaseKey, setMizanCaseKey] = useState("CASE-MIZAN-01");
  const [mizanRating, setMizanRating] = useState("4.2");
  const [mizanResult, setMizanResult] = useState<MizanEvaluateResult["assessment"] | null>(null);
  const [mizanError, setMizanError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    requestApiJson<{ modules?: WitnessModuleEntry[] }>("/api/v1/witness/engine/modules")
      .then((res) => {
        if (active && Array.isArray(res?.modules)) setModules(res.modules);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleRunWitnessEngine(e: FormEvent) {
    e.preventDefault();
    setReplayStatus(null);
    try {
      const res = await requestApiJson<WitnessRunResult>("/api/v1/witness/engine/run", {
        method: "POST",
        body: JSON.stringify({
          moduleCode: selectedModule,
          moduleVersion: "1.0.0",
          input: {
            q: sourceRef.trim(),
            claim: claimText.trim(),
            sourceRef: sourceRef.trim(),
          },
        }),
      });
      if (res?.run || res?.output) setRunResult(res);
    } catch (err) {
      setReplayStatus(err instanceof Error ? err.message : "Witness engine run failed.");
    }
  }

  async function handleReplayRun() {
    const runKey = runResult?.run?.run_key;
    if (!runKey) return;
    try {
      const res = await requestApiJson<{ deterministicMatch?: boolean }>(
        `/api/v1/witness/engine/runs/${encodeURIComponent(runKey)}/replay`,
        { method: "POST" },
      );
      setReplayStatus(
        res?.deterministicMatch
          ? `DETERMINISTIC REPLAY VERIFIED (SHA-256: ${runResult?.run?.digest})`
          : "Replay completed.",
      );
    } catch (err) {
      setReplayStatus(err instanceof Error ? err.message : "Replay request failed.");
    }
  }

  async function handleEvaluateMizan(e: FormEvent) {
    e.preventDefault();
    setMizanError(null);
    const boundedRating = Math.min(4.5, Math.max(0, Number(mizanRating) || 4.0));
    try {
      const res = await requestApiJson<MizanEvaluateResult>("/api/v1/mizan/evaluate", {
        method: "POST",
        body: JSON.stringify({
          case_key: mizanCaseKey.trim() || `CASE-${Date.now()}`,
          general_sufficient: true,
          balance_satisfied: true,
          internal_reference_verified: true,
          prophetic_reference_relevant: true,
          primary_filter_passed: true,
          secondary_filter_passed: true,
          power_right_score: 9,
          power_left_score: 6,
          prophetic_reference_weight: 4,
          rating: boundedRating,
          confidence: "high",
        }),
      });
      if (res?.assessment) setMizanResult(res.assessment);
    } catch (err) {
      setMizanError(err instanceof Error ? err.message : "Mizan evaluation failed.");
    }
  }

  const models = [
    { id: "witness.claim", label: "Witness Claims" },
    { id: "wx.passage", label: "Scripture Passages" },
    { id: "wx.root", label: "Semitic Roots" },
    { id: "wx.figure", label: "Historical Figures" },
    { id: "wx.engine.run", label: "9-Module Engine Runs" },
    { id: "mizan.case", label: "Mizan Cases" },
    { id: "mizan.assessment", label: "Mizan Assessments" },
  ] as const;

  return (
    <ConsoleShellAdapter
      breadcrumb={dictionary.navigation.academy}
      plane="creator"
      activeOverride="academy"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: dictionary.shell.searchPlaceholder,
      }}
    >
      <div className="space-y-4">
        <Card className="relative overflow-hidden">
          <SkinOrnament slot="corner" className="start-2 top-2" />
          <CutoutArtwork
            id="witness-silhouette"
            decorative
            className="pointer-events-none absolute -top-2 hidden h-24 w-24 opacity-20 sm:block ltr:-right-4 rtl:-left-4"
          />
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">9-MODULE WITNESS ENGINE (WX-01..09)</Badge>
              <Badge variant="default">MIZAN BALANCE</Badge>
              {modules.length > 0 ? (
                <Badge variant="secondary">{modules.length} ACTIVE MODULES</Badge>
              ) : null}
            </div>
            <h1 className="font-semibold leading-none tracking-tight text-lg uppercase">
              {dictionary.apps.academyTitle}
            </h1>
            <CardDescription>{dictionary.apps.academySubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <form
              onSubmit={(e) => void handleRunWitnessEngine(e)}
              className="space-y-2.5 border border-[var(--border)] bg-[var(--background)] p-4"
            >
              <div className="font-mono text-xs font-bold text-[var(--primary)]">
                WITNESS 9-MODULE DETERMINISTIC PIPELINE
              </div>
              {modules.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {modules.slice(0, 5).map((mod) => (
                    <Button
                      key={mod.code}
                      type="button"
                      size="sm"
                      variant={selectedModule === mod.code ? "default" : "outline"}
                      onClick={() => setSelectedModule(mod.code)}
                    >
                      {mod.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              <Textarea
                rows={2}
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
                placeholder="Witness claim statement…"
                aria-label="Witness claim statement"
              />
              <Input
                value={sourceRef}
                onChange={(e) => setSourceRef(e.target.value)}
                placeholder="Primary source reference…"
                aria-label="Primary source reference"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" size="sm">
                  Execute WX-01..09 Pipeline
                </Button>
                {runResult?.run?.run_key ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleReplayRun()}
                  >
                    Verify SHA-256 Replay ({runResult.run.run_key})
                  </Button>
                ) : null}
              </div>
              {runResult ? (
                <div className="border border-[var(--border)] p-2.5 font-mono text-xs">
                  <div>
                    STATUS: <strong>{runResult.run?.run_status ?? "completed"}</strong> · FINDINGS:{" "}
                    {runResult.run?.findings_count ?? runResult.output?.findings?.length ?? 0}
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">
                    {runResult.output?.summary}
                  </div>
                  <div className="truncate text-[10px] text-[var(--muted-foreground)]">
                    HASH: {runResult.run?.digest}
                  </div>
                </div>
              ) : null}
              {replayStatus ? (
                <div className="font-mono text-xs text-[var(--primary)]">{replayStatus}</div>
              ) : null}
            </form>

            <form
              onSubmit={(e) => void handleEvaluateMizan(e)}
              className="space-y-2.5 border border-[var(--border)] bg-[var(--background)] p-4"
            >
              <div className="font-mono text-xs font-bold text-[var(--primary)]">
                MIZAN BALANCE & WEIGHTED REFERENCE EVALUATOR
              </div>
              <Input
                value={mizanCaseKey}
                onChange={(e) => setMizanCaseKey(e.target.value)}
                placeholder="Case key…"
                aria-label="Mizan case key"
              />
              <Input
                value={mizanRating}
                onChange={(e) => setMizanRating(e.target.value)}
                placeholder="Rating (0..4.5)…"
                aria-label="Mizan rating"
              />
              <Button type="submit" size="sm">
                Evaluate Mizan Balance
              </Button>
              {mizanError ? (
                <div className="font-mono text-xs text-[var(--destructive)]">{mizanError}</div>
              ) : null}
              {mizanResult ? (
                <div className="border border-[var(--border)] p-2.5 font-mono text-xs">
                  <div>
                    METHOD: <strong>{mizanResult.method}</strong> · WEIGHT:{" "}
                    {mizanResult.total_weight ?? 0}/21 · RATING: {mizanResult.rating ?? 0}/4.5
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">
                    Confidence: {mizanResult.confidence}
                  </div>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {models.map((m) => (
            <Button
              key={m.id}
              type="button"
              size="sm"
              variant={activeModel === m.id ? "default" : "outline"}
              onClick={() => setActiveModel(m.id)}
            >
              {m.label} ({m.id})
            </Button>
          ))}
        </div>

        <AutoModelConsole
          model={activeModel}
          searchQuery={search}
          domainIcon="memory"
          cutoutId="witness-silhouette"
        />
      </div>
    </ConsoleShellAdapter>
  );
}
export default AcademyWitnessMizanView;
