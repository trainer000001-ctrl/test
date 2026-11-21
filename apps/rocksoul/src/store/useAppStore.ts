import { create } from "zustand";
import { call } from "../lib";
import type {
  ActivityEvent,
  CreateIssueArgs,
  CreateMilestoneArgs,
  CreateProjectArgs,
  DevServiceEntry,
  DevServiceTarget,
  EdgeOrmSyncStatus,
  GitView,
  Issue,
  IssueStatus,
  Milestone,
  MilestoneStatus,
  MonitorSnapshot,
  Project,
  Repository,
  UpdateIssueArgs,
  UpdateMilestoneArgs,
  UpdateProjectArgs,
} from "../lib/contracts";

export type { DevServiceTarget };

export interface AppState {
  page: "deck" | "monitor" | "pit" | "git" | "war-room" | "noise";
  loading: boolean;
  error: string;
  monitor: MonitorSnapshot | null;
  devServices: DevServiceEntry[];
  devActionTarget: string | null;
  devActionError: string;
  monitorLoading: boolean;
  monitorError: string;
  autoMonitor: boolean;
  gitPresetView: GitView | null;
  edgeOrmStatus: EdgeOrmSyncStatus | null;
  stats: { active: number; blocked: number; completed: number };
  issues: Issue[];
  repositories: Repository[];
  projects: Project[];
  milestones: Milestone[];
  events: ActivityEvent[];
  selectedRepository: string;
  projectFilter: string;
  setPage: (page: AppState["page"]) => void;
  setSelectedRepository: (selectedRepository: string) => void;
  setProjectFilter: (projectFilter: string) => void;
  setAutoMonitor: (autoMonitor: boolean) => void;
  setGitPresetView: (gitPresetView: GitView | null) => void;
  setEdgeOrmStatus: (edgeOrmStatus: EdgeOrmSyncStatus | null) => void;
  refresh: () => Promise<void>;
  refreshMonitor: () => Promise<void>;
  syncEdgeOrm: () => Promise<EdgeOrmSyncStatus | null>;
  startDevService: (target: DevServiceTarget) => Promise<void>;
  stopDevService: (target: DevServiceTarget) => Promise<void>;
  openEcosystemUrl: (url: string) => Promise<void>;
  createIssue: (payload: CreateIssueArgs) => Promise<void>;
  editIssue: (payload: UpdateIssueArgs) => Promise<void>;
  deleteIssue: (issueId: string) => Promise<void>;
  updateIssue: (issueId: string, status: IssueStatus) => Promise<void>;
  createProject: (payload: CreateProjectArgs) => Promise<void>;
  editProject: (payload: UpdateProjectArgs) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  createMilestone: (payload: CreateMilestoneArgs) => Promise<void>;
  updateMilestone: (milestoneId: string, status: MilestoneStatus) => Promise<void>;
  editMilestone: (payload: UpdateMilestoneArgs) => Promise<void>;
  deleteMilestone: (milestoneId: string) => Promise<void>;
  addRepository: (path: string) => Promise<Repository>;
}

