import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { closeDb } from "@moonwitness/orm";
import {
  globalCronRunner,
  irCronLogModel,
  irViewModel,
  type ActionBindingsSpec,
} from "@moonwitness/addon-runtime";
import { createSession, createUser } from "@moonwitness/addons/auth";
import { buildApp } from "./app";

const API_SRC_DIR = resolve(__dirname);
const ADDONS_SRC_DIR = resolve(__dirname, "../../../packages/addons/src");

function listNonTestTsFiles(rootDir: string): string[] {
  const results: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".d.ts")
      ) {
        results.push(fullPath);
      }
    }
  };
  walk(rootDir);
  return results;
}

function toPosixRelative(baseDir: string, filePath: string): string {
  return relative(baseDir, filePath).replace(/\\/g, "/");
}

interface RegisteredRouteEntry {
  method: string;
  pattern: string;
}

function parseFastifyPrintRoutes(tree: string): RegisteredRouteEntry[] {
  const routes: RegisteredRouteEntry[] = [];
  const stack: Array<{ col: number; seg: string }> = [];

  for (const rawLine of tree.split(/\r?\n/)) {
    const branchMatch = /^([│\s]*[├└]── )(.*)$/.exec(rawLine);
    if (!branchMatch) continue;
    const col = branchMatch[1]!.length - 4;
    const remainder = branchMatch[2]!.trimEnd();
    if (!remainder) continue;

    while (stack.length > 0 && stack[stack.length - 1]!.col >= col) {
      stack.pop();
    }

    const methodMatch = /^(.*?)\s+\(([^)]+)\)(?:\s+\{.*\})?$/.exec(remainder);
    const segment = methodMatch ? methodMatch[1]! : remainder;
    stack.push({ col, seg: segment });

    if (methodMatch) {
      const rawPath = stack.map((item) => item.seg).join("");
      const normalized = `/${rawPath}`.replace(/\/+/g, "/");
      for (const method of methodMatch[2]!.split(",").map((m) => m.trim().toUpperCase())) {
        routes.push({ method, pattern: normalized });
      }
    }
  }

  return routes;
}

function routeMatchesConcreteUrl(pattern: string, concreteUrl: string): boolean {
  const targetPath = concreteUrl.split("?")[0]!.replace(/\{[^}]+\}/g, "sample-id");
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:[^/]+/g, "[^/]+")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(targetPath);
}

