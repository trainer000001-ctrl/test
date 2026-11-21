import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import FastifyCors from "@fastify/cors";
import { initDb, closeDb } from "@moonwitness/orm";

async function loadRoutes(max: string) {
  process.env.ARSY_AUTH_RATE_MAX = max;
  process.env.ARSY_AUTH_RATE_WINDOW_MS = "60000";
  const { registerControlRoutes } = await import("@moonwitness/addons/control");
  const { authBridge } = await import("../../bootstrap");
  return {
    controlRoutes: async (instance: FastifyInstance) =>
      registerControlRoutes(instance, { auth: authBridge }),
  };
}

describe("control routes auth rate limiting", () => {
  const envBackup = { ...process.env };
  let app: FastifyInstance | null = null;

  beforeEach(async () => {
    process.env = { ...envBackup };
    await initDb("file::memory:?cache=shared");
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    process.env = { ...envBackup };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await closeDb();
  });

  it("menolak permintaan auth setelah batas per-IP terlampaui", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { controlRoutes } = await loadRoutes("2");
    const fastifyCookie = (await import("@fastify/cookie")).default;
    app = Fastify({ logger: false });
    await app.register(fastifyCookie);
    await app.register(controlRoutes);
    await app.ready();
    const inject = () =>
      app!.inject({
        method: "POST",
        url: "/control/auth/login",
        payload: { email: "a@b.c" },
        remoteAddress: "10.1.2.3",
      });
    const first = await inject();
    const second = await inject();
    expect(first.statusCode).toBe(502);
    expect(second.statusCode).toBe(502);
    const third = await inject();
    expect(third.statusCode).toBe(429);
    expect(third.json().message).toContain("terlalu banyak");
  });

  it("mengirim header rate limit pada respons auth", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { controlRoutes } = await loadRoutes("5");
    const fastifyCookie = (await import("@fastify/cookie")).default;
    app = Fastify({ logger: false });
    await app.register(fastifyCookie);
    await app.register(controlRoutes);
    await app.ready();
    const res = await app.inject({
      method: "GET",
      url: "/control/auth/me",
      remoteAddress: "10.9.9.9",
    });
    expect(res.statusCode).toBe(502);
    expect(res.headers["x-ratelimit-limit"]).toBe("5");
    expect(res.headers["x-ratelimit-remaining"]).toBe("4");
  });

  it("tidak membatasi route baca non-auth secara berlebihan", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { controlRoutes } = await loadRoutes("1");
    const fastifyCookie = (await import("@fastify/cookie")).default;
    app = Fastify({ logger: false });
    await app.register(fastifyCookie);
    await app.register(controlRoutes);
    await app.ready();
    for (let i = 0; i < 3; i += 1) {
      const res = await app.inject({
        method: "GET",
        url: "/control/host",
        remoteAddress: "10.5.5.5",
      });
      expect(res.statusCode).not.toBe(429);
    }
  });

  it("allows CORS preflight for DELETE on control routes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { controlRoutes } = await loadRoutes("1");
    app = Fastify({ logger: false });
    await app.register(FastifyCors, {
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    });
    await app.register(controlRoutes);
    await app.ready();
    const deletePreflight = await app.inject({
      method: "OPTIONS",
      url: "/control/portforwards",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "DELETE",
        "access-control-request-headers": "content-type",
      },
    });
    expect([200, 204]).toContain(deletePreflight.statusCode);
    expect(deletePreflight.headers["access-control-allow-methods"]).toContain("DELETE");
  });

  it("uses ARSY bearer token and strips mw_session cookie for MoonWitness session requests", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    process.env.ARSY_URL = "https://arsy-edge.example.com";
    process.env.ARSY_TOKEN_READONLY = "ro-secret-token";
    process.env.ARSY_TOKEN_ADMIN = "adm-secret-token";

    const { controlRoutes } = await loadRoutes("5");
    const authSvc = await import("@moonwitness/addons/auth");
    await authSvc.ensureAuthSchema();
    const created = await authSvc.createUser({
      username: "ctrladmin",
      email: "ctrl@example.com",
      password: "PasswordLongEnough123!",
      role: "admin",
      displayName: "Ctrl Admin",
    });
    const sessToken = await authSvc.createSession(created.id);

    const fastifyCookie = (await import("@fastify/cookie")).default;
    app = Fastify({ logger: false });
    await app.register(fastifyCookie);
    await app.register(controlRoutes);
    await app.ready();

    const hostRes = await app.inject({
      method: "GET",
      url: "/control/host",
      headers: { cookie: `mw_session=${sessToken}` },
    });
    expect(hostRes.statusCode).toBe(200);

    const statusRes = await app.inject({
      method: "GET",
      url: "/control/status",
      headers: { cookie: `mw_session=${sessToken}` },
    });
    expect(statusRes.statusCode).toBe(200);

    for (const [, init] of fetchMock.mock.calls as Array<[string, RequestInit]>) {
      const hdrs = init.headers as Record<string, string>;
      expect(hdrs.authorization).toBe("Bearer ro-secret-token");
      expect(hdrs.cookie).toBeUndefined();
    }
  });

  it("rejects nonexistent per-kind proxy routes and V1-deferred plan/apply kinds before contacting arsy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    process.env.ARSY_URL = "https://arsy-edge.example.com";
    process.env.ARSY_TOKEN_ADMIN = "adm-secret-token";

    const { controlRoutes } = await loadRoutes("5");
    const authSvc = await import("@moonwitness/addons/auth");
    await authSvc.ensureAuthSchema();
    const admin = await authSvc.createUser({
      username: "ctrlv1admin",
      email: "ctrlv1@example.com",
      password: "PasswordLongEnough123!",
      role: "admin",
      displayName: "Ctrl V1 Admin",
    });
    const sessToken = await authSvc.createSession(admin.id);

    const fastifyCookie = (await import("@fastify/cookie")).default;
    app = Fastify({ logger: false });
    await app.register(fastifyCookie);
    await app.register(controlRoutes);
    await app.ready();

    const blockedRead = await app.inject({
      method: "GET",
      url: "/control/network",
      headers: { cookie: `mw_session=${sessToken}` },
    });
    expect(blockedRead.statusCode).toBe(404);

    const blockedPlan = await app.inject({
      method: "POST",
      url: "/control/plan",
      headers: { cookie: `mw_session=${sessToken}` },
      payload: {
        version: 1,
        resources: [{ kind: "kubernetes", name: "k8s-main" }],
      },
    });
    expect(blockedPlan.statusCode).toBe(400);
    expect(blockedPlan.json().unsupportedKinds).toEqual(["kubernetes"]);

    const blockedApply = await app.inject({
      method: "POST",
      url: "/control/apply",
      headers: { cookie: `mw_session=${sessToken}` },
      payload: {
        confirm: "apply",
        state: {
          version: 1,
          resources: [{ kind: "gitdeploy", name: "app-repo" }],
        },
      },
    });
    expect(blockedApply.statusCode).toBe(400);
    expect(blockedApply.json().unsupportedKinds).toEqual(["gitdeploy"]);
    expect(fetchMock).not.toHaveBeenCalled();

    const allowedPlan = await app.inject({
      method: "POST",
      url: "/control/plan",
      headers: { cookie: `mw_session=${sessToken}` },
      payload: {
        version: 1,
        resources: [{ kind: "systemd", name: "caddy" }],
      },
    });
    expect(allowedPlan.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("Native first-light onboarding & control auth (CONTROL_NATIVE_SETUP=1)", () => {
  const envBackup = { ...process.env };
  let app: FastifyInstance | null = null;

  beforeEach(async () => {
    process.env = { ...envBackup, CONTROL_NATIVE_SETUP: "1" };
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("arsy offline")));
    const { controlRoutes } = await loadRoutes("20");
    const orm = await import("@moonwitness/orm");
    await orm.initDb("file::memory:?cache=shared");
    const authSvc = await import("@moonwitness/addons/auth");
    await authSvc.ensureAuthSchema();
    const db = orm.getDb();
    await db.run("DELETE FROM auth_sessions");
    await db.run("DELETE FROM auth_users");

    const fastifyCookie = (await import("@fastify/cookie")).default;
    app = Fastify({ logger: false });
    await app.register(fastifyCookie);
    await app.register(controlRoutes);
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    process.env = { ...envBackup };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await closeDb();
  });

  it("supports full uninitialized -> superuser -> locked -> login -> me -> logout lifecycle", async () => {
    const initialStatus = await app!.inject({
      method: "GET",
      url: "/control/setup/status",
    });
    expect(initialStatus.statusCode).toBe(200);
    expect(initialStatus.json()).toMatchObject({
      initialized: false,
      version: "0.1.0",
      instance: {
        id: "moonwitness-vps",
        name: "Moonwitness",
      },
    });

    const invalidShort = await app!.inject({
      method: "POST",
      url: "/control/setup/superuser",
      payload: {
        name: "Admin",
        email: "admin@moonwitness.local",
        password: "short",
        instance_name: "MoonProd",
      },
    });
    expect(invalidShort.statusCode).toBe(400);

    const created = await app!.inject({
      method: "POST",
      url: "/control/setup/superuser",
      headers: { "x-forwarded-proto": "http" },
      payload: {
        name: "Rezza Admin",
        email: "rezza@moonwitness.local",
        password: "CorrectHorseBatteryStaple12!",
        instance_name: "MoonProd",
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      initialized: true,
      user: {
        name: "Rezza Admin",
        email: "rezza@moonwitness.local",
        role: "superadmin",
      },
    });
    const setCookieHeader = created.headers["set-cookie"];
    const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
    expect(cookieStr).toContain("mw_session=");
    const sessionPair = cookieStr!.split(";")[0]!;

    const secondCreate = await app!.inject({
      method: "POST",
      url: "/control/setup/superuser",
      payload: {
        name: "Intruder",
        email: "intruder@moonwitness.local",
        password: "AnotherLongPassword1234!",
        instance_name: "Evil",
      },
    });
    expect(secondCreate.statusCode).toBe(409);

    const postStatus = await app!.inject({
      method: "GET",
      url: "/control/setup/status",
    });
    expect(postStatus.statusCode).toBe(200);
    expect(postStatus.json()).toMatchObject({
      initialized: true,
      instance: {
        name: "MoonProd",
      },
    });
    expect(postStatus.json().instance.initialized_at).toBeTruthy();

    const meRes = await app!.inject({
      method: "GET",
      url: "/control/auth/me",
      headers: { cookie: sessionPair },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json()).toMatchObject({
      user: {
        name: "Rezza Admin",
        email: "rezza@moonwitness.local",
        role: "superadmin",
      },
    });

    const logoutRes = await app!.inject({
      method: "POST",
      url: "/control/auth/logout",
      headers: { cookie: sessionPair },
    });
    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.json()).toEqual({ ok: true });

    const revokedMe = await app!.inject({
      method: "GET",
      url: "/control/auth/me",
      headers: { cookie: sessionPair },
    });
    expect(revokedMe.statusCode).toBe(401);

    const badLogin = await app!.inject({
      method: "POST",
      url: "/control/auth/login",
      payload: {
        email: "rezza@moonwitness.local",
        password: "WrongPassword1234!",
      },
    });
    expect(badLogin.statusCode).toBe(401);

    const goodLogin = await app!.inject({
      method: "POST",
      url: "/control/auth/login",
      headers: { "x-forwarded-proto": "http" },
      payload: {
        email: "rezza@moonwitness.local",
        password: "CorrectHorseBatteryStaple12!",
      },
    });
    expect(goodLogin.statusCode).toBe(200);
    expect(goodLogin.json().user).toMatchObject({
      email: "rezza@moonwitness.local",
      role: "superadmin",
    });
    const loginCookie = Array.isArray(goodLogin.headers["set-cookie"])
      ? goodLogin.headers["set-cookie"][0]
      : goodLogin.headers["set-cookie"];
    expect(loginCookie).toContain("mw_session=");
  });

  it("sets Secure cookie when production request arrives over https and omits it on plain http", async () => {
    process.env.NODE_ENV = "production";
    await app!.inject({
      method: "POST",
      url: "/control/setup/superuser",
      payload: {
        name: "Proto Admin",
        email: "proto@moonwitness.local",
        password: "CorrectHorseBatteryStaple12!",
        instance_name: "ProtoTest",
      },
    });

    const httpLogin = await app!.inject({
      method: "POST",
      url: "/control/auth/login",
      headers: { "x-forwarded-proto": "http" },
      payload: {
        email: "proto@moonwitness.local",
        password: "CorrectHorseBatteryStaple12!",
      },
    });
    expect(httpLogin.statusCode).toBe(200);
    expect(String(httpLogin.headers["set-cookie"])).not.toContain("; Secure");

    const httpsLogin = await app!.inject({
      method: "POST",
      url: "/control/auth/login",
      headers: { "x-forwarded-proto": "https" },
      payload: {
        email: "proto@moonwitness.local",
        password: "CorrectHorseBatteryStaple12!",
      },
    });
    expect(httpsLogin.statusCode).toBe(200);
    expect(String(httpsLogin.headers["set-cookie"])).toContain("Secure");
  });
});
