"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Checkbox, Input, NativeSelect, ZineButton } from "@moonwitness/ui";
import type { RiotAiConfig, RiotAiConfigHistoryEntry, RiotAiModel } from "@/lib/api/riot-ai";

export interface IntelligenceUsageEntry {
  actorId: string;
  provider: string;
  model: string;
  outcome: "success" | "failure";
  durationMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  errorCode: string | null;
  occurredAt: string;
}

export function isPermissionFailure(message: string | null): boolean {
  return message !== null && /\b(401|403)\b|not authenticated|forbidden/i.test(message);
}

interface IntelligencePolicyPanelProps {
  models: RiotAiModel[];
  modelsLoading: boolean;
  config: RiotAiConfig | null;
  configError: string | null;
  canEditConfig: boolean;
  configHistory: RiotAiConfigHistoryEntry[];
  historyLoading: boolean;
  configHistoryError: string | null;
  onRefreshConfig: () => void;
  onRefreshHistory: () => void;
  onConfigSaved: () => void;
  onSaveConfig: (input: {
    label: string;
    enabled: boolean;
    preferredModel: string | null;
  }) => Promise<void>;
}

export function IntelligencePolicyPanel({
  models,
  modelsLoading,
  config,
  configError,
  canEditConfig,
  configHistory,
  historyLoading,
  configHistoryError,
  onRefreshConfig,
  onRefreshHistory,
  onConfigSaved,
  onSaveConfig,
}: IntelligencePolicyPanelProps) {
  const [configLabel, setConfigLabel] = useState("Local inference");
  const [configEnabled, setConfigEnabled] = useState(false);
  const [configModel, setConfigModel] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);
  const [configFailure, setConfigFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setConfigLabel(config.label);
    setConfigEnabled(config.enabled);
    setConfigModel(config.preferredModel ?? "");
  }, [config]);

  async function saveConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEditConfig || configSaving || (configEnabled && !configModel)) return;
    setConfigSaving(true);
    setConfigFailure(null);
    setConfigNotice(null);
    try {
      await onSaveConfig({
        label: configLabel.trim(),
        enabled: configEnabled,
        preferredModel: configModel || null,
      });
      setConfigNotice("Operator settings saved.");
      onConfigSaved();
    } catch (error) {
      setConfigFailure(
        error instanceof Error ? error.message : "Could not save operator settings.",
      );
    } finally {
      setConfigSaving(false);
    }
  }

  return (
    <div className="border-2 border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
            OPERATOR POLICY
          </p>
          <h2 className="mt-1 font-brush text-xl text-[var(--foreground)]">Runtime preference</h2>
        </div>
        <span className="rounded-full border border-[var(--border)] px-3 py-1 font-mono text-[10px] text-[var(--muted-foreground)]">
          {config?.enabled ? "ENABLED" : "DISABLED"}
        </span>
      </div>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        The endpoint remains server-side; this panel only selects an approved model and runtime
        state.
      </p>
      {configError ? (
        <div className="mt-4 text-sm text-[var(--primary)]" role="alert">
          <p>{isPermissionFailure(configError) ? "Operator settings unavailable." : configError}</p>
          <Button
            type="button"
            variant="link"
            onClick={onRefreshConfig}
            className="mt-2 h-auto min-h-11 p-0 text-xs"
          >
            Retry configuration
          </Button>
        </div>
      ) : !config ? (
        <p className="mt-4 text-sm text-[var(--muted-foreground)]" role="status">
          Loading operator settings…
        </p>
      ) : !canEditConfig ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] tracking-widest text-[var(--muted-foreground)]">PROFILE</dt>
            <dd className="mt-1 text-[var(--foreground)]">{config.label}</dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-widest text-[var(--muted-foreground)]">
              PREFERRED MODEL
            </dt>
            <dd className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">
              {config.preferredModel ?? "Not selected"}
            </dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={saveConfiguration} className="mt-4 space-y-3">
          <label className="block text-xs text-[var(--muted-foreground)]">
            Profile label
            <Input
              value={configLabel}
              onChange={(event) => setConfigLabel(event.target.value)}
              maxLength={120}
              required
              className="mt-1 min-h-11 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--blue)]"
            />
          </label>
          <label className="block text-xs text-[var(--muted-foreground)]">
            Approved model preference
            <NativeSelect
              value={configModel}
              onChange={(event) => setConfigModel(event.target.value)}
              disabled={modelsLoading || models.length === 0}
              className="mt-1 min-h-11 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--blue)] disabled:opacity-50"
            >
              <option value="">No preferred model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.id})
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-[var(--foreground)]">
            <Checkbox
              checked={configEnabled}
              onCheckedChange={(checked) => setConfigEnabled(checked === true)}
            />
            Enable local inference for authorized operators
          </label>
          {configFailure && (
            <p className="text-sm text-red-300" role="alert">
              {configFailure}
            </p>
          )}
          {configNotice && (
            <p className="text-sm text-emerald-400" role="status">
              {configNotice}
            </p>
          )}
          <ZineButton
            type="submit"
            tone="blue"
            disabled={configSaving || (configEnabled && (!configModel || models.length === 0))}
            className="min-h-11 px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {configSaving ? "SAVING…" : "SAVE OPERATOR SETTINGS"}
          </ZineButton>
        </form>
      )}
      {canEditConfig && (
        <section
          aria-label="Configuration audit history"
          className="mt-5 border-t border-[var(--border)] pt-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
              CHANGE HISTORY
            </h3>
            <Button
              type="button"
              variant="link"
              onClick={onRefreshHistory}
              className="h-auto min-h-11 p-0 text-xs"
            >
              Refresh history
            </Button>
          </div>
          {configHistoryError ? (
            <p className="mt-2 text-xs text-[var(--primary)]" role="alert">
              Audit history is unavailable: {configHistoryError}
            </p>
          ) : historyLoading ? (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]" role="status">
              Loading audit history…
            </p>
          ) : configHistory.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]" role="status">
              No configuration changes are recorded yet.
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {configHistory.map((entry) => (
                <li
                  key={`${entry.entity_version}-${entry.action}`}
                  className="border border-[var(--border)] p-2 text-xs text-[var(--muted-foreground)]"
                >
                  <p>
                    {entry.action} · version {entry.entity_version} · {entry.changed_by ?? "System"}{" "}
                    · {new Date(entry.changed_at).toLocaleString()}
                  </p>
                  <p className="mt-1 break-all font-mono text-[10px] text-[var(--muted-foreground)]">
                    {entry.diff}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
