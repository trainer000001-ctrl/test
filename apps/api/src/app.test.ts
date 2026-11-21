import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app";
import { authBridge } from "./bootstrap";
import {
  events,
  registerTimelineRoutes,
  seedTimeline,
  type ITimelineRepository,
} from "@moonwitness/addons/timeline";
import { createSession, createUser } from "@moonwitness/addons/auth";

let app: FastifyInstance;
let actorTestApp: FastifyInstance | null = null;
let dbDir: string;
let dbPath: string;
const dirs: string[] = [];

beforeEach(async () => {
  dbDir = await mkdtemp(join(tmpdir(), "moonwitness-api-"));
  dirs.push(dbDir);
  dbPath = join(dbDir, "timeline.db");
  app = await buildApp({ dbPath, prefix: "/api/v1" });
  await seedTimeline();
});

afterEach(async () => {
  if (actorTestApp) {
    await actorTestApp.close();
    actorTestApp = null;
  }
  await app.close();
});

afterAll(async () => {
  for (const path of dirs) {
    await rm(path, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }).catch(
      () => {},
    );
  }
});

describe("operational endpoints", () => {
  it("reports liveness at /healthz", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/healthz" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("reports readiness with database connectivity at /readyz", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/readyz" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ready",
      database: "ok",
      services: {
        radius: {
          enabled: expect.any(Boolean),
          status: expect.stringMatching(/^(disabled|healthy|unhealthy)$/),
        },
        snmp: {
          enabled: expect.any(Boolean),
          status: expect.stringMatching(/^(disabled|healthy|unhealthy)$/),
        },
        syslog: {
          enabled: expect.any(Boolean),
          status: expect.stringMatching(/^(disabled|healthy|unhealthy)$/),
        },
        storage: {
          enabled: expect.any(Boolean),
          status: expect.stringMatching(/^(disabled|healthy|unhealthy)$/),
        },
      },
    });
  });

  it("reports disabled optional ops capabilities on /readyz and returns 503 SERVICE_DISABLED when disabled", async () => {
    const prev = process.env.MW_OPS_RADIUS_ENABLED;
    process.env.MW_OPS_RADIUS_ENABLED = "0";
    try {
      const readyRes = await app.inject({ method: "GET", url: "/api/v1/readyz" });
      expect(readyRes.statusCode).toBe(200);
      expect(readyRes.json()).toMatchObject({
        status: "ready",
        database: "ok",
        services: { radius: { enabled: false, status: "disabled" } },
      });

      const user = await createUser({
        username: "ops-check",
        email: "ops@moon.world",
        password: "ops-password-2026",
        role: "admin",
        displayName: "Ops Check",
      });
      const token = await createSession(user.id);

      const proxyRes = await app.inject({
        method: "GET",
        url: "/api/v1/radius/health",
        headers: { cookie: `mw_session=${token}` },
      });
      expect(proxyRes.statusCode).toBe(503);
      expect(proxyRes.json()).toEqual({
        error: "SERVICE_DISABLED",
        service: "radius",
        enabled: false,
      });
    } finally {
      if (prev === undefined) delete process.env.MW_OPS_RADIUS_ENABLED;
      else process.env.MW_OPS_RADIUS_ENABLED = prev;
    }
  });

  it("reports disabled optional ops capabilities on /readyz and returns 503 SERVICE_DISABLED when disabled", async () => {
    const prev = process.env.MW_OPS_RADIUS_ENABLED;
    process.env.MW_OPS_RADIUS_ENABLED = "0";
    try {
      const readyRes = await app.inject({ method: "GET", url: "/api/v1/readyz" });
      expect(readyRes.statusCode).toBe(200);
      expect(readyRes.json()).toMatchObject({
        status: "ready",
        database: "ok",
        services: { radius: { enabled: false, status: "disabled" } },
      });

      const user = await createUser({
        username: "ops-check",
        email: "ops@moon.world",
        password: "ops-password-2026",
        role: "admin",
        displayName: "Ops Check",
      });
      const token = await createSession(user.id);

      const proxyRes = await app.inject({
        method: "GET",
        url: "/api/v1/radius/health",
        headers: { cookie: `mw_session=${token}` },
      });
      expect(proxyRes.statusCode).toBe(503);
      expect(proxyRes.json()).toEqual({
        error: "SERVICE_DISABLED",
        service: "radius",
        enabled: false,
      });
    } finally {
      if (prev === undefined) delete process.env.MW_OPS_RADIUS_ENABLED;
      else process.env.MW_OPS_RADIUS_ENABLED = prev;
    }
  });

  it("sets safe security headers", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/healthz" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });

  it("advertises rate-limit headers on responses", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/healthz" });
    expect(response.headers["x-ratelimit-limit"]).toBeDefined();
    expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
  });

  it("echoes a caller-supplied request correlation id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/healthz",
      headers: { "x-request-id": "corr-123" },
    });
    expect(response.headers["x-request-id"]).toBe("corr-123");
  });

  it("generates a request correlation id when none is supplied", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/healthz" });
    expect(typeof response.headers["x-request-id"]).toBe("string");
    expect(response.headers["x-request-id"]).not.toBe("");
  });
});

