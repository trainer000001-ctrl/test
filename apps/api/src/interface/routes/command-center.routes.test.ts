import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { closeDb, initDb } from "@moonwitness/orm";
import { defaultFailClosedAuthBridge, type BaseAddonAuthBridge } from "@moonwitness/addon-runtime";
import {
  ensureCommandCenterSchema,
  registerCommandCenterRoutes,
} from "@moonwitness/addons/command-center";

const testAuth: BaseAddonAuthBridge = {
  ...defaultFailClosedAuthBridge,
  authenticate: async (request: FastifyRequest, reply: FastifyReply) => {
    const cookieHeader = request.headers.cookie ?? "";
    if (!cookieHeader.includes("mw_session=")) {
      return reply.code(401).send({ error: "Not authenticated" });
    }
    const actor = request.headers["x-test-actor"] === "second" ? "2" : "1";
    const role = (request.headers["x-test-role"] as "admin" | "editor" | "viewer") ?? "editor";
    (request as { user?: { id: string; role: string } }).user = { id: actor, role };
  },
  requireRole:
    (...allowedRoles) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as { user?: { role: "admin" | "editor" | "viewer" } }).user;
      if (!user) return reply.code(401).send({ error: "Not authenticated" });
      if (!allowedRoles.includes(user.role)) {
        return reply.code(403).send({ error: "Forbidden: insufficient permissions" });
      }
    },
};

