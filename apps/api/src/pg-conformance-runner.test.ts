import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolvePostgresConformanceUrl } from "./pg-conformance-config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = resolve(__dirname, "../../../scripts/run-pg-conformance.mjs");

function runConformanceCli(envOverrides: Record<string, string | undefined>) {
  const env = { ...process.env };
  delete env.TEST_POSTGRES_URL;
  delete env.POSTGRES_TEST_URL;
  delete env.DATABASE_URL;
  delete env.MW_REQUIRE_POSTGRES_CONFORMANCE;
  for (const [key, val] of Object.entries(envOverrides)) {
    if (val === undefined) {
      delete env[key];
    } else {
      env[key] = val;
    }
  }
  return spawnSync(process.execPath, [RUNNER_PATH], {
    env,
    encoding: "utf8",
  });
}

describe("PostgreSQL conformance gate contract (MW-0825 / #530)", () => {
  it("resolvePostgresConformanceUrl ignores DATABASE_URL and rejects non-PostgreSQL protocols", () => {
    expect(
      resolvePostgresConformanceUrl({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/prod_db",
      }),
    ).toBe("");

    expect(() =>
      resolvePostgresConformanceUrl({
        MW_REQUIRE_POSTGRES_CONFORMANCE: "1",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/prod_db",
      }),
    ).toThrow(/TEST_POSTGRES_URL or POSTGRES_TEST_URL/);

    expect(() =>
      resolvePostgresConformanceUrl({
        TEST_POSTGRES_URL: "file:/tmp/not-postgres.db",
      }),
    ).toThrow(/postgres:\/\/ or postgresql:\/\//i);

    expect(() =>
      resolvePostgresConformanceUrl({
        POSTGRES_TEST_URL: "sqlite::memory:",
      }),
    ).toThrow(/postgres:\/\/ or postgresql:\/\//i);

    expect(
      resolvePostgresConformanceUrl({
        TEST_POSTGRES_URL: "postgres://postgres:postgres@127.0.0.1:5432/test_a",
        POSTGRES_TEST_URL: "postgresql://postgres:postgres@127.0.0.1:5432/test_b",
      }),
    ).toBe("postgres://postgres:postgres@127.0.0.1:5432/test_a");
  });

  it("run-pg-conformance.mjs fails fast non-zero when no explicit test PostgreSQL URL is provided", () => {
    const missingRes = runConformanceCli({});
    expect(missingRes.status).toBe(1);
    expect(missingRes.stderr).toContain("TEST_POSTGRES_URL or POSTGRES_TEST_URL");

    const databaseUrlOnlyRes = runConformanceCli({
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    });
    expect(databaseUrlOnlyRes.status).toBe(1);
    expect(databaseUrlOnlyRes.stderr).toContain("TEST_POSTGRES_URL or POSTGRES_TEST_URL");

    const sqliteRes = runConformanceCli({
      TEST_POSTGRES_URL: "file:/tmp/dev.db",
    });
    expect(sqliteRes.status).toBe(1);
    expect(sqliteRes.stderr).toContain("postgres:// or postgresql://");

    const d1Res = runConformanceCli({
      POSTGRES_TEST_URL: "d1://binding/DB",
    });
    expect(d1Res.status).toBe(1);
    expect(d1Res.stderr).toContain("postgres:// or postgresql://");
  });
});
