"use client";

import { useState } from "react";
import { CutoutArtwork, ZineButton } from "@moonwitness/ui";
import { MtimeHorizon } from "@moonwitness/ui/icons";
import {
  useRiotAiHealth,
  type RiotAiConfig,
  type RiotAiConfigHistoryEntry,
  type RiotAiModel,
  type RiotAiUsageOverview,
} from "@/lib/api/riot-ai";
import { ArchiveMemoryBridge } from "./ArchiveMemoryBridge";
import { IntelligenceChatConsole } from "./IntelligenceChatConsole";
import {
  IntelligencePolicyPanel,
  isPermissionFailure,
  type IntelligenceUsageEntry,
} from "./IntelligencePolicyPanel";
import { IntelligenceUsagePanel } from "./IntelligenceUsagePanel";

interface IntelligenceDashboardProps {
  models: RiotAiModel[];
  modelsLoading: boolean;
  modelsError: string | null;
  onRefreshModels: () => void;
  query: string;
  config: RiotAiConfig | null;
  configError: string | null;
  canEditConfig: boolean;
  canChat?: boolean;
  usage: RiotAiUsageOverview | null;
  usageError: string | null;
  onRefreshConfig: () => void;
  onRefreshUsage: () => void;
  usageEntries: IntelligenceUsageEntry[];
  usageLoading: boolean;
  configHistory: RiotAiConfigHistoryEntry[];
  historyLoading: boolean;
  configHistoryError: string | null;
  onRefreshHistory: () => void;
  onSaveConfig: (input: {
    label: string;
    enabled: boolean;
    preferredModel: string | null;
  }) => Promise<void>;
}

function statusLabel(status: string | undefined, loading: boolean, failed: boolean): string {
  if (loading) return "CHECKING";
  if (failed) return "UNAVAILABLE";
  if (status === "healthy") return "ONLINE";
  if (status === "unhealthy") return "OFFLINE";
  return "NOT CONFIGURED";
}