describe("apps/api Thin-Host & ORM Addon Architecture Gates", () => {
  const apiNonTestFiles = listNonTestTsFiles(API_SRC_DIR);
  const addonsNonTestFiles = listNonTestTsFiles(ADDONS_SRC_DIR);
  const tempDirs: string[] = [];
  let app: FastifyInstance | null = null;

  afterAll(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    closeDb();
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      } catch {
        // Ignore transient Windows SQLite WAL handle locks on cleanup.
      }
    }
  });

  it("API-GATE-01: zero defineModel( calls in non-test apps/api/src/**/*.ts", () => {
    const offenders = apiNonTestFiles
      .filter((file) => /\bdefineModel\s*\(/.test(readFileSync(file, "utf8")))
      .map((file) => toPosixRelative(API_SRC_DIR, file));
    expect(offenders).toEqual([]);
  });

  it("API-GATE-02: zero getDb( calls outside health.routes.ts and infrastructure/rate-limit.ts", () => {
    const allowed = new Set(["interface/routes/health.routes.ts", "infrastructure/rate-limit.ts"]);
    const offenders = apiNonTestFiles
      .filter((file) => /\bgetDb\s*\(/.test(readFileSync(file, "utf8")))
      .map((file) => toPosixRelative(API_SRC_DIR, file))
      .filter((rel) => !allowed.has(rel));
    expect(offenders).toEqual([]);
  });

  it("API-GATE-03: zero domain route files in apps/api/src (only health.routes.ts and metrics.ts)", () => {
    const routeFiles = apiNonTestFiles
      .map((file) => toPosixRelative(API_SRC_DIR, file))
      .filter(
        (rel) => rel.startsWith("interface/routes/") || /(?:^|\/)[^/]*\.routes\.ts$/.test(rel),
      );
    expect(routeFiles.sort()).toEqual([
      "interface/routes/health.routes.ts",
      "interface/routes/metrics.ts",
    ]);
  });

  it("API-GATE-04: total non-test LOC across apps/api/src/**/*.ts <= 1350", () => {
    const totalLoc = apiNonTestFiles.reduce((sum, file) => {
      const lines = readFileSync(file, "utf8").split(/\r?\n/).length;
      return sum + lines;
    }, 0);
    expect(totalLoc).toBeLessThanOrEqual(1350);
  });

  it("API-GATE-06: zero applyMigrations( calls in non-test apps/api/src and packages/addons/src", () => {
    const apiOffenders = apiNonTestFiles
      .filter((file) => /\bapplyMigrations\s*\(/.test(readFileSync(file, "utf8")))
      .map((file) => `apps/api/src/${toPosixRelative(API_SRC_DIR, file)}`);
    const addonOffenders = addonsNonTestFiles
      .filter((file) => /\bapplyMigrations\s*\(/.test(readFileSync(file, "utf8")))
      .map((file) => `packages/addons/src/${toPosixRelative(ADDONS_SRC_DIR, file)}`);
    expect([...apiOffenders, ...addonOffenders]).toEqual([]);
  });

  it("API-GATE-07: zero syncModels( calls inside addon routes or non-ensure service handlers", () => {
    const routeOffenders: string[] = [];
    const unexpectedServiceOffenders: string[] = [];

    for (const file of addonsNonTestFiles) {
      const rel = toPosixRelative(ADDONS_SRC_DIR, file);
      const content = readFileSync(file, "utf8");
      if (!/\bsyncModels\s*\(/.test(content)) continue;

      if (/(?:^|\/)(?:routes|riot-routes|memory-routes)\.ts$/.test(rel)) {
        routeOffenders.push(rel);
        continue;
      }

      const fnMatches = Array.from(content.matchAll(/(?:async\s+)?function\s+(\w+)\s*\(/g));
      const allowedNames = /^(?:ensure|initialize)[A-Z]/;
      let cursor = 0;
      const syncRegex = /\bsyncModels\s*\(/g;
      let hit: RegExpExecArray | null;
      while ((hit = syncRegex.exec(content)) !== null) {
        const pos = hit.index;
        const enclosing = [...fnMatches]
          .reverse()
          .find((m) => (m.index ?? 0) < pos && pos >= cursor);
        if (!enclosing || !allowedNames.test(enclosing[1]!)) {
          unexpectedServiceOffenders.push(`${rel}:${enclosing?.[1] ?? "top-level"}`);
        }
        cursor = 0;
      }
    }

    expect(routeOffenders).toEqual([]);
    expect(unexpectedServiceOffenders).toEqual([]);
  });

  it("API-GATE-05 & API-GATE-08: every ir_view actionBinding maps to a live route and tenant isolation holds end-to-end", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mw-arch-gate-"));
    tempDirs.push(dir);
    app = await buildApp({ dbPath: join(dir, "arch.db"), prefix: "/api/v1" });

    // API-GATE-05: verify zero phantom 404 actionBindings
    const registeredRoutes = parseFastifyPrintRoutes(app.printRoutes({ commonPrefix: false }));
    const views = await irViewModel.repository.find({});
    expect(views.length).toBeGreaterThan(0);

    const missingBindings: string[] = [];
    for (const view of views) {
      if (!view.action_bindings_json) continue;
      const bindings = JSON.parse(view.action_bindings_json) as ActionBindingsSpec;
      const checks: Array<{ key: string; method: string; url?: string }> = [
        { key: "listUrl", method: "GET", url: bindings.listUrl },
        { key: "createUrl", method: "POST", url: bindings.createUrl },
        { key: "archiveUrl", method: "POST", url: bindings.archiveUrl },
        { key: "restoreUrl", method: "POST", url: bindings.restoreUrl },
        { key: "deleteUrl", method: "DELETE", url: bindings.deleteUrl },
        { key: "historyUrl", method: "GET", url: bindings.historyUrl },
      ];

      for (const item of checks) {
        if (!item.url) continue;
        const matched = registeredRoutes.some(
          (r) => r.method === item.method && routeMatchesConcreteUrl(r.pattern, item.url!),
        );
        if (!matched) {
          missingBindings.push(`${view.model_name}.${item.key}: ${item.method} ${item.url}`);
        }
      }

      if (bindings.updateUrl) {
        const matchedUpdate = registeredRoutes.some(
          (r) =>
            (r.method === "PUT" || r.method === "PATCH") &&
            routeMatchesConcreteUrl(r.pattern, bindings.updateUrl!),
        );
        if (!matchedUpdate) {
          missingBindings.push(`${view.model_name}.updateUrl: PUT/PATCH ${bindings.updateUrl}`);
        }
      }

      for (const custom of bindings.customActions ?? []) {
        const method = (custom.method ?? "POST").toUpperCase();
        const matchedCustom = registeredRoutes.some(
          (r) => r.method === method && routeMatchesConcreteUrl(r.pattern, custom.urlTemplate),
        );
        if (!matchedCustom) {
          missingBindings.push(
            `${view.model_name}.customActions[${custom.id}]: ${method} ${custom.urlTemplate}`,
          );
        }
      }
    }
    expect(missingBindings).toEqual([]);

    // API-GATE-08: multi-tenant read/write smoke test across addons & /m/:model
    const admin = await createUser({
      username: "arch-admin",
      email: "arch-admin@moonwitness.local",
      password: "CorrectHorseBatteryStaple!2026",
      role: "admin",
      displayName: "Architecture Admin",
    });
    const sessionToken = await createSession(admin.id);
    const tenantAHeaders = { cookie: `mw_session=${sessionToken}`, "x-tenant-id": "tenant-a" };
    const tenantBHeaders = { cookie: `mw_session=${sessionToken}`, "x-tenant-id": "tenant-b" };

    const tlCreate = await app.inject({
      method: "POST",
      url: "/api/v1/timeline/events",
      headers: tenantAHeaders,
      payload: {
        kind: "SIGNAL",
        date: "2026-11-19",
        era: "neon",
        title: "Tenant A Timeline Event",
      },
    });
    expect(tlCreate.statusCode).toBe(201);

    const ccCreate = await app.inject({
      method: "POST",
      url: "/api/v1/command-center/workflows",
      headers: tenantAHeaders,
      payload: {
        name: "Tenant A Workflow",
        detail: "Isolated to tenant-a",
      },
    });
    expect(ccCreate.statusCode).toBe(201);
    const createdWorkflowId = ccCreate.json().workflow.id as string;

    const memCreate = await app.inject({
      method: "POST",
      url: "/api/v1/memory/entries",
      headers: tenantAHeaders,
      payload: {
        record_key: "arch-mem-tenant-a",
        scope: "global",
        kind: "note",
        title: "Tenant A Memory",
      },
    });
    expect(memCreate.statusCode).toBe(201);

    const codexCreate = await app.inject({
      method: "POST",
      url: "/api/v1/m/canon.codex",
      headers: tenantAHeaders,
      payload: {
        slug: "codex-tenant-a",
        title: "Tenant A Codex Entry",
        summary: "Isolated canon record",
      },
    });
    expect(codexCreate.statusCode).toBe(201);

    const auditReadA = await app.inject({
      method: "GET",
      url: "/api/v1/audit/logs",
      headers: tenantAHeaders,
    });
    expect(auditReadA.statusCode).toBe(200);
    expect(auditReadA.json().data.length).toBeGreaterThanOrEqual(4);

    // Tenant B must not observe Tenant A data across any endpoint
    const auditReadB = await app.inject({
      method: "GET",
      url: "/api/v1/audit/logs",
      headers: tenantBHeaders,
    });
    expect(auditReadB.statusCode).toBe(200);
    expect(auditReadB.json().data).toHaveLength(0);

    const tlReadB = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events",
      headers: tenantBHeaders,
    });
    expect(tlReadB.statusCode).toBe(200);
    expect(tlReadB.json().data).toHaveLength(0);

    const ccReadB = await app.inject({
      method: "GET",
      url: "/api/v1/command-center/state",
      headers: tenantBHeaders,
    });
    expect(ccReadB.statusCode).toBe(200);
    const tenantBWorkflowIds = (ccReadB.json().workflows as Array<{ id: string }>).map((w) => w.id);
    expect(tenantBWorkflowIds).not.toContain(createdWorkflowId);

    const memReadB = await app.inject({
      method: "GET",
      url: "/api/v1/memory/entries",
      headers: tenantBHeaders,
    });
    expect(memReadB.statusCode).toBe(200);
    expect(memReadB.json().data).toHaveLength(0);

    const codexReadB = await app.inject({
      method: "GET",
      url: "/api/v1/m/canon.codex",
      headers: tenantBHeaders,
    });
    expect(codexReadB.statusCode).toBe(200);
    expect(codexReadB.json().data).toHaveLength(0);

    // API-GATE-10: constitutional __base models + /m/:model/read-group live in booted host
    const companyList = await app.inject({
      method: "GET",
      url: "/api/v1/m/res.company",
      headers: { cookie: `mw_session=${sessionToken}` },
    });
    expect(companyList.statusCode).toBe(200);
    expect(companyList.json().total).toBeGreaterThanOrEqual(1);

    const groupRead = await app.inject({
      method: "GET",
      url: "/api/v1/m/canon.codex/read-group?groupBy=canon_tier",
      headers: tenantAHeaders,
    });
    expect(groupRead.statusCode).toBe(200);
    expect(groupRead.json().groups).toEqual([{ canon_tier: "canonical", count: 1 }]);

    // API-GATE-11: res.country, res.currency, POST /api/v1/rpc, and CronRunner + ir.cron.log
    const countryList = await app.inject({
      method: "GET",
      url: `/api/v1/m/res.country?domain=${encodeURIComponent(JSON.stringify([["code", "=", "ID"]]))}`,
      headers: { cookie: `mw_session=${sessionToken}` },
    });
    expect(countryList.statusCode).toBe(200);
    expect(countryList.json().total).toBe(1);

    const rpcEval = await app.inject({
      method: "POST",
      url: "/api/v1/rpc",
      headers: tenantAHeaders,
      payload: {
        model: "epistemic.computation",
        method: "evaluate",
        kwargs: { engine: "divine-text", text: "Bismillah" },
      },
    });
    expect(rpcEval.statusCode).toBe(200);
    expect(rpcEval.json().result.output.wordCount).toBe(1);

    const cronResults = await globalCronRunner.processDueCrons();
    expect(
      cronResults.some((r) => r.cronKey === "auth.cleanup_expired_sessions" && r.success),
    ).toBe(true);
    const cronLogs = await irCronLogModel.repository.find({
      cron_key: "auth.cleanup_expired_sessions",
    });
    expect(cronLogs.length).toBeGreaterThanOrEqual(1);

    // API-GATE-12: multi-company non-admin user can switch x-tenant-id to allowed companyIds only
    const multiEditor = await createUser({
      username: "multi-editor",
      email: "multi-editor@moonwitness.local",
      password: "CorrectHorseBatteryStaple!2026",
      role: "editor",
      displayName: "Multi Company Editor",
      companyId: "default",
      companyIds: ["default", "tenant-a"],
    });
    const editorSession = await createSession(multiEditor.id);
    const editorTenantA = await app.inject({
      method: "GET",
      url: "/api/v1/m/canon.codex",
      headers: { cookie: `mw_session=${editorSession}`, "x-tenant-id": "tenant-a" },
    });
    expect(editorTenantA.statusCode).toBe(200);
    expect(editorTenantA.json().total).toBe(1);

    // API-GATE-13: celestial prayer-times/hilal & witness-research 9 engines
    const prayerTimes = await app.inject({
      method: "GET",
      url: "/api/v1/celestial/prayer-times?lat=-6.2088&lng=106.8456&convention=KEMENAG",
    });
    expect(prayerTimes.statusCode).toBe(200);
    expect(prayerTimes.json().fajr).toMatch(/^\d{2}:\d{2}$/);

    const hilal = await app.inject({
      method: "GET",
      url: "/api/v1/celestial/hilal?altitude=3.5&elongation=6.8",
    });
    expect(hilal.statusCode).toBe(200);
    expect(hilal.json().mabims_criterion.passed).toBe(true);

    const witnessModules = await app.inject({
      method: "GET",
      url: "/api/v1/witness/engine/modules",
      headers: tenantAHeaders,
    });
    expect(witnessModules.statusCode).toBe(200);
    expect(witnessModules.json().modules).toHaveLength(9);

    const witnessRun = await app.inject({
      method: "POST",
      url: "/api/v1/witness/engine/run",
      headers: tenantAHeaders,
      payload: { moduleCode: "lexical-analysis", input: { q: "w-z-n" } },
    });
    expect(witnessRun.statusCode).toBe(201);
    expect(witnessRun.json().run.run_status).toBe("completed");

    // API-GATE-14: account double-entry ledger invariant & reversal
    const badMove = await app.inject({
      method: "POST",
      url: "/api/v1/account/ledger/post",
      headers: tenantAHeaders,
      payload: {
        move_key: "ARCH-BAD",
        idempotency_key: "arch-bad",
        lines: [
          { account_code: "1010", debit: 200, credit: 0 },
          { account_code: "4000", debit: 0, credit: 100 },
        ],
      },
    });
    expect(badMove.statusCode).toBe(400);

    const goodMove = await app.inject({
      method: "POST",
      url: "/api/v1/account/ledger/post",
      headers: tenantAHeaders,
      payload: {
        move_key: "ARCH-OK",
        idempotency_key: "arch-ok",
        lines: [
          { account_code: "1010", debit: 250, credit: 0 },
          { account_code: "4000", debit: 0, credit: 250 },
        ],
      },
    });
    expect(goodMove.statusCode).toBe(201);

    const reversedMove = await app.inject({
      method: "POST",
      url: "/api/v1/account/ledger/reverse",
      headers: tenantAHeaders,
      payload: { move_key: "ARCH-OK", reversal_key: "ARCH-OK-REV" },
    });
    expect(reversedMove.statusCode).toBe(201);
    expect(reversedMove.json().move.reversal_of_key).toBe("ARCH-OK");

    // API-GATE-15: performance KPIs, observatory feeds, crm, and view contract integrity
    const defaultAdminHeaders = { cookie: `mw_session=${sessionToken}` };
    const [perfRes, obsRes, crmRes] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/v1/performance/summary",
        headers: defaultAdminHeaders,
      }),
      app.inject({ method: "GET", url: "/api/v1/observatory/summary" }),
      app.inject({ method: "GET", url: "/api/v1/crm/summary", headers: defaultAdminHeaders }),
    ]);
    expect(perfRes.statusCode).toBe(200);
    expect(perfRes.json().widgets.length).toBeGreaterThanOrEqual(3);
    expect(obsRes.statusCode).toBe(200);
    expect(obsRes.json().feeds).toBeGreaterThanOrEqual(5);
    expect(crmRes.statusCode).toBe(200);
    expect(crmRes.json().stages).toBeGreaterThanOrEqual(4);
  });

  it("API-GATE-09: refactored addons eliminate raw SQL in timeline and probe retention", () => {
    const timelineRepo = readFileSync(join(ADDONS_SRC_DIR, "timeline/repository.ts"), "utf8");
    expect(timelineRepo).not.toMatch(/\bgetDb\s*\(/);

    const probesService = readFileSync(join(ADDONS_SRC_DIR, "probes/service.ts"), "utf8");
    expect(probesService).not.toMatch(/DELETE FROM orm_probe_events/i);
  });
});
