import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Deck from "./Deck";

describe("Deck", () => {
  it("renders loading/unavailable state when data is not ready", () => {
    render(
      <Deck
        issues={[]}
        repositories={[]}
        events={[]}
        dataReady={false}
        loading={true}
        onCreate={vi.fn()}
        onStatusChange={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getAllByText("READING LOCAL WORKSPACE.")).toHaveLength(3);
  });

  it("renders active issues, repositories, events, and triggers actions when ready", () => {
    const onCreate = vi.fn();
    const onNavigate = vi.fn();

    render(
      <Deck
        issues={[
          {
            id: "i1",
            issue_key: "RS-1",
            title: "Ship release",
            status: "open",
            priority: "P1",
            description: "",
            assignee: "",
            repository_id: null,
            repository_name: null,
            updated_at: "2026-11-16T01:00:00Z",
            project_id: null,
          },
        ]}
        repositories={[{ id: "r1", name: "moonwitness", branch: "main", path: "/test/path", remote_url: "", default_branch: "main" }]}
        events={[{ id: "e1", kind: "git", message: "Committed fix", created_at: "2026-11-16T01:00:00Z" }]}
        dataReady={true}
        loading={false}
        onCreate={onCreate}
        onStatusChange={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByText("Ship release")).toBeInTheDocument();
    expect(screen.getByText("moonwitness")).toBeInTheDocument();
    expect(screen.getByText("Committed fix")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ALL TASKS/i }));
    expect(onNavigate).toHaveBeenCalledWith("pit");

    fireEvent.click(screen.getByRole("button", { name: /ADD TO THE PILE/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("renders the live overseer banner and repository click shortcut when snapshot is present", () => {
    const onNavigate = vi.fn();
    const onInspectRepo = vi.fn();
    const onOpenUrl = vi.fn();

    render(
      <Deck
        issues={[]}
        repositories={[{ id: "r1", name: "moonwitness", branch: "dev", path: "/test/path", remote_url: "", default_branch: "main" }]}
        events={[]}
        monitor={{
          generated_at: "2026-11-16T07:05:00Z",
          disks: [{ drive: "C:", mount_path: "C:\\", available: true, total_gb: 118, free_gb: 12.5, used_pct: 89, tier: "calm" }],
          services: [{ id: "allah", name: "A-L-L-A-H", url: "http://127.0.0.1:3000", status: "online", http_status: 200, latency_ms: 8 }],
          agent_sessions: [{ session_id: "abc", updated_at: "2026-11-16T07:04:00Z", step_count: 10, last_type: "PLANNER_RESPONSE", last_status: "DONE", last_tool: "edit_file" }],
          repositories: [{ id: "r1", name: "moonwitness", path: "/test/path", branch: "dev", head_hash: "c5a873b", head_subject: "unify", head_age: "now", dirty_count: 2, staged_count: 1, untracked_count: 0, worktree_count: 1, changed_files: [], recent_commits: [] }],
          plans: [],
        }}
        dataReady={true}
        loading={false}
        onCreate={vi.fn()}
        onStatusChange={vi.fn()}
        onNavigate={onNavigate}
        onInspectRepo={onInspectRepo}
        onOpenUrl={onOpenUrl}
      />,
    );

    expect(screen.getByLabelText("Live Overseer summary")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /A-L-L-A-H :3000/i }));
    expect(onOpenUrl).toHaveBeenCalledWith("http://127.0.0.1:3000");
    fireEvent.click(screen.getByRole("button", { name: /OPEN OVERSEER/i }));
    expect(onNavigate).toHaveBeenCalledWith("monitor");
    fireEvent.click(screen.getByRole("button", { name: /moonwitness/i }));
    expect(onInspectRepo).toHaveBeenCalledWith("r1");
  });

  it("renders START DEV / STOP DEV toggle in desktop mode", () => {
    const onStartDev = vi.fn();
    const onStopDev = vi.fn();

    const { rerender } = render(
      <Deck
        issues={[]}
        repositories={[]}
        events={[]}
        monitor={{
          generated_at: "2026-11-16T07:05:00Z",
          disks: [],
          services: [{ id: "api", name: "Core API", url: "http://127.0.0.1:3002", status: "offline", http_status: null, latency_ms: null }],
          agent_sessions: [],
          repositories: [],
          plans: [],
        }}
        desktop={true}
        dataReady={true}
        loading={false}
        onCreate={vi.fn()}
        onStatusChange={vi.fn()}
        onNavigate={vi.fn()}
        onStartDev={onStartDev}
        onStopDev={onStopDev}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /START DEV/i }));
    expect(onStartDev).toHaveBeenCalledWith("all");

    rerender(
      <Deck
        issues={[]}
        repositories={[]}
        events={[]}
        monitor={{
          generated_at: "2026-11-16T07:05:00Z",
          disks: [],
          services: [{ id: "api", name: "Core API", url: "http://127.0.0.1:3002", status: "online", http_status: 200, latency_ms: 4 }],
          agent_sessions: [],
          repositories: [],
          plans: [],
        }}
        desktop={true}
        dataReady={true}
        loading={false}
        onCreate={vi.fn()}
        onStatusChange={vi.fn()}
        onNavigate={vi.fn()}
        onStartDev={onStartDev}
        onStopDev={onStopDev}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /STOP DEV/i }));
    expect(onStopDev).toHaveBeenCalledWith("all");
  });
});
