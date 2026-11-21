import React from "react";
import { RiotRail, Topbar } from "./components";
import { IllustratedStage } from "./components/ui/IllustratedStage";
import { KatanaAgentSubtitle } from "./components/ui/KatanaSkyHud";
import { Deck, Git, Monitor, Noise, Pit, WarRoom } from "./features";
import { RoomReturnButton } from "./features/World";
import { isDesktop } from "./lib";
import type { RocksoulOidcSession } from "./lib/mid-oidc";
import type { PageRoute } from "./router/useWorldRouter";
import type {
  ActivityEvent,
  CreateMilestoneArgs,
  CreateProjectArgs,
  DevServiceEntry,
  DevServiceTarget,
  GitView,
  Issue,
  IssueStatus,
  Milestone,
  MilestoneStatus,
  MonitorSnapshot,
  Project,
  Repository,
  UpdateMilestoneArgs,
  UpdateProjectArgs,
} from "./lib/contracts";

export interface AppWorkspaceProps {
  page: PageRoute;
  pageTitle: string;
  reducedMotion: boolean;
  systemReducedMotion: boolean;
  onToggleMotion: () => void;
  onReturnToThreshold: () => void;
  repositories: Repository[];
  selectedRepository: string;
  onRepositoryChange: (repoId: string) => void;
  onOpenCommand: () => void;
  onOpenSettings: () => void;
  onNavigate: (target: string) => void;
  onRefreshAll: () => Promise<void>;
  topbarMonitorSummary: string;
  oidcSession: RocksoulOidcSession | null;
  oidcBusy: boolean;
  onOidcSignIn: () => void;
  onOidcSignOut: () => void;
  error: string;
  oidcError: string;
  issues: Issue[];
  projects: Project[];
  milestones: Milestone[];
  events: ActivityEvent[];
  monitor: MonitorSnapshot | null;
  devServices: DevServiceEntry[];
  devActionTarget: string | null;
  devActionError: string;
  monitorLoading: boolean;
  monitorError: string;
  autoMonitor: boolean;
  gitPresetView: GitView | null;
  projectFilter: string;
  hasLoaded: boolean;
  loading: boolean;
  onToggleAutoMonitor: (enabled: boolean) => void;
  onRefreshMonitor: () => Promise<void>;
  onInspectRepoFromOverseer: (repoId: string, view: "status" | "patch") => void;
  onOpenEcosystemUrl: (url: string) => Promise<void>;
  onStartDevService: (target: DevServiceTarget) => Promise<void>;
  onStopDevService: (target: DevServiceTarget) => Promise<void>;
  onOpenCreate: () => void;
  onIssueStatusChange: (issueId: string, status: IssueStatus) => Promise<void>;
  onEditIssue: (issue: Issue) => void;
  onDeleteIssue: (issue: Issue) => Promise<void>;
  onProjectFilter: (projectId: string) => void;
  onAddRepository: (path: string) => Promise<Repository>;
  onCreateProject: (args: CreateProjectArgs) => Promise<void>;
  onUpdateProject: (args: UpdateProjectArgs) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onCreateMilestone: (args: CreateMilestoneArgs) => Promise<void>;
  onUpdateMilestone: (args: UpdateMilestoneArgs) => Promise<void>;
  onDeleteMilestone: (milestoneId: string) => Promise<void>;
  onMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => Promise<void>;
  onProjectIssues: (projectId: string) => void;
}

