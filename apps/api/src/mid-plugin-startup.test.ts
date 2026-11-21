import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";

describe("API bootstrap with MID plugin enabled", () => {
  let dbDir = "";
  let app: FastifyInstance | null = null;
  let originalMidSecret: string | undefined;

  beforeEach(() => {
    originalMidSecret = process.env.MID_KEY_ENCRYPTION_SECRET;
    process.env.MID_KEY_ENCRYPTION_SECRET = "test-mid-key-encryption-secret-32c";
    dbDir = mkdtempSync(join(tmpdir(), "mw-api-mid-boot-"));
    vi.resetModules();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    if (originalMidSecret === undefined) {
      delete process.env.MID_KEY_ENCRYPTION_SECRET;
    } else {
      process.env.MID_KEY_ENCRYPTION_SECRET = originalMidSecret;
    }
    vi.resetModules();
    try {
      rmSync(dbDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    } catch {
      // Windows libSQL file handle release may lag slightly after test teardown.
    }
  });

  it("boots cleanly without /health route collision when MID_KEY_ENCRYPTION_SECRET is set", async () => {
    const { buildApp } = await import("./app");
    app = await buildApp({ dbPath: join(dbDir, "mid-boot.db"), prefix: "/api/v1" });

    const rootHealth = await app.inject({ method: "GET", url: "/health" });
    expect(rootHealth.statusCode).toBe(200);
    expect(rootHealth.json().status).toBe("ok");

    const apiHealth = await app.inject({ method: "GET", url: "/api/v1/healthz" });
    expect(apiHealth.statusCode).toBe(200);

    const midDiscovery = await app.inject({
      method: "GET",
      url: "/api/v1/mid/.well-known/openid-configuration",
    });
    expect(midDiscovery.statusCode).toBe(200);
    expect(typeof midDiscovery.json().issuer).toBe("string");

    const midHealth = await app.inject({ method: "GET", url: "/api/v1/mid/health" });
    expect(midHealth.statusCode).toBe(200);
    expect(midHealth.json().service).toBe("moonwitness-id");
  });
});
