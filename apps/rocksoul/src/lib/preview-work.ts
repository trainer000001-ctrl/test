import type {
  ActivityEvent,
  Issue,
  IssuePriority,
  IssueStatus,
  Milestone,
  MilestoneStatus,
  NativeCommand,
  Project,
  ProjectStatus,
  Repository,
} from "./contracts";
import {
  readPreview,
  timestamp,
  writePreview,
  type PreviewCommandOutcome,
} from "./preview-storage";

const issueStatuses: readonly IssueStatus[] = ["open", "blocked", "done", "closed"] as const;
const milestoneStatuses: readonly MilestoneStatus[] = [
  "planned",
  "in_progress",
  "done",
  "blocked",
] as const;

const CLOUD_BACKUP_COMMANDS = new Set<NativeCommand>([
  "cloud_backup_status",
  "connect_google_drive",
  "disconnect_google_drive",
  "backup_to_google_drive",
  "restore_from_google_drive",
]);

const S3_GATEWAY_COMMANDS = new Set<NativeCommand>([
  "s3_gateway_status",
  "start_s3_gateway",
  "stop_s3_gateway",
]);

const ALLOWLISTED_ECOSYSTEM_ORIGINS = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3002",
  "http://localhost:3002",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
];

function appendPreviewEvent(
  events: ActivityEvent[],
  kind: string,
  message: string,
): void {
  writePreview("events", [
    {
      id: crypto.randomUUID(),
      kind,
      message,
      created_at: timestamp(),
    },
    ...events,
  ]);
}

