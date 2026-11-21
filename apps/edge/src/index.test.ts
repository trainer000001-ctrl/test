import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LibSqlDriver,
  closeDb,
  createD1DatabaseFromOrm,
  modelRegistry,
  type D1DatabaseLike,
} from "@moonwitness/orm";
import { handleEdgeRequest } from "./index.js";
import { resetEdgeRuntimeState, type EdgeEnv } from "./runtime.js";

const EDGE_SRC_DIR = resolve(__dirname);

function listNonTestTsFiles(rootDir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listNonTestTsFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("@moonwitness/edge centralized addon thin host", () => {
  let backingDriver: LibSqlDriver;
  let d1: D1DatabaseLike;
  let env: EdgeEnv;

  beforeEach(async () => {
    resetEdgeRuntimeState();
    modelRegistry.clearCustomFieldsForTests();
    backingDriver = new LibSqlDriver();
    await backingDriver.init("file::memory:?cache=shared");
    d1 = createD1DatabaseFromOrm(backingDriver);
    env = { DB: d1, DEFAULT_GITHUB_REPO: "A-L-L-A-H/moonwitness" };
  });

  afterEach(() => {
    resetEdgeRuntimeState();
    closeDb();
    backingDriver.close();
    modelRegistry.clearCustomFieldsForTests();
  });

  it("EDGE-GATE-01: zero defineModel( calls in non-test apps/edge/src/**/*.ts (centralized in @moonwitness/addons)", () => {
    const offenders = listNonTestTsFiles(EDGE_SRC_DIR)
      .filter((file) => /\bdefineModel\s*\(/.test(readFileSync(file, "utf8")))
      .map((file) => relative(EDGE_SRC_DIR, file).replace(/\\/g, "/"));
    expect(offenders).toEqual([]);
  });

  it("boots centralized __base + project addons, reports health/meta, and runs ORM CRUD + locking", async () => {
    const healthRes = await handleEdgeRequest(new Request("https://edge.local/healthz"), env);
    expect(healthRes.status).toBe(200);
    expect(await healthRes.json()).toEqual({
      ok: true,
      service: "moonwitness-edge-tasks",
      orm: "@moonwitness/orm",
      addonRuntime: "@moonwitness/addon-runtime",
      addons: ["__base", "project"],
      dialect: "d1",
    });

    const metaRes = await handleEdgeRequest(new Request("https://edge.local/_meta/addons"), env);
    expect(metaRes.status).toBe(200);
    const metaBody = (await metaRes.json()) as {
      order: string[];
      projectAddon: { name: string };
      installed: Array<{ name: string; state: string }>;
    };
    expect(metaBody.order).toEqual(["__base", "project"]);
    expect(metaBody.projectAddon.name).toBe("project");
    expect(
      metaBody.installed.some((addon) => addon.name === "project" && addon.state === "installed"),
    ).toBe(true);

    const htmlRes = await handleEdgeRequest(new Request("https://edge.local/"), env);
    expect(htmlRes.status).toBe(200);
    expect(await htmlRes.text()).toContain("@moonwitness/ui");

    const createProjectRes = await handleEdgeRequest(
      new Request("https://edge.local/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json", "x-tenant-id": "tenant-a" },
        body: JSON.stringify({ name: "Core Platform", summary: "Main delivery" }),
      }),
      env,
    );
    expect(createProjectRes.status).toBe(201);
    const project = ((await createProjectRes.json()) as { data: { id: string; code: string } })
      .data;
    expect(project.code).toBe("core-platform");

    const createTaskRes = await handleEdgeRequest(
      new Request("https://edge.local/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json", "x-tenant-id": "tenant-a" },
        body: JSON.stringify({
          project_code: project.code,
          title: "Wire centralized project addon",
          priority: "high",
          task_status: "todo",
        }),
      }),
      env,
    );
    expect(createTaskRes.status).toBe(201);
    const task = (
      (await createTaskRes.json()) as {
        data: { id: string; version: number; task_status: string; is_github_synced: boolean };
      }
    ).data;
    expect(task.version).toBe(1);
    expect(task.is_github_synced).toBe(false);

    // Tenant B must be strictly isolated
    const tenantBTasks = await handleEdgeRequest(
      new Request("https://edge.local/api/tasks", { headers: { "x-tenant-id": "tenant-b" } }),
      env,
    );
    expect(((await tenantBTasks.json()) as { total: number }).total).toBe(0);

    // Optimistic locking update
    const patchOk = await handleEdgeRequest(
      new Request(`https://edge.local/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-tenant-id": "tenant-a" },
        body: JSON.stringify({ task_status: "in_progress", version: 1 }),
      }),
      env,
    );
    expect(patchOk.status).toBe(200);
    expect(
      ((await patchOk.json()) as { data: { version: number; task_status: string } }).data,
    ).toMatchObject({
      version: 2,
      task_status: "in_progress",
    });

    const patchConflict = await handleEdgeRequest(
      new Request(`https://edge.local/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-tenant-id": "tenant-a" },
        body: JSON.stringify({ task_status: "done", version: 1 }),
      }),
      env,
    );
    expect(patchConflict.status).toBe(409);

    // Board summary via centralized getProjectBoardSummary
    const summaryRes = await handleEdgeRequest(
      new Request(`https://edge.local/api/board/summary?project_code=${project.code}`, {
        headers: { "x-tenant-id": "tenant-a" },
      }),
      env,
    );
    expect(summaryRes.status).toBe(200);
    expect(await summaryRes.json()).toMatchObject({
      projects: 1,
      tasks: 1,
      byStatus: { in_progress: 1 },
    });

    // Archive, restore, and audit history
    const archiveRes = await handleEdgeRequest(
      new Request(`https://edge.local/api/tasks/${task.id}/archive`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant-a" },
      }),
      env,
    );
    expect(archiveRes.status).toBe(200);

    const restoreRes = await handleEdgeRequest(
      new Request(`https://edge.local/api/tasks/${task.id}/restore`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant-a" },
      }),
      env,
    );
    expect(restoreRes.status).toBe(200);

    const historyRes = await handleEdgeRequest(
      new Request(`https://edge.local/api/tasks/${task.id}/history`, {
        headers: { "x-tenant-id": "tenant-a" },
      }),
      env,
    );
    expect(historyRes.status).toBe(200);
    const historyBody = (await historyRes.json()) as { data: Array<{ action: string }> };
    expect(historyBody.data.length).toBeGreaterThanOrEqual(4);
  });

  it("synchronizes GitHub issues and webhooks via centralized @moonwitness/addons/project", async () => {
    const syncRes = await handleEdgeRequest(
      new Request("https://edge.local/api/sync/github", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          repo: "A-L-L-A-H/moonwitness",
          issues: [
            {
              number: 288,
              title: "PostgreSQL standardization",
              body: "Move all services to PostgreSQL",
              state: "open",
              url: "https://github.com/A-L-L-A-H/moonwitness/issues/288",
              labels: ["p1", "database"],
              assignee: "bjo163",
            },
            {
              number: 489,
              title: "Universal ORM Epic",
              state: "closed",
              url: "https://github.com/A-L-L-A-H/moonwitness/issues/489",
              labels: ["p0"],
            },
          ],
        }),
      }),
      env,
    );
    expect(syncRes.status).toBe(200);
    expect(await syncRes.json()).toMatchObject({
      ok: true,
      repo: "A-L-L-A-H/moonwitness",
      projectCode: "a-l-l-a-h-moonwitness",
      synced: 2,
      created: 2,
      updated: 0,
    });

    const listRes = await handleEdgeRequest(new Request("https://edge.local/api/tasks"), env);
    const listBody = (await listRes.json()) as {
      data: Array<{
        id: string;
        github_issue_number: number;
        task_status: string;
        priority: string;
      }>;
    };
    const issue288 = listBody.data.find((task) => task.github_issue_number === 288)!;
    expect(issue288.task_status).toBe("todo");
    expect(issue288.priority).toBe("high");

    // Move issue #288 to in_progress; open re-sync preserves in_progress
    await handleEdgeRequest(
      new Request(`https://edge.local/api/tasks/${issue288.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task_status: "in_progress" }),
      }),
      env,
    );

    const resyncRes = await handleEdgeRequest(
      new Request("https://edge.local/api/sync/github", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          repo: "A-L-L-A-H/moonwitness",
          issues: [
            {
              number: 288,
              title: "PostgreSQL standardization (updated)",
              state: "open",
              labels: ["p0"],
            },
          ],
        }),
      }),
      env,
    );
    expect(await resyncRes.json()).toMatchObject({ created: 0, updated: 1 });

    const afterResync = await handleEdgeRequest(
      new Request(`https://edge.local/api/tasks/${issue288.id}`),
      env,
    );
    expect((await afterResync.json()) as Record<string, unknown>).toMatchObject({
      data: { task_status: "in_progress", priority: "critical" },
    });

    // Webhook closes issue #288 -> done
    const webhookRes = await handleEdgeRequest(
      new Request("https://edge.local/api/webhooks/github", {
        method: "POST",
        headers: { "content-type": "application/json", "x-github-event": "issues" },
        body: JSON.stringify({
          repository: { full_name: "A-L-L-A-H/moonwitness" },
          issue: {
            number: 288,
            title: "PostgreSQL standardization (updated)",
            state: "closed",
            html_url: "https://github.com/A-L-L-A-H/moonwitness/issues/288",
            labels: [{ name: "p0" }],
          },
        }),
      }),
      env,
    );
    expect(webhookRes.status).toBe(200);
    expect(await webhookRes.json()).toMatchObject({ ok: true, webhook: true, updated: 1 });

    const logsRes = await handleEdgeRequest(new Request("https://edge.local/api/sync/logs"), env);
    expect(((await logsRes.json()) as { data: unknown[] }).data.length).toBe(3);
  });

  it("supports bi-directional pub/sub publish, incremental events delta, and SSE stream", async () => {
    const publishRes = await handleEdgeRequest(
      new Request("https://edge.local/api/pubsub/publish", {
        method: "POST",
        headers: { "content-type": "application/json", "x-tenant-id": "rocksoul-local" },
        body: JSON.stringify({
          projects: [
            {
              code: "rocksoul-desktop",
              name: "ROCKSOUL Desktop",
              summary: "Mirrored from Rust ORM",
              project_status: "active",
            },
          ],
          tasks: [
            {
              project_code: "rocksoul-desktop",
              title: "Realtime Pub/Sub Sync",
              priority: "high",
              task_status: "in_progress",
            },
          ],
        }),
      }),
      env,
    );
    expect(publishRes.status).toBe(200);
    expect(await publishRes.json()).toMatchObject({
      ok: true,
      projectsUpserted: 1,
      tasksUpserted: 1,
    });

    const deltaRes = await handleEdgeRequest(
      new Request("https://edge.local/api/pubsub/events", {
        headers: { "x-tenant-id": "rocksoul-local" },
      }),
      env,
    );
    expect(deltaRes.status).toBe(200);
    const delta = (await deltaRes.json()) as {
      ok: boolean;
      cursor: string;
      projects: Array<{ code: string }>;
      tasks: Array<{ title: string; task_status: string }>;
      events: Array<{ model: string; action: string }>;
    };
    expect(delta.ok).toBe(true);
    expect(delta.projects.map((p) => p.code)).toContain("rocksoul-desktop");
    expect(delta.tasks.map((t) => t.title)).toContain("Realtime Pub/Sub Sync");
    expect(delta.events.length).toBeGreaterThanOrEqual(2);

    // Incremental fetch using returned cursor yields empty delta
    const emptyDelta = await handleEdgeRequest(
      new Request(
        `https://edge.local/api/pubsub/events?since=${encodeURIComponent(delta.cursor)}`,
        {
          headers: { "x-tenant-id": "rocksoul-local" },
        },
      ),
      env,
    );
    expect(emptyDelta.status).toBe(200);
    const emptyJson = (await emptyDelta.json()) as {
      projects: unknown[];
      tasks: unknown[];
    };
    expect(emptyJson.projects).toHaveLength(0);
    expect(emptyJson.tasks).toHaveLength(0);

    const streamRes = await handleEdgeRequest(
      new Request("https://edge.local/api/pubsub/stream", {
        headers: { "x-tenant-id": "rocksoul-local" },
      }),
      env,
    );
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers.get("content-type")).toContain("text/event-stream");
    const sseText = await streamRes.text();
    expect(sseText).toContain("event: orm.pubsub");
    expect(sseText).toContain("Realtime Pub/Sub Sync");
  });
});
