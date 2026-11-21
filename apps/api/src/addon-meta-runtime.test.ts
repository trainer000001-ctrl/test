import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app";
import { createSession, createUser, SESSION_COOKIE_NAME } from "@moonwitness/addons/auth";

const dirs: string[] = [];

describe("API addon runtime metadata & live toggle routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Temp directory created per test below so parallel/isolated state is clean.
  });

  beforeEach(async () => {
    const dir = await mkdtemp(join(tmpdir(), "mw-addon-meta-"));
    dirs.push(dir);
    app = await buildApp({ dbPath: join(dir, "runtime.db"), prefix: "/api/v1" });
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    for (const dir of dirs) {
      await rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }).catch(
        () => {},
      );
    }
  });

  async function issueCookie(role: "admin" | "viewer") {
    const user = await createUser({
      username: `user_${role}_${Date.now()}`,
      email: `${role}_${Date.now()}@example.com`,
      password: "Password123!",
      role,
      displayName: role.toUpperCase(),
    });
    const sessionId = await createSession(user.id);
    return `${SESSION_COOKIE_NAME}=${sessionId}`;
  }

  it("keeps public discovery endpoints anonymous-safe and gates admin addon controls", async () => {
    const models = await app.inject({ url: "/_meta/models" });
    expect(models.statusCode).toBe(200);
    expect(models.json().models).toContain("timeline.event");

    const unauthAddons = await app.inject({ url: "/api/v1/_meta/addons" });
    expect(unauthAddons.statusCode).toBe(401);

    const viewerCookie = await issueCookie("viewer");
    const viewerAddons = await app.inject({
      url: "/api/v1/_meta/addons",
      headers: { cookie: viewerCookie },
    });
    expect(viewerAddons.statusCode).toBe(403);

    const adminCookie = await issueCookie("admin");
    const adminAddons = await app.inject({
      url: "/api/v1/_meta/addons",
      headers: { cookie: adminCookie },
    });
    expect(adminAddons.statusCode).toBe(200);
    const names = adminAddons.json().addons.map((a: { name: string }) => a.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "__base",
        "i18n",
        "audit",
        "auth",
        "timeline",
        "control",
        "command-center",
        "probes",
        "ai",
        "storage",
        "snmp",
        "syslog",
        "radius",
        "canon-lore",
        "witness-research",
        "epistemic",
      ]),
    );

    const viewRes = await app.inject({
      url: "/api/v1/_meta/views/timeline.event",
      headers: { cookie: adminCookie },
    });
    expect(viewRes.statusCode).toBe(200);
    const tlFields = viewRes.json().fields.map((f: { field_name: string }) => f.field_name);
    expect(tlFields).toContain("canon_tier");
  });

  it("enforces dependency guard on disable and toggles live via HTTP without restart", async () => {
    const adminCookie = await issueCookie("admin");
    expect((await app.inject({ url: "/api/v1/timeline/events" })).statusCode).toBe(200);
    expect((await app.inject({ url: "/api/v1/canon/overview" })).statusCode).toBe(200);

    // Dependency guard: timeline cannot be disabled while active canon-lore depends on it
    const guarded = await app.inject({
      method: "POST",
      url: "/api/v1/_meta/addons/timeline/disable",
      headers: { cookie: adminCookie },
    });
    expect(guarded.statusCode).toBe(409);

    // Disable dependent leaf first, then timeline
    const disableCanon = await app.inject({
      method: "POST",
      url: "/api/v1/_meta/addons/canon-lore/disable",
      headers: { cookie: adminCookie },
    });
    expect(disableCanon.statusCode).toBe(200);
    expect((await app.inject({ url: "/api/v1/canon/overview" })).statusCode).toBe(503);

    const disabled = await app.inject({
      method: "POST",
      url: "/api/v1/_meta/addons/timeline/disable",
      headers: { cookie: adminCookie },
    });
    expect(disabled.statusCode).toBe(200);

    const blocked = await app.inject({ url: "/api/v1/timeline/events" });
    expect(blocked.statusCode).toBe(503);
    expect(blocked.json().code).toBe("ADDON_DISABLED");

    const enabled = await app.inject({
      method: "POST",
      url: "/api/v1/_meta/addons/timeline/enable",
      headers: { cookie: adminCookie },
    });
    expect(enabled.statusCode).toBe(200);
    expect((await app.inject({ url: "/api/v1/timeline/events" })).statusCode).toBe(200);
  });

  it("serves dynamic /api/v1/_meta/models without ghost models and guards /api/v1/m/:model on disabled addons", async () => {
    const adminCookie = await issueCookie("admin");
    const prefixedModels = await app.inject({ url: "/api/v1/_meta/models" });
    expect(prefixedModels.statusCode).toBe(200);
    const modelNames = prefixedModels.json().models as string[];
    expect(modelNames).toContain("timeline.event");
    expect(modelNames).toContain("canon.codex");
    expect(modelNames).not.toContain("identity.user_profile");
    expect(modelNames).not.toContain("ops.metric_snapshot");

    const beforeDisable = await app.inject({
      url: "/api/v1/m/canon.codex",
      headers: { cookie: adminCookie },
    });
    expect(beforeDisable.statusCode).toBe(200);

    const disableCanon = await app.inject({
      method: "POST",
      url: "/api/v1/_meta/addons/canon-lore/disable",
      headers: { cookie: adminCookie },
    });
    expect(disableCanon.statusCode).toBe(200);

    const afterDisable = await app.inject({
      url: "/api/v1/m/canon.codex",
      headers: { cookie: adminCookie },
    });
    expect(afterDisable.statusCode).toBe(503);
    expect(afterDisable.json().code).toBe("ADDON_DISABLED");
  });
});
