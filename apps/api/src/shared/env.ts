import { parseEnv, z } from "@moonwitness/core";
import {
  isBlockedRuntimeHost,
  validateMemoryRuntimeConfig,
  validateRiotAiRuntimeConfig,
} from "@moonwitness/addon-runtime";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv as parseDotEnv } from "node:util";

export { isBlockedRuntimeHost, validateMemoryRuntimeConfig, validateRiotAiRuntimeConfig };

const envSchema = {
  PORT: z.string().default("3002"),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_PREFIX: z.string().default("/api/v1"),
  DATABASE_URL: z.string().optional(),
  /** Comma-separated list of allowed browser origins. Required in production. */
  CORS_ORIGINS: z.string().optional(),
  /**
   * Number of trusted reverse proxies in front of this API. `0` (default) means
   * the socket peer is the client; `1` trusts the last `X-Forwarded-For` hop.
   * Never raise this above the real proxy depth, otherwise callers can spoof
   * their rate-limit identity.
   */
  TRUSTED_PROXY_COUNT: z.coerce.number().int().min(0).max(5).default(0),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).optional(),
  /** Max requests per window per client IP. 0 disables rate limiting. */
  RATE_LIMIT_MAX: z.string().default("120"),
  /** Rate-limit window in milliseconds. */
  RATE_LIMIT_WINDOW_MS: z.string().default("60000"),
  /** Rate-limit storage backend: in-process memory or shared ORM SQL store. */
  RATE_LIMIT_STORE: z.enum(["memory", "orm"]).default("memory"),
  /** Upstream Rust service base URLs (proxied by this API). */
  RADIUS_URL: z.string().default("http://127.0.0.1:8090"),
  STORAGE_URL: z.string().default("http://127.0.0.1:8091"),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  SYSLOG_URL: z.string().default("http://127.0.0.1:8093"),
  SNMP_POLLER_URL: z.string().default("http://127.0.0.1:8094"),
  /** Approved local OpenAI-compatible inference runtime endpoint, configured by the operator. */
  RIOT_AI_BASE_URL: z.string().max(2048).optional(),
  RIOT_AI_MODEL: z.string().min(1).max(200).optional(),
  RIOT_AI_TIMEOUT_MS: z.coerce.number().int().positive().max(600_000).default(30_000),
  RIOT_AI_MAX_REQUEST_BYTES: z.coerce.number().int().positive().max(1_048_576).default(65_536),
  RIOT_AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().max(10_000).default(20),
  RIOT_AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(3_600_000).default(60_000),
  RIOT_AI_USAGE_RETENTION_DAYS: z.coerce.number().int().positive().max(3_650).default(90),
  /** Optional local apps/memory FastAPI bridge URL (e.g. http://127.0.0.1:8000). */
  MEMORY_API_URL: z.string().max(2048).optional(),
  MEMORY_API_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(10_000),
  /** Shared Bearer token accepted from apps/memory -> POST /api/v1/memory/sync workers. */
  MOONWITNESS_SYNC_TOKEN: z.string().min(8).max(512).optional(),
  /** Canonical MoonWitness centralized Identity issuer, JWKS override, and audience allowlist. */
  MID_ISSUER_URL: z.string().max(2048).optional(),
  MID_INTERNAL_URL: z.string().max(2048).optional(),
  MID_JWKS_URL: z.string().max(2048).optional(),
  MID_ALLOWED_AUDIENCES: z.string().max(2048).optional(),
  /** AES-256-GCM key encryption secret for MID signing-key storage (min 16 chars). */
  MID_KEY_ENCRYPTION_SECRET: z.string().min(16).optional(),
  /** Cookie domain for MID session cookies (e.g. ".moonwitness.biz.id"). */
  MID_COOKIE_DOMAIN: z.string().optional(),
  /** Optional operations services enablement flags (`--profile ops`). */
  MW_OPS_ENABLED: z.string().optional(),
  MW_OPS_RADIUS_ENABLED: z.string().optional(),
  MW_OPS_SNMP_ENABLED: z.string().optional(),
  MW_OPS_SYSLOG_ENABLED: z.string().optional(),
  MW_OPS_STORAGE_ENABLED: z.string().optional(),
  MW_ADDON_RADIUS_DISABLED: z.string().optional(),
  MW_ADDON_SNMP_DISABLED: z.string().optional(),
  MW_ADDON_SYSLOG_DISABLED: z.string().optional(),
  MW_ADDON_STORAGE_DISABLED: z.string().optional(),
  /** Addon manifest signature verification policy at boot. */
  ADDON_SIGNING_MODE: z.enum(["permissive", "strict"]).default("permissive"),
};

function readLocalApiEnvOverrides(): Record<string, string | undefined> {
  if (process.env.NODE_ENV === "test") return {};
  const localEnvPath = resolve(process.cwd(), ".env");
  const rootEnvPath = resolve(process.cwd(), "../../.env");
  if (localEnvPath === rootEnvPath || !existsSync(localEnvPath)) return {};
  return parseDotEnv(readFileSync(localEnvPath, "utf8"));
}

