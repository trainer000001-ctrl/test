import { z } from "zod";
import { defineModel, type ActorContext } from "@moonwitness/orm";
import type { AddonDefinition, AddonManifest } from "@moonwitness/addon-runtime";

export interface GitHubIssueInput {
  readonly number: number;
  readonly title: string;
  readonly body?: string | null;
  readonly state?: "open" | "closed" | string;
  readonly html_url?: string;
  readonly labels?: ReadonlyArray<string | { name?: string }>;
  readonly assignee?: { login?: string } | null;
}

export interface GitHubIssueWebhookPayload {
  readonly action?: string;
  readonly repository?: { full_name?: string };
  readonly issue?: GitHubIssueInput;
}

export function slugifyProjectCode(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "project";
}

export const projectManifest: AddonManifest = {
  name: "project",
  version: "1.0.0",
  description: "Project portfolios, relational task boards, and synchronization logs.",
  category: "Operations",
  depends: ["__base"],
  provides: {
    models: ["project.project", "project.task", "project.sync_log"],
    routes: ["project"],
  },
  defaultEnabled: true,
};

export const ProjectModel = defineModel({
  name: "project.project",
  table: "project_projects",
  originAddon: "project",
  restEnabled: true,
  recName: "name",
  schema: z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    summary: z.string().optional().default(""),
    description: z.string().optional().default(""),
    project_status: z.enum(["planning", "active", "paused", "completed"]).default("active"),
    stage: z.enum(["planning", "active", "paused", "completed"]).default("active"),
    repo: z.string().optional().default(""),
  }),
  indexes: [{ fields: ["code"], unique: true }],
});

export const ProjectTaskModel = defineModel({
  name: "project.task",
  table: "project_tasks",
  originAddon: "project",
  restEnabled: true,
  recName: "title",
  schema: z.object({
    project_id: z.string().nullable().optional().default(null),
    project_code: z.string().optional().default("mw-core"),
    title: z.string().min(1),
    stage: z.enum(["backlog", "in_progress", "review", "done"]).default("backlog"),
    task_status: z.enum(["backlog", "todo", "in_progress", "review", "done"]).default("backlog"),
    priority: z.enum(["low", "normal", "medium", "high", "critical"]).default("medium"),
    assignee: z.string().optional().default("Unassigned"),
    summary: z.string().optional().default(""),
    github_repo: z.string().nullable().optional().default(null),
    github_issue_number: z.coerce.number().int().nullable().optional().default(null),
  }),
  relations: {
    project_id: { model: "project.project", type: "many2one", onDelete: "restrict" },
  },
  indexes: [{ fields: ["project_id", "stage"] }],
});

export const ProjectSyncLogModel = defineModel({
  name: "project.sync_log",
  table: "project_sync_logs",
  originAddon: "project",
  restEnabled: true,
  recName: "source",
  schema: z.object({
    project_id: z.string().nullable().optional().default(null),
    source: z.string().min(1),
    status: z.enum(["ok", "warn", "error"]).default("ok"),
    message: z.string().default(""),
  }),
});

// Aliases matching apps/edge imports for full cross-app alignment
export const projectProjectModel = ProjectModel;
export const projectTaskModel = ProjectTaskModel;
export const projectSyncLogModel = ProjectSyncLogModel;

export async function getProjectBoardSummary(tenantId = "default", projectCode?: string) {
  const taskFilter = projectCode ? { project_code: projectCode } : {};
  const [projects, grouped] = await Promise.all([
    ProjectModel.repository.count({}, { tenantId }),
    ProjectTaskModel.repository.readGroup("stage", taskFilter, { tenantId }),
  ]);
  return {
    projects,
    stages: grouped,
  };
}

export async function fetchGitHubIssues(
  repo: string,
  state: "open" | "closed" | "all" = "all",
  token?: string,
): Promise<GitHubIssueInput[]> {
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)) {
    throw new Error("Invalid GitHub repository format. Expected 'owner/repo'.");
  }
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "moonwitness-platform",
  };
  if (token?.trim()) {
    headers.authorization = `Bearer ${token.trim()}`;
  }
  const res = await fetch(
    `https://api.github.com/repos/${repo}/issues?state=${encodeURIComponent(state)}&per_page=50`,
    { headers },
  );
  if (!res.ok) {
    throw new Error(`GitHub API responded with status ${res.status}`);
  }
  const data = (await res.json()) as GitHubIssueInput[];
  return Array.isArray(data) ? data : [];
}

