import React from "react";
import { Activity, RefreshCw, Server } from "@moonwitness/ui/icons";
import { BarChart, RadialGauge } from "@moonwitness/ui";
import { thumbSignalUrl } from "../assets/art";
import { KatanaSkyHud } from "../components/ui/KatanaSkyHud";
import { AnarchyStarSigil } from "@moonwitness/ui/artwork";
import type { DevServiceEntry, DevServiceTarget, MonitorSnapshot } from "../lib/contracts";
import {
  formatMonitorTime,
  MonitorDisksPanel,
  MonitorEcosystemPanel,
  MonitorSessionsPanel,
  MonitorWorktreesPanel,
} from "./MonitorPanels";

export interface MonitorProps {
  snapshot: MonitorSnapshot | null;
  devServices?: DevServiceEntry[];
  devActionTarget?: string | null;
  devActionError?: string;
  loading: boolean;
  error: string;
  autoMonitor: boolean;
  desktop: boolean;
  onToggleAuto: (enabled: boolean) => void;
  onRefresh: () => void;
  onInspectRepoPatch: (repositoryId: string) => void;
  onOpenUrl: (url: string) => void;
  onStartDev?: (target: DevServiceTarget) => void;
  onStopDev?: (target: DevServiceTarget) => void;
}

const SERVICE_FALLBACKS = [
  { id: "allah", name: "A-L-L-A-H Sanctuary", url: "http://127.0.0.1:3000" },
  { id: "web", name: "MoonWitness Web", url: "http://127.0.0.1:3000/moonwitness" },
  { id: "api", name: "Core API", url: "http://127.0.0.1:3002" },
  { id: "arsy", name: "ARSY Control Plane", url: "http://127.0.0.1:8787" },
  { id: "memory", name: "Memory Engine", url: "http://127.0.0.1:8000" },
] as const;