/** `API_PORT`/`API_HOST` take precedence so a shared root `.env` never collides with web's `PORT`. */
export function resolveApiEnvSource(
  source: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const apiPort = source.API_PORT?.trim();
  const apiHost = source.API_HOST?.trim();
  return {
    ...source,
    PORT: apiPort || source.PORT?.trim() || undefined,
    HOST: apiHost || source.HOST?.trim() || undefined,
  };
}

export const env = parseEnv(
  envSchema,
  resolveApiEnvSource({ ...process.env, ...readLocalApiEnvOverrides() }),
);
export type Env = typeof env;

export function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function validatePostgresDatabaseUrl(rawUrl: string | undefined): string[] {
  const candidate = rawUrl?.trim();
  if (!candidate) {
    return ["DATABASE_URL must be set to a persistent database in production."];
  }
  if (candidate === ":memory:") {
    return ["DATABASE_URL must not be an in-memory database in production."];
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return ["DATABASE_URL must be a valid PostgreSQL URL (postgresql:// or postgres://)."];
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return [
      "DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://) in production.",
    ];
  }
  if (!parsed.hostname) {
    return ["DATABASE_URL must include a PostgreSQL host."];
  }
  if (!parsed.pathname || parsed.pathname === "/") {
    return ["DATABASE_URL must include a PostgreSQL database name."];
  }
  if (parsed.hash) {
    return ["DATABASE_URL must not contain a URL fragment."];
  }
  return [];
}

/**
 * Resolve Core API database connection without silently falling back to an
 * implicit local SQLite file (`./moonwitness.db`).
 */
export function resolveApiDatabaseUrl(
  configuredUrl: string | undefined,
  nodeEnv: "development" | "production" | "test",
  explicitPath?: string,
): string {
  const override = explicitPath?.trim();
  if (override && nodeEnv !== "production") {
    return override;
  }
  const candidate = configuredUrl?.trim();
  if (!candidate) {
    throw new Error(
      "DATABASE_URL is required. Configure an explicit PostgreSQL (or test SQLite) DATABASE_URL before starting the API.",
    );
  }
  if (nodeEnv === "production") {
    const problems = validatePostgresDatabaseUrl(candidate);
    if (problems.length > 0) {
      throw new Error(`Invalid production DATABASE_URL:\n  - ${problems.join("\n  - ")}`);
    }
  }
  return candidate;
}

/**
 * Reject production configuration that is missing required values or relies on
 * insecure development defaults. Returns a list of human-readable problems; an
 * empty list means the configuration is acceptable to boot in production.
 */
export function validateProductionEnv(config: typeof env): string[] {
  if (config.NODE_ENV !== "production") return [];

  const problems: string[] = [...validatePostgresDatabaseUrl(config.DATABASE_URL)];
  if (!config.CORS_ORIGINS || parseCorsOrigins(config.CORS_ORIGINS).length === 0) {
    problems.push("CORS_ORIGINS must list explicit allowed origins in production.");
  }
  if (config.CORS_ORIGINS && parseCorsOrigins(config.CORS_ORIGINS).includes("*")) {
    problems.push("CORS_ORIGINS must not use '*' in production.");
  }
  if (!config.STORAGE_ACCESS_KEY?.trim()) {
    problems.push("STORAGE_ACCESS_KEY must be set for server-side Storage signing in production.");
  }
  problems.push(...validateRiotAiRuntimeConfig(config));
  problems.push(...validateMemoryRuntimeConfig(config));
  if (!config.STORAGE_SECRET_KEY?.trim()) {
    problems.push("STORAGE_SECRET_KEY must be set for server-side Storage signing in production.");
  } else if (config.STORAGE_SECRET_KEY.trim() === "change-me-storage-secret") {
    problems.push("STORAGE_SECRET_KEY must not use the example placeholder in production.");
  }

  // MID key encryption secret is required in production for OIDC signing-key storage.
  if (!config.MID_KEY_ENCRYPTION_SECRET?.trim()) {
    problems.push(
      "MID_KEY_ENCRYPTION_SECRET must be set for MID signing-key encryption in production.",
    );
  } else if (config.MID_KEY_ENCRYPTION_SECRET.trim() === "dev-insecure-encryption-secret-min16") {
    problems.push(
      "MID_KEY_ENCRYPTION_SECRET must not use the insecure development default in production.",
    );
  } else if (config.MID_KEY_ENCRYPTION_SECRET.trim().length < 16) {
    problems.push("MID_KEY_ENCRYPTION_SECRET must be at least 16 characters in production.");
  }

  return problems;
}

/** Throws when production configuration is unsafe; call once at startup. */
export function assertProductionEnv(config: typeof env): void {
  const problems = validateProductionEnv(config);
  if (problems.length > 0) {
    throw new Error(
      `Insecure or incomplete production configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
  }
}