export default function AppWorkspace({
  page,
  pageTitle,
  reducedMotion,
  systemReducedMotion,
  onToggleMotion,
  onReturnToThreshold,
  repositories,
  selectedRepository,
  onRepositoryChange,
  onOpenCommand,
  onOpenSettings,
  onNavigate,
  onRefreshAll,
  topbarMonitorSummary,
  oidcSession,
  oidcBusy,
  onOidcSignIn,
  onOidcSignOut,
  error,
  oidcError,
  issues,
  projects,
  milestones,
  events,
  monitor,
  devServices,
  devActionTarget,
  devActionError,
  monitorLoading,
  monitorError,
  autoMonitor,
  gitPresetView,
  projectFilter,
  hasLoaded,
  loading,
  onToggleAutoMonitor,
  onRefreshMonitor,
  onInspectRepoFromOverseer,
  onOpenEcosystemUrl,
  onStartDevService,
  onStopDevService,
  onOpenCreate,
  onIssueStatusChange,
  onEditIssue,
  onDeleteIssue,
  onProjectFilter,
  onAddRepository,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onCreateMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onMilestoneStatus,
  onProjectIssues,
}: AppWorkspaceProps) {
  const sectorScene =
    page === "monitor" || page === "noise"
      ? "signal-room"
      : page === "git"
        ? "archive"
        : page === "war-room"
          ? "studio"
          : "riot-deck";

  return (
    <div className="app-shell riot-room-shell katana-cut-shell" data-reduced-motion={reducedMotion} data-sector={page}>
      <IllustratedStage scene={sectorScene} destination={sectorScene} reducedMotion={reducedMotion} subtle />
      <div className="app-main">
        <Topbar
          repositories={repositories}
          selectedRepository={selectedRepository}
          onRepositoryChange={onRepositoryChange}
          onCommand={onOpenCommand}
          onSettings={onOpenSettings}
          onOpenMonitor={() => onNavigate("monitor")}
          onRefresh={() => {
            void onRefreshAll();
          }}
          monitorSummary={topbarMonitorSummary}
          identity={
            oidcSession
              ? {
                  username: oidcSession.user.preferred_username,
                  displayName: oidcSession.user.name,
                  role: oidcSession.user.role,
                }
              : null
          }
          identityBusy={oidcBusy}
          onSignIn={onOidcSignIn}
          onSignOut={onOidcSignOut}
        />
        <div className="katana-hud-bar">
          <RiotRail page={page} onNavigate={onNavigate} onSwitchboard={onOpenCommand} />
          <RoomReturnButton
            onReturn={onReturnToThreshold}
            reducedMotion={reducedMotion}
            systemReducedMotion={systemReducedMotion}
            onToggleMotion={onToggleMotion}
          />
        </div>
        <div className="screen-heading">
          <span>
            THE RIOT DECK / <b>{pageTitle}</b>
          </span>
          <span className="screen-clock">
            {isDesktop() ? "NATIVE DESKTOP / PRIVATE" : "BROWSER PREVIEW / LOCAL DATA"}
          </span>
        </div>
        {(error || oidcError) && <div className="global-error">{error || oidcError}</div>}
        {page === "deck" && (
          <Deck
            issues={issues}
            repositories={repositories}
            events={events}
            monitor={monitor}
            devServices={devServices}
            devActionTarget={devActionTarget}
            desktop={isDesktop()}
            dataReady={hasLoaded && !loading && !error}
            loading={loading || !hasLoaded}
            onCreate={onOpenCreate}
            onStatusChange={onIssueStatusChange}
            onNavigate={onNavigate}
            onInspectRepo={(repoId) => onInspectRepoFromOverseer(repoId, "status")}
            onOpenUrl={(url) => {
              void onOpenEcosystemUrl(url);
            }}
            onStartDev={(target) => {
              void onStartDevService(target);
            }}
            onStopDev={(target) => {
              void onStopDevService(target);
            }}
          />
        )}
        {page === "monitor" && (
          <Monitor
            snapshot={monitor}
            devServices={devServices}
            devActionTarget={devActionTarget}
            devActionError={devActionError}
            loading={monitorLoading}
            error={monitorError}
            autoMonitor={autoMonitor}
            desktop={isDesktop()}
            onToggleAuto={onToggleAutoMonitor}
            onRefresh={() => {
              void onRefreshMonitor();
            }}
            onInspectRepoPatch={(repoId) => onInspectRepoFromOverseer(repoId, "patch")}
            onOpenUrl={(url) => {
              void onOpenEcosystemUrl(url);
            }}
            onStartDev={(target) => {
              void onStartDevService(target);
            }}
            onStopDev={(target) => {
              void onStopDevService(target);
            }}
          />
        )}
        {page === "pit" && (
          <Pit
            issues={issues}
            projects={projects}
            projectFilter={projectFilter}
            onProjectFilter={onProjectFilter}
            onCreate={onOpenCreate}
            onStatusChange={onIssueStatusChange}
            onEdit={onEditIssue}
            onDelete={onDeleteIssue}
          />
        )}
        {page === "git" && (
          <Git
            repositories={repositories}
            initialSelectedId={selectedRepository}
            initialView={gitPresetView ?? undefined}
            onAddRepository={onAddRepository}
            onRefresh={onRefreshAll}
          />
        )}
        {page === "war-room" && (
          <WarRoom
            projects={projects}
            milestones={milestones}
            issues={issues}
            onCreateProject={onCreateProject}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            onCreateMilestone={onCreateMilestone}
            onUpdateMilestone={onUpdateMilestone}
            onDeleteMilestone={onDeleteMilestone}
            onMilestoneStatus={onMilestoneStatus}
            onProjectIssues={onProjectIssues}
          />
        )}
        {page === "noise" && <Noise events={events} />}
        <footer className="app-footer">
          <span>
            ROCKSOUL - DX <b>0.1.0</b>
          </span>
          <KatanaAgentSubtitle
            monitor={monitor}
            branch={repositories.find((repo) => repo.id === selectedRepository)?.branch || repositories[0]?.branch}
            pageTitle={pageTitle}
          />
          <span>
            YOUR MACHINE · LOCAL FIRST <i />
          </span>
        </footer>
      </div>
    </div>
  );
}