export default function Monitor({
  snapshot,
  devServices = [],
  devActionTarget = null,
  devActionError = "",
  loading,
  error,
  autoMonitor,
  desktop,
  onToggleAuto,
  onRefresh,
  onInspectRepoPatch,
  onOpenUrl,
  onStartDev,
  onStopDev,
}: MonitorProps) {
  const disks = snapshot?.disks ?? [];
  const primaryDisk = disks[0];
  const secondaryDisk = disks[1];
  const services = snapshot?.services?.length
    ? snapshot.services
    : SERVICE_FALLBACKS.map((svc) => ({
        ...svc,
        status: "offline" as const,
        http_status: null,
        latency_ms: null,
      }));
  const onlineServices = services.filter((svc) => svc.status === "online").length;
  const totalDirty = (snapshot?.repositories ?? []).reduce((acc, repo) => acc + repo.dirty_count, 0);
  const sessions = snapshot?.agent_sessions ?? [];
  const plans = snapshot?.plans ?? [];
  const devByTarget = new Map(devServices.map((entry) => [entry.id, entry]));
  const anyDevRunning =
    devServices.some((entry) => entry.managed || entry.listening) ||
    services.some((svc) => (svc.id === "allah" || svc.id === "web" || svc.id === "api") && svc.status !== "offline");
  const allDevRunning =
    (devServices.length > 0 && devServices.every((entry) => entry.managed || entry.listening)) ||
    (["web", "api"].every((id) => services.some((svc) => svc.id === id && svc.status !== "offline")));

  return (
    <section className="page-content workspace-page monitor-page">
      <header className="workspace-title">
        <div className="workspace-title-copy">
          <span className="eyebrow">00 / LIVE OVERSEER &amp; AGENT TELEMETRY</span>
          <h1>OVERSEER</h1>
          <p>
            Read-only real-time monitor for agent activity, active checkouts, C:/Z: disk pressure, and MoonWitness ecosystem ports.
          </p>
        </div>
        <div className="workspace-title-aside">
          <div className="workspace-art-plate" aria-hidden="true">
            <img src={thumbSignalUrl} alt="" loading="lazy" />
            <div className="workspace-art-scrim" />
            <div className="workspace-art-meta">
              <AnarchyStarSigil className="rs-anarchy-sigil workspace-art-sigil" />
              <span>SECTOR 00 // OVERSEER</span>
            </div>
          </div>
          <div className="monitor-head-actions">
            <button
              type="button"
              className={`outline-button ${autoMonitor ? "selected" : ""}`}
              aria-pressed={autoMonitor}
              onClick={() => onToggleAuto(!autoMonitor)}
            >
              <Activity size={14} /> AUTO 10S {autoMonitor ? "ON" : "OFF"}
            </button>
            <button type="button" className="riot-button" onClick={onRefresh} disabled={loading}>
              <RefreshCw size={15} className={loading ? "spin" : ""} /> REFRESH
            </button>
          </div>
        </div>
      </header>

      {error && <p className="inline-notice error-output">{error}</p>}
      {!desktop && (
        <p className="inline-notice">
          BROWSER PREVIEW MODE — Native C:/Z: disk steward, Antigravity session scanner, and live loopback TCP probes run inside the desktop Tauri app.
        </p>
      )}

      <KatanaSkyHud monitor={snapshot} mode="astrolabe" onOpenUrl={onOpenUrl} />

      <div className="monitor-summary-grid">
        <article className="riot-panel monitor-stat-card">
          <span className="eyebrow">SYSTEM DRIVE ({primaryDisk?.drive ?? "C:"})</span>
          <strong className={`monitor-stat-value tier-${primaryDisk?.tier ?? "unavailable"}`}>
            {primaryDisk?.available ? `${primaryDisk.free_gb.toFixed(2)} GB` : "DESKTOP ONLY"}
          </strong>
          <small>
            {primaryDisk?.available
              ? `${primaryDisk.used_pct.toFixed(0)}% used · ${(primaryDisk.tier || "calm").toUpperCase()} · Z: ${secondaryDisk?.available ? `${secondaryDisk.free_gb.toFixed(1)} GB free` : "N/A"}`
              : "Disk telemetry available in native Windows build"}
          </small>
        </article>
        <article className="riot-panel monitor-stat-card">
          <span className="eyebrow">WORKING TREE DELTA</span>
          <strong className="monitor-stat-value">{totalDirty} CHANGED</strong>
          <small>
            {(snapshot?.repositories.length ?? 0)} connected checkout(s) tracked live
          </small>
        </article>
        <article className="riot-panel monitor-stat-card">
          <span className="eyebrow">AGENT SESSIONS</span>
          <strong className="monitor-stat-value">{sessions.length} RECENT</strong>
          <small>
            {sessions[0]
              ? `Latest: ${sessions[0].last_tool} (${sessions[0].step_count} steps)`
              : "No recent local session logs detected"}
          </small>
        </article>
        <article className="riot-panel monitor-stat-card">
          <span className="eyebrow">ECOSYSTEM STACK</span>
          <strong className="monitor-stat-value">
            {onlineServices} / {services.length} ONLINE
          </strong>
          <small>
            Last poll: {snapshot?.generated_at ? formatMonitorTime(snapshot.generated_at) : "not polled"}
          </small>
        </article>
      </div>

      <section className="riot-panel" aria-label="Ecosystem visual telemetry" style={{ marginBottom: "14px" }}>
        <div className="panel-heading cream">
          <span>
            <Server size={15} /> LIVE TELEMETRY GAUGES &amp; DISTRIBUTION
          </span>
          <span>@MOONWITNESS/UI CHARTS</span>
        </div>
        <div
          className="monitor-panel-body"
          style={{
            display: "grid",
            gridTemplateColumns: "auto auto minmax(180px, 1fr)",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <RadialGauge
            value={onlineServices}
            max={Math.max(1, services.length)}
            size={104}
            label="STACK ONLINE"
            colorVar="var(--color-lime)"
            ariaLabel="Stack services online ratio"
          />
          <RadialGauge
            value={Math.round(primaryDisk?.used_pct ?? 0)}
            max={100}
            size={104}
            label={`${primaryDisk?.drive ?? "C:"} USED`}
            unit="%"
            colorVar="var(--color-orange)"
            ariaLabel="Primary disk capacity used"
          />
          <BarChart
            height={110}
            ariaLabel="Overseer telemetry counters"
            data={[
              { label: "ONLINE", value: onlineServices, colorVar: "var(--color-lime)" },
              { label: "DIRTY", value: totalDirty, colorVar: "var(--color-orange)" },
              { label: "SESS", value: sessions.length, colorVar: "var(--color-purple)" },
              { label: "PLANS", value: plans.length, colorVar: "var(--color-pink)" },
            ]}
          />
        </div>
      </section>

      <div className="monitor-grid">
        <MonitorWorktreesPanel
          repositories={snapshot?.repositories ?? []}
          onInspectRepoPatch={onInspectRepoPatch}
        />
        <MonitorSessionsPanel sessions={sessions} plans={plans} />
        <MonitorDisksPanel disks={disks} primaryDisk={primaryDisk} />
        <MonitorEcosystemPanel
          services={services}
          onlineServices={onlineServices}
          devByTarget={devByTarget}
          desktop={desktop}
          devActionTarget={devActionTarget}
          devActionError={devActionError}
          anyDevRunning={anyDevRunning}
          allDevRunning={allDevRunning}
          onOpenUrl={onOpenUrl}
          onStartDev={onStartDev}
          onStopDev={onStopDev}
        />
      </div>
    </section>
  );
}