export const useAppStore = create<AppState>((setState, getState) => ({
  page: "deck",
  loading: false,
  error: "",
  monitor: null,
  devServices: [],
  devActionTarget: null,
  devActionError: "",
  monitorLoading: false,
  monitorError: "",
  autoMonitor: true,
  gitPresetView: null,
  edgeOrmStatus: null,
  stats: { active: 0, blocked: 0, completed: 0 },
  issues: [],
  repositories: [],
  projects: [],
  milestones: [],
  events: [],
  selectedRepository: "",
  projectFilter: "",
  setPage: (page) => setState({ page }),
  setSelectedRepository: (selectedRepository) => setState({ selectedRepository }),
  setProjectFilter: (projectFilter) => setState({ projectFilter }),
  setAutoMonitor: (autoMonitor) => setState({ autoMonitor }),
  setGitPresetView: (gitPresetView) => setState({ gitPresetView }),
  setEdgeOrmStatus: (edgeOrmStatus) => setState({ edgeOrmStatus }),
  syncEdgeOrm: async () => {
    try {
      const edgeOrmStatus = await call("sync_edge_orm");
      setState({ edgeOrmStatus: edgeOrmStatus ?? null });
      if (edgeOrmStatus && (edgeOrmStatus.projects_synced > 0 || edgeOrmStatus.tasks_synced > 0)) {
        await getState().refresh();
      }
      return edgeOrmStatus ?? null;
    } catch (error) {
      const failure: EdgeOrmSyncStatus = {
        connected: false,
        edge_url: getState().edgeOrmStatus?.edge_url ?? "https://moonwitness-edge-tasks.bjo163.workers.dev",
        cursor: getState().edgeOrmStatus?.cursor ?? null,
        projects_synced: 0,
        tasks_synced: 0,
        outbox_pushed: 0,
        last_synced_at: getState().edgeOrmStatus?.last_synced_at ?? null,
        error: error instanceof Error ? error.message : String(error),
      };
      setState({ edgeOrmStatus: failure });
      return failure;
    }
  },
  refreshMonitor: async () => {
    if (getState().monitorLoading) return;
    setState({ monitorLoading: true, monitorError: "" });
    try {
      const [monitor, devServices] = await Promise.all([
        call("get_monitor_snapshot"),
        call("get_dev_services_status").catch(() => getState().devServices),
      ]);
      setState({ monitor, devServices: devServices ?? [], monitorLoading: false });
    } catch (error) {
      setState({
        monitorLoading: false,
        monitorError: error instanceof Error ? error.message : String(error),
      });
    }
  },
  startDevService: async (target) => {
    if (getState().devActionTarget) return;
    setState({ devActionTarget: target, devActionError: "" });
    try {
      const devServices = await call("start_dev_service", { target });
      setState({ devServices: devServices ?? [], devActionTarget: null });
      await getState().refreshMonitor();
      if (typeof window !== "undefined") {
        window.setTimeout(() => void getState().refreshMonitor(), 1500);
        window.setTimeout(() => void getState().refreshMonitor(), 3500);
      }
    } catch (error) {
      setState({
        devActionTarget: null,
        devActionError: error instanceof Error ? error.message : String(error),
      });
    }
  },
  stopDevService: async (target) => {
    if (getState().devActionTarget) return;
    setState({ devActionTarget: target, devActionError: "" });
    try {
      const devServices = await call("stop_dev_service", { target });
      setState({ devServices: devServices ?? [], devActionTarget: null });
      await getState().refreshMonitor();
    } catch (error) {
      setState({
        devActionTarget: null,
        devActionError: error instanceof Error ? error.message : String(error),
      });
    }
  },
  openEcosystemUrl: async (url) => {
    await call("open_ecosystem_url", { url });
  },
  refresh: async () => {
    if (getState().loading) return;
    setState({ loading: true, error: "" });
    try {
      const [dashboard, projects, milestones] = await Promise.all([
        call("get_dashboard"),
        call("list_projects"),
        call("list_milestones"),
      ]);
      setState({
        stats: dashboard?.stats ?? { active: 0, blocked: 0, completed: 0 },
        issues: dashboard?.issues ?? [],
        repositories: dashboard?.repositories ?? [],
        projects: projects ?? [],
        milestones: milestones ?? [],
        events: dashboard?.events ?? [],
        selectedRepository: dashboard?.repositories?.some(
          repository => repository.id === getState().selectedRepository,
        )
          ? getState().selectedRepository
          : dashboard?.repositories?.[0]?.id || "",
        loading: false,
      });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  },
  createIssue: async (payload) => {
    await call("create_issue", payload);
    await getState().refresh();
  },
  editIssue: async (payload) => {
    await call("update_issue", payload);
    await getState().refresh();
  },
  deleteIssue: async (issueId) => {
    await call("delete_issue", { issueId });
    await getState().refresh();
  },
  updateIssue: async (issueId, status) => {
    await call("set_issue_status", { issueId, status });
    await getState().refresh();
  },
  createProject: async (payload) => {
    await call("create_project", payload);
    await getState().refresh();
  },
  editProject: async (payload) => {
    await call("update_project", payload);
    await getState().refresh();
  },
  deleteProject: async (projectId) => {
    await call("delete_project", { projectId });
    await getState().refresh();
  },
  createMilestone: async (payload) => {
    await call("create_milestone", payload);
    await getState().refresh();
  },
  updateMilestone: async (milestoneId, status) => {
    await call("set_milestone_status", { milestoneId, status });
    await getState().refresh();
  },
  editMilestone: async (payload) => {
    await call("update_milestone", payload);
    await getState().refresh();
  },
  deleteMilestone: async (milestoneId) => {
    await call("delete_milestone", { milestoneId });
    await getState().refresh();
  },
  addRepository: async (path) => {
    const repository = await call("add_repository", { path });
    await getState().refresh();
    return repository;
  },
}));
