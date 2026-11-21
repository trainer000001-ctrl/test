import { describe, expect, it } from "vitest";
import {
  assertProductionEnv,
  parseCorsOrigins,
  resolveApiDatabaseUrl,
  resolveApiEnvSource,
  validateMemoryRuntimeConfig,
  validatePostgresDatabaseUrl,
  validateProductionEnv,
  validateRiotAiRuntimeConfig,
  env,
} from "./env.js";

const base = {
  PORT: "3002",
  HOST: "127.0.0.1",
  API_PREFIX: "/api/v1",
  NODE_ENV: "production" as const,
  DATABASE_URL: "postgresql://moonwitness:secret@localhost:5432/moonwitness",
  CORS_ORIGINS: "https://moonwitness.example",
  LOG_LEVEL: undefined,
  RATE_LIMIT_MAX: "120",
  RATE_LIMIT_WINDOW_MS: "60000",
  RATE_LIMIT_STORE: "memory" as const,
  RADIUS_URL: "http://127.0.0.1:8090",
  STORAGE_URL: "http://127.0.0.1:8091",
  STORAGE_ACCESS_KEY: "test-storage-access",
  STORAGE_SECRET_KEY: "test-storage-secret",
  MID_KEY_ENCRYPTION_SECRET: "test-mid-key-encryption-secret-16",
  SYSLOG_URL: "http://127.0.0.1:8093",
  SNMP_POLLER_URL: "http://127.0.0.1:8094",
  TRUSTED_PROXY_COUNT: 0,
  RIOT_AI_MODEL: undefined,
  RIOT_AI_TIMEOUT_MS: 30_000,
  RIOT_AI_MAX_REQUEST_BYTES: 65_536,
  RIOT_AI_RATE_LIMIT_MAX: 20,
  RIOT_AI_RATE_LIMIT_WINDOW_MS: 60_000,
  RIOT_AI_USAGE_RETENTION_DAYS: 90,
  MEMORY_API_TIMEOUT_MS: 10_000,
  ADDON_SIGNING_MODE: "permissive" as const,
};

describe("parseCorsOrigins", () => {
  it("splits, trims and drops empty entries", () => {
    expect(parseCorsOrigins("https://a.test, https://b.test ,, ")).toEqual([
      "https://a.test",
      "https://b.test",
    ]);
    expect(parseCorsOrigins(undefined)).toEqual([]);
  });
});

