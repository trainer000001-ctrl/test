import { isPostgresUrl } from "@moonwitness/orm";

/**
 * Resolves the disposable PostgreSQL conformance URL strictly from
 * `TEST_POSTGRES_URL` or `POSTGRES_TEST_URL`. Never falls back to `DATABASE_URL`,
 * SQLite, or D1.
 */
export function resolvePostgresConformanceUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const requireConformance = env.MW_REQUIRE_POSTGRES_CONFORMANCE === "1";
  const candidates = [env.TEST_POSTGRES_URL?.trim(), env.POSTGRES_TEST_URL?.trim()];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!isPostgresUrl(candidate)) {
      throw new Error(
        "PostgreSQL conformance target must use postgres:// or postgresql:// protocol (SQLite, D1, and non-PostgreSQL targets are forbidden).",
      );
    }
    return candidate;
  }
  if (requireConformance) {
    throw new Error(
      "MW_REQUIRE_POSTGRES_CONFORMANCE=1 requires explicit TEST_POSTGRES_URL or POSTGRES_TEST_URL (never falls back to DATABASE_URL).",
    );
  }
  return "";
}
