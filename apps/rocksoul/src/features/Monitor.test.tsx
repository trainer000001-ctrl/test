import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Monitor from "./Monitor";
import type { MonitorSnapshot } from "../lib/contracts";

const SAMPLE_SNAPSHOT: MonitorSnapshot = {
  generated_at: "2026-11-16T07:05:00Z",
  disks: [
    {
      drive: "C:",
      mount_path: "C:\\",
      available: true,
      total_gb: 118.1,
      free_gb: 8.4,
      used_pct: 92.8,
      tier: "watch",
    },
    {
      drive: "Z:",
      mount_path: "Z:\\",
      available: true,
      total_gb: 238.5,
      free_gb: 144.3,
      used_pct: 39.5,
      tier: "calm",
    },
  ],
  services: [
    {
      id: "allah",
      name: "A-L-L-A-H Sanctuary",
      url: "http://127.0.0.1:3000",
      status: "online",
      http_status: 200,
      latency_ms: 14,
    },
    {
      id: "api",
      name: "Core API",
      url: "http://127.0.0.1:3002",
      status: "offline",
      http_status: null,
      latency_ms: null,
    },
  ],
  agent_sessions: [
    {
      session_id: "86d79523-3594-4738-9288-e53de3308000",
      updated_at: "2026-11-16T07:04:00Z",
      step_count: 142,
      last_type: "PLANNER_RESPONSE",
      last_status: "DONE",
      last_tool: "edit_file, run_command",
    },
  ],
  repositories: [
    {
      id: "repo-mw",
      name: "moonwitness",
      path: "Z:\\repo\\isrockfeel\\moonwitness",
      branch: "dev",
      head_hash: "c5a873b",
      head_subject: "feat(ecosystem): unify canon SSOT",
      head_age: "1 hour ago",
      dirty_count: 3,
      staged_count: 1,
      untracked_count: 1,
      worktree_count: 2,
      changed_files: [" M apps/rocksoul/src/App.tsx", "?? apps/rocksoul/src/features/Monitor.tsx"],
      recent_commits: ["c5a873b · feat(ecosystem): unify canon SSOT (1 hour ago) — bjo163"],
    },
  ],
  plans: [
    {
      name: "WORK_PLAN.md",
      path: "Z:\\repo\\isrockfeel\\moonwitness\\WORK_PLAN.md",
      total_tasks: 10,
      completed_tasks: 7,
      partial_tasks: 1,
    },
  ],
};

describe("Monitor (OVERSEER)", () => {
  it("renders disk steward tiers, active agent sessions, git watchtree delta, and canon links", () => {
    const onInspectRepoPatch = vi.fn();
    const onOpenUrl = vi.fn();
    const onToggleAuto = vi.fn();
    const onRefresh = vi.fn();

    render(
      <Monitor
        snapshot={SAMPLE_SNAPSHOT}
        loading={false}
        error=""
        autoMonitor={true}
        desktop={true}
        onToggleAuto={onToggleAuto}
        onRefresh={onRefresh}
        onInspectRepoPatch={onInspectRepoPatch}
        onOpenUrl={onOpenUrl}
      />,
    );

    expect(screen.getByRole("heading", { name: "OVERSEER" })).toBeInTheDocument();
    expect(screen.getByLabelText("Orbital Ecosystem Sanctuary")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Stack services online ratio" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Primary disk capacity used" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Overseer telemetry counters" })).toBeInTheDocument();
    expect(screen.getByText("8.40 GB")).toBeInTheDocument();
    expect(screen.getByText(/below 10 GB calm buffer/)).toBeInTheDocument();
    expect(screen.getByText("3 CHANGED")).toBeInTheDocument();
    expect(screen.getByText("142 STEPS")).toBeInTheDocument();
    expect(screen.getByText("7/10 DONE (1 PARTIAL)")).toBeInTheDocument();
    expect(screen.getByText("A-L-L-A-H Sanctuary")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /INSPECT PATCH/i }));
    expect(onInspectRepoPatch).toHaveBeenCalledWith("repo-mw");

    fireEvent.click(screen.getAllByRole("button", { name: /LAUNCH/i })[0]!);
    expect(onOpenUrl).toHaveBeenCalledWith("http://127.0.0.1:3000");

    fireEvent.click(screen.getByRole("button", { name: /AUTO 10S ON/i }));
    expect(onToggleAuto).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: /REFRESH/i }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("shows honest browser preview guidance when non-desktop and null snapshot", () => {
    render(
      <Monitor
        snapshot={null}
        loading={false}
        error=""
        autoMonitor={false}
        desktop={false}
        onToggleAuto={vi.fn()}
        onRefresh={vi.fn()}
        onInspectRepoPatch={vi.fn()}
        onOpenUrl={vi.fn()}
      />,
    );

    expect(screen.getByText(/BROWSER PREVIEW MODE/)).toBeInTheDocument();
    expect(screen.getByText("NO CHECKOUTS CONNECTED.")).toBeInTheDocument();
  });

  it("triggers start and stop dev controls for stack and individual nodes in desktop mode", () => {
    const onStartDev = vi.fn();
    const onStopDev = vi.fn();

    render(
      <Monitor
        snapshot={SAMPLE_SNAPSHOT}
        devServices={[
          {
            id: "api",
            name: "Core API",
            port: 3002,
            managed: false,
            listening: false,
            pid: null,
            recent_logs: [],
            last_error: null,
          },
          {
            id: "web",
            name: "MoonWitness Web",
            port: 3000,
            managed: true,
            listening: true,
            pid: 4242,
            recent_logs: ["[out] Ready in 310ms"],
            last_error: null,
          },
        ]}
        loading={false}
        error=""
        autoMonitor={false}
        desktop={true}
        onToggleAuto={vi.fn()}
        onRefresh={vi.fn()}
        onInspectRepoPatch={vi.fn()}
        onOpenUrl={vi.fn()}
        onStartDev={onStartDev}
        onStopDev={onStopDev}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^START DEV$/i }));
    expect(onStartDev).toHaveBeenCalledWith("all");

    fireEvent.click(screen.getByRole("button", { name: /^STOP DEV$/i }));
    expect(onStopDev).toHaveBeenCalledWith("all");

    fireEvent.click(screen.getByRole("button", { name: /^START$/i }));
    expect(onStartDev).toHaveBeenCalledWith("api");

    fireEvent.click(screen.getByRole("button", { name: /^STOP$/i }));
    expect(onStopDev).toHaveBeenCalledWith("web");
  });
});