export function IntelligenceDashboard({
  models,
  modelsLoading,
  modelsError,
  onRefreshModels,
  query,
  config,
  configError,
  canEditConfig,
  canChat = canEditConfig,
  usage,
  usageError,
  onRefreshConfig,
  onRefreshUsage,
  usageEntries,
  usageLoading,
  configHistory,
  historyLoading,
  configHistoryError,
  onRefreshHistory,
  onSaveConfig,
}: IntelligenceDashboardProps) {
  const health = useRiotAiHealth();
  const [draft, setDraft] = useState("");
  const permissionError = isPermissionFailure(modelsError);
  const healthFailure = health.isError || health.data?.status === "unhealthy";
  const runtimeConfigurationFailure =
    health.data?.status === "misconfigured" || health.data?.status === "unconfigured";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8">
      <header className="relative flex flex-col justify-between gap-5 overflow-hidden border-b-2 border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <CutoutArtwork
          id="oscilloscope-crt"
          decorative
          className="pointer-events-none absolute right-24 top-0 hidden h-24 w-24 text-[var(--primary)]/15 md:block"
        />
        <CutoutArtwork
          id="radar-sweep"
          decorative
          className="pointer-events-none absolute right-2 top-0 hidden h-24 w-24 text-[var(--accent)]/15 lg:block"
        />
        <div>
          <p className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-[var(--primary)]">
            <MtimeHorizon className="h-4 w-4" />
            <span>LOCAL INFERENCE / OPERATOR CONSOLE</span>
          </p>
          <h1 className="mt-2 font-brush text-4xl text-[var(--foreground)] sm:text-5xl">
            RIOT INTELLIGENCE
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
            Inspect the configured local runtime and run an authenticated model conversation.
            Prompts are sent only to the operator-configured inference endpoint.
          </p>
        </div>
        <ZineButton
          type="button"
          tone="blue"
          onClick={() => {
            void health.refetch();
            onRefreshModels();
          }}
          disabled={health.isFetching || modelsLoading}
          className="min-h-11 px-4 py-2 text-xs disabled:cursor-wait disabled:opacity-50"
        >
          {health.isFetching || modelsLoading ? "REFRESHING…" : "REFRESH STATUS"}
        </ZineButton>
      </header>

      <section aria-label="Inference runtime status" className="grid gap-3 sm:grid-cols-3">
        <div className="border-2 border-[var(--border)] bg-[var(--card)] p-4">
          <p className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
            RUNTIME
          </p>
          <p className="mt-2 font-brush text-xl text-[var(--foreground)]">OLLAMA</p>
          <p
            className={`mt-1 text-xs ${
              health.data?.status === "healthy" ? "text-emerald-400" : "text-[var(--primary)]"
            }`}
            role="status"
          >
            {statusLabel(health.data?.status, health.isLoading, health.isError)}
          </p>
        </div>
        <div className="border-2 border-[var(--border)] bg-[var(--card)] p-4">
          <p className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
            RESPONSE TIME
          </p>
          <p className="mt-2 font-brush text-xl text-[var(--foreground)]">
            {health.data?.latencyMs != null ? `${health.data.latencyMs} ms` : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {health.data?.lastCheckAt
              ? `Checked ${new Date(health.data.lastCheckAt).toLocaleTimeString()}`
              : "Awaiting health check"}
          </p>
        </div>
        <div className="border-2 border-[var(--border)] bg-[var(--card)] p-4">
          <p className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
            AVAILABLE MODELS
          </p>
          <p className="mt-2 font-brush text-xl text-[var(--foreground)]">{models.length}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Allowed by server configuration
          </p>
        </div>
      </section>

      {(healthFailure || runtimeConfigurationFailure || permissionError) && (
        <div
          className="border-2 border-[var(--yellow)]/50 bg-[var(--card)] p-4 text-sm text-[var(--foreground)]"
          role="alert"
        >
          <p className="font-brush text-lg text-[var(--primary)]">
            {permissionError
              ? "OPERATOR ACCESS REQUIRED"
              : health.data?.status === "misconfigured"
                ? "INFERENCE CONFIGURATION INVALID"
                : health.data?.status === "unconfigured"
                  ? "INFERENCE RUNTIME NOT CONFIGURED"
                  : "INFERENCE RUNTIME UNAVAILABLE"}
          </p>
          <p className="mt-1">
            {permissionError
              ? "Your account cannot access RIOT Intelligence. Sign in with an authorized operator account."
              : runtimeConfigurationFailure
                ? "An operator must configure a valid approved local inference endpoint before it can be used."
                : health.isError
                  ? health.error instanceof Error
                    ? health.error.message
                    : "Could not check the local inference runtime."
                  : (health.data?.error ?? "The configured runtime did not pass its health check.")}
          </p>
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <IntelligencePolicyPanel
          models={models}
          modelsLoading={modelsLoading}
          config={config}
          configError={configError}
          canEditConfig={canEditConfig}
          configHistory={configHistory}
          historyLoading={historyLoading}
          configHistoryError={configHistoryError}
          onRefreshConfig={onRefreshConfig}
          onRefreshHistory={onRefreshHistory}
          onConfigSaved={() => {
            onRefreshConfig();
            onRefreshModels();
            void health.refetch();
          }}
          onSaveConfig={onSaveConfig}
        />
        <IntelligenceUsagePanel
          canEditConfig={canEditConfig}
          usage={usage}
          usageError={usageError}
          usageEntries={usageEntries}
          usageLoading={usageLoading}
          onRefreshUsage={onRefreshUsage}
        />
      </section>

      <ArchiveMemoryBridge
        onAttachContext={(snippet) =>
          setDraft((previous) =>
            previous.trim() ? `${previous.trimEnd()}\n\n${snippet}` : snippet,
          )
        }
      />

      <IntelligenceChatConsole
        models={models}
        modelsLoading={modelsLoading}
        modelsError={modelsError}
        permissionError={permissionError}
        query={query}
        canChat={canChat}
        draft={draft}
        onDraftChange={setDraft}
        onRefreshModels={onRefreshModels}
      />
    </div>
  );
}
