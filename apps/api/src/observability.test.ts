import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app";
import { resolveRequestTenant, type AuthenticatedRequest } from "./middleware/auth";
import { getUpstreamBridgeHeaders } from "@moonwitness/addon-runtime";

describe("Observability, Prometheus /metrics, traceparent & tenant isolation guard", () => {
  let dbDir = "";
  let app: FastifyInstance | null = null;
  let originalBridgeToken: string | undefined;

  beforeEach(async () => {
    originalBridgeToken = process.env.BRIDGE_SHARED_TOKEN;
    dbDir = mkdtempSync(join(tmpdir(), "mw-api-obs-"));
    app = await buildApp({ dbPath: join(dbDir, "obs.db"), prefix: "/api/v1" });
  });

  afterEach(async () => {
    if (originalBridgeToken === undefined) {
      delete process.env.BRIDGE_SHARED_TOKEN;
    } else {
      process.env.BRIDGE_SHARED_TOKEN = originalBridgeToken;
    }
    if (app) {
      await app.close();
      app = null;
    }
    try {
      rmSync(dbDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    } catch {
      // Ignore Windows WAL handle release timing.
    }
  });

  it("propagates W3C traceparent and x-request-id and exposes Prometheus /metrics", async () => {
    const inboundTrace = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const healthRes = await app!.inject({
      method: "GET",
      url: "/api/v1/healthz",
      headers: {
        "x-request-id": "req-obs-001",
        traceparent: inboundTrace,
      },
    });
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.headers["x-request-id"]).toBe("req-obs-001");
    expect(healthRes.headers["traceparent"]).toBe(inboundTrace);

    const autoTraceRes = await app!.inject({
      method: "GET",
      url: "/api/v1/readyz",
    });
    expect(autoTraceRes.statusCode).toBe(200);
    expect(String(autoTraceRes.headers["x-request-id"])).toMatch(/^[0-9a-f-]{36}$/);
    expect(String(autoTraceRes.headers["traceparent"])).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
    );

    const metricsRes = await app!.inject({
      method: "GET",
      url: "/metrics",
    });
    expect(metricsRes.statusCode).toBe(200);
    expect(metricsRes.headers["content-type"]).toContain("text/plain");
    const metricsBody = metricsRes.body;
    expect(metricsBody).toContain(
      'moonwitness_http_requests_total{method="GET",status_class="2xx"}',
    );
    expect(metricsBody).toContain("moonwitness_http_request_duration_ms_bucket");
    expect(metricsBody).toContain("moonwitness_process_uptime_seconds");
    expect(metricsBody).toContain('moonwitness_addons_total{state="total"}');

    const prefixedMetrics = await app!.inject({
      method: "GET",
      url: "/api/v1/metrics",
    });
    expect(prefixedMetrics.statusCode).toBe(200);
    expect(prefixedMetrics.body).toContain("moonwitness_http_requests_total");
  });

  it("forges child traceparent span and forwards bridge token in getUpstreamBridgeHeaders", () => {
    process.env.BRIDGE_SHARED_TOKEN = "bridge-secret-xyz";
    const inboundTrace = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const headers = getUpstreamBridgeHeaders(
      { accept: "application/json" },
      {
        id: "req-up-1",
        traceparent: inboundTrace,
      },
    );
    expect(headers["x-moonwitness-bridge-token"]).toBe("bridge-secret-xyz");
    expect(headers["x-request-id"]).toBe("req-up-1");
    expect(headers.traceparent).toMatch(/^00-4bf92f3577b34da6a3ce929d0e0e4736-[0-9a-f]{16}-01$/);
    expect(headers.traceparent).not.toBe(inboundTrace);
  });

  it("ignores spoofed x-tenant-id header for non-admin users while allowing validated admin scope", () => {
    const editorReq = {
      headers: { "x-tenant-id": "tenant-b" },
      user: {
        id: "u-1",
        username: "ed",
        email: "ed@moonwitness.biz.id",
        role: "editor",
        displayName: "Editor",
        tenantId: "tenant-a",
      },
    } as unknown as AuthenticatedRequest;
    expect(resolveRequestTenant(editorReq)).toBe("tenant-a");

    const adminReq = {
      headers: { "x-tenant-id": "tenant-b" },
      user: {
        id: "u-0",
        username: "root",
        email: "root@moonwitness.biz.id",
        role: "admin",
        displayName: "Admin",
        tenantId: "default",
      },
    } as unknown as AuthenticatedRequest;
    expect(resolveRequestTenant(adminReq)).toBe("tenant-b");

    const invalidAdminHeader = {
      headers: { "x-tenant-id": "bad tenant!" },
      user: {
        id: "u-0",
        username: "root",
        email: "root@moonwitness.biz.id",
        role: "admin",
        displayName: "Admin",
      },
    } as unknown as AuthenticatedRequest;
    expect(resolveRequestTenant(invalidAdminHeader)).toBe("default");
  });
});
