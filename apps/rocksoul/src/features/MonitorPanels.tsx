import React from "react";
import {
  Activity,
  ArrowUpRight,
  ExternalLink,
  FolderGit2,
  GitBranch,
  HardDrive,
  Play,
  Server,
  ShieldCheck,
  Square,
} from "@moonwitness/ui/icons";
import { FOUR_ENTRY_DOORS, PRIME_CODE_AXIOMS, SUPREME_IDENTITY } from "@moonwitness/canon";
import type {
  AgentSessionActivity,
  DevServiceEntry,
  DevServiceTarget,
  DiskVolumeStatus,
  EcosystemServiceStatus,
  PlanTrackerEntry,
  RepoMonitorEntry,
} from "../lib/contracts";

function shortSessionId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export function formatMonitorTime(iso: string): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? iso
    : parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function resolveDevTarget(serviceId: string): "web" | "api" | null {
  if (serviceId === "allah" || serviceId === "web") return "web";
  if (serviceId === "api") return "api";
  return null;
}

export function MonitorWorktreesPanel({
  repositories,
  onInspectRepoPatch,
}: {
  repositories: RepoMonitorEntry[];
  onInspectRepoPatch: (repositoryId: string) => void;
}) {
  return (
    <section className="riot-panel monitor-panel-wide">
      <div className="panel-heading cream">
        <span>
          <Server size={15} /> LIVE GIT WORKTREES &amp; AGENT CHANGES
        </span>
        <span>READ-ONLY SNAPSHOT</span>
      </div>
      <div className="monitor-panel-body">
        {repositories.length ? (
          repositories.map((repo) => (
            <article className="monitor-repo-card" key={repo.id}>
              <header className="monitor-repo-head">
                <div>
                  <strong className="monitor-repo-title">
                    <GitBranch size={15} /> {repo.name}
                  </strong>
                  <small className="monitor-repo-path">{repo.path}</small>
                </div>
                <div className="monitor-repo-badges">
                  <span className="monitor-badge branch">⑂ {repo.branch || "HEAD"}</span>
                  <span className={`monitor-badge ${repo.dirty_count > 0 ? "dirty" : "clean"}`}>
                    {repo.dirty_count} DIRTY ({repo.staged_count} STAGED · {repo.untracked_count} NEW)
                  </span>
                  <span className="monitor-badge">{repo.worktree_count} WORKTREE</span>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => onInspectRepoPatch(repo.id)}
                  >
                    INSPECT PATCH <ArrowUpRight size={13} />
                  </button>
                </div>
              </header>
              {repo.head_subject && (
                <div className="monitor-head-commit">
                  <code>{repo.head_hash}</code>
                  <span>{repo.head_subject}</span>
                  <time>{repo.head_age}</time>
                </div>
              )}
              <div className="monitor-repo-columns">
                <div>
                  <span className="eyebrow">CHANGED FILES ({repo.changed_files.length})</span>
                  {repo.changed_files.length ? (
                    <ul className="monitor-code-list">
                      {repo.changed_files.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="monitor-muted">Working tree is clean.</p>
                  )}
                </div>
                <div>
                  <span className="eyebrow">RECENT COMMITS</span>
                  {repo.recent_commits.length ? (
                    <ul className="monitor-commit-list">
                      {repo.recent_commits.map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="monitor-muted">No commits read.</p>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state compact-empty">
            <b>NO CHECKOUTS CONNECTED.</b>
            <span>Connect moonwitness in GIT to watch live diffs, worktrees, and commits.</span>
          </div>
        )}
      </div>
    </section>
  );
}

export function MonitorSessionsPanel({
  sessions,
  plans,
}: {
  sessions: AgentSessionActivity[];
  plans: PlanTrackerEntry[];
}) {
  return (
    <section className="riot-panel">
      <div className="panel-heading pink">
        <span>
          <Activity size={15} /> ANTIGRAVITY AGENT SESSIONS &amp; PLANS
        </span>
        <span>{sessions.length} SESSIONS</span>
      </div>
      <div className="monitor-panel-body">
        {sessions.length ? (
          <div className="monitor-session-list">
            {sessions.map((session) => (
              <div className="monitor-session-row" key={session.session_id}>
                <div>
                  <b>{shortSessionId(session.session_id)}</b>
                  <small>
                    {session.last_type} · {session.last_tool}
                  </small>
                </div>
                <div className="monitor-session-meta">
                  <span className="monitor-badge">{session.step_count} STEPS</span>
                  <span className="monitor-badge clean">{session.last_status}</span>
                  <time>{formatMonitorTime(session.updated_at)}</time>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="monitor-muted">
            No local Antigravity transcript logs found under ~/.gemini/antigravity/brain.
          </p>
        )}

        {plans.length > 0 && (
          <div className="monitor-plans-block">
            <span className="eyebrow">WORKSPACE PLANS &amp; CHECKLISTS ({plans.length})</span>
            {plans.map((plan) => (
              <div className="monitor-plan-row" key={plan.path}>
                <span>{plan.name}</span>
                <b>
                  {plan.completed_tasks}/{plan.total_tasks} DONE
                  {plan.partial_tasks > 0 ? ` (${plan.partial_tasks} PARTIAL)` : ""}
                </b>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function MonitorDisksPanel({
  disks,
  primaryDisk,
}: {
  disks: DiskVolumeStatus[];
  primaryDisk?: DiskVolumeStatus | undefined;
}) {
  return (
    <section className="riot-panel">
      <div className="panel-heading purple-head">
        <span>
          <HardDrive size={15} /> WORKSTATION DISK STEWARD (READ-ONLY)
        </span>
        <span>SAFE OBSERVER</span>
      </div>
      <div className="monitor-panel-body">
        {disks.length ? (
          <div className="monitor-disk-list">
            {disks.map((disk) => (
              <div className="monitor-disk-row" key={disk.mount_path}>
                <div className="monitor-disk-head">
                  <b>
                    {disk.drive} ({disk.mount_path})
                  </b>
                  <span className={`monitor-tier tier-${disk.tier}`}>{disk.tier.toUpperCase()}</span>
                </div>
                <div className="monitor-bar">
                  <span
                    className={`tier-bg-${disk.tier}`}
                    style={{ width: `${Math.min(100, Math.max(0, disk.used_pct))}%` }}
                  />
                </div>
                <small>
                  {disk.available
                    ? `${disk.free_gb.toFixed(2)} GB free of ${disk.total_gb.toFixed(2)} GB (${disk.used_pct.toFixed(1)}% used)`
                    : "Drive unavailable"}
                </small>
              </div>
            ))}
            {primaryDisk?.available && primaryDisk.free_gb < 10 && (
              <p className="inline-notice">
                C: below 10 GB calm buffer — review npm/Playwright/Chrome caches after closing active sessions. Steward never auto-deletes files.
              </p>
            )}
          </div>
        ) : (
          <p className="monitor-muted">
            Disk steward volume metrics activate in the Windows desktop app.
          </p>
        )}
      </div>
    </section>
  );
}

export function MonitorEcosystemPanel({
  services,
  onlineServices,
  devByTarget,
  desktop,
  devActionTarget,
  devActionError,
  anyDevRunning,
  allDevRunning,
  onOpenUrl,
  onStartDev,
  onStopDev,
}: {
  services: EcosystemServiceStatus[];
  onlineServices: number;
  devByTarget: Map<string, DevServiceEntry>;
  desktop: boolean;
  devActionTarget: string | null;
  devActionError: string;
  anyDevRunning: boolean;
  allDevRunning: boolean;
  onOpenUrl: (url: string) => void;
  onStartDev?: ((target: DevServiceTarget) => void) | undefined;
  onStopDev?: ((target: DevServiceTarget) => void) | undefined;
}) {
  return (
    <section className="riot-panel monitor-panel-wide">
      <div className="panel-heading cream">
        <span>
          <FolderGit2 size={15} /> MOONWITNESS ECOSYSTEM NODES &amp; A-L-L-A-H CANON BRIDGE
        </span>
        <div className="monitor-dev-controls">
          {desktop && onStartDev && (
            <button
              type="button"
              disabled={Boolean(devActionTarget) || allDevRunning}
              onClick={() => onStartDev("all")}
              title="Start Web (:3000) and Core API (:3002) dev servers"
            >
              <Play size={11} /> {devActionTarget === "all" ? "WORKING…" : "START DEV"}
            </button>
          )}
          {desktop && onStopDev && (
            <button
              type="button"
              disabled={Boolean(devActionTarget) || !anyDevRunning}
              onClick={() => onStopDev("all")}
              title="Stop Web (:3000) and Core API (:3002) dev servers"
            >
              <Square size={11} /> STOP DEV
            </button>
          )}
          <span>{onlineServices} ACTIVE PORT(S)</span>
        </div>
      </div>
      <div className="monitor-panel-body monitor-services-wrap">
        {devActionError && <p className="inline-notice error-output">{devActionError}</p>}
        <div className="monitor-services-grid">
          {services.map((svc) => {
            const target = resolveDevTarget(svc.id);
            const managedEntry = target ? devByTarget.get(target) : undefined;
            const isRunning = Boolean(
              managedEntry?.managed || managedEntry?.listening || svc.status !== "offline",
            );
            const lastLog = managedEntry?.recent_logs?.[managedEntry.recent_logs.length - 1];
            return (
              <div className="monitor-service-card" key={svc.id}>
                <div className="monitor-service-top">
                  <b>{svc.name}</b>
                  <span className={`monitor-badge ${svc.status === "online" ? "clean" : svc.status === "degraded" ? "dirty" : ""}`}>
                    {svc.status === "offline" && managedEntry?.managed
                      ? "BOOTING"
                      : svc.status.toUpperCase()}
                    {svc.latency_ms !== null ? ` · ${svc.latency_ms}ms` : ""}
                  </span>
                </div>
                <small>{svc.url}</small>
                {managedEntry?.pid && (
                  <small className="monitor-service-meta">PID {managedEntry.pid}</small>
                )}
                {managedEntry?.last_error && (
                  <small className="error-output">{managedEntry.last_error}</small>
                )}
                {!managedEntry?.last_error && lastLog && (
                  <small className="monitor-service-log" title={lastLog}>
                    {lastLog}
                  </small>
                )}
                <div className="monitor-service-actions">
                  <button type="button" className="outline-button" onClick={() => onOpenUrl(svc.url)}>
                    LAUNCH <ExternalLink size={12} />
                  </button>
                  {desktop && target && onStartDev && onStopDev && (
                    isRunning ? (
                      <button
                        type="button"
                        className="outline-button monitor-stop-btn"
                        disabled={Boolean(devActionTarget)}
                        onClick={() => onStopDev(target)}
                      >
                        <Square size={11} /> STOP
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="outline-button monitor-start-btn"
                        disabled={Boolean(devActionTarget)}
                        onClick={() => onStartDev(target)}
                      >
                        <Play size={11} /> START
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="monitor-canon-strip">
          <div className="monitor-canon-head">
            <span>
              <ShieldCheck size={14} /> @MOONWITNESS/CANON SSOT · {SUPREME_IDENTITY.creativeFormula}
            </span>
            <small>{PRIME_CODE_AXIOMS.length} PRIME AXIOMS</small>
          </div>
          <div className="monitor-doors-row">
            {FOUR_ENTRY_DOORS.map((door) => (
              <div className="monitor-door-chip" key={door.id}>
                <b>{door.numeral}</b>
                <span>{door.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
