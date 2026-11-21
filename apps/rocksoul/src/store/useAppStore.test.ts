import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib", () => ({ call: vi.fn() }));

import { call } from "../lib";
import type {
  CreateMilestoneArgs,
  UpdateIssueArgs,
  UpdateMilestoneArgs,
  UpdateProjectArgs,
} from "../lib/contracts";
import { useAppStore } from "./useAppStore";

const mockedCall = call as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  useAppStore.setState({
    loading: false,
    error: "",
    stats: { active: 0, blocked: 0, completed: 0 },
    issues: [],
    repositories: [],
    projects: [],
    milestones: [],
    events: [],
    selectedRepository: "",
  });
});

describe("useAppStore refresh", () => {
  it("loads dashboard resources and retains a valid selected repository", async () => {
    useAppStore.setState({ selectedRepository: "repository-2" });
    mockedCall.mockImplementation(async (command: string) => {
      if (command === "get_dashboard") {
        return {
          stats: { active: 3, blocked: 1, completed: 2 },
          issues: [{ id: "issue-1" }],
          repositories: [{ id: "repository-1" }, { id: "repository-2" }],
          events: [{ id: "event-1" }],
        };
      }
      if (command === "list_projects") return [{ id: "project-1" }];
      if (command === "list_milestones") return [{ id: "milestone-1" }];
      throw new Error(`Unexpected command ${command}`);
    });

    await useAppStore.getState().refresh();

    expect(useAppStore.getState()).toMatchObject({
      loading: false,
      selectedRepository: "repository-2",
      stats: { active: 3, blocked: 1, completed: 2 },
      issues: [{ id: "issue-1" }],
      repositories: [{ id: "repository-1" }, { id: "repository-2" }],
      projects: [{ id: "project-1" }],
      milestones: [{ id: "milestone-1" }],
      events: [{ id: "event-1" }],
    });
  });

  it("selects the first repository when selection disappeared", async () => {
    useAppStore.setState({ selectedRepository: "removed-repository" });
    mockedCall.mockImplementation(async (command: string) => {
      if (command === "get_dashboard") return { repositories: [{ id: "available-repository" }] };
      return [];
    });

    await useAppStore.getState().refresh();

    expect(useAppStore.getState().selectedRepository).toBe("available-repository");
  });

  it("clears loading and stores a readable error when loading fails", async () => {
    mockedCall.mockRejectedValue(new Error("Local database is locked"));

    await useAppStore.getState().refresh();

    expect(useAppStore.getState()).toMatchObject({ loading: false, error: "Local database is locked" });
  });
});

describe("useAppStore actions", () => {
  it("uses explicit commands for issue, project, milestone, and repository actions", async () => {
    mockedCall.mockImplementation(async (command: string) => {
      if (command === "get_dashboard") return { repositories: [] };
      return [];
    });

    await useAppStore.getState().createIssue({ title: "Issue" });
    await useAppStore.getState().editIssue({ issueId: "issue-1" } as unknown as UpdateIssueArgs);
    await useAppStore.getState().deleteIssue("issue-1");
    await useAppStore.getState().updateIssue("issue-1", "done");
    await useAppStore.getState().createProject({ name: "Project" });
    await useAppStore.getState().editProject({ projectId: "project-1" } as unknown as UpdateProjectArgs);
    await useAppStore.getState().deleteProject("project-1");
    await useAppStore.getState().createMilestone({ title: "Milestone" } as unknown as CreateMilestoneArgs);
    await useAppStore.getState().updateMilestone("milestone-1", "done");
    await useAppStore.getState().editMilestone({ milestoneId: "milestone-1" } as unknown as UpdateMilestoneArgs);
    await useAppStore.getState().deleteMilestone("milestone-1");
    await useAppStore.getState().addRepository("C:/repo");

    expect(
      mockedCall.mock.calls.filter(
        (callArgs: unknown[]) => !["get_dashboard", "list_projects", "list_milestones"].includes(String(callArgs[0])),
      ),
    ).toEqual([
      ["create_issue", { title: "Issue" }],
      ["update_issue", { issueId: "issue-1" }],
      ["delete_issue", { issueId: "issue-1" }],
      ["set_issue_status", { issueId: "issue-1", status: "done" }],
      ["create_project", { name: "Project" }],
      ["update_project", { projectId: "project-1" }],
      ["delete_project", { projectId: "project-1" }],
      ["create_milestone", { title: "Milestone" }],
      ["set_milestone_status", { milestoneId: "milestone-1", status: "done" }],
      ["update_milestone", { milestoneId: "milestone-1" }],
      ["delete_milestone", { milestoneId: "milestone-1" }],
      ["add_repository", { path: "C:/repo" }],
    ]);
  });

  it("refreshes live monitor snapshot and opens allowlisted ecosystem URLs", async () => {
    const sampleSnapshot = {
      generated_at: "2026-11-16T07:05:00Z",
      disks: [],
      services: [],
      agent_sessions: [],
      repositories: [],
      plans: [],
    };
    mockedCall.mockImplementation(async (command: string) => {
      if (command === "get_monitor_snapshot") return sampleSnapshot;
      return undefined;
    });

    await useAppStore.getState().refreshMonitor();
    expect(useAppStore.getState().monitor).toEqual(sampleSnapshot);
    expect(useAppStore.getState().monitorLoading).toBe(false);

    useAppStore.getState().setAutoMonitor(false);
    useAppStore.getState().setGitPresetView("patch");
    expect(useAppStore.getState().autoMonitor).toBe(false);
    expect(useAppStore.getState().gitPresetView).toBe("patch");

    await useAppStore.getState().openEcosystemUrl("http://127.0.0.1:3000");
    expect(mockedCall).toHaveBeenCalledWith("open_ecosystem_url", { url: "http://127.0.0.1:3000" });

    mockedCall.mockImplementation(async (command: string) => {
      if (command === "sync_edge_orm") {
        return {
          connected: true,
          edge_url: "https://moonwitness-edge-tasks.bjo163.workers.dev",
          cursor: "2026-11-20T02:00:00Z",
          projects_synced: 1,
          tasks_synced: 2,
          outbox_pushed: 0,
          last_synced_at: "2026-11-20T02:00:00Z",
          error: null,
        };
      }
      if (command === "get_dashboard") return { repositories: [] };
      return [];
    });
    const syncStatus = await useAppStore.getState().syncEdgeOrm();
    expect(syncStatus?.connected).toBe(true);
    expect(useAppStore.getState().edgeOrmStatus?.tasks_synced).toBe(2);
    expect(mockedCall).toHaveBeenCalledWith("sync_edge_orm");
  });
});
