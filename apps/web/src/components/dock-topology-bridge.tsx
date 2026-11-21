"use client";

import Link from "next/link";
import { DnaBadge, DnaButton } from "@moonwitness/ui/imperium";
import { ECOSYSTEM_RUNTIME_CATALOG } from "@/data/empire-canon-codex";
import type { useEcosystemTelemetry } from "@/lib/use-ecosystem-telemetry";

const LOCAL_WEB_ROUTES: readonly { readonly href: string; readonly label: string }[] = [
  { href: "/dock", label: "Chronicle Dock" },
  { href: "/mission-control", label: "Command Center" },
  { href: "/intelligence", label: "RIOT Intelligence" },
  { href: "/skin-lab", label: "7-DNA Skin Lab" },
];

export type EcosystemTelemetrySnapshot = ReturnType<typeof useEcosystemTelemetry>;

export function DockTopologyBridge({
  telemetry,
}: {
  readonly telemetry: EcosystemTelemetrySnapshot;
}) {
  return (
    <div className="mt-5 border-t border-[var(--dna-accent)]/20 pt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
        <span className="text-[var(--dna-accent)]">ECOSYSTEM TOPOLOGY BRIDGE</span>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`border px-2 py-0.5 ${
              telemetry.status === "online"
                ? "border-[var(--dna-accent)]/55 bg-[var(--dna-accent)]/15 text-[var(--dna-text)]"
                : "border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] text-[var(--dna-muted)]"
            }`}
          >
            {telemetry.status === "checking"
              ? "PROBING ECOSYSTEM…"
              : telemetry.status === "online"
                ? `API ONLINE · DB:${(telemetry.databaseStatus ?? "OK").toUpperCase()} · ${telemetry.timelineTotal ?? 0} EVENTS · ${telemetry.erasCount ?? 0} ERAS`
                : telemetry.runtimeMode === "cloudflare-edge"
                  ? "CLOUDFLARE EDGE · ORIGIN API STANDBY"
                  : "CANON SPEC MODE · LOCAL API STANDBY"}
          </span>
          <DnaButton
            type="button"
            tone="secondary"
            onClick={telemetry.refresh}
            disabled={telemetry.refreshing}
            className="min-h-[34px] px-3 py-0.5 font-mono text-[10px] tracking-[0.14em] text-[var(--dna-accent)] hover:text-[var(--dna-text)] disabled:opacity-50"
          >
            {telemetry.refreshing ? "PROBING…" : "REFRESH"}
          </DnaButton>
        </div>
      </div>

      {/* Real Live Public Cloudflare Edge Portals */}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 font-mono text-[10px]">
        {ECOSYSTEM_RUNTIME_CATALOG.liveEdges
          .filter((edge) => edge.id !== "sanctuary")
          .map((edge) => {
            const liveProbe = telemetry.edges.find((e) => e.id === edge.id);
            const isUp = liveProbe?.status === "online";
            return (
              <a
                key={edge.id}
                href={edge.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] px-3 py-2 text-[var(--dna-text)] hover:border-[var(--dna-text)] hover:bg-[var(--dna-surface-elevated)] transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold truncate">{edge.hostname} ↗</div>
                  <div className="text-[9.5px] text-[var(--dna-muted)] truncate">
                    {edge.workerName}
                  </div>
                </div>
                <span
                  className={`shrink-0 border px-1.5 py-0.5 text-[9.5px] ${
                    isUp
                      ? "border-[var(--dna-accent)]/55 bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                      : "border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] text-[var(--dna-muted)]"
                  }`}
                >
                  {liveProbe
                    ? isUp &&
                      typeof liveProbe.latencyMs === "number" &&
                      liveProbe.source === "live-http-probe"
                      ? `LIVE · ${liveProbe.latencyMs}ms`
                      : liveProbe.status.toUpperCase()
                    : "EDGE"}
                </span>
              </a>
            );
          })}
      </div>

      {telemetry.services.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 font-mono text-[10px]">
          {telemetry.services.map((svc) => (
            <div
              key={svc.id}
              className={`border px-2.5 py-1.5 ${
                svc.status === "online"
                  ? "border-[var(--dna-accent)]/45 bg-[var(--dna-accent)]/10 text-[var(--dna-text)]"
                  : svc.status === "degraded"
                    ? "border-[var(--dna-accent)]/35 bg-[var(--dna-canvas)] text-[var(--dna-accent)]"
                    : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)]"
              }`}
            >
              <div className="font-bold tracking-[0.04em]">{svc.name.toUpperCase()}</div>
              <div className="mt-0.5 text-[10px]">
                {svc.status === "online" &&
                typeof svc.latencyMs === "number" &&
                svc.source === "live-http-probe"
                  ? `ONLINE · ${svc.latencyMs}ms`
                  : telemetry.runtimeMode === "cloudflare-edge"
                    ? "LOCAL STACK"
                    : svc.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}

      {telemetry.git?.available && (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] px-3 py-2 font-mono text-[10px] text-[var(--dna-muted)]">
          <span>
            GIT WORKSPACE:{" "}
            <strong className="text-[var(--dna-text)]">
              {telemetry.git.branch ?? "HEAD"} ({telemetry.git.headShort ?? "—"})
            </strong>
          </span>
          <span className="text-[var(--dna-accent)]">
            {telemetry.git.dirtyCount > 0
              ? `${telemetry.git.dirtyCount} CHANGED FILES`
              : "CLEAN TREE"}
            {telemetry.git.lastCommitSubject ? ` · ${telemetry.git.lastCommitSubject}` : ""}
          </span>
        </div>
      )}

      {telemetry.codexGovernance?.source === "cloudflare-d1" && (
        <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] px-3 py-2.5 space-y-1.5 font-mono text-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[var(--dna-accent)]">
            <span>CLOUDFLARE D1 · SOVEREIGN-CODEX-DB LIVE</span>
            <span className="text-[var(--dna-text)]">
              {telemetry.codexGovernance.milestonesCount} MILESTONES ·{" "}
              {telemetry.codexGovernance.tasksCount} TASKS · {telemetry.codexGovernance.docsCount}{" "}
              DOCS · {telemetry.codexGovernance.releasesCount} RELEASES
            </span>
          </div>
          {telemetry.codexGovernance.latestReleases.length > 0 && (
            <div className="flex flex-wrap gap-1.5 text-[9.5px] text-[var(--dna-muted)]">
              {telemetry.codexGovernance.latestReleases.slice(0, 2).map((rel) => (
                <DnaBadge key={rel.tag} className="font-mono text-[9.5px] text-[var(--dna-accent)]">
                  {rel.tag} ({rel.channel})
                </DnaBadge>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <DnaButton
          asChild
          tone="secondary"
          className="min-h-0 inline-flex items-center px-3.5 py-1 font-mono text-[10px] tracking-[0.12em] text-[var(--dna-accent)] uppercase"
        >
          <Link href="/scriptures">4-SCRIPTURE STUDIO &rsaquo;</Link>
        </DnaButton>
        <DnaButton
          asChild
          tone="secondary"
          className="min-h-0 inline-flex items-center px-3.5 py-1 font-mono text-[10px] tracking-[0.12em] text-[var(--dna-accent)] uppercase"
        >
          <Link href="/mtime">M-TIME OBSERVATORY &rsaquo;</Link>
        </DnaButton>
        <DnaButton
          asChild
          tone="secondary"
          className="min-h-0 inline-flex items-center px-3.5 py-1 font-mono text-[10px] tracking-[0.12em] text-[var(--dna-muted)] uppercase"
        >
          <Link href="/codex">CODEX DOORS &rsaquo;</Link>
        </DnaButton>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {LOCAL_WEB_ROUTES.map((link) => (
          <DnaButton
            key={link.href}
            asChild
            tone="secondary"
            className="min-h-0 inline-flex items-center px-3.5 py-1 font-mono text-[10px] tracking-[0.12em] text-[var(--dna-muted)] uppercase hover:text-[var(--dna-text)]"
          >
            <Link href={link.href}>{link.label} &rsaquo;</Link>
          </DnaButton>
        ))}
      </div>
    </div>
  );
}
