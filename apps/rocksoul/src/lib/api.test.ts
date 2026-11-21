import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { invoke } from "@tauri-apps/api/core";
import { call, isDesktop } from "./api";
import type { IssuePriority, IssueStatus } from "./contracts";

const storage = new Map<string, string>();

declare global {
  interface Window {
    __TAURI_INTERNALS__?: Record<string, unknown>;
  }
}

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: unknown) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
  });
  delete window.__TAURI_INTERNALS__;
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "test-uuid") });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ROCKSOUL desktop bridge", () => {
  it("detects the native Tauri runtime without assuming a browser preview is desktop", () => {
    expect(isDesktop()).toBe(false);
    window.__TAURI_INTERNALS__ = {};
    expect(isDesktop()).toBe(true);
  });

  it("forwards native commands and arguments through Tauri IPC", async () => {
    window.__TAURI_INTERNALS__ = {};
    (invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: "test-project" }]);

    await expect(call("list_projects")).resolves.toEqual([{ id: "test-project" }]);
    expect(invoke).toHaveBeenCalledWith("list_projects", {});
  });
});

describe("ROCKSOUL browser-preview workflow", () => {
  it("persists a newly created issue and its activity event", async () => {
    const issue = await call("create_issue", {
      title: "Ship the desktop build",
      description: "Verify the native package",
      priority: "P1",
    });

    expect(issue).toMatchObject({
      id: "test-uuid",
      issue_key: "DX-001",
      title: "Ship the desktop build",
      description: "Verify the native package",
      priority: "P1",
      status: "open",
    });
    expect(JSON.parse(storage.get("rocksoul:issues")!)).toEqual([issue]);
    expect(JSON.parse(storage.get("rocksoul:events")!)[0].message).toContain("Created DX-001");
  });

  it("returns safe defaults when browser storage is malformed", async () => {
    storage.set("rocksoul:issues", "{broken json");

    await expect(call("list_issues")).resolves.toEqual([]);
    await expect(call("get_dashboard")).resolves.toMatchObject({
      stats: { active: 0, blocked: 0, completed: 0 },
      issues: [],
    });
  });

  it("rejects empty or invalid issue payloads without changing preview storage", async () => {
    await expect(call("create_issue", { title: "   " })).rejects.toMatchObject({
      message: "Issue title cannot be empty.",
    });
    await expect(
      call("create_issue", { title: "Valid title", priority: "P9" as unknown as IssuePriority }),
    ).rejects.toMatchObject({
      message: "Priority must be P0, P1, P2, or P3.",
    });
    await expect(call("create_issue", { title: "Valid title", projectId: "missing" })).rejects.toMatchObject({
      message: "Select an existing project.",
    });
    expect(storage.has("rocksoul:issues")).toBe(false);
  });

  it("persists project and repository links when creating an issue", async () => {
    storage.set("rocksoul:projects", JSON.stringify([{ id: "p1", name: "Desktop" }]));
    storage.set("rocksoul:repositories", JSON.stringify([{ id: "r1", name: "rocksoul-dx", branch: "main" }]));

    const issue = await call("create_issue", {
      title: "Link local work",
      projectId: "p1",
      repositoryId: "r1",
    });

    expect(issue).toMatchObject({
      project_id: "p1",
      repository_id: "r1",
      repository_name: "rocksoul-dx",
    });
  });

  it("allocates preview issue keys from the highest existing number", async () => {
    storage.set(
      "rocksoul:issues",
      JSON.stringify([
        { id: "old-1", issue_key: "DX-001" },
        { id: "old-3", issue_key: "DX-003" },
      ]),
    );

    const issue = await call("create_issue", { title: "Continue after a numbering gap" });
    expect(issue.issue_key).toBe("DX-004");
  });

  it("updates an issue status in persisted preview data", async () => {
    await call("create_issue", { title: "Run QA" });

    const updated = await call("set_issue_status", {
      issueId: "test-uuid",
      status: "blocked",
    });

    expect(updated).toMatchObject({ id: "test-uuid", status: "blocked" });
    expect(JSON.parse(storage.get("rocksoul:issues")!)[0].status).toBe("blocked");
  });

  it("rejects unknown issue statuses and records valid status history", async () => {
    const issue = await call("create_issue", { title: "Audit a state change" });
    for (const status of ["ship-it", "running", "review"]) {
      await expect(
        call("set_issue_status", { issueId: issue.id, status: status as unknown as IssueStatus }),
      ).rejects.toMatchObject({
        message: "Unsupported issue status.",
      });
    }

    await call("set_issue_status", { issueId: issue.id, status: "done" });

    expect(JSON.parse(storage.get("rocksoul:issues")!)[0].closed_at).toBeTruthy();
    expect(JSON.parse(storage.get("rocksoul:events")!)[0].message).toBe("DX-001 moved to DONE");
  });

  it("edits and deletes issues with an append-only event", async () => {
    const issue = await call("create_issue", { title: "Old title" });
    await call("update_issue", {
      issueId: issue.id,
      title: "Updated title",
      description: "New acceptance notes",
      priority: "P1",
      projectId: null,
      repositoryId: null,
    });
    expect(JSON.parse(storage.get("rocksoul:issues")!)[0]).toMatchObject({
      issue_key: "DX-001",
      title: "Updated title",
      description: "New acceptance notes",
      priority: "P1",
    });

    await call("delete_issue", { issueId: issue.id });
    expect(JSON.parse(storage.get("rocksoul:issues")!)).toEqual([]);
    expect(JSON.parse(storage.get("rocksoul:events")!)[0].message).toBe("Deleted DX-001");
  });

  it("requires an existing project before creating a milestone", async () => {
    await expect(
      call("create_milestone", {
        projectId: "missing",
        title: "Release candidate",
      }),
    ).rejects.toMatchObject({ message: "Select an existing project." });

    await call("create_project", { name: "ROCKSOUL DX" });
    const milestone = await call("create_milestone", {
      projectId: "test-uuid",
      title: "Release candidate",
      dueAt: "2026-12-01",
    });

    expect(milestone).toMatchObject({
      project_id: "test-uuid",
      project_name: "ROCKSOUL DX",
      title: "Release candidate",
      due_at: "2026-12-01",
      status: "planned",
    });
  });

  it("edits and deletes milestones while retaining event history", async () => {
    await call("create_project", { name: "ROCKSOUL DX" });
    const milestone = await call("create_milestone", {
      projectId: "test-uuid",
      title: "First pass",
    });

    await call("update_milestone", {
      milestoneId: milestone.id,
      title: "Release candidate",
      description: "Build and smoke test",
      dueAt: "2026-12-01",
    });
    expect(JSON.parse(storage.get("rocksoul:milestones")!)[0]).toMatchObject({
      title: "Release candidate",
      description: "Build and smoke test",
      due_at: "2026-12-01",
    });
    await call("delete_milestone", { milestoneId: milestone.id });
    expect(JSON.parse(storage.get("rocksoul:milestones")!)).toEqual([]);
    expect(JSON.parse(storage.get("rocksoul:events")!)[0].message).toBe("Deleted milestone Release candidate");
  });

  it("deletes a project with milestones and safely detaches linked issues", async () => {
    await call("create_project", { name: "Temporary operation" });
    await call("create_issue", { title: "Keep issue", projectId: "test-uuid" });
    await call("create_milestone", { projectId: "test-uuid", title: "Remove with project" });
    await call("delete_project", { projectId: "test-uuid" });

    expect(JSON.parse(storage.get("rocksoul:projects")!)).toEqual([]);
    expect(JSON.parse(storage.get("rocksoul:milestones")!)).toEqual([]);
    expect(JSON.parse(storage.get("rocksoul:issues")!)[0].project_id).toBeNull();
  });

  it("refuses Git write operations in the browser preview", async () => {
    await expect(
      call("git_execute", {
        repositoryId: "repo-1",
        operation: "push",
      }),
    ).rejects.toMatchObject({ message: "Git write operations require the native desktop app." });
  });

  it("returns honest empty telemetry for monitor_snapshot and enforces ecosystem URL allowlist", async () => {
    storage.set(
      "rocksoul:repositories",
      JSON.stringify([{ id: "r1", name: "moonwitness", path: "Z:/repo/mw", branch: "dev", default_branch: "dev" }]),
    );
    const snapshot = await call("get_monitor_snapshot");
    expect(snapshot.disks).toEqual([]);
    expect(snapshot.repositories[0]).toMatchObject({ id: "r1", name: "moonwitness", branch: "dev" });

    const openSpy = vi.fn();
    vi.stubGlobal("open", openSpy);
    await call("open_ecosystem_url", { url: "http://127.0.0.1:3000" });
    expect(openSpy).toHaveBeenCalledWith("http://127.0.0.1:3000", "_blank", "noopener,noreferrer");

    await expect(call("open_ecosystem_url", { url: "http://127.0.0.1:3003" })).rejects.toMatchObject({
      message: expect.stringContaining("3000, 3002, 8000, or 8787"),
    });

    await expect(call("open_ecosystem_url", { url: "https://example.com" })).rejects.toMatchObject({
      message: expect.stringContaining("3000, 3002, 8000, or 8787"),
    });

    await expect(
      call("await_mid_loopback_callback", { authorizeUrl: "https://id.moonwitness.biz.id/authorize" }),
    ).rejects.toMatchObject({
      message: "Loopback sign-in requires the native desktop app.",
    });

    const devStatus = await call("get_dev_services_status");
    expect(devStatus.map((entry) => entry.id)).toEqual(["api", "web"]);
    await expect(call("start_dev_service", { target: "all" })).rejects.toMatchObject({
      message: "Dev server process control requires the native desktop app.",
    });
    await expect(call("stop_dev_service", { target: "all" })).rejects.toMatchObject({
      message: "Dev server process control requires the native desktop app.",
    });
  });
});