describe("command center persistence routes", () => {
  let app: FastifyInstance | null = null;
  const authHeaders = { cookie: "mw_session=test-session" };

  beforeEach(async () => {
    await initDb("file::memory:?cache=shared");
    await ensureCommandCenterSchema();
    app = Fastify({ logger: false });
    await app.register(
      async (scope) => {
        await registerCommandCenterRoutes(scope, { auth: testAuth });
      },
      { prefix: "/api/v1" },
    );
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    await closeDb();
  });

  it("rejects unauthenticated requests with 401", async () => {
    const res = await app!.inject({
      method: "GET",
      url: "/api/v1/command-center/state",
    });
    expect(res.statusCode).toBe(401);
  });

  it("hydrates initial workflows/alerts and persists newly created & toggled workflows", async () => {
    const initial = await app!.inject({
      method: "GET",
      url: "/api/v1/command-center/state",
      headers: authHeaders,
    });
    expect(initial.statusCode).toBe(200);
    const body = initial.json() as {
      workflows: Array<{ id: string; status: string }>;
      alerts: Array<{ id: string }>;
      feed: Array<{ time: string; tag: string; msg: string }>;
    };
    expect(body.workflows).toHaveLength(5);
    expect(body.alerts).toHaveLength(3);
    expect(body.feed.length).toBeGreaterThan(0);
    expect(body.feed[0]).toHaveProperty("tag");

    const created = await app!.inject({
      method: "POST",
      url: "/api/v1/command-center/workflows",
      headers: authHeaders,
      payload: {
        name: "Nightly Zine Compiler",
        detail: "story-forge · The Batteries",
      },
    });
    expect(created.statusCode).toBe(201);
    const createdWf = (created.json() as { workflow: { id: string; status: string; name: string } })
      .workflow;
    expect(createdWf.name).toBe("Nightly Zine Compiler");
    expect(createdWf.status).toBe("Queued");

    const toggled = await app!.inject({
      method: "PATCH",
      url: `/api/v1/command-center/workflows/${createdWf.id}/toggle`,
      headers: authHeaders,
    });
    expect(toggled.statusCode).toBe(200);
    expect((toggled.json() as { workflow: { status: string } }).workflow.status).toBe("Running");

    const refreshed = await app!.inject({
      method: "GET",
      url: "/api/v1/command-center/state",
      headers: authHeaders,
    });
    const refreshedBody = refreshed.json() as {
      workflows: Array<{ id: string; status: string }>;
    };
    expect(refreshedBody.workflows[0]?.id).toBe(createdWf.id);
    expect(refreshedBody.workflows[0]?.status).toBe("Running");
  });

  it("validates payload schema and keeps dismissed alerts dismissed across reloads", async () => {
    const bad = await app!.inject({
      method: "POST",
      url: "/api/v1/command-center/workflows",
      headers: authHeaders,
      payload: { name: "  ", detail: "" },
    });
    expect(bad.statusCode).toBe(400);

    const dismissed = await app!.inject({
      method: "DELETE",
      url: "/api/v1/command-center/alerts/a-2",
      headers: authHeaders,
    });
    expect(dismissed.statusCode).toBe(200);

    const missing = await app!.inject({
      method: "DELETE",
      url: "/api/v1/command-center/alerts/a-2",
      headers: authHeaders,
    });
    expect(missing.statusCode).toBe(404);

    // Other actors still keep their own alert state isolated
    const otherActor = await app!.inject({
      method: "GET",
      url: "/api/v1/command-center/state",
      headers: { ...authHeaders, "x-test-actor": "second" },
    });
    expect((otherActor.json() as { alerts: Array<{ id: string }> }).alerts).toHaveLength(3);

    const sameActor = await app!.inject({
      method: "GET",
      url: "/api/v1/command-center/state",
      headers: authHeaders,
    });
    const remainingIds = (sameActor.json() as { alerts: Array<{ id: string }> }).alerts.map(
      (a) => a.id,
    );
    expect(remainingIds).toEqual(["a-1", "a-3"]);
  });

  it("reflects created/transitioned workflows in stats after mutations", async () => {
    const before = await app!.inject({
      method: "GET",
      url: "/api/v1/command-center/stats",
      headers: authHeaders,
    });
    const beforeBody = before.json() as { workflows: number; queued: number; running: number };

    const created = await app!.inject({
      method: "POST",
      url: "/api/v1/command-center/workflows",
      headers: authHeaders,
      payload: { name: "Signal Batch", detail: "queue -> run -> pause" },
    });
    const wf = (created.json() as { workflow: { id: string; status: string } }).workflow;

    const stats = await app!.inject({
      method: "GET",
      url: "/api/v1/command-center/stats",
      headers: authHeaders,
    });
    const statsBody = stats.json() as { workflows: number; queued: number; running: number };
    expect(statsBody.workflows).toBe(beforeBody.workflows + 1);
    expect(statsBody.queued).toBe(beforeBody.queued + 1);

    await app!.inject({
      method: "PATCH",
      url: `/api/v1/command-center/workflows/${wf.id}/status`,
      headers: authHeaders,
      payload: { status: "Running" },
    });
    const statsAfterRun = await app!.inject({
      method: "GET",
      url: "/api/v1/command-center/stats",
      headers: authHeaders,
    });
    const body2 = statsAfterRun.json() as { running: number; queued: number };
    expect(body2.running).toBe(beforeBody.running + 1);
    expect(body2.queued).toBe(beforeBody.queued);
  });

  it("exposes DB-derived stats and enforces valid workflow lifecycle transitions", async () => {
    const stats = await app!.inject({
      method: "GET",
      url: "/api/v1/command-center/stats",
      headers: authHeaders,
    });
    expect(stats.statusCode).toBe(200);

    // Create a workflow queued by default, then run it.
    const created = await app!.inject({
      method: "POST",
      url: "/api/v1/command-center/workflows",
      headers: authHeaders,
      payload: { name: "Signal Batch", detail: "queue -> run -> pause" },
    });
    const wf = (created.json() as { workflow: { id: string; status: string } }).workflow;
    expect(wf.status).toBe("Queued");

    const run = await app!.inject({
      method: "PATCH",
      url: `/api/v1/command-center/workflows/${wf.id}/status`,
      headers: authHeaders,
      payload: { status: "Running" },
    });
    expect(run.statusCode).toBe(200);
    expect((run.json() as { workflow: { status: string } }).workflow.status).toBe("Running");

    const pause = await app!.inject({
      method: "PATCH",
      url: `/api/v1/command-center/workflows/${wf.id}/status`,
      headers: authHeaders,
      payload: { status: "Paused" },
    });
    expect(pause.statusCode).toBe(200);
    expect((pause.json() as { workflow: { status: string } }).workflow.status).toBe("Paused");

    const cancel = await app!.inject({
      method: "PATCH",
      url: `/api/v1/command-center/workflows/${wf.id}/status`,
      headers: authHeaders,
      payload: { status: "Cancelled" },
    });
    expect(cancel.statusCode).toBe(200);
    expect((cancel.json() as { workflow: { status: string } }).workflow.status).toBe("Cancelled");

    // A terminal workflow cannot be transitioned again.
    const illegal = await app!.inject({
      method: "PATCH",
      url: `/api/v1/command-center/workflows/${wf.id}/status`,
      headers: authHeaders,
      payload: { status: "Running" },
    });
    expect(illegal.statusCode).toBe(409);
  });
});
