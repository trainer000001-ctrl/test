import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import FastifyCors from "@fastify/cors";

import { defaultFailClosedAuthBridge, type BaseAddonAuthBridge } from "@moonwitness/addon-runtime";
import { registerRadiusRoutes } from "@moonwitness/addons/radius";

async function loadRoutes(allowWrite: boolean) {
  const auth: BaseAddonAuthBridge = {
    ...defaultFailClosedAuthBridge,
    authenticate: async () => {},
    requireRole: () =>
      allowWrite
        ? async () => {}
        : async (
            _request: unknown,
            reply: { code: (status: number) => { send: (body: unknown) => unknown } },
          ) => {
            reply.code(403).send({ error: "Forbidden: insufficient permissions" });
          },
  };
  return async (instance: FastifyInstance) => registerRadiusRoutes(instance, { auth });
}

describe("RADIUS proxy authorization", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;
    vi.unstubAllGlobals();
    vi.doUnmock("../../middleware/auth");
  });

  it("forwards reads to the upstream service", async () => {
    const routes = await loadRoutes(true);
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ users: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(routes);
    await app.ready();

    const read = await app.inject({ method: "GET", url: "/radius/users" });
    expect(read.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("blocks writes when RADIUS_PROXY_ADMIN is not enabled", async () => {
    const routes = await loadRoutes(true);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(routes);
    await app.ready();

    const write = await app.inject({ method: "POST", url: "/radius/users", payload: {} });
    expect(write.statusCode).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows CORS preflight for PUT and DELETE on radius routes", async () => {
    const routes = await loadRoutes(true);
    app = Fastify({ logger: false });
    await app.register(FastifyCors, {
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    });
    await app.register(routes);
    await app.ready();

    // CORS preflight for PUT
    const putPreflight = await app.inject({
      method: "OPTIONS",
      url: "/radius/users",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    });
    expect([200, 204]).toContain(putPreflight.statusCode);
    expect(putPreflight.headers["access-control-allow-methods"]).toContain("PUT");

    // CORS preflight for DELETE
    const deletePreflight = await app.inject({
      method: "OPTIONS",
      url: "/radius/users",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "DELETE",
        "access-control-request-headers": "content-type",
      },
    });
    expect([200, 204]).toContain(deletePreflight.statusCode);
    expect(deletePreflight.headers["access-control-allow-methods"]).toContain("DELETE");
  });

  it("rejects user creation when the role gate denies the caller", async () => {
    const routes = await loadRoutes(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.RADIUS_PROXY_ADMIN = "1";
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(routes);
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/radius/users",
      payload: { username: "mallory", password: "mallory-password-2026" },
    });

    expect(response.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    delete process.env.RADIUS_PROXY_ADMIN;
  });

  it("rejects user deletion when the role gate denies the caller", async () => {
    const routes = await loadRoutes(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(routes);
    await app.ready();

    const response = await app.inject({
      method: "DELETE",
      url: "/radius/users/alice",
    });

    expect(response.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
