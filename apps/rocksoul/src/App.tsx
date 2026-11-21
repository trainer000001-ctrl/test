import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AppWorkspace from "./AppWorkspace";
import {
  CommandSwitchboardModal,
  CreateIssueDialog,
  EditIssueDialog,
  OidcCallbackScreen,
  SettingsDialog,
} from "./components";
import { Awakening, PreviewRoom, Threshold } from "./features/World";
import useMotionPreference from "./features/useMotionPreference";
import type { Issue, IssueStatus, MilestoneStatus, UpdateIssueArgs } from "./lib/contracts";
import { subscribeEdgeOrmPubsub } from "./lib";
import {
  ROCKSOUL_MID_AUTH_EVENT,
  getStoredRocksoulOidcSession,
  resolveValidRocksoulOidcSession,
  signInWithMoonWitnessId,
  signOutRocksoulOidc,
  type RocksoulOidcSession,
} from "./lib/mid-oidc";
import { isPageRoute, toWorldRoute, useWorldRouter } from "./router/useWorldRouter";
import { useAppStore } from "./store";

const pageTitles: Record<string, string> = {
  deck: "WORKBENCH",
  monitor: "OVERSEER",
  pit: "THE PIT",
  git: "GIT JUNGLE",
  "war-room": "WAR ROOM",
  noise: "NOISE TAPE",
};