export function handlePreviewWorkCommand(
  command: NativeCommand,
  payload: Record<string, unknown>,
): PreviewCommandOutcome {
  const stringArg = (key: string): string | undefined => payload[key] as string | undefined;
  const issues = readPreview<Issue[]>("issues", []);
  const repositories = readPreview<Repository[]>("repositories", []);
  const projects = readPreview<Project[]>("projects", []);
  const milestones = readPreview<Milestone[]>("milestones", []);
  const events = readPreview<ActivityEvent[]>("events", []);

  if (CLOUD_BACKUP_COMMANDS.has(command)) {
    return {
      handled: true,
      value: {
        available: false,
        connected: false,
        account: null,
        lastBackupAt: null,
        error: "Google Drive backup is only available in the native desktop app.",
      },
    };
  }
  if (S3_GATEWAY_COMMANDS.has(command)) {
    return {
      handled: true,
      value: {
        running: false,
        endpoint: null,
        bucket: "rocksoul",
        access_key: null,
        secret_key: null,
      },
    };
  }

  if (command === "get_dashboard") {
    const completedIssues = issues.filter((issue) => ["done", "closed"].includes(issue.status));
    return {
      handled: true,
      value: {
        stats: {
          active: issues.length - completedIssues.length,
          blocked: issues.filter((issue) => issue.status === "blocked").length,
          completed: completedIssues.length,
        },
        issues,
        repositories,
        events,
      },
    };
  }
  if (command === "list_issues") return { handled: true, value: issues };
  if (command === "list_repositories") return { handled: true, value: repositories };
  if (command === "list_projects") return { handled: true, value: projects };
  if (command === "list_milestones") return { handled: true, value: milestones };
  if (command === "list_events") return { handled: true, value: events };

  if (command === "create_issue") {
    const title = stringArg("title") ?? "";
    const priority = stringArg("priority") as IssuePriority | undefined;
    const projectId = stringArg("projectId") || null;
    const repositoryId = stringArg("repositoryId") || null;
    if (!title.trim()) throw new Error("Issue title cannot be empty.");
    if (!["P0", "P1", "P2", "P3"].includes(priority || "P2")) {
      throw new Error("Priority must be P0, P1, P2, or P3.");
    }
    if (projectId && !projects.some((project) => project.id === projectId)) {
      throw new Error("Select an existing project.");
    }
    if (repositoryId && !repositories.some((repository) => repository.id === repositoryId)) {
      throw new Error("Select an existing repository.");
    }
    const highestIssueNumber = issues.reduce((highest, issue) => {
      const match = /^DX-(\d+)$/.exec(issue.issue_key);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    const repository = repositories.find((entry) => entry.id === repositoryId);
    const issue: Issue = {
      id: crypto.randomUUID(),
      issue_key: `DX-${String(highestIssueNumber + 1).padStart(3, "0")}`,
      title: title.trim(),
      description: stringArg("description") || "",
      priority: priority || "P2",
      status: "open",
      assignee: "",
      repository_id: repositoryId,
      repository_name: repository?.name || "",
      updated_at: timestamp(),
      project_id: projectId,
    };
    writePreview("issues", [issue, ...issues]);
    appendPreviewEvent(events, "issue", `Created ${issue.issue_key} — ${issue.title}`);
    return { handled: true, value: issue };
  }

  if (command === "set_issue_status") {
    const issueId = stringArg("issueId");
    const status = stringArg("status") as IssueStatus | undefined;
    if (!status || !issueStatuses.includes(status)) throw new Error("Unsupported issue status.");
    const selectedIssue = issues.find((issue) => issue.id === issueId);
    if (!selectedIssue) throw new Error("Issue not found.");
    const updatedIssue: Issue = {
      ...selectedIssue,
      status,
      closed_at: ["done", "closed"].includes(status)
        ? (selectedIssue.closed_at as string | null) || timestamp()
        : null,
      updated_at: timestamp(),
    };
    writePreview(
      "issues",
      issues.map((issue) => (issue.id === issueId ? updatedIssue : issue)),
    );
    appendPreviewEvent(events, "issue", `${selectedIssue.issue_key} moved to ${status.toUpperCase()}`);
    return { handled: true, value: updatedIssue };
  }

  if (command === "update_issue") {
    const issueId = stringArg("issueId");
    const selectedIssue = issues.find((issue) => issue.id === issueId);
    if (!selectedIssue) throw new Error("Issue not found.");
    const projectId = stringArg("projectId") || null;
    const repositoryId = stringArg("repositoryId") || null;
    const repository = repositories.find((entry) => entry.id === repositoryId);
    if (projectId && !projects.some((project) => project.id === projectId)) {
      throw new Error("Select an existing Project.");
    }
    if (repositoryId && !repository) throw new Error("Select an existing Repository.");
    const title = stringArg("title") ?? "";
    const priority = stringArg("priority") as IssuePriority;
    if (!title.trim()) throw new Error("Issue title cannot be empty.");
    if (!["P0", "P1", "P2", "P3"].includes(priority)) {
      throw new Error("Priority must be P0, P1, P2, or P3.");
    }
    const updatedIssue: Issue = {
      ...selectedIssue,
      title: title.trim(),
      description: stringArg("description") ?? "",
      priority,
      project_id: projectId,
      repository_id: repositoryId,
      repository_name: repository?.name || "",
      updated_at: timestamp(),
    };
    writePreview(
      "issues",
      issues.map((issue) => (issue.id === issueId ? updatedIssue : issue)),
    );
    appendPreviewEvent(events, "issue", `Updated ${updatedIssue.issue_key}`);
    return { handled: true, value: undefined };
  }

  if (command === "delete_issue") {
    const issueId = stringArg("issueId");
    const selectedIssue = issues.find((issue) => issue.id === issueId);
    if (!selectedIssue) throw new Error("Issue not found.");
    writePreview(
      "issues",
      issues.filter((issue) => issue.id !== issueId),
    );
    appendPreviewEvent(events, "issue", `Deleted ${selectedIssue.issue_key}`);
    return { handled: true, value: undefined };
  }

  if (command === "create_project") {
    const project: Project = {
      id: crypto.randomUUID(),
      name: stringArg("name") ?? "",
      description: stringArg("description") || "",
      status: "active",
    };
    writePreview("projects", [project, ...projects]);
    appendPreviewEvent(events, "project", `Created project ${project.name}`);
    return { handled: true, value: project };
  }

  if (command === "update_project") {
    const projectId = stringArg("projectId");
    const selectedProject = projects.find((project) => project.id === projectId);
    if (!selectedProject) throw new Error("Project not found.");
    const name = stringArg("name") ?? "";
    const status = stringArg("status") as ProjectStatus;
    if (!name.trim()) throw new Error("Project name cannot be empty.");
    if (!["active", "paused", "done", "archived"].includes(status)) {
      throw new Error("Unsupported project status.");
    }
    const updatedProject: Project = {
      ...selectedProject,
      name: name.trim(),
      description: stringArg("description") ?? "",
      status,
    };
    writePreview(
      "projects",
      projects.map((project) => (project.id === projectId ? updatedProject : project)),
    );
    appendPreviewEvent(events, "project", `Updated project ${updatedProject.name}`);
    return { handled: true, value: undefined };
  }

  if (command === "delete_project") {
    const projectId = stringArg("projectId");
    const selectedProject = projects.find((project) => project.id === projectId);
    if (!selectedProject) throw new Error("Project not found.");
    writePreview(
      "projects",
      projects.filter((project) => project.id !== projectId),
    );
    writePreview(
      "milestones",
      milestones.filter((milestone) => milestone.project_id !== projectId),
    );
    writePreview(
      "issues",
      issues.map((issue) => (issue.project_id === projectId ? { ...issue, project_id: null } : issue)),
    );
    appendPreviewEvent(events, "project", `Deleted project ${selectedProject.name}`);
    return { handled: true, value: undefined };
  }

  if (command === "create_milestone") {
    const projectId = stringArg("projectId") ?? "";
    const title = stringArg("title") ?? "";
    const project = projects.find((entry) => entry.id === projectId);
    if (!title.trim()) throw new Error("Milestone title cannot be empty.");
    if (!project) throw new Error("Select an existing project.");
    const milestone: Milestone = {
      id: crypto.randomUUID(),
      project_id: projectId,
      project_name: project.name,
      title: title.trim(),
      description: stringArg("description") || "",
      due_at: stringArg("dueAt") || null,
      status: "planned",
    };
    writePreview("milestones", [milestone, ...milestones]);
    appendPreviewEvent(events, "milestone", `Created milestone ${milestone.title}`);
    return { handled: true, value: milestone };
  }

  if (command === "set_milestone_status") {
    const milestoneId = stringArg("milestoneId");
    const status = stringArg("status") as MilestoneStatus | undefined;
    if (!status || !milestoneStatuses.includes(status)) {
      throw new Error("Unsupported milestone status.");
    }
    const selectedMilestone = milestones.find((milestone) => milestone.id === milestoneId);
    if (!selectedMilestone) throw new Error("Milestone not found.");
    const updatedMilestone: Milestone = {
      ...selectedMilestone,
      status,
    };
    writePreview(
      "milestones",
      milestones.map((milestone) => (milestone.id === milestoneId ? updatedMilestone : milestone)),
    );
    appendPreviewEvent(events, "milestone", `${selectedMilestone.title} moved to ${status.toUpperCase()}`);
    return { handled: true, value: undefined };
  }

  if (command === "update_milestone") {
    const milestoneId = stringArg("milestoneId");
    const selectedMilestone = milestones.find((milestone) => milestone.id === milestoneId);
    if (!selectedMilestone) throw new Error("Milestone not found.");
    const title = stringArg("title") ?? "";
    if (!title.trim()) throw new Error("Milestone title cannot be empty.");
    const updatedMilestone: Milestone = {
      ...selectedMilestone,
      title: title.trim(),
      description: stringArg("description") ?? "",
      due_at: stringArg("dueAt") || null,
    };
    writePreview(
      "milestones",
      milestones.map((milestone) => (milestone.id === milestoneId ? updatedMilestone : milestone)),
    );
    appendPreviewEvent(events, "milestone", `Updated milestone ${updatedMilestone.title}`);
    return { handled: true, value: undefined };
  }

  if (command === "delete_milestone") {
    const milestoneId = stringArg("milestoneId");
    const selectedMilestone = milestones.find((milestone) => milestone.id === milestoneId);
    if (!selectedMilestone) throw new Error("Milestone not found.");
    writePreview(
      "milestones",
      milestones.filter((milestone) => milestone.id !== milestoneId),
    );
    appendPreviewEvent(events, "milestone", `Deleted milestone ${selectedMilestone.title}`);
    return { handled: true, value: undefined };
  }

  if (command === "get_monitor_snapshot") {
    return {
      handled: true,
      value: {
        generated_at: timestamp(),
        disks: [],
        services: [],
        agent_sessions: [],
        repositories: repositories.map((repo) => ({
          id: repo.id,
          name: repo.name,
          path: repo.path,
          branch: repo.branch || repo.default_branch || "unknown",
          head_hash: "",
          head_subject: "Native desktop required for live Git worktree inspection.",
          head_age: "",
          dirty_count: 0,
          staged_count: 0,
          untracked_count: 0,
          worktree_count: 0,
          changed_files: [],
          recent_commits: [],
        })),
        plans: [],
      },
    };
  }

  if (command === "open_ecosystem_url") {
    const rawUrl = (stringArg("url") ?? "").trim();
    const matched = ALLOWLISTED_ECOSYSTEM_ORIGINS.some((origin) => {
      if (!rawUrl.startsWith(origin)) return false;
      const suffix = rawUrl.slice(origin.length);
      return suffix === "" || suffix.startsWith("/") || suffix.startsWith("?") || suffix.startsWith("#");
    });
    if (!matched || /\s/.test(rawUrl)) {
      throw new Error("Only local MoonWitness endpoints on ports 3000, 3002, 8000, or 8787 may be opened.");
    }
    if (typeof window !== "undefined" && typeof window.open === "function") {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
    }
    return { handled: true, value: undefined };
  }

  if (command === "get_dev_services_status") {
    return {
      handled: true,
      value: [
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
          managed: false,
          listening: false,
          pid: null,
          recent_logs: [],
          last_error: null,
        },
      ],
    };
  }

  if (command === "start_dev_service" || command === "stop_dev_service") {
    throw new Error("Dev server process control requires the native desktop app.");
  }
  if (command === "add_repository") {
    throw new Error("Repository registration is available in the native desktop app.");
  }
  if (command === "git_execute") {
    throw new Error("Git write operations require the native desktop app.");
  }
  if (command === "git_snapshot") {
    const repositoryId = stringArg("repositoryId");
    const repository = repositories.find((entry) => entry.id === repositoryId);
    if (!repository) throw new Error("Repository is not registered in browser preview.");
    return {
      handled: true,
      value: {
        name: repository.name,
        branch: repository.branch || repository.default_branch || "unknown",
        view: stringArg("view") || "status",
        output: "Native Git inspection is available in the desktop app.",
      },
    };
  }

  if (command === "await_mid_loopback_callback") {
    throw new Error("Loopback sign-in requires the native desktop app.");
  }
  if (command === "discover_local_providers") {
    return { handled: true, value: [] };
  }
  if (
    command === "start_supervised_agent_run" ||
    command === "cancel_supervised_agent_run" ||
    command === "evaluate_agent_worktree_evidence"
  ) {
    throw new Error("Supervised agent execution requires the native desktop app.");
  }
  if (command === "get_agent_execution_steps" || command === "get_orchestration_tasks") {
    return { handled: true, value: [] };
  }
  if (command === "sync_edge_orm") {
    return {
      handled: true,
      value: {
        connected: false,
        edge_url: "https://moonwitness-edge-tasks.bjo163.workers.dev",
        cursor: null,
        projects_synced: 0,
        tasks_synced: 0,
        outbox_pushed: 0,
        last_synced_at: null,
        error: "Edge ORM SQLite pub/sub sync is active in the native desktop app.",
      },
    };
  }

  return { handled: false };
}
