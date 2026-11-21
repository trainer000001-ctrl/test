import React from "react";
import { ArrowUpRight, GitCommitHorizontal, Play, Plus, Radio, ShieldAlert, Square } from "@moonwitness/ui/icons";
import { thumbRiotUrl } from "../assets/art";
import { IssueRow } from "../components";
import { KatanaSkyHud } from "../components/ui/KatanaSkyHud";
import { AnarchyStarSigil, TelemetryWaveformSvg } from "@moonwitness/ui/artwork";
import type { ActivityEvent, DevServiceEntry, DevServiceTarget, Issue, IssueStatus, MonitorSnapshot, Repository } from "../lib/contracts";
import type { PageRoute } from "../router/useWorldRouter";

export interface DeckProps {
  issues: Issue[];
  repositories: Repository[];
  events: ActivityEvent[];
  monitor?: MonitorSnapshot | null | undefined;
  devServices?: DevServiceEntry[] | undefined;
  devActionTarget?: string | null | undefined;
  desktop?: boolean | undefined;
  dataReady: boolean;
  loading: boolean;
  onCreate: () => void;
  onStatusChange: (issueId: string, status: IssueStatus) => void;
  onNavigate: (page: PageRoute) => void;
  onInspectRepo?: ((repositoryId: string) => void) | undefined;
  onOpenUrl?: ((url: string) => void) | undefined;
  onStartDev?: ((target: DevServiceTarget) => void) | undefined;
  onStopDev?: ((target: DevServiceTarget) => void) | undefined;
}

