import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { closeDb, initDb } from "@moonwitness/orm";
import { defaultFailClosedAuthBridge, type BaseAddonAuthBridge } from "@moonwitness/addon-runtime";
import { ensureProbesSchema, registerProbesRoutes } from "@moonwitness/addons/probes";
import { registerHealthRoutes } from "./health.routes";

const testAuth: BaseAddonAuthBridge = {
  ...defaultFailClosedAuthBridge,
  authenticate: async (request: FastifyRequest, reply: FastifyReply) => {
    const cookieHeader = request.headers.cookie ?? "";
    if (!cookieHeader.includes("mw_session=")) {
      return reply.code(401).send({ error: "Not authenticated" });
    }
    const role = (request.headers["x-test-role"] as string) ?? "editor";
    (request as { user?: { id: string; username: string; role: string } }).user = {
      id: "1",
      username: "test-operator",
      role,
    };
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

describe("probes routes & NOC consolidation", () => {
  let app: FastifyInstance | null = null;
  const adminHeaders = { cookie: "mw_session=test-session", "x-test-role": "admin" };
  const editorHeaders = { cookie: "mw_session=test-session", "x-test-role": "editor" };
  const viewerHeaders = { cookie: "mw_session=test-session", "x-test-role": "viewer" };

  beforeEach(async () => {
    await initDb("file::memory:?cache=shared");
    await ensureProbesSchema();

    app = Fastify({ logger: false });
    await registerHealthRoutes(app);
    await app.register(
      async (scope) => {
        await registerProbesRoutes(scope, { auth: testAuth });
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

  it("enforces authentication: rejects unauthenticated requests with 401", async () => {
    const nodesRes = await app!.inject({
      method: "GET",
      url: "/api/v1/probes/nodes",
    });
    expect(nodesRes.statusCode).toBe(401);

    const eventsRes = await app!.inject({
      method: "GET",
      url: "/api/v1/probes/events",
    });
    expect(eventsRes.statusCode).toBe(401);

    const runRes = await app!.inject({
      method: "POST",
      url: "/api/v1/probes/run",
    });
    expect(runRes.statusCode).toBe(401);
  });

  it("enforces role-based access: viewers can read nodes and events but cannot execute probes", async () => {
    const nodesRes = await app!.inject({
      method: "GET",
      url: "/api/v1/probes/nodes",
      headers: viewerHeaders,
    });
    expect(nodesRes.statusCode).toBe(200);
    const nodesBody = nodesRes.json() as { nodes: Array<{ id: string; name: string }> };
    expect(nodesBody.nodes.length).toBeGreaterThanOrEqual(5);

    const eventsRes = await app!.inject({
      method: "GET",
      url: "/api/v1/probes/events",
      headers: viewerHeaders,
    });
    expect(eventsRes.statusCode).toBe(200);

    const runRes = await app!.inject({
      method: "POST",
      url: "/api/v1/probes/run",
      headers: viewerHeaders,
      payload: { nodeId: "core-api" },
    });
    expect(runRes.statusCode).toBe(403);
  });

  it("allows admin and editor to execute probes and records audit telemetry", async () => {
    const probeRes = await app!.inject({
      method: "POST",
      url: "/api/v1/probes/run",
      headers: editorHeaders,
      payload: { nodeId: "core-api" },
    });
    expect(probeRes.statusCode).toBe(200);
    const body = probeRes.json() as {
      probed: Array<{
        nodeId: string;
        statusCode: number;
        ok: boolean;
        latencyMs: number;
        actorSub: string;
        checkedAt: string;
      }>;
    };
    expect(body.probed).toHaveLength(1);
    expect(body.probed[0]!.nodeId).toBe("core-api");
    expect(body.probed[0]!.actorSub).toBe("1");
    expect(body.probed[0]!.checkedAt).toBeDefined();

    // Verify event is listed in recent events
    const eventsRes = await app!.inject({
      method: "GET",
      url: "/api/v1/probes/events?limit=10",
      headers: viewerHeaders,
    });
    expect(eventsRes.statusCode).toBe(200);
    const eventsBody = eventsRes.json() as { events: Array<{ nodeId: string }> };
    expect(eventsBody.events.some((ev) => ev.nodeId === "core-api")).toBe(true);
  });

  it("rejects unknown node ids with 404 to prevent arbitrary SSRF probing", async () => {
    const res = await app!.inject({
      method: "POST",
      url: "/api/v1/probes/run",
      headers: adminHeaders,
      payload: { nodeId: "non-existent-evil-node" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "unknown_node" });
  });

  it("serves IGate backward-compatibility endpoints", async () => {
    const statusRes = await app!.inject({
      method: "GET",
      url: "/api/v1/igate/status",
      headers: viewerHeaders,
    });
    expect(statusRes.statusCode).toBe(200);
    const status = statusRes.json() as {
      service: string;
      actor: { sub: string; role: string };
      nodes: Array<{ id: string }>;
    };
    expect(status.service).toBe("moonwitness-api");
    expect(status.actor.role).toBe("viewer");
    expect(status.nodes.length).toBeGreaterThanOrEqual(5);

    const probeRes = await app!.inject({
      method: "POST",
      url: "/api/v1/igate/probe",
      headers: adminHeaders,
      payload: { nodeId: "id-provider" },
    });
    expect(probeRes.statusCode).toBe(200);
    const probeBody = probeRes.json() as { probed: Array<{ nodeId: string }> };
    expect(probeBody.probed[0]!.nodeId).toBe("id-provider");
  });

  it("serves standard health ready and live endpoints", async () => {
    const readyRes = await app!.inject({
      method: "GET",
      url: "/readyz",
    });
    expect(readyRes.statusCode).toBe(200);
    expect(readyRes.json()).toMatchObject({ status: "ready", database: "ok" });

    const healthReadyRes = await app!.inject({
      method: "GET",
      url: "/health/ready",
    });
    expect(healthReadyRes.statusCode).toBe(200);
    expect(healthReadyRes.json()).toMatchObject({ status: "ready", database: "ok" });
  });
});