describe("validateProductionEnv", () => {
  it("accepts a fully specified production config", () => {
    expect(validateProductionEnv(base)).toEqual([]);
  });

  it("allows explicit loopback HTTP and rejects non-local plaintext inference endpoints", () => {
    expect(validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "http://localhost:11434" })).toEqual([]);
    expect(validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "http://10.1.2.3:11434" })).toContain(
      "RIOT_AI_BASE_URL must use HTTPS except for a loopback local runtime.",
    );
    expect(
      validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "https://user:pass@ai.example/v1" }),
    ).toContain("RIOT_AI_BASE_URL must not contain embedded credentials.");
    expect(validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "https://127.0.0.1:11434" })).toContain(
      "RIOT_AI_BASE_URL must use HTTP for a loopback local runtime.",
    );
    expect(
      validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "https://ai.example/v1?token=x" }),
    ).toContain("RIOT_AI_BASE_URL must not contain query parameters or fragments.");
  });

  it("rejects unsafe inference URL components and malformed runtime policy values", () => {
    expect(
      validateProductionEnv({
        ...base,
        RIOT_AI_BASE_URL: "https://inference.example/v1?token=secret",
      }),
    ).toContain("RIOT_AI_BASE_URL must not contain query parameters or fragments.");
    expect(env.RIOT_AI_TIMEOUT_MS).toBeGreaterThan(0);
    expect(env.RIOT_AI_USAGE_RETENTION_DAYS).toBe(90);
  });

  it("blocks inference endpoints that resolve to private or metadata networks", () => {
    expect(validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "http://127.0.0.1:11434" })).toEqual([]);
    expect(validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "http://10.0.0.5:11434" })).toContain(
      "RIOT_AI_BASE_URL must use HTTPS except for a loopback local runtime.",
    );
    expect(
      validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "http://169.254.169.254:80" }),
    ).toContain(
      "RIOT_AI_BASE_URL must not target private, link-local, or metadata network ranges.",
    );
    expect(
      validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "http://192.168.10.4:11434" }),
    ).toContain(
      "RIOT_AI_BASE_URL must not target private, link-local, or metadata network ranges.",
    );
    expect(validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "http://[::1]:11434" })).toEqual([]);
    expect(validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "http://[fd00::1]:11434" })).toContain(
      "RIOT_AI_BASE_URL must not target private, link-local, or metadata network ranges.",
    );
    expect(
      validateRiotAiRuntimeConfig({ RIOT_AI_BASE_URL: "https://inference.example/v1" }),
    ).toEqual([]);
    expect(validateMemoryRuntimeConfig({ MEMORY_API_URL: "http://127.0.0.1:8000" })).toEqual([]);
    expect(
      validateMemoryRuntimeConfig({ MEMORY_API_URL: "http://169.254.169.254:8000" }),
    ).toContain("MEMORY_API_URL must not target private, link-local, or metadata network ranges.");
    expect(validateMemoryRuntimeConfig({ MEMORY_API_URL: "https://memory.example" })).toEqual([]);
  });

  it("ignores non-production environments", () => {
    expect(
      validateProductionEnv({ ...base, NODE_ENV: "development", DATABASE_URL: undefined }),
    ).toEqual([]);
  });

  it("rejects a missing, in-memory, or non-PostgreSQL database", () => {
    expect(validateProductionEnv({ ...base, DATABASE_URL: undefined })).toContain(
      "DATABASE_URL must be set to a persistent database in production.",
    );
    expect(validateProductionEnv({ ...base, DATABASE_URL: ":memory:" })).toContain(
      "DATABASE_URL must not be an in-memory database in production.",
    );
    expect(
      validateProductionEnv({ ...base, DATABASE_URL: "file:/var/lib/moonwitness/app.db" }),
    ).toContain(
      "DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://) in production.",
    );
  });

  it("rejects missing, empty or wildcard CORS origins", () => {
    expect(validateProductionEnv({ ...base, CORS_ORIGINS: undefined })).toContain(
      "CORS_ORIGINS must list explicit allowed origins in production.",
    );
    expect(validateProductionEnv({ ...base, CORS_ORIGINS: "  " })).toContain(
      "CORS_ORIGINS must list explicit allowed origins in production.",
    );
    expect(validateProductionEnv({ ...base, CORS_ORIGINS: "*" })).toContain(
      "CORS_ORIGINS must not use '*' in production.",
    );
  });

  it("requires non-placeholder Storage signing credentials in production", () => {
    expect(validateProductionEnv({ ...base, STORAGE_ACCESS_KEY: undefined })).toContain(
      "STORAGE_ACCESS_KEY must be set for server-side Storage signing in production.",
    );
    expect(validateProductionEnv({ ...base, STORAGE_SECRET_KEY: undefined })).toContain(
      "STORAGE_SECRET_KEY must be set for server-side Storage signing in production.",
    );
    expect(
      validateProductionEnv({ ...base, STORAGE_SECRET_KEY: "change-me-storage-secret" }),
    ).toContain("STORAGE_SECRET_KEY must not use the example placeholder in production.");
  });

  it("assertProductionEnv throws with actionable detail on unsafe config", () => {
    expect(() => assertProductionEnv({ ...base, DATABASE_URL: undefined })).toThrow(
      /Insecure or incomplete production configuration/,
    );
    expect(() => assertProductionEnv(base)).not.toThrow();
  });
});

describe("resolveApiEnvSource", () => {
  it("prefers API_PORT and API_HOST over shared PORT and HOST", () => {
    const resolved = resolveApiEnvSource({
      PORT: "3000",
      HOST: "localhost",
      API_PORT: "3002",
      API_HOST: "127.0.0.1",
    });
    expect(resolved.PORT).toBe("3002");
    expect(resolved.HOST).toBe("127.0.0.1");
  });

  it("falls back to PORT/HOST or undefined defaults when API_* are blank", () => {
    const fallback = resolveApiEnvSource({ PORT: "4000", HOST: "0.0.0.0", API_PORT: "  " });
    expect(fallback.PORT).toBe("4000");
    expect(fallback.HOST).toBe("0.0.0.0");

    const empty = resolveApiEnvSource({ PORT: "", HOST: "" });
    expect(empty.PORT).toBeUndefined();
    expect(empty.HOST).toBeUndefined();
  });
});

describe("validatePostgresDatabaseUrl & resolveApiDatabaseUrl", () => {
  it("validates postgres URLs including host, db pathname, and no fragment", () => {
    expect(
      validatePostgresDatabaseUrl("postgresql://moonwitness:secret@localhost:5432/moonwitness"),
    ).toEqual([]);
    expect(validatePostgresDatabaseUrl("postgresql:///moonwitness")).toContain(
      "DATABASE_URL must include a PostgreSQL host.",
    );
    expect(validatePostgresDatabaseUrl("postgresql://localhost:5432/")).toContain(
      "DATABASE_URL must include a PostgreSQL database name.",
    );
    expect(validatePostgresDatabaseUrl("postgresql://localhost:5432/moonwitness#frag")).toContain(
      "DATABASE_URL must not contain a URL fragment.",
    );
  });

  it("rejects implicit SQLite fallback when no DATABASE_URL is configured", () => {
    expect(() => resolveApiDatabaseUrl(undefined, "development")).toThrow(
      /DATABASE_URL is required/,
    );
    expect(() => resolveApiDatabaseUrl("  ", "production")).toThrow(/DATABASE_URL is required/);
    expect(() => resolveApiDatabaseUrl("file:./moonwitness.db", "production")).toThrow(
      /Invalid production DATABASE_URL/,
    );
    expect(resolveApiDatabaseUrl(undefined, "test", ":memory:")).toBe(":memory:");
  });
});