export default function Deck({
  issues,
  repositories,
  events,
  monitor,
  devServices = [],
  devActionTarget = null,
  desktop = false,
  dataReady,
  loading,
  onCreate,
  onStatusChange,
  onNavigate,
  onInspectRepo,
  onOpenUrl,
  onStartDev,
  onStopDev,
}: DeckProps) {
  const activeIssues = issues.filter((item) => !["done", "closed"].includes(item.status)).slice(0, 4);
  const unavailableMessage = loading ? "READING LOCAL WORKSPACE." : "LOCAL DATA UNAVAILABLE.";
  const primaryDisk = monitor?.disks?.[0];
  const onlineServices = monitor?.services?.filter((svc) => svc.status === "online").length ?? 0;
  const dirtyFiles = (monitor?.repositories ?? []).reduce((acc, repo) => acc + repo.dirty_count, 0);
  const latestSession = monitor?.agent_sessions?.[0];
  const anyDevRunning =
    devServices.some((entry) => entry.managed || entry.listening) ||
    Boolean(monitor?.services?.some((svc) => (svc.id === "allah" || svc.id === "web" || svc.id === "api") && svc.status !== "offline"));
  return (
    <main className="page-content deck-page">
      {monitor && (
        <section className="deck-overseer-strip" aria-label="Live Overseer summary">
          <div className="deck-overseer-metrics">
            <span>
              DISK {primaryDisk?.drive ?? "C:"}{" "}
              <b>{primaryDisk?.available ? `${primaryDisk.free_gb.toFixed(1)} GB (${primaryDisk.tier.toUpperCase()})` : "LOCAL"}</b>
            </span>
            <span>
              GIT DELTA: <b>{dirtyFiles} FILE(S)</b>
            </span>
            <span>
              NODES: <b>{onlineServices}/{monitor.services.length || 5} ONLINE</b>
            </span>
            {latestSession && (
              <span>
                AGENT: <b>{latestSession.last_tool} ({latestSession.step_count} steps)</b>
              </span>
            )}
          </div>
          <div className="deck-overseer-actions">
            {desktop && onStartDev && onStopDev && (
              <button
                type="button"
                className={`outline-button ${anyDevRunning ? "monitor-stop-btn" : "monitor-start-btn"}`}
                disabled={Boolean(devActionTarget)}
                onClick={() => (anyDevRunning ? onStopDev("all") : onStartDev("all"))}
              >
                {anyDevRunning ? <Square size={12} /> : <Play size={12} />}
                {devActionTarget === "all" ? "WORKING…" : anyDevRunning ? "STOP DEV" : "START DEV"}
              </button>
            )}
            {onOpenUrl && (
              <button
                type="button"
                className="outline-button"
                onClick={() => onOpenUrl("http://127.0.0.1:3000")}
              >
                A-L-L-A-H :3000 <ArrowUpRight size={13} />
              </button>
            )}
            <button type="button" className="outline-button" onClick={() => onNavigate("monitor")}>
              OPEN OVERSEER <ArrowUpRight size={13} />
            </button>
          </div>
        </section>
      )}
      <KatanaSkyHud monitor={monitor} mode="compact" onOpenUrl={onOpenUrl} />
      <section className="deck-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> ROOM 03 / EXECUTION SPACE
          </span>
          <h1>
            MAKE THE
            <br />
            <em>NEXT MOVE.</em>
          </h1>
          <p>LOCAL WORK / HUMAN REVIEW / CLEAR STATE.</p>
          <div className="workbench-principles">
            <span>
              <small>01 / SCOPE</small>
              <b>LOCAL</b>
            </span>
            <span>
              <small>02 / CONTROL</small>
              <b>HUMAN-DRIVEN</b>
            </span>
            <span>
              <small>03 / STATUS</small>
              <b>VISIBLE</b>
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <img className="hero-art-backdrop" src={thumbRiotUrl} alt="" />
          <div className="hero-art-scrim" />
          <div className="hero-art-chrome">
            <AnarchyStarSigil className="rs-anarchy-sigil hero-sigil-svg" />
            <span className="hero-sigil">DX</span>
          </div>
          <TelemetryWaveformSvg className="rs-waveform-svg hero-waveform" />
          <div className="hero-quote">
            HUMAN IN
            <br />
            THE LOOP.
          </div>
        </div>
      </section>
      <div className="deck-grid">
        <section className="riot-panel incoming-panel">
          <div className="panel-heading cream">
            <span>01 / INCOMING CHAOS</span>
            <button onClick={() => onNavigate("pit")}>
              ALL TASKS <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="issue-list">
            {!dataReady ? (
              <div className="empty-state">
                <b>{unavailableMessage}</b>
                <span>Issue state will appear when local data is available.</span>
              </div>
            ) : activeIssues.length ? (
              activeIssues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} compact onStatusChange={onStatusChange} />
              ))
            ) : (
              <div className="empty-state">
                <b>THE PIT IS QUIET.</b>
                <span>Drop the first task into the machine.</span>
                <button onClick={onCreate}>
                  CREATE FIRST ISSUE <Plus size={14} />
                </button>
              </div>
            )}
          </div>
          <button className="panel-footer-action" onClick={onCreate}>
            <Plus size={15} /> ADD TO THE PILE
          </button>
        </section>
        <section className="riot-panel git-panel">
          <div className="panel-heading cream">
            <span>02 / GIT JUNGLE</span>
            <button onClick={() => onNavigate("git")}>
              REPOSITORIES <ArrowUpRight size={15} />
            </button>
          </div>
          {!dataReady ? (
            <div className="empty-state compact-empty">
              <b>{unavailableMessage}</b>
              <span>Repository state is not available yet.</span>
            </div>
          ) : repositories.length ? (
            <div className="repo-list">
              {repositories.slice(0, 3).map((repo) => (
                <button
                  type="button"
                  className="repo-row repo-row-btn"
                  key={repo.id}
                  onClick={() => (onInspectRepo ? onInspectRepo(repo.id) : onNavigate("git"))}
                >
                  <span className="repo-glyph">⑂</span>
                  <div>
                    <b>{repo.name}</b>
                    <small>{repo.branch || repo.default_branch || "branch unknown"}</small>
                  </div>
                  <span className="repo-dot" />
                  <small>LOCAL</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <b>NO REPOSITORIES YET.</b>
              <span>Connect a local Git checkout in GIT.</span>
              <button onClick={() => onNavigate("git")}>
                CONNECT REPOSITORY <Plus size={14} />
              </button>
            </div>
          )}
        </section>
        <section className="riot-panel noise-panel">
          <div className="panel-heading purple-head">
            <span>
              <Radio size={15} /> 03 / NOISE TAPE
            </span>
            <button onClick={() => onNavigate("noise")}>
              FULL LOG <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="noise-telemetry-strip" aria-hidden="true">
            <TelemetryWaveformSvg className="rs-waveform-svg noise-waveform" />
            <span>CH-03 // LIVE TRACE</span>
          </div>
          <div className="event-list">
            {dataReady ? (
              events.slice(0, 5).map((event) => (
                <div className="event-row" key={event.id}>
                  <span className="event-icon">
                    {event.kind === "git" ? <GitCommitHorizontal /> : <ShieldAlert />}
                  </span>
                  <div>
                    <b>{event.message}</b>
                    <small>
                      {new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state mini-empty">
                <b>{unavailableMessage}</b>
                <span>Activity is shown only when real events are available.</span>
              </div>
            )}
            {dataReady && !events.length && (
              <div className="empty-state mini-empty">
                <b>NO TRANSMISSIONS.</b>
                <span>System events will appear here.</span>
              </div>
            )}
          </div>
        </section>
      </div>
      <button className="create-chaos" onClick={onCreate}>
        <span>+</span>
        <b>
          CREATE
          <br />
          ISSUE
        </b>
        <ArrowUpRight size={25} />
        <small>ADD A TRACKABLE WORK ITEM.</small>
      </button>
    </main>
  );
}
