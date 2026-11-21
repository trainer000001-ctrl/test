import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDb, initDb } from "@moonwitness/orm";
import {
  createAsyncRateLimiter,
  createOrmRateLimitStore,
  createRateLimiter,
} from "./rate-limit.js";

describe("createRateLimiter", () => {
  it("allows up to max requests then blocks within the window", () => {
    const t = 1000;
    const limiter = createRateLimiter({ windowMs: 1000, max: 3, now: () => t });

    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").remaining).toBe(0);
    const blocked = limiter.check("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    let t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(false);
    t = 1001;
    expect(limiter.check("ip").allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("can reset a single key or all keys", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    limiter.check("a");
    limiter.check("b");
    limiter.reset("a");
    expect(limiter.check("a").allowed).toBe(true);
    limiter.reset();
    expect(limiter.size()).toBe(0);
  });
});

describe("createOrmRateLimitStore + createAsyncRateLimiter", () => {
  const dirs: string[] = [];

  afterEach(() => {
    closeDb();
    for (const dir of dirs.splice(0)) {
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      } catch {
        // Ignore transient Windows SQLite lock on temp directory cleanup.
      }
    }
  });

  it("persists rate-limit counters in SQL across limiter instances and resets cleanly", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mw-rate-limit-"));
    dirs.push(dir);
    await initDb(join(dir, "rate.db"));

    let nowMs = 10_000;
    const limiter1 = createAsyncRateLimiter({
      windowMs: 1_000,
      max: 2,
      store: createOrmRateLimitStore(),
      now: () => nowMs,
    });
    expect((await limiter1.check("10.0.0.1")).allowed).toBe(true);

    // Fresh limiter instance shares the persisted SQL bucket (simulating restart/multi-worker)
    const limiter2 = createAsyncRateLimiter({
      windowMs: 1_000,
      max: 2,
      store: createOrmRateLimitStore(),
      now: () => nowMs,
    });
    const second = await limiter2.check("10.0.0.1");
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    const blocked = await limiter2.check("10.0.0.1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);

    nowMs = 11_001;
    expect((await limiter2.check("10.0.0.1")).allowed).toBe(true);

    await limiter2.reset("10.0.0.1");
    expect(await limiter2.size()).toBe(0);
  });
});
