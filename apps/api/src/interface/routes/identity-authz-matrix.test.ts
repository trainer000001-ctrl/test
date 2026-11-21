import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { closeDb, initDb } from "@moonwitness/orm";
import { createUser, ensureAuthSchema, resetMidJwksCacheForTests } from "@moonwitness/addons/auth";

const API_PREFIX = "/api/v1";
let dbCounter = 0;

async function loginCookie(
  app: FastifyInstance,
  username: string,
  password: string,
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: `${API_PREFIX}/auth/login`,
    payload: { identifier: username, password },
  });
  expect(res.statusCode).toBe(200);
  const raw = res.headers["set-cookie"];
  const header = Array.isArray(raw) ? raw.join(";") : String(raw ?? "");
  const match = header.match(/mw_session=([^;]+)/);
  if (!match) throw new Error("Missing session cookie on login");
  return `mw_session=${match[1]}`;
}

describe("API identity & deny-by-default authorization matrix", () => {
  const envBackup = { ...process.env };
  let app: FastifyInstance | null = null;
  let adminUser = "";
  let editorUser = "";
  let viewerUser = "";

  beforeEach(async () => {
    process.env = { ...envBackup };
    process.env.NODE_ENV = "test";
    process.env.MID_KEY_ENCRYPTION_SECRET = "matrix-test-mid-secret-32-chars!";
    process.env.MID_ISSUER_URL = "https://id.moonwitness.biz.id";
    delete process.env.MW_BOOTSTRAP_ADMIN_USERNAME;
    delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
    resetMidJwksCacheForTests();

    dbCounter += 1;
    adminUser = `matrix-admin-${dbCounter}`;
    editorUser = `matrix-editor-${dbCounter}`;
    viewerUser = `matrix-viewer-${dbCounter}`;

    await initDb("file::memory:?cache=shared");
    await ensureAuthSchema();

    await createUser({
      username: adminUser,
      email: `${adminUser}@moonwitness.local`,
      password: "AdminMatrixPassword!2026",
      role: "admin",
      displayName: "Matrix Admin",
    });
    await createUser({
      username: editorUser,
      email: `${editorUser}@moonwitness.local`,
      password: "EditorMatrixPassword!2026",
      role: "editor",
      displayName: "Matrix Editor",
    });
    await createUser({
      username: viewerUser,
      email: `${viewerUser}@moonwitness.local`,
      password: "ViewerMatrixPassword!2026",
      role: "viewer",
      displayName: "Matrix Viewer",
    });

    const { buildCoreApp } = await import("../../bootstrap");
    app = await buildCoreApp({ prefix: API_PREFIX });
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    process.env = { ...envBackup };
    await closeDb();
  });

  it("rejects anonymous, invalid bearer, and revoked session callers with 401 across protected endpoints", async () => {
    const protectedEndpoints: Array<{ method: "GET" | "POST" | "PUT"; url: string }> = [
      { method: "GET", url: `${API_PREFIX}/auth/me` },
      { method: "GET", url: `${API_PREFIX}/probes/nodes` },
      { method: "POST", url: `${API_PREFIX}/probes/run` },
      { method: "GET", url: `${API_PREFIX}/igate/status` },
      { method: "GET", url: `${API_PREFIX}/command-center/state` },
      { method: "POST", url: `${API_PREFIX}/command-center/workflows` },
      { method: "GET", url: `${API_PREFIX}/riot-ai/usage` },
      { method: "PUT", url: `${API_PREFIX}/riot-ai/config` },
      { method: "GET", url: `${API_PREFIX}/storage/buckets` },
    ];

    for (const endpoint of protectedEndpoints) {
      const anonRes = await app!.inject({ method: endpoint.method, url: endpoint.url });
      expect(anonRes.statusCode).toBe(401);

      const badBearerRes = await app!.inject({
        method: endpoint.method,
        url: endpoint.url,
        headers: { authorization: "Bearer invalid.jwt.token" },
      });
      expect(badBearerRes.statusCode).toBe(401);
    }

    const cookie = await loginCookie(app!, viewerUser, "ViewerMatrixPassword!2026");
    const meBefore = await app!.inject({
      method: "GET",
      url: `${API_PREFIX}/auth/me`,
      headers: { cookie },
    });
    expect(meBefore.statusCode).toBe(200);

    const logoutRes = await app!.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/logout`,
      headers: { cookie, origin: "http://localhost:3000" },
    });
    expect(logoutRes.statusCode).toBe(200);

    const meAfter = await app!.inject({
      method: "GET",
      url: `${API_PREFIX}/auth/me`,
      headers: { cookie },
    });
    expect(meAfter.statusCode).toBe(401);
  });

  it("enforces role hierarchy across viewer, editor, and admin without auth middleware mocks", async () => {
    const viewerCookie = await loginCookie(app!, viewerUser, "ViewerMatrixPassword!2026");
    const editorCookie = await loginCookie(app!, editorUser, "EditorMatrixPassword!2026");
    const adminCookie = await loginCookie(app!, adminUser, "AdminMatrixPassword!2026");

    // Viewer can read probe inventory and command-center state, but cannot mutate or touch admin/operator ops.
    expect(
      (
        await app!.inject({
          method: "GET",
          url: `${API_PREFIX}/probes/nodes`,
          headers: { cookie: viewerCookie },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app!.inject({
          method: "GET",
          url: `${API_PREFIX}/command-center/state`,
          headers: { cookie: viewerCookie },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app!.inject({
          method: "POST",
          url: `${API_PREFIX}/command-center/workflows`,
          headers: { cookie: viewerCookie },
          payload: { name: "Blocked Viewer Workflow", detail: "test" },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app!.inject({
          method: "POST",
          url: `${API_PREFIX}/probes/run`,
          headers: { cookie: viewerCookie },
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app!.inject({
          method: "GET",
          url: `${API_PREFIX}/riot-ai/usage`,
          headers: { cookie: viewerCookie },
        })
      ).statusCode,
    ).toBe(403);

    // Editor can create workflows and query RIOT AI health, but cannot read admin usage or write config.
    expect(
      (
        await app!.inject({
          method: "POST",
          url: `${API_PREFIX}/command-center/workflows`,
          headers: { cookie: editorCookie },
          payload: { name: "Allowed Editor Workflow", detail: "ops" },
        })
      ).statusCode,
    ).toBe(201);
    expect(
      (
        await app!.inject({
          method: "GET",
          url: `${API_PREFIX}/riot-ai/usage`,
          headers: { cookie: editorCookie },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app!.inject({
          method: "PUT",
          url: `${API_PREFIX}/riot-ai/config`,
          headers: { cookie: editorCookie },
          payload: { provider: "mock" },
        })
      ).statusCode,
    ).toBe(403);

    // Admin has access to admin usage reporting.
    expect(
      (
        await app!.inject({
          method: "GET",
          url: `${API_PREFIX}/riot-ai/usage`,
          headers: { cookie: adminCookie },
        })
      ).statusCode,
    ).toBe(200);
  });

  it("serves MoonWitness ID discovery and JWKS consistently via id.moonwitness.biz.id host authority", async () => {
    const discoveryRes = await app!.inject({
      method: "GET",
      url: "/.well-known/openid-configuration",
      headers: { host: "id.moonwitness.biz.id" },
    });
    expect(discoveryRes.statusCode).toBe(200);
    expect(discoveryRes.json()).toMatchObject({
      issuer: "https://id.moonwitness.biz.id",
      jwks_uri: "https://id.moonwitness.biz.id/.well-known/jwks.json",
      authorization_endpoint: "https://id.moonwitness.biz.id/authorize",
      token_endpoint: "https://id.moonwitness.biz.id/oauth/token",
    });

    const jwksRes = await app!.inject({
      method: "GET",
      url: "/.well-known/jwks.json",
      headers: { host: "id.moonwitness.biz.id" },
    });
    expect(jwksRes.statusCode).toBe(200);
    const jwks = jwksRes.json() as { keys: Array<{ kid: string; kty: string; crv: string }> };
    expect(jwks.keys.length).toBeGreaterThanOrEqual(1);
    expect(jwks.keys[0]).toMatchObject({ kty: "EC", crv: "P-256" });
  });
});
