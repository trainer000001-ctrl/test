import { ZodError } from "zod";
import {
  ConflictError,
  DEFAULT_TENANT_ID,
  PolicyError,
  compileTupleDomainToFilter,
  createActorContext,
  normalizeTenantId,
  type ActorContext,
} from "@moonwitness/orm";
import {
  fetchGitHubIssues,
  getProjectBoardSummary,
  parseGitHubIssueWebhookPayload,
  projectManifest,
  projectProjectModel,
  projectSyncLogModel,
  projectTaskModel,
  slugifyProjectCode,
  syncGitHubIssuesToOrm,
  type GitHubIssueInput,
  type GitHubIssueWebhookPayload,
} from "@moonwitness/addons/project";
import { ensureEdgeRuntime, type EdgeEnv } from "./runtime.js";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "Content-Type, X-Tenant-Id, X-Actor-Id, X-Request-Id",
};

function toIsoTimestamp(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

function resolveActor(request: Request): ActorContext {
  const rawTenant = request.headers.get("x-tenant-id")?.trim();
  const tenantId = rawTenant ? normalizeTenantId(rawTenant) : DEFAULT_TENANT_ID;
  const actorId = request.headers.get("x-actor-id")?.trim() || "edge-operator";
  const requestId = request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  return createActorContext(actorId, "api", requestId, tenantId);
}

function handleOrmError(error: unknown): Response {
  if (error instanceof ConflictError) {
    return json({ error: error.message, code: "CONFLICT" }, 409);
  }
  if (error instanceof PolicyError) {
    return json({ error: error.message, code: error.code }, error.statusCode);
  }
  if (error instanceof ZodError) {
    return json(
      { error: error.issues[0]?.message ?? "Validation failed", issues: error.issues },
      400,
    );
  }
  return json({ error: error instanceof Error ? error.message : "Bad request" }, 400);
}

function normalizeProjectPayload(body: Record<string, unknown>): Record<string, unknown> {
  const payload = { ...body };
  if (typeof payload.summary !== "string" && typeof payload.description === "string") {
    payload.summary = payload.description;
  }
  delete payload.description;

  const rawCode =
    typeof payload.code === "string" && payload.code.trim()
      ? payload.code.trim()
      : typeof payload.slug === "string" && payload.slug.trim()
        ? payload.slug.trim()
        : typeof payload.name === "string"
          ? slugifyProjectCode(payload.name)
          : "";
  if (rawCode) payload.code = rawCode;
  delete payload.slug;
  return payload;
}

function normalizeTaskPayload(body: Record<string, unknown>): Record<string, unknown> {
  const payload = { ...body };
  if (typeof payload.project_code !== "string") {
    const alias =
      typeof payload.projectCode === "string"
        ? payload.projectCode
        : typeof payload.project_id === "string"
          ? payload.project_id
          : typeof payload.projectId === "string"
            ? payload.projectId
            : undefined;
    if (alias !== undefined) payload.project_code = alias;
  }
  delete payload.projectCode;
  delete payload.project_id;
  delete payload.projectId;

  if (typeof payload.task_status !== "string" && typeof payload.stage === "string") {
    payload.task_status = payload.stage;
  }
  delete payload.stage;

  if (payload.priority === "medium") {
    payload.priority = "normal";
  }
  return payload;
}

export async function handleEdgeRequest(request: Request, env: EdgeEnv): Promise<Response> {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  const method = request.method.toUpperCase();

  const isWorkerRoute =
    pathname === "/healthz" || pathname.startsWith("/api/") || pathname.startsWith("/_meta/");

  if (!isWorkerRoute) {
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response(
      '<!doctype html><html><body><div id="root">MoonWitness Edge UI (@moonwitness/ui)</div></body></html>',
      {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let booted;
  try {
    booted = await ensureEdgeRuntime(env);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Database unavailable" }, 503);
  }

  if (method === "GET" && pathname === "/healthz") {
    return json({
      ok: true,
      service: "moonwitness-edge-tasks",
      orm: "@moonwitness/orm",
      addonRuntime: "@moonwitness/addon-runtime",
      addons: booted.order,
      dialect: booted.driver.dialect ?? booted.driver.kind ?? "unknown",
    });
  }

  if (method === "GET" && pathname === "/_meta/addons") {
    const installed = await booted.runtime.listAddons();
    return json({
      order: booted.order,
      projectAddon: projectManifest,
      installed,
    });
  }

  let actor: ActorContext;
  try {
    actor = resolveActor(request);
  } catch (error) {
    return handleOrmError(error);
  }

  const projectRepo = projectProjectModel.repository.forActor(actor);
  const taskRepo = projectTaskModel.repository.forActor(actor);
  const syncLogRepo = projectSyncLogModel.repository.forActor(actor);

  try {
    if (pathname === "/api/projects") {
      if (method === "GET") {
        const q = searchParams.get("q")?.trim() || undefined;
        const projects = await projectRepo.find({}, { orderBy: "create_date DESC", q });
        return json({ data: projects, total: projects.length });
      }
      if (method === "POST") {
        const body = (await request.json()) as Record<string, unknown>;
        const created = await projectRepo.create(normalizeProjectPayload(body));
        return json({ data: created }, 201);
      }
    }

    const projectMatch = /^\/api\/projects\/([^/]+)$/.exec(pathname);
    if (projectMatch) {
      const projectId = decodeURIComponent(projectMatch[1]!);
      if (method === "GET") {
        const withRels = searchParams.get("with")?.split(",").filter(Boolean);
        const project = await projectRepo.findOne(projectId, withRels ? { with: withRels } : {});
        if (!project) return json({ error: "Project not found" }, 404);
        return json({ data: project });
      }
      if (method === "PATCH") {
        const body = (await request.json()) as Record<string, unknown>;
        const updated = await projectRepo.update(projectId, normalizeProjectPayload(body));
        if (!updated) return json({ error: "Project not found" }, 404);
        return json({ data: updated });
      }
      if (method === "DELETE") {
        const deleted = await projectRepo.delete(projectId);
        if (!deleted) return json({ error: "Project not found" }, 404);
        return json({ data: deleted });
      }
    }

    if (pathname === "/api/tasks") {
      if (method === "GET") {
        const filters: Record<string, unknown> = {};
        const projectCode =
          searchParams.get("project_code")?.trim() || searchParams.get("projectCode")?.trim();
        const taskStatus =
          searchParams.get("task_status")?.trim() || searchParams.get("stage")?.trim();
        const priority = searchParams.get("priority")?.trim();
        if (projectCode) filters.project_code = projectCode;
        if (taskStatus) filters.task_status = taskStatus;
        if (priority) filters.priority = priority === "medium" ? "normal" : priority;

        const rawDomain = searchParams.get("domain")?.trim();
        const finalFilters = rawDomain
          ? { $and: [filters, compileTupleDomainToFilter(JSON.parse(rawDomain) as unknown[])] }
          : filters;

        const q = searchParams.get("q")?.trim() || undefined;
        const withRels = searchParams.get("with")?.split(",").filter(Boolean);
        const limit = searchParams.get("limit")
          ? Math.min(200, Math.max(1, Number(searchParams.get("limit"))))
          : 100;
        const offset = searchParams.get("offset")
          ? Math.max(0, Number(searchParams.get("offset")))
          : 0;

        const tasks = await taskRepo.find(finalFilters, {
          limit,
          offset,
          orderBy: "write_date DESC",
          ...(q ? { q } : {}),
          ...(withRels?.length ? { with: withRels } : {}),
        });
        const total = await taskRepo.count(finalFilters, q ? { q } : {});
        return json({ data: tasks, total });
      }
      if (method === "POST") {
        const body = (await request.json()) as Record<string, unknown>;
        const created = await taskRepo.create(normalizeTaskPayload(body));
        return json({ data: created }, 201);
      }
    }

    if (method === "GET" && pathname === "/api/board/summary") {
      const projectCode =
        searchParams.get("project_code")?.trim() ||
        searchParams.get("projectCode")?.trim() ||
        undefined;
      const summary = await getProjectBoardSummary(actor.tenantId!, projectCode);
      return json(summary);
    }

    const taskHistoryMatch = /^\/api\/tasks\/([^/]+)\/history$/.exec(pathname);
    if (taskHistoryMatch && method === "GET") {
      const taskId = decodeURIComponent(taskHistoryMatch[1]!);
      const existing = await taskRepo.findOne(taskId, { includeDeleted: true });
      if (!existing) return json({ error: "Task not found" }, 404);
      const entries = await taskRepo.history(taskId);
      return json({ data: entries });
    }

    const taskActionMatch = /^\/api\/tasks\/([^/]+)\/(archive|restore)$/.exec(pathname);
    if (taskActionMatch && method === "POST") {
      const taskId = decodeURIComponent(taskActionMatch[1]!);
      const action = taskActionMatch[2]!;
      const updated =
        action === "archive" ? await taskRepo.archive(taskId) : await taskRepo.restore(taskId);
      if (!updated) return json({ error: "Task not found" }, 404);
      return json({ data: updated });
    }

    const taskMatch = /^\/api\/tasks\/([^/]+)$/.exec(pathname);
    if (taskMatch) {
      const taskId = decodeURIComponent(taskMatch[1]!);
      if (method === "GET") {
        const withRels = searchParams.get("with")?.split(",").filter(Boolean);
        const task = await taskRepo.findOne(taskId, withRels ? { with: withRels } : {});
        if (!task) return json({ error: "Task not found" }, 404);
        return json({ data: task });
      }
      if (method === "PATCH") {
        const body = (await request.json()) as Record<string, unknown>;
        const updated = await taskRepo.update(taskId, normalizeTaskPayload(body));
        if (!updated) return json({ error: "Task not found" }, 404);
        return json({ data: updated });
      }
      if (method === "DELETE") {
        const deleted = await taskRepo.delete(taskId);
        if (!deleted) return json({ error: "Task not found" }, 404);
        return json({ data: deleted });
      }
    }

    if (pathname === "/api/sync/logs" && method === "GET") {
      const logs = await syncLogRepo.find({}, { orderBy: "create_date DESC", limit: 25 });
      return json({ data: logs });
    }

    if (pathname === "/api/pubsub/events" || pathname === "/api/pubsub/stream") {
      const rawSince = searchParams.get("since")?.trim() || undefined;
      const since = rawSince ? (toIsoTimestamp(rawSince) ?? rawSince) : undefined;
      const filter = since ? { write_date: { $gt: since } } : {};
      const [projects, tasks, events] = await Promise.all([
        projectRepo.find(filter, { orderBy: "write_date ASC", limit: 200 }),
        taskRepo.find(filter, { orderBy: "write_date ASC", limit: 200 }),
        booted.driver.all<{
          id: string;
          model: string;
          entity_id: string;
          action: string;
          changed_by: string | null;
          changed_at: string;
          diff: string;
          entity_version: number;
          source: string;
        }>(
          "SELECT id, model, entity_id, action, changed_by, changed_at, diff, entity_version, source FROM _orm_audit_log WHERE model IN ('project.project', 'project.task', 'project.sync_log') AND changed_at > ? ORDER BY changed_at ASC LIMIT 100",
          [since ?? "1970-01-01T00:00:00.000Z"],
        ),
      ]);

      const timestamps: string[] = [];
      for (const p of projects) {
        const ts = toIsoTimestamp(p.write_date);
        if (ts) timestamps.push(ts);
      }
      for (const t of tasks) {
        const ts = toIsoTimestamp(t.write_date);
        if (ts) timestamps.push(ts);
      }
      for (const ev of events) {
        const ts = toIsoTimestamp(ev.changed_at);
        if (ts) timestamps.push(ts);
      }
      const cursor = timestamps.sort().at(-1) ?? since ?? new Date().toISOString();

      const envelope = { ok: true, cursor, projects, tasks, events };
      if (pathname === "/api/pubsub/stream") {
        const body = `retry: 5000\nevent: orm.pubsub\ndata: ${JSON.stringify(envelope)}\n\n`;
        return new Response(body, {
          status: 200,
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache",
            connection: "keep-alive",
            ...CORS_HEADERS,
          },
        });
      }
      return json(envelope);
    }

    if (pathname === "/api/pubsub/publish" && method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        projects?: Array<Record<string, unknown>>;
        tasks?: Array<Record<string, unknown>>;
      };
      let projectsUpserted = 0;
      let tasksUpserted = 0;

      for (const rawProject of body.projects ?? []) {
        const normalized = normalizeProjectPayload(rawProject);
        const code = typeof normalized.code === "string" ? normalized.code.trim() : "";
        if (!code) continue;
        await projectRepo.upsert({ code }, normalized);
        projectsUpserted += 1;
      }

      for (const rawTask of body.tasks ?? []) {
        const normalized = normalizeTaskPayload(rawTask);
        const projectCode =
          typeof normalized.project_code === "string" ? normalized.project_code.trim() : "";
        const title = typeof normalized.title === "string" ? normalized.title.trim() : "";
        if (!projectCode || !title) continue;

        const ensuredProject = (await projectRepo.find({ code: projectCode }, { limit: 1 }))[0];
        if (!ensuredProject) {
          await projectRepo.upsert(
            { code: projectCode },
            { code: projectCode, name: projectCode, summary: "", project_status: "active" },
          );
          projectsUpserted += 1;
        }

        const githubRepo =
          typeof normalized.github_repo === "string" ? normalized.github_repo.trim() : "";
        const githubIssue =
          typeof normalized.github_issue_number === "number"
            ? normalized.github_issue_number
            : null;
        if (githubRepo && githubIssue !== null) {
          await taskRepo.upsert(
            { github_repo: githubRepo, github_issue_number: githubIssue },
            normalized,
          );
          tasksUpserted += 1;
          continue;
        }

        const existingById =
          typeof rawTask.id === "string" && rawTask.id.trim()
            ? await taskRepo.findOne(rawTask.id.trim())
            : null;
        const existingByTitle =
          existingById ??
          (await taskRepo.find({ project_code: projectCode, title }, { limit: 1 }))[0] ??
          null;
        if (existingByTitle) {
          await taskRepo.update(existingByTitle.id, normalized);
        } else {
          await taskRepo.create(normalized);
        }
        tasksUpserted += 1;
      }

      return json({
        ok: true,
        projectsUpserted,
        tasksUpserted,
        cursor: new Date().toISOString(),
      });
    }

    if (pathname === "/api/sync/github" && method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        repo?: string;
        state?: "open" | "closed" | "all";
        issues?: GitHubIssueInput[];
      };
      const repo = body.repo?.trim() || env.DEFAULT_GITHUB_REPO || "A-L-L-A-H/moonwitness";
      const issues =
        body.issues ?? (await fetchGitHubIssues(repo, body.state ?? "all", env.GITHUB_TOKEN));
      const result = await syncGitHubIssuesToOrm(repo, issues, actor);
      return json({ ok: true, ...result });
    }

    if (pathname === "/api/webhooks/github" && method === "POST") {
      const event = request.headers.get("x-github-event") ?? "issues";
      if (event !== "issues") {
        return json({ ok: true, ignored: event });
      }
      const parsed = parseGitHubIssueWebhookPayload(
        (await request.json()) as GitHubIssueWebhookPayload,
      );
      if (!parsed) {
        return json({ error: "Invalid GitHub issues webhook payload" }, 400);
      }
      const result = await syncGitHubIssuesToOrm(parsed.repo, [parsed.issue], actor);
      return json({ ok: true, webhook: true, ...result });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    return handleOrmError(error);
  }
}

export default {
  fetch: handleEdgeRequest,
} satisfies ExportedHandler<EdgeEnv>;