export default function App() {
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [oidcSession, setOidcSession] = useState<RocksoulOidcSession | null>(() =>
    getStoredRocksoulOidcSession(),
  );
  const [oidcBusy, setOidcBusy] = useState(false);
  const [oidcError, setOidcError] = useState("");
  const location = useLocation();
  const browserPathname =
    typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") : "";
  const routerPathname = location.pathname.replace(/\/+$/, "");
  const isOidcCallbackRoute =
    browserPathname === "/auth/callback" || routerPathname === "/auth/callback";
  const oidcCallbackSearch =
    browserPathname === "/auth/callback" && typeof window !== "undefined"
      ? window.location.search
      : location.search;
  const { reducedMotion, systemReducedMotion, toggleMotion } = useMotionPreference();
  const { destination, navigateDestination: navigateWorld, returnToThreshold } = useWorldRouter();
  const projectFilter = useAppStore((state) => state.projectFilter);
  const {
    page,
    setPage,
    refresh,
    refreshMonitor,
    syncEdgeOrm,
    setEdgeOrmStatus,
    openEcosystemUrl,
    loading,
    monitor,
    devServices,
    devActionTarget,
    devActionError,
    monitorLoading,
    monitorError,
    autoMonitor,
    gitPresetView,
    setAutoMonitor,
    setGitPresetView,
    startDevService,
    stopDevService,
    issues,
    repositories,
    projects,
    milestones,
    events,
    selectedRepository,
    setSelectedRepository,
    setProjectFilter,
    createIssue,
    editIssue,
    deleteIssue,
    updateIssue,
    createProject,
    editProject,
    deleteProject,
    createMilestone,
    editMilestone,
    deleteMilestone,
    updateMilestone,
    addRepository,
    error,
  } = useAppStore();

  useEffect(() => {
    let active = true;
    const timer =
      typeof window !== "undefined"
        ? window.setTimeout(() => {
            if (active) {
              void refreshMonitor();
              void syncEdgeOrm();
            }
          }, 250)
        : null;
    void refresh().finally(() => {
      if (active) setHasLoaded(true);
    });
    return () => {
      active = false;
      if (timer !== null && typeof window !== "undefined") {
        window.clearTimeout(timer);
      }
    };
  }, [refresh, refreshMonitor, syncEdgeOrm]);

  useEffect(() => {
    if (typeof subscribeEdgeOrmPubsub !== "function") return;
    return subscribeEdgeOrmPubsub((status) => {
      setEdgeOrmStatus(status);
      if (status.projects_synced > 0 || status.tasks_synced > 0) {
        void refresh();
      }
    });
  }, [refresh, setEdgeOrmStatus]);

  useEffect(() => {
    if (!autoMonitor) return;
    if (destination !== "riot-deck" && !isPageRoute(destination)) return;
    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void refreshMonitor();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [autoMonitor, destination, refreshMonitor]);

  useEffect(() => {
    if (isOidcCallbackRoute) return;
    const sync = () => setOidcSession(getStoredRocksoulOidcSession());
    window.addEventListener(ROCKSOUL_MID_AUTH_EVENT, sync);
    void resolveValidRocksoulOidcSession().then((valid) => {
      setOidcSession(valid);
    });
    return () => window.removeEventListener(ROCKSOUL_MID_AUTH_EVENT, sync);
  }, [isOidcCallbackRoute]);

  useEffect(() => {
    if (isPageRoute(destination)) {
      setPage(destination);
    }
  }, [destination, setPage]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCreateOpen(false);
        setSettingsOpen(false);
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigateDestination = (dest: string) => {
    if (dest === "riot-deck") {
      setPage("deck");
    } else if (isPageRoute(dest)) {
      setPage(dest);
    }
    navigateWorld(toWorldRoute(dest));
  };

  const runCommand = (item: string) => {
    setCommandOpen(false);
    setCommandQuery("");
    if (item === "create") setCreateOpen(true);
    else navigateDestination(item);
  };

  const removeIssue = async (issue: Issue) => {
    if (!window.confirm(`Delete ${issue.issue_key}: "${issue.title}"? This cannot be undone.`)) return;
    try {
      await deleteIssue(issue.id);
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  };

  const showProjectIssues = (projectId: string) => {
    setProjectFilter(projectId);
    navigateDestination("pit");
  };

  const setIssueStatus = async (issueId: string, status: IssueStatus) => {
    try {
      await updateIssue(issueId, status);
    } catch (statusError) {
      window.alert(statusError instanceof Error ? statusError.message : String(statusError));
    }
  };

  const setMilestoneStatus = async (milestoneId: string, status: MilestoneStatus) => {
    try {
      await updateMilestone(milestoneId, status);
    } catch (statusError) {
      window.alert(statusError instanceof Error ? statusError.message : String(statusError));
    }
  };

  const saveIssue = async (payload: UpdateIssueArgs) => {
    await editIssue(payload);
    setEditingIssue(null);
  };

  const inspectRepoFromOverseer = (repositoryId: string, view: "status" | "patch" = "patch") => {
    setSelectedRepository(repositoryId);
    setGitPresetView(view);
    navigateDestination("git");
  };

  const refreshAll = async () => {
    await Promise.all([refresh(), refreshMonitor()]);
  };

  const handleOidcSignIn = async () => {
    setOidcBusy(true);
    setOidcError("");
    try {
      const session = await signInWithMoonWitnessId({ returnHash: `#/${page}` });
      if (session) setOidcSession(session);
    } catch (authError) {
      setOidcError(authError instanceof Error ? authError.message : String(authError));
    } finally {
      setOidcBusy(false);
    }
  };

  const handleOidcSignOut = async () => {
    setOidcBusy(true);
    setOidcError("");
    try {
      await signOutRocksoulOidc();
      setOidcSession(null);
    } finally {
      setOidcBusy(false);
    }
  };

  const primaryDisk = monitor?.disks?.[0];
  const onlineServices = monitor?.services?.filter((svc) => svc.status === "online").length ?? 0;
  const topbarMonitorSummary = monitor
    ? `${primaryDisk?.available ? `${primaryDisk.free_gb.toFixed(1)}G` : "LOCAL"} · ${onlineServices}/${monitor.services.length || 5}`
    : "OVERSEER";

  const filtered = Object.entries(pageTitles).filter(([key, title]) =>
    (title + " " + key).toLowerCase().includes(commandQuery.toLowerCase()),
  );

  if (isOidcCallbackRoute) {
    return (
      <OidcCallbackScreen
        search={oidcCallbackSearch}
        onComplete={(session, returnHash) => {
          setOidcSession(session);
          setOidcError("");
          if (typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/auth/callback") {
            window.history.replaceState(null, "", `/${returnHash}`);
          }
          const routeTarget = returnHash.replace(/^#\/?/, "") || "deck";
          navigateDestination(routeTarget);
        }}
        onReturnWorkbench={() => {
          if (typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/auth/callback") {
            window.history.replaceState(null, "", "/#/deck");
          }
          navigateDestination("deck");
        }}
      />
    );
  }

  if (destination === "awakening") {
    return (
      <Awakening
        onEnter={() => navigateWorld("threshold")}
        reducedMotion={reducedMotion}
        onQuickWorkbench={() => navigateDestination("riot-deck")}
        onQuickMonitor={() => navigateDestination("monitor")}
      />
    );
  }

  if (destination === "threshold") {
    return (
      <>
        <Threshold
          onNavigate={navigateDestination}
          reducedMotion={reducedMotion}
          systemReducedMotion={systemReducedMotion}
          onToggleMotion={toggleMotion}
          onSettings={() => setSettingsOpen(true)}
          onCreateIssue={() => setCreateOpen(true)}
          recentIssue={issues[0] ?? null}
          recentIssueReady={hasLoaded && !loading && !error}
        />
        {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      </>
    );
  }

  if (destination !== "riot-deck" && !isPageRoute(destination)) {
    return (
      <PreviewRoom
        roomId={destination}
        onReturn={returnToThreshold}
        onNavigate={navigateDestination}
        reducedMotion={reducedMotion}
        systemReducedMotion={systemReducedMotion}
        onToggleMotion={toggleMotion}
      />
    );
  }

  return (
    <>
      <AppWorkspace
        page={page}
        pageTitle={pageTitles[page] || "WORKBENCH"}
        reducedMotion={reducedMotion}
        systemReducedMotion={systemReducedMotion}
        onToggleMotion={toggleMotion}
        onReturnToThreshold={returnToThreshold}
        repositories={repositories}
        selectedRepository={selectedRepository}
        onRepositoryChange={setSelectedRepository}
        onOpenCommand={() => setCommandOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onNavigate={navigateDestination}
        onRefreshAll={refreshAll}
        topbarMonitorSummary={topbarMonitorSummary}
        oidcSession={oidcSession}
        oidcBusy={oidcBusy}
        onOidcSignIn={() => {
          void handleOidcSignIn();
        }}
        onOidcSignOut={() => {
          void handleOidcSignOut();
        }}
        error={error}
        oidcError={oidcError}
        issues={issues}
        projects={projects}
        milestones={milestones}
        events={events}
        monitor={monitor}
        devServices={devServices}
        devActionTarget={devActionTarget}
        devActionError={devActionError}
        monitorLoading={monitorLoading}
        monitorError={monitorError}
        autoMonitor={autoMonitor}
        gitPresetView={gitPresetView}
        projectFilter={projectFilter}
        hasLoaded={hasLoaded}
        loading={loading}
        onToggleAutoMonitor={setAutoMonitor}
        onRefreshMonitor={refreshMonitor}
        onInspectRepoFromOverseer={inspectRepoFromOverseer}
        onOpenEcosystemUrl={openEcosystemUrl}
        onStartDevService={startDevService}
        onStopDevService={stopDevService}
        onOpenCreate={() => setCreateOpen(true)}
        onIssueStatusChange={setIssueStatus}
        onEditIssue={setEditingIssue}
        onDeleteIssue={removeIssue}
        onProjectFilter={setProjectFilter}
        onAddRepository={addRepository}
        onCreateProject={createProject}
        onUpdateProject={editProject}
        onDeleteProject={deleteProject}
        onCreateMilestone={createMilestone}
        onUpdateMilestone={editMilestone}
        onDeleteMilestone={deleteMilestone}
        onMilestoneStatus={setMilestoneStatus}
        onProjectIssues={showProjectIssues}
      />
      {createOpen && (
        <CreateIssueDialog
          onClose={() => setCreateOpen(false)}
          onCreate={createIssue}
          projects={projects}
          repositories={repositories}
        />
      )}
      {editingIssue && (
        <EditIssueDialog
          issue={editingIssue}
          projects={projects}
          repositories={repositories}
          onClose={() => setEditingIssue(null)}
          onSave={saveIssue}
        />
      )}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      {commandOpen && (
        <CommandSwitchboardModal
          query={commandQuery}
          options={filtered}
          onQueryChange={setCommandQuery}
          onSelect={runCommand}
          onClose={() => setCommandOpen(false)}
        />
      )}
    </>
  );
}
