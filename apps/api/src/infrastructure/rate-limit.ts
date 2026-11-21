import { getDb, type OrmDriverHandle } from "@moonwitness/orm";

/**
 * Fixed-window rate limiter with synchronous in-memory implementation and
 * pluggable asynchronous store support (including durable SQL via `@moonwitness/orm`).
 */
export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  reset(key?: string): void;
  size(): number;
}

export interface RateLimitStore {
  consume(key: string, windowMs: number, max: number, nowMs: number): Promise<RateLimitResult>;
  reset(key?: string): Promise<void>;
  size(): Promise<number>;
}

export interface AsyncRateLimiter {
  check(key: string): Promise<RateLimitResult>;
  reset(key?: string): Promise<void>;
  size(): Promise<number>;
}

export interface AsyncRateLimiterOptions extends RateLimiterOptions {
  store?: RateLimitStore;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Resolves the rate-limit identity for a request.
 *
 * Node only reports the socket peer, so a deployment behind `n` reverse
 * proxies must opt in with `TRUSTED_PROXY_COUNT=n`. Anything above that is
 * caller-controlled and ignored, which stops `X-Forwarded-For` spoofing from
 * minting unlimited buckets.
 */
export function resolveRateLimitKey(
  peer: string,
  forwardedFor: string | string[] | undefined,
  trustedProxyCount: number,
): string {
  if (!Number.isInteger(trustedProxyCount) || trustedProxyCount <= 0) return peer;
  const header = Array.isArray(forwardedFor)
    ? forwardedFor.join(",")
    : typeof forwardedFor === "string"
      ? forwardedFor
      : "";
  const hops = header
    .split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop.length > 0);
  if (hops.length < trustedProxyCount) return peer;
  const client = hops[hops.length - trustedProxyCount];
  return client && client.length > 0 ? client : peer;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, max } = options;
  const now = options.now ?? (() => Date.now());
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string): RateLimitResult {
      const t = now();
      let bucket = buckets.get(key);
      if (!bucket || t >= bucket.resetAt) {
        bucket = { count: 0, resetAt: t + windowMs };
        buckets.set(key, bucket);
      }
      if (bucket.count >= max) {
        return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - t };
      }
      bucket.count += 1;
      return { allowed: true, remaining: max - bucket.count, retryAfterMs: 0 };
    },
    reset(key?: string): void {
      if (key === undefined) buckets.clear();
      else buckets.delete(key);
    },
    size(): number {
      return buckets.size;
    },
  };
}

/** In-process `RateLimitStore` adapter for single-instance deployments and tests. */
export function createMemoryRateLimitStore(): RateLimitStore {
  const buckets = new Map<string, Bucket>();
  return {
    async consume(
      key: string,
      windowMs: number,
      max: number,
      nowMs: number,
    ): Promise<RateLimitResult> {
      let bucket = buckets.get(key);
      if (!bucket || nowMs >= bucket.resetAt) {
        bucket = { count: 0, resetAt: nowMs + windowMs };
        buckets.set(key, bucket);
      }
      if (bucket.count >= max) {
        return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - nowMs };
      }
      bucket.count += 1;
      return { allowed: true, remaining: max - bucket.count, retryAfterMs: 0 };
    },
    async reset(key?: string): Promise<void> {
      if (key === undefined) buckets.clear();
      else buckets.delete(key);
    },
    async size(): Promise<number> {
      return buckets.size;
    },
  };
}

const RATE_LIMIT_TABLE = "ops_rate_limit_buckets";
const initializedRateLimitDbs = new WeakSet<OrmDriverHandle>();

async function ensureRateLimitBucketTable(db: OrmDriverHandle): Promise<void> {
  if (initializedRateLimitDbs.has(db)) return;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ${RATE_LIMIT_TABLE} (
      bucket_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    )
  `);
  initializedRateLimitDbs.add(db);
}

/** Shared SQL-backed `RateLimitStore` persisted through `@moonwitness/orm`. */
export function createOrmRateLimitStore(): RateLimitStore {
  return {
    async consume(
      key: string,
      windowMs: number,
      max: number,
      nowMs: number,
    ): Promise<RateLimitResult> {
      const db = getDb();
      await ensureRateLimitBucketTable(db);
      return db.transaction(async (tx) => {
        const current = await tx.get<{ count: number; reset_at: number }>(
          `SELECT count, reset_at FROM ${RATE_LIMIT_TABLE} WHERE bucket_key = ?`,
          [key],
        );

        if (!current || nowMs >= Number(current.reset_at)) {
          const resetAt = nowMs + windowMs;
          await tx.run(
            `INSERT INTO ${RATE_LIMIT_TABLE} (bucket_key, count, reset_at)
             VALUES (?, 1, ?)
             ON CONFLICT(bucket_key) DO UPDATE SET count = excluded.count, reset_at = excluded.reset_at`,
            [key, resetAt],
          );
          return {
            allowed: max > 0,
            remaining: Math.max(0, max - 1),
            retryAfterMs: 0,
          };
        }

        const currentCount = Number(current.count);
        const resetAt = Number(current.reset_at);
        if (currentCount >= max) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterMs: Math.max(0, resetAt - nowMs),
          };
        }

        const nextCount = currentCount + 1;
        await tx.run(`UPDATE ${RATE_LIMIT_TABLE} SET count = ? WHERE bucket_key = ?`, [
          nextCount,
          key,
        ]);
        return {
          allowed: true,
          remaining: Math.max(0, max - nextCount),
          retryAfterMs: 0,
        };
      });
    },

    async reset(key?: string): Promise<void> {
      const db = getDb();
      await ensureRateLimitBucketTable(db);
      if (key === undefined) {
        await db.run(`DELETE FROM ${RATE_LIMIT_TABLE}`);
      } else {
        await db.run(`DELETE FROM ${RATE_LIMIT_TABLE} WHERE bucket_key = ?`, [key]);
      }
    },

    async size(): Promise<number> {
      const db = getDb();
      await ensureRateLimitBucketTable(db);
      const row = await db.get<{ total: number }>(
        `SELECT COUNT(*) AS total FROM ${RATE_LIMIT_TABLE}`,
      );
      return Number(row?.total ?? 0);
    },
  };
}

/** Creates an async fixed-window rate limiter backed by any `RateLimitStore`. */
export function createAsyncRateLimiter(options: AsyncRateLimiterOptions): AsyncRateLimiter {
  const { windowMs, max } = options;
  const now = options.now ?? (() => Date.now());
  const store = options.store ?? createMemoryRateLimitStore();
  return {
    check: (key: string) => store.consume(key, windowMs, max, now()),
    reset: (key?: string) => store.reset(key),
    size: () => store.size(),
  };
}