export function parseGitHubIssueWebhookPayload(
  payload: GitHubIssueWebhookPayload,
): { repo: string; issue: GitHubIssueInput } | null {
  const repo = payload.repository?.full_name?.trim();
  if (!repo || !payload.issue || typeof payload.issue.number !== "number") {
    return null;
  }
  return { repo, issue: payload.issue };
}

export async function syncGitHubIssuesToOrm(
  repo: string,
  issues: readonly GitHubIssueInput[],
  actor?: ActorContext,
): Promise<{ synced: number; projectCode: string }> {
  const projectCode = slugifyProjectCode(repo.split("/").pop() || repo);
  const project = await ProjectModel.repository.upsert(
    { code: projectCode },
    { code: projectCode, name: repo, repo, stage: "active", project_status: "active" },
    actor,
  );
  let synced = 0;
  for (const issue of issues) {
    const isClosed = issue.state === "closed";
    await ProjectTaskModel.repository.upsert(
      { github_repo: repo, github_issue_number: issue.number },
      {
        project_id: project.id,
        project_code: projectCode,
        title: issue.title,
        stage: isClosed ? "done" : "backlog",
        task_status: isClosed ? "done" : "backlog",
        assignee: issue.assignee?.login ?? "Unassigned",
        summary: (issue.body ?? "").slice(0, 500),
        github_repo: repo,
        github_issue_number: issue.number,
      },
      actor,
    );
    synced += 1;
  }
  await ProjectSyncLogModel.repository.create(
    {
      project_id: project.id,
      source: `github:${repo}`,
      status: "ok",
      message: `Synchronized ${synced} issue(s) into project '${projectCode}'.`,
    },
    actor,
  );
  return { synced, projectCode };
}

export function createProjectAddon(): AddonDefinition {
  return {
    manifest: projectManifest,
    models: [ProjectModel, ProjectTaskModel, ProjectSyncLogModel],
    views: [
      {
        id: "project.project.list",
        model: "project.project",
        view_type: "list",
        spec: {
          title: "Projects",
          description: "Active platform initiatives and engineering portfolios.",
          columns: ["code", "name", "stage", "repo"],
        },
      },
      {
        id: "project.task.list",
        model: "project.task",
        view_type: "list",
        spec: {
          title: "Project Tasks",
          description: "Relational tasks linked to projects via many2one foreign keys.",
          columns: ["title", "stage", "priority", "assignee", "project_id"],
        },
      },
      {
        id: "project.task.kanban",
        model: "project.task",
        view_type: "kanban",
        spec: {
          title: "Project Task Board",
          stageField: "stage",
          cardFields: ["title", "priority", "assignee"],
        },
      },
    ],
    menus: [
      {
        menu_key: "project.board",
        label: "Project Tasks",
        href: "/addons?model=project.task",
        icon: "kanban",
        plane: "operations",
        sort_order: 40,
        min_role: "viewer",
      },
    ],
    seed: async () => {
      const count = await ProjectModel.repository.count();
      if (count === 0) {
        const core = await ProjectModel.repository.create({
          code: "mw-core",
          name: "MoonWitness Platform Core",
          stage: "active",
          project_status: "active",
          repo: "A-L-L-A-H/moonwitness",
          description: "ORM-first modular platform runtime, addons, and metadata-driven views.",
        });
        const obs = await ProjectModel.repository.create({
          code: "hilal-obs",
          name: "Simpul Nusantara Observatory Network",
          stage: "active",
          project_status: "active",
          repo: "A-L-L-A-H/moonwitness-probes",
          description: "Distributed optical lunar telemetry relays across the archipelago.",
        });
        await ProjectTaskModel.repository.create({
          project_id: core.id,
          project_code: "mw-core",
          title: "Unify ORM & Addon Runtime Registry",
          stage: "done",
          task_status: "done",
          priority: "critical",
          assignee: "Platform Architect",
          summary: "Centralize model registry, view inheritance, ACL, and RPC gateway.",
        });
        await ProjectTaskModel.repository.create({
          project_id: obs.id,
          project_code: "hilal-obs",
          title: "Calibrate Bandung & Makassar SNMP Relays",
          stage: "in_progress",
          task_status: "in_progress",
          priority: "high",
          assignee: "Ops Lead",
          summary: "Verify live ORM-backed SNMP target polling and alert ingestion.",
        });
      }
    },
  };
}
