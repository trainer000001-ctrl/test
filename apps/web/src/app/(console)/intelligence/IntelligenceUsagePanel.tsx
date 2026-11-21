"use client";

import { Button, RadialGauge, SkinOrnament, Sparkline } from "@moonwitness/ui";
import type { RiotAiUsageOverview } from "@/lib/api/riot-ai";
import { isPermissionFailure, type IntelligenceUsageEntry } from "./IntelligencePolicyPanel";

interface IntelligenceUsagePanelProps {
  canEditConfig: boolean;
  usage: RiotAiUsageOverview | null;
  usageError: string | null;
  usageEntries: IntelligenceUsageEntry[];
  usageLoading: boolean;
  onRefreshUsage: () => void;
}

export function IntelligenceUsagePanel({
  canEditConfig,
  usage,
  usageError,
  usageEntries,
  usageLoading,
  onRefreshUsage,
}: IntelligenceUsagePanelProps) {
  return (
    <div className="border-2 border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
            LAST 30 DAYS
          </p>
          <h2 className="mt-1 font-brush text-xl text-[var(--foreground)]">Usage summary</h2>
        </div>
        {canEditConfig && (
          <Button
            type="button"
            variant="link"
            onClick={onRefreshUsage}
            className="h-auto min-h-11 px-2 py-0 text-xs"
          >
            Refresh
          </Button>
        )}
      </div>
      {!canEditConfig ? (
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Usage summaries are restricted to administrators.
        </p>
      ) : usageError ? (
        <p className="mt-4 text-sm text-[var(--primary)]" role="alert">
          {isPermissionFailure(usageError)
            ? "Administrator access is required to view usage."
            : usageError}
        </p>
      ) : !usage ? (
        <p className="mt-4 text-sm text-[var(--muted-foreground)]" role="status">
          {usageLoading ? "Loading measured usage…" : "Usage summary is unavailable."}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {typeof usage.requests === "number" && usage.requests > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="flex items-center gap-3">
                <RadialGauge
                  value={Math.max(0, usage.requests - (usage.failed ?? 0))}
                  max={usage.requests}
                  size={72}
                  label="OK RATE"
                  unit={`/${usage.requests}`}
                />
                <div>
                  <SkinOrnament slot="tag" label="TELEMETRY PULSE" />
                  <p className="mt-1 font-mono text-[11px] text-[var(--muted-foreground)]">
                    {usageEntries.length > 0
                      ? `Latency trace (${usageEntries.length} calls)`
                      : "Awaiting per-call latency trace"}
                  </p>
                </div>
              </div>
              {usageEntries.length > 0 && (
                <div className="w-40">
                  <Sparkline
                    data={usageEntries.slice(0, 16).map((entry) => entry.durationMs)}
                    height={36}
                    ariaLabel="Inference request latency trend"
                  />
                </div>
              )}
            </div>
          )}
          <dl className="grid grid-cols-2 gap-3">
            <div className="border border-[var(--border)] p-3">
              <dt className="text-[10px] tracking-widest text-[var(--muted-foreground)]">
                REQUESTS
              </dt>
              <dd className="mt-1 font-brush text-2xl text-[var(--foreground)]">
                {usage.requests ?? "Unavailable"}
              </dd>
            </div>
            <div className="border border-[var(--border)] p-3">
              <dt className="text-[10px] tracking-widest text-[var(--muted-foreground)]">FAILED</dt>
              <dd className="mt-1 font-brush text-2xl text-[var(--foreground)]">
                {usage.failed ?? "Unavailable"}
              </dd>
            </div>
            {[
              ["PROMPT TOKENS", usage.promptTokens],
              ["COMPLETION TOKENS", usage.completionTokens],
              ["TOTAL TOKENS", usage.totalTokens],
            ].map(([label, measurement]) => {
              const tokenCount = measurement as RiotAiUsageOverview["totalTokens"];
              return (
                <div key={label as string} className="border border-[var(--border)] p-3">
                  <dt className="text-[10px] tracking-widest text-[var(--muted-foreground)]">
                    {label as string}
                  </dt>
                  <dd className="mt-1 font-mono text-sm text-[var(--foreground)]">
                    {tokenCount.measurement === "measured"
                      ? tokenCount.value
                      : tokenCount.measurement === "estimated"
                        ? `At least ${tokenCount.estimatedValue}`
                        : "Unavailable"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
      {canEditConfig && !usageError && usage?.measurement === "estimated" && (
        <p className="mt-2 text-xs text-[var(--muted-foreground)]" role="status">
          Token totals are lower-bound estimates because some requests omitted usage metrics.
        </p>
      )}
      {canEditConfig && !usageError && usage?.truncated && (
        <p className="mt-3 text-xs text-[var(--primary)]" role="status">
          Showing the latest 5,000 records; exact totals are unavailable because older records are
          omitted. Displayed token lower bounds remain estimates.
        </p>
      )}
      {canEditConfig && !usageError && usageEntries.length > 0 && (
        <div className="mt-4 overflow-x-auto border border-[var(--border)]">
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead className="bg-[var(--background)] font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
              <tr>
                <th scope="col" className="p-3">
                  Time
                </th>
                <th scope="col" className="p-3">
                  Actor
                </th>
                <th scope="col" className="p-3">
                  Model
                </th>
                <th scope="col" className="p-3">
                  Outcome
                </th>
                <th scope="col" className="p-3">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] text-[var(--foreground)]">
              {usageEntries.map((entry) => (
                <tr key={`${entry.actorId}-${entry.occurredAt}-${entry.model}`}>
                  <td className="whitespace-nowrap p-3">
                    {new Date(entry.occurredAt).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono">{entry.actorId}</td>
                  <td className="p-3 font-mono">{entry.model}</td>
                  <td className="p-3">{entry.outcome}</td>
                  <td className="p-3">{entry.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canEditConfig &&
        !usageError &&
        usage?.measurement === "measured" &&
        usage.requests === 0 &&
        !usage.truncated && (
          <p className="mt-3 text-xs text-[var(--muted-foreground)]" role="status">
            No inference requests have been recorded in the reporting period.
          </p>
        )}
    </div>
  );
}