describe("addon registry wiring", () => {
  it("serves __base health and metadata endpoints loaded through the registry", async () => {
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok" });

    const models = await app.inject({ method: "GET", url: "/_meta/models" });
    expect(models.statusCode).toBe(200);
    expect(models.json().models).toContain("timeline.event");

    const one = await app.inject({ method: "GET", url: "/_meta/models/timeline.event" });
    expect(one.statusCode).toBe(200);
    expect(one.json().fields.map((f: { name: string }) => f.name)).toContain("title");

    const missing = await app.inject({ method: "GET", url: "/_meta/models/does-not-exist" });
    expect(missing.statusCode).toBe(404);
  });
});

describe("timeline API", () => {
  it("returns an empty list on a fresh database", async () => {
    await app.close();
    app = await buildApp({ dbPath: join(dbDir, "fresh.db"), prefix: "/api/v1" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [], total: 0 });
  });

  it("lists seeded events with the correct total", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: unknown[]; total: number };
    expect(body.total).toBe(5);
    expect(body.data).toHaveLength(5);
  });

  it("returns a stored event by id with arrays and numbers intact", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events/evt-002",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { title: string; tags: string[]; sources: number; related: string[] };
    };
    expect(body.data.title).toBe("Signal in the Fog");
    expect(body.data.tags).toEqual(["signal", "voice"]);
    expect(body.data.sources).toBe(4);
    expect(body.data.related).toEqual(["evt-001", "evt-003"]);
  });

  it("returns 404 for an unknown event id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events/does-not-exist",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "TimelineEvent with id 'does-not-exist' not found",
    });
  });

  it("filters by era and reports total for the filtered set, not the page", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events?era=origins&limit=1",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { id: string }[]; total: number };
    expect(body.total).toBe(1);
    expect(body.data.map((event) => event.id)).toEqual(["evt-001"]);
  });

  it("paginates with offset after filtering", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events?limit=2&offset=2",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { id: string }[]; total: number };
    expect(body.total).toBe(5);
    expect(body.data.map((event) => event.id)).toEqual(["evt-003", "evt-004"]);
  });

  it("filters by inclusive date range", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events?from=2022-01-01&to=2024-12-31",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { id: string }[]; total: number };
    expect(body.data.map((event) => event.id)).toEqual(["evt-002", "evt-003"]);
    expect(body.total).toBe(2);
  });

  it("aggregates stats by era and kind", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/stats",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: {
        total: number;
        byEra: Record<string, number>;
        byKind: Record<string, number>;
      };
    };
    expect(body.data.total).toBe(5);
    expect(body.data.byEra).toEqual({
      origins: 1,
      neon: 1,
      fracture: 1,
      rebuilding: 1,
      expansions: 1,
    });
    expect(body.data.byKind).toEqual({
      PROJECT: 1,
      STORY: 1,
      WORLD: 1,
      PEOPLE: 1,
      RESEARCH: 1,
    });
  });

  it("returns eras with their display metadata", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/eras",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { id: string; name: string; years: string; color: string }[];
    };
    expect(body.data).toHaveLength(5);
    expect(body.data.find((era) => era.id === "origins")).toEqual({
      id: "origins",
      name: "Origins",
      years: "2020-2022",
      tagline: "The first witnesses.",
      color: "#3b82f6",
    });
  });

  it("rejects an out-of-range limit with 400", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events?limit=500",
    });

    expect(response.statusCode).toBe(400);
  });

  it("ignores a spoofed actor header and still serves public reads", async () => {
    const baseline = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events/evt-001",
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events/evt-001",
      headers: { "x-actor-id": "attacker" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(baseline.body);
  });

  it("propagates identity from a verified session into ActorContext", async () => {
    const user = await createUser({
      username: "api-actor",
      email: "api-actor@moon.world",
      password: "api-actor-password-2026",
      role: "editor",
      displayName: "API Actor",
    });
    const sessionId = await createSession(user.id);
    const getEvent = vi.fn(async (_id: string, _tenantId?: string) => events[0]!);
    const createEvent = vi.fn(async () => events[0]!);
    const repository: ITimelineRepository = {
      listEvents: async () => ({ data: [], total: 0 }),
      getEvent,
      getStats: async () => ({ total: 0, byEra: {}, byKind: {} }),
      getEras: async () => [],
      createEvent,
      updateEvent: async () => events[0]!,
      archiveEvent: async () => events[0]!,
      restoreEvent: async () => events[0]!,
      deleteEvent: async () => events[0]!,
      getEventHistory: async () => [],
      upsertEra: async (era) => era,
    };
    actorTestApp = Fastify({ logger: false });
    await actorTestApp.register(cookie);
    await actorTestApp.register(
      async (scope) => {
        await registerTimelineRoutes(scope, { auth: authBridge, repository });
      },
      { prefix: "/api/v1/timeline" },
    );
    await actorTestApp.ready();

    const anonymous = await actorTestApp.inject({
      method: "GET",
      url: "/api/v1/timeline/events/evt-001",
      headers: { "x-actor-id": "attacker", "x-actor-role": "admin", "x-tenant-id": "tenant-x" },
    });
    expect(anonymous.statusCode).toBe(200);
    expect(getEvent).toHaveBeenCalledWith("evt-001", "default");

    const postRes = await actorTestApp.inject({
      method: "POST",
      url: "/api/v1/timeline/events",
      headers: {
        cookie: `mw_session=${sessionId}`,
        "x-actor-id": "attacker",
        "x-actor-role": "admin",
      },
      payload: {
        kind: "PROJECT",
        date: "2026-11-18",
        era: "origins",
        title: "Actor Propagation",
      },
    });

    expect(postRes.statusCode).toBe(201);
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Actor Propagation" }),
      expect.objectContaining({
        actorId: String(user.id),
        source: "api",
        requestId: expect.any(String),
        tenantId: "default",
      }),
    );
  });

  it("persists data across an app restart on the same file", async () => {
    await app.close();
    app = await buildApp({ dbPath, prefix: "/api/v1" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: unknown[]; total: number };
    expect(body.total).toBe(5);
  });

  it("enforces RBAC on timeline mutations and records audit history", async () => {
    const admin = await createUser({
      username: "tl-admin",
      email: "tl-admin@moon.world",
      password: "tl-admin-password-2026",
      role: "admin",
      displayName: "TL Admin",
    });
    const editor = await createUser({
      username: "tl-editor",
      email: "tl-editor@moon.world",
      password: "tl-editor-password-2026",
      role: "editor",
      displayName: "TL Editor",
    });
    const viewer = await createUser({
      username: "tl-viewer",
      email: "tl-viewer@moon.world",
      password: "tl-viewer-password-2026",
      role: "viewer",
      displayName: "TL Viewer",
    });
    const adminSession = await createSession(admin.id);
    const editorSession = await createSession(editor.id);
    const viewerSession = await createSession(viewer.id);

    const payload = {
      kind: "SIGNAL",
      date: "2026-11-18",
      era: "expansions",
      title: "New Relay Beacon",
      excerpt: "Activated relay north.",
      body: "Full beacon report.",
      location: "North Tower",
      tags: ["beacon"],
    };

    const unauth = await app.inject({
      method: "POST",
      url: "/api/v1/timeline/events",
      payload,
    });
    expect(unauth.statusCode).toBe(401);

    const forbiddenViewer = await app.inject({
      method: "POST",
      url: "/api/v1/timeline/events",
      headers: { cookie: `mw_session=${viewerSession}` },
      payload,
    });
    expect(forbiddenViewer.statusCode).toBe(403);

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/timeline/events",
      headers: { cookie: `mw_session=${editorSession}` },
      payload,
    });
    expect(created.statusCode).toBe(201);
    const createdBody = created.json() as { data: { id: string; title: string } };
    const eventId = createdBody.data.id;
    expect(createdBody.data.title).toBe("New Relay Beacon");

    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/timeline/events/${eventId}`,
      headers: { cookie: `mw_session=${editorSession}` },
      payload: { title: "Updated Relay Beacon" },
    });
    expect(updated.statusCode).toBe(200);
    expect((updated.json() as { data: { title: string } }).data.title).toBe("Updated Relay Beacon");

    const archived = await app.inject({
      method: "POST",
      url: `/api/v1/timeline/events/${eventId}/archive`,
      headers: { cookie: `mw_session=${editorSession}` },
    });
    expect(archived.statusCode).toBe(200);

    const restored = await app.inject({
      method: "POST",
      url: `/api/v1/timeline/events/${eventId}/restore`,
      headers: { cookie: `mw_session=${editorSession}` },
    });
    expect(restored.statusCode).toBe(200);

    const editorDelete = await app.inject({
      method: "DELETE",
      url: `/api/v1/timeline/events/${eventId}`,
      headers: { cookie: `mw_session=${editorSession}` },
    });
    expect(editorDelete.statusCode).toBe(403);

    const adminDelete = await app.inject({
      method: "DELETE",
      url: `/api/v1/timeline/events/${eventId}`,
      headers: { cookie: `mw_session=${adminSession}` },
    });
    expect(adminDelete.statusCode).toBe(200);

    const afterDelete = await app.inject({
      method: "GET",
      url: `/api/v1/timeline/events/${eventId}`,
    });
    expect(afterDelete.statusCode).toBe(404);

    const history = await app.inject({
      method: "GET",
      url: `/api/v1/timeline/events/${eventId}/history`,
      headers: { cookie: `mw_session=${viewerSession}` },
    });
    expect(history.statusCode).toBe(200);
    const actions = (history.json() as { data: { action: string }[] }).data.map((h) => h.action);
    expect(actions).toEqual(
      expect.arrayContaining(["CREATE", "UPDATE", "ARCHIVE", "RESTORE", "DELETE"]),
    );
  });
});
