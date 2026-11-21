import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { Pool } from "pg";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  closeDbAsync,
  ConflictError,
  createActorContext,
  defineModel,
  getDb,
  initPostgresDb,
  modelRegistry,
  PolicyError,
  syncModels,
  withQueryBudget,
} from "@moonwitness/orm";
import {
  AddonRegistryError,
  AddonRuntimeController,
  dispatchOutboxBatch,
  ensureOutboxSchema,
  irAddonModel,
  OutboxDispatcher,
  recoverExpiredOutboxLeases,
  registerBaseAddon,
  type AddonDefinition,
  type BaseAddonAuthBridge,
  type CrewRoleOrPublic,
} from "@moonwitness/addon-runtime";
import { createSession, createUser } from "@moonwitness/addons/auth";
import { irAutomationModel, irWebhookModel, irWebhookLogModel } from "@moonwitness/addons/khidra";
import { buildApp } from "./app";
import { resolvePostgresConformanceUrl } from "./pg-conformance-config";

const POSTGRES_CONFORMANCE_URL = resolvePostgresConformanceUrl();

interface IsolatedPostgresDb {
  dbUrl: string;
  dbName: string;
  drop: () => Promise<void>;
}

async function createIsolatedPostgresDb(baseUrl: string): Promise<IsolatedPostgresDb> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const dbName = `mw_pg_conf_${suffix}`;
  const adminPool = new Pool({ connectionString: baseUrl, max: 2 });
  adminPool.on("error", () => {});
  try {
    await adminPool.query(`CREATE DATABASE "${dbName}"`);
  } catch (error) {
    await adminPool.end().catch(() => {});
    throw error;
  }

  const targetUrl = new URL(baseUrl);
  targetUrl.pathname = `/${dbName}`;

  return {
    dbUrl: targetUrl.toString(),
    dbName,
    drop: async () => {
      try {
        // Terminate remaining backend connections before dropping so the
        // process does not emit unhandled 57P01 errors on live sockets.
        await adminPool
          .query(
            `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [dbName],
          )
          .catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 50));
        await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
      } finally {
        await adminPool.end();
      }
    },
  };
}

function createHeaderAuthBridge(): BaseAddonAuthBridge {
  return {
    authenticate: async (request, reply) => {
      if (!request.headers["x-role"]) {
        await reply.code(401).send({ error: "Not authenticated" });
      }
    },
    requireRole:
      (...roles) =>
      async (request, reply) => {
        const role = request.headers["x-role"];
        if (typeof role !== "string" || !role) {
          await reply.code(401).send({ error: "Not authenticated" });
          return;
        }
        if (!roles.includes(role as "admin" | "editor" | "viewer")) {
          await reply.code(403).send({ error: "Forbidden" });
        }
      },
    getActorRole: (request): CrewRoleOrPublic => {
      const role = request.headers["x-role"];
      return role === "admin" || role === "editor" || role === "viewer" ? role : "public";
    },
    getActorId: (request) => {
      const raw = request.headers["x-actor-id"];
      return typeof raw === "string" && raw.trim() ? raw.trim() : null;
    },
    getActorGroups: (request) => {
      const raw = request.headers["x-groups"];
      if (typeof raw !== "string" || !raw.trim()) return [];
      return raw
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
    },
    resolveActorContext: (request, source = "api") => {
      const actorId =
        typeof request.headers["x-actor-id"] === "string" ? request.headers["x-actor-id"] : null;
      const tenantId =
        typeof request.headers["x-tenant-id"] === "string"
          ? request.headers["x-tenant-id"]
          : undefined;
      return createActorContext(actorId, source, request.id, tenantId);
    },
  };
}

describe.skipIf(!POSTGRES_CONFORMANCE_URL)(
  "PostgreSQL API-to-ORM conformance suite (#509 / MW-0824)",
  () => {
    const cleanups: Array<() => Promise<void>> = [];

    afterEach(async () => {
      await closeDbAsync();
      modelRegistry.clearHookErrors();
      while (cleanups.length > 0) {
        const cleanup = cleanups.pop()!;
        await cleanup().catch(() => {});
      }
    });

    afterAll(async () => {
      await closeDbAsync();
    });
    afterAll(async () => {
      // Allow PG client pool to fully drain and avoid unhandled 57P01 terminations
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it("1a. boots real Fastify host (buildApp) on PostgreSQL 16 with health/readiness, authBridge actor context, RPC, and 2-tenant isolation", async () => {
      const isolated = await createIsolatedPostgresDb(POSTGRES_CONFORMANCE_URL);
      let app: FastifyInstance | null = null;
      cleanups.push(async () => {
        if (app) {
          await app.close();
          app = null;
        }
        await closeDbAsync();
        await new Promise((resolve) => setTimeout(resolve, 250));
        await isolated.drop();
      });

      app = await buildApp({ dbPath: isolated.dbUrl, prefix: "/api/v1" });
      await syncModels([irAutomationModel, irWebhookModel, irWebhookLogModel]);

      const pgVersionRow = await getDb().get<{ version: string }>("SELECT version() AS version");
      expect(pgVersionRow?.version).toMatch(/PostgreSQL 16\./);

      const healthRes = await app.inject({ method: "GET", url: "/api/v1/healthz" });
      expect(healthRes.statusCode).toBe(200);

      const readyRes = await app.inject({ method: "GET", url: "/api/v1/readyz" });
      expect(readyRes.statusCode).toBe(200);
      expect(readyRes.json().status).toBe("ready");

      const admin = await createUser({
        username: "pg-conf-admin",
        email: "pg-conf-admin@moonwitness.local",
        password: "CorrectHorseBatteryStaple!2026",
        role: "admin",
        displayName: "PG Conformance Admin",
      });
      const sessionToken = await createSession(admin.id);
      const tenantAHeaders = { cookie: `mw_session=${sessionToken}`, "x-tenant-id": "tenant-a" };
      const tenantBHeaders = { cookie: `mw_session=${sessionToken}`, "x-tenant-id": "tenant-b" };

      const created = await app.inject({
        method: "POST",
        url: "/api/v1/m/canon.codex",
        headers: tenantAHeaders,
        payload: {
          slug: "pg-codex-alpha",
          title: "PG Codex Alpha",
          summary: "PostgreSQL persisted record",
        },
      });
      expect(created.statusCode).toBe(201);
      const recordId = created.json().data.id as string;

      const listA = await app.inject({
        method: "GET",
        url: "/api/v1/m/canon.codex",
        headers: tenantAHeaders,
      });
      expect(listA.statusCode).toBe(200);
      expect(listA.json().total).toBe(1);

      const listB = await app.inject({
        method: "GET",
        url: "/api/v1/m/canon.codex",
        headers: tenantBHeaders,
      });
      expect(listB.statusCode).toBe(200);
      expect(listB.json().total).toBe(0);
      expect(listB.json().data).toEqual([]);

      const readB = await app.inject({
        method: "GET",
        url: `/api/v1/m/canon.codex/${recordId}`,
        headers: tenantBHeaders,
      });
      expect(readB.statusCode).toBe(404);

      const rpcRes = await app.inject({
        method: "POST",
        url: "/api/v1/rpc",
        headers: tenantAHeaders,
        payload: {
          model: "epistemic.computation",
          method: "evaluate",
          kwargs: { engine: "divine-text", text: "Bismillah" },
        },
      });
      expect(rpcRes.statusCode).toBe(200);
      expect(rpcRes.json().result.output.wordCount).toBe(1);
    });

    it("1b. enforces request context -> tenant scope -> global + group ir.rule -> field read/write policies -> PostgreSQL across all CRUD, readGroup, history, RPC, custom actions, and 2-tenant isolation", async () => {
      const isolated = await createIsolatedPostgresDb(POSTGRES_CONFORMANCE_URL);
      let app: FastifyInstance | null = null;
      cleanups.push(async () => {
        if (app) {
          await app.close();
          app = null;
        }
        await closeDbAsync();
        await isolated.drop();
      });

      await initPostgresDb(isolated.dbUrl);
      const suffix = isolated.dbName.slice(-8);

      const deptModel = defineModel({
        name: `conf.dept_${suffix}`,
        table: `conf_depts_${suffix}`,
        schema: z.object({
          name: z.string().min(1),
          internal_budget: z.number().int().default(5000),
        }),
        restEnabled: true,
        fieldPolicies: {
          internal_budget: { readRoles: ["admin"], writeRoles: ["admin"] },
        },
      });

      const caseModel = defineModel({
        name: `conf.case_${suffix}`,
        table: `conf_cases_${suffix}`,
        schema: z.object({
          owner_id: z.string(),
          dept_id: z.string().nullable().default(null),
          title: z.string().min(1),
          tier: z.enum(["standard", "critical"]).default("standard"),
          budget: z.number().int().default(100),
          classified_note: z.string().default("top-secret"),
        }),
        restEnabled: true,
        defaults: {
          owner_id: (actor) => actor.actorId ?? "system",
        },
        relations: {
          dept_id: { model: deptModel.name, targetField: "id", onDelete: "restrict" },
        },
        fieldPolicies: {
          budget: { readRoles: ["editor", "admin"], writeRoles: ["admin"] },
          classified_note: { readRoles: ["admin"], writeRoles: ["admin"] },
        },
        actions: {
          case_stats: {
            scope: "model",
            roles: ["viewer", "editor", "admin"],
            handler: async ({ repository }) => ({ total: await repository.count() }),
          },
          inspect_case: {
            scope: "record",
            operation: "read",
            roles: ["viewer", "editor", "admin"],
            handler: async ({ record }) => record,
          },
          promote_case: {
            scope: "record",
            operation: "update",
            roles: ["editor", "admin"],
            input: z.object({ title: z.string().min(1).optional() }).optional(),
            handler: async ({ record, input, repository, actor }) => {
              const title = (input as { title?: string } | undefined)?.title;
              return repository.update(
                String(record!.id),
                {
                  tier: "critical",
                  ...(title ? { title } : {}),
                },
                actor,
              );
            },
          },
        },
      });

      const runtime = new AddonRuntimeController();
      app = Fastify();
      const authBridge = createHeaderAuthBridge();

      await runtime.syncAll(
        [
          { manifest: { name: "__base", version: "1.0.0", autoInstall: true } },
          {
            manifest: {
              name: `conf_crud_${suffix}`,
              version: "1.0.0",
              depends: ["__base"],
              provides: { models: [deptModel.name, caseModel.name] },
            },
            models: [deptModel, caseModel],
            rules: [
              {
                rule_key: `conf.dept.all_${suffix}`,
                model_name: deptModel.name,
                role: "viewer",
                can_read: true,
                can_create: true,
              },
              {
                rule_key: `conf.case.global_tenant_${suffix}`,
                model_name: caseModel.name,
                scope: "global",
                can_read: true,
                can_create: true,
                can_update: true,
                can_delete: true,
                domain: { tenant_id: "$actor.tenantId" },
              },
              {
                rule_key: `conf.case.group_viewer_${suffix}`,
                model_name: caseModel.name,
                scope: "group",
                groups: ["base.group_viewer"],
                can_read: true,
                domain: { owner_id: "$actor.id" },
              },
              {
                rule_key: `conf.case.group_editor_${suffix}`,
                model_name: caseModel.name,
                scope: "group",
                groups: ["base.group_editor"],
                can_read: true,
                can_create: true,
                can_update: true,
                can_delete: true,
                domain: { owner_id: "$actor.id" },
              },
            ],
          },
        ],
        app,
      );
      await registerBaseAddon(app, { runtime, auth: authBridge, apiPrefix: "/api/v1" });
      await app.ready();

      const adminAlpha = {
        "x-role": "admin",
        "x-actor-id": "admin-1",
        "x-tenant-id": "tenant-alpha",
      };
      const editorU1Alpha = {
        "x-role": "editor",
        "x-actor-id": "u1",
        "x-groups": "base.group_editor",
        "x-tenant-id": "tenant-alpha",
      };
      const viewerU1Alpha = {
        "x-role": "viewer",
        "x-actor-id": "u1",
        "x-groups": "base.group_viewer",
        "x-tenant-id": "tenant-alpha",
      };
      const editorU2Alpha = {
        "x-role": "editor",
        "x-actor-id": "u2",
        "x-groups": "base.group_editor",
        "x-tenant-id": "tenant-alpha",
      };
      const editorU1Beta = {
        "x-role": "editor",
        "x-actor-id": "u1",
        "x-groups": "base.group_editor",
        "x-tenant-id": "tenant-beta",
      };

      const deptRes = await app.inject({
        method: "POST",
        url: `/api/v1/m/${deptModel.name}`,
        headers: adminAlpha,
        payload: { name: "Observatory" },
      });
      expect(deptRes.statusCode).toBe(201);
      const deptId = deptRes.json().data.id as string;

      // Field write policy check
      const forbiddenFieldCreate = await app.inject({
        method: "POST",
        url: `/api/v1/m/${caseModel.name}`,
        headers: editorU1Alpha,
        payload: { title: "Denied Write", budget: 999 },
      });
      expect(forbiddenFieldCreate.statusCode).toBe(403);
      expect(forbiddenFieldCreate.json().code).toBe("FIELD_WRITE_FORBIDDEN");

      // Group rule check: forging another owner_id is denied
      const forgedOwnerCreate = await app.inject({
        method: "POST",
        url: `/api/v1/m/${caseModel.name}`,
        headers: editorU1Alpha,
        payload: { title: "Forged Owner", owner_id: "u2" },
      });
      expect(forgedOwnerCreate.statusCode).toBe(403);
      expect(forgedOwnerCreate.json().code).toBe("RULE_FORBIDDEN");

      // Create valid record
      const created = await app.inject({
        method: "POST",
        url: `/api/v1/m/${caseModel.name}`,
        headers: editorU1Alpha,
        payload: { title: "PG Case One", dept_id: deptId },
      });
      expect(created.statusCode).toBe(201);
      const caseId = created.json().data.id as string;
      expect(created.json().data.owner_id).toBe("u1");
      expect(created.json().data.budget).toBe(100);
      expect(created.json().data.classified_note).toBeUndefined();

      // List + count
      const listRes = await app.inject({
        method: "GET",
        url: `/api/v1/m/${caseModel.name}`,
        headers: editorU1Alpha,
      });
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json().total).toBe(1);
      expect(listRes.json().data[0].classified_note).toBeUndefined();

      // Viewer read + with relation strips restricted fields on both parent & relation
      const readViewer = await app.inject({
        method: "GET",
        url: `/api/v1/m/${caseModel.name}/${caseId}?with=dept_id`,
        headers: viewerU1Alpha,
      });
      expect(readViewer.statusCode).toBe(200);
      expect(readViewer.json().data.budget).toBeUndefined();
      expect(readViewer.json().data.classified_note).toBeUndefined();
      expect(readViewer.json().data.$dept_id.name).toBe("Observatory");
      expect(readViewer.json().data.$dept_id.internal_budget).toBeUndefined();

      // Field read policy check on filter/domain/orderBy/groupBy
      const restrictedFilter = await app.inject({
        method: "GET",
        url: `/api/v1/m/${caseModel.name}?classified_note=top-secret`,
        headers: editorU1Alpha,
      });
      expect(restrictedFilter.statusCode).toBe(403);
      expect(restrictedFilter.json().code).toBe("FIELD_READ_FORBIDDEN");

      // readGroup
      const groupRes = await app.inject({
        method: "GET",
        url: `/api/v1/m/${caseModel.name}/read-group?groupBy=tier`,
        headers: editorU1Alpha,
      });
      expect(groupRes.statusCode).toBe(200);
      expect(groupRes.json().groups).toEqual([{ tier: "standard", count: 1 }]);

      // Update
      const patchRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/m/${caseModel.name}/${caseId}`,
        headers: editorU1Alpha,
        payload: { title: "PG Case Updated" },
      });
      expect(patchRes.statusCode).toBe(200);
      expect(patchRes.json().data.title).toBe("PG Case Updated");

      // Custom model action & record action
      const modelActionRes = await app.inject({
        method: "POST",
        url: `/api/v1/m/${caseModel.name}/call/case_stats`,
        headers: viewerU1Alpha,
        payload: {},
      });
      expect(modelActionRes.statusCode).toBe(200);
      expect(modelActionRes.json().data).toEqual({ total: 1 });

      const recordActionRes = await app.inject({
        method: "POST",
        url: `/api/v1/m/${caseModel.name}/${caseId}/call/inspect_case`,
        headers: viewerU1Alpha,
        payload: {},
      });
      expect(recordActionRes.statusCode).toBe(200);
      expect(recordActionRes.json().data.budget).toBeUndefined();

      // RPC model & record actions
      const rpcPromote = await app.inject({
        method: "POST",
        url: "/api/v1/rpc",
        headers: editorU1Alpha,
        payload: {
          model: caseModel.name,
          method: "promote_case",
          id: caseId,
          kwargs: { title: "PG Case Escalated" },
        },
      });
      expect(rpcPromote.statusCode).toBe(200);
      expect(rpcPromote.json().result.tier).toBe("critical");
      expect(rpcPromote.json().result.classified_note).toBeUndefined();

      // Same-tenant other user blocked by group ir.rule; second tenant blocked by global tenant ir.rule
      const otherUserRead = await app.inject({
        method: "GET",
        url: `/api/v1/m/${caseModel.name}/${caseId}`,
        headers: editorU2Alpha,
      });
      expect(otherUserRead.statusCode).toBe(404);

      const otherTenantList = await app.inject({
        method: "GET",
        url: `/api/v1/m/${caseModel.name}`,
        headers: editorU1Beta,
      });
      expect(otherTenantList.statusCode).toBe(200);
      expect(otherTenantList.json().total).toBe(0);

      const otherTenantRead = await app.inject({
        method: "GET",
        url: `/api/v1/m/${caseModel.name}/${caseId}`,
        headers: editorU1Beta,
      });
      expect(otherTenantRead.statusCode).toBe(404);

      // Archive, restore, history, delete
      const archiveRes = await app.inject({
        method: "POST",
        url: `/api/v1/m/${caseModel.name}/${caseId}/archive`,
        headers: editorU1Alpha,
      });
      expect(archiveRes.statusCode).toBe(200);
      expect(archiveRes.json().data.status).toBe("archived");

      const restoreRes = await app.inject({
        method: "POST",
        url: `/api/v1/m/${caseModel.name}/${caseId}/restore`,
        headers: editorU1Alpha,
      });
      expect(restoreRes.statusCode).toBe(200);
      expect(restoreRes.json().data.status).toBe("active");

      const historyRes = await app.inject({
        method: "GET",
        url: `/api/v1/m/${caseModel.name}/${caseId}/history`,
        headers: viewerU1Alpha,
      });
      expect(historyRes.statusCode).toBe(200);
      expect(historyRes.json().data.length).toBeGreaterThanOrEqual(4);
      const firstDiff = JSON.parse(historyRes.json().data[0].diff) as Record<string, unknown>;
      expect(firstDiff.classified_note).toBeUndefined();
      expect(firstDiff.budget).toBeUndefined();

      const deleteRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/m/${caseModel.name}/${caseId}`,
        headers: editorU1Alpha,
      });
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.json().data.status).toBe("deleted");
    });

    it("1c. enforces group-aware readGroups and writeGroups (including authenticated auth_users group_keys_json, implied res.groups, and relation target policies) against PostgreSQL", async () => {
      const isolated = await createIsolatedPostgresDb(POSTGRES_CONFORMANCE_URL);
      let app: FastifyInstance | null = null;
      cleanups.push(async () => {
        if (app) {
          await app.close();
          app = null;
        }
        await closeDbAsync();
        await isolated.drop();
      });

      const suffix = isolated.dbName.slice(-8);
      const targetModel = defineModel({
        name: `conf.grp_dept_${suffix}`,
        table: `conf_grp_depts_${suffix}`,
        schema: z.object({
          name: z.string().min(1),
          audit_budget: z.number().int().default(7000),
          secret_vault_key: z.string().default("vault-secret"),
        }),
        restEnabled: true,
        fieldPolicies: {
          audit_budget: {
            readGroups: ["ops.group_auditor"],
            writeGroups: ["ops.group_auditor"],
          },
          secret_vault_key: {
            sensitive: true,
            readGroups: ["ops.group_lead"],
          },
        },
      });

      const docModel = defineModel({
        name: `conf.grp_doc_${suffix}`,
        table: `conf_grp_docs_${suffix}`,
        schema: z.object({
          code: z.string().min(1),
          dept_id: z.string().nullable().default(null),
          title: z.string().min(1),
          classification: z.string().default("internal"),
          audit_finding: z.string().default("pg-secret-finding"),
          lead_secret: z.string().default("lead-token-xyz"),
        }),
        restEnabled: true,
        indexes: [{ fields: ["code"], unique: true }],
        relations: {
          dept_id: { model: targetModel.name, targetField: "id", onDelete: "restrict" },
        },
        fieldPolicies: {
          audit_finding: {
            readRoles: ["admin"],
            readGroups: ["ops.group_auditor"],
            writeRoles: ["admin"],
            writeGroups: ["ops.group_auditor"],
          },
          lead_secret: {
            sensitive: true,
            readGroups: ["ops.group_lead"],
            writeGroups: ["ops.group_lead"],
          },
        },
        actions: {
          update_finding: {
            scope: "record",
            operation: "update",
            roles: ["viewer", "editor", "admin"],
            handler: async ({ record, input, repository, actor }) => {
              const payload = input as { audit_finding?: string; title?: string };
              return repository.update(
                String(record!.id),
                {
                  ...(payload.audit_finding ? { audit_finding: payload.audit_finding } : {}),
                  ...(payload.title ? { title: payload.title } : {}),
                },
                actor,
              );
            },
          },
        },
      });

      app = await buildApp({
        dbPath: isolated.dbUrl,
        prefix: "/api/v1",
        addons: [
          {
            manifest: {
              name: `conf_grp_addon_${suffix}`,
              version: "1.0.0",
              depends: ["__base"],
              provides: { models: [targetModel.name, docModel.name] },
            },
            models: [targetModel, docModel],
            data: [
              {
                id: `grp_auditor_${suffix}`,
                model: "res.groups",
                key: { group_key: "ops.group_auditor" },
                values: {
                  group_key: "ops.group_auditor",
                  name: "Ops Auditor",
                  category: "ops",
                  implied_ids_json: '["base.group_viewer"]',
                },
              },
              {
                id: `grp_lead_${suffix}`,
                model: "res.groups",
                key: { group_key: "ops.group_lead" },
                values: {
                  group_key: "ops.group_lead",
                  name: "Ops Lead",
                  category: "ops",
                  implied_ids_json: '["ops.group_auditor"]',
                },
              },
            ],
            rules: [
              {
                rule_key: `conf.grp_dept.viewer_${suffix}`,
                model_name: targetModel.name,
                scope: "group",
                groups: ["base.group_viewer"],
                can_read: true,
                can_create: true,
              },
              {
                rule_key: `conf.grp_doc.viewer_${suffix}`,
                model_name: docModel.name,
                scope: "group",
                groups: ["base.group_viewer"],
                can_read: true,
                can_create: true,
                can_update: true,
              },
            ],
          },
        ],
      });

      const plainViewer = await createUser({
        username: `pg-plain-viewer-${suffix}`,
        email: `pg-plain-viewer-${suffix}@moonwitness.local`,
        password: "CorrectHorseBatteryStaple!2026",
        role: "viewer",
        displayName: "Plain Viewer",
        groups: [],
      });
      const leadViewer = await createUser({
        username: `pg-lead-viewer-${suffix}`,
        email: `pg-lead-viewer-${suffix}@moonwitness.local`,
        password: "CorrectHorseBatteryStaple!2026",
        role: "viewer",
        displayName: "Lead Viewer",
        groups: ["ops.group_lead"],
      });

      const plainCookie = `mw_session=${await createSession(plainViewer.id)}`;
      const leadCookie = `mw_session=${await createSession(leadViewer.id)}`;

      const deptRes = await app.inject({
        method: "POST",
        url: `/api/v1/m/${targetModel.name}`,
        headers: { cookie: leadCookie },
        payload: { name: "Audit Dept", audit_budget: 12000 },
      });
      expect(deptRes.statusCode).toBe(201);
      const deptId = deptRes.json().data.id as string;
      expect(deptRes.json().data.audit_budget).toBe(12000);
      expect(deptRes.json().data.secret_vault_key).toBe("vault-secret");

      // Plain viewer (role=viewer, no groups) is denied writing group-protected fields
      const plainDeniedWrite = await app.inject({
        method: "POST",
        url: `/api/v1/m/${docModel.name}`,
        headers: { cookie: plainCookie },
        payload: { code: "G-1", title: "Blocked", audit_finding: "forged" },
      });
      expect(plainDeniedWrite.statusCode).toBe(403);
      expect(plainDeniedWrite.json().code).toBe("FIELD_WRITE_FORBIDDEN");

      // Viewer with ops.group_lead (which implies ops.group_auditor) succeeds despite role=viewer
      const leadCreate = await app.inject({
        method: "POST",
        url: `/api/v1/m/${docModel.name}`,
        headers: { cookie: leadCookie },
        payload: {
          code: "G-1",
          dept_id: deptId,
          title: "PG Group Doc",
          audit_finding: "pg-audit-only-needle",
          lead_secret: "lead-pg-secret",
        },
      });
      expect(leadCreate.statusCode).toBe(201);
      const docId = leadCreate.json().data.id as string;
      expect(leadCreate.json().data.audit_finding).toBe("pg-audit-only-needle");
      expect(leadCreate.json().data.lead_secret).toBe("lead-pg-secret");

      // Plain viewer reads with ?with=dept_id -> cannot see audit_finding, lead_secret, or target audit_budget / secret_vault_key
      const plainRead = await app.inject({
        method: "GET",
        url: `/api/v1/m/${docModel.name}/${docId}?with=dept_id`,
        headers: { cookie: plainCookie },
      });
      expect(plainRead.statusCode).toBe(200);
      expect(plainRead.json().data.title).toBe("PG Group Doc");
      expect(plainRead.json().data.audit_finding).toBeUndefined();
      expect(plainRead.json().data.lead_secret).toBeUndefined();
      expect(plainRead.json().data.$dept_id.name).toBe("Audit Dept");
      expect(plainRead.json().data.$dept_id.audit_budget).toBeUndefined();
      expect(plainRead.json().data.$dept_id.secret_vault_key).toBeUndefined();

      // Plain viewer cannot infer audit_finding via filter, orderBy, readGroup, ?q=, or ?fields=
      expect(
        (
          await app.inject({
            method: "GET",
            url: `/api/v1/m/${docModel.name}?audit_finding=pg-audit-only-needle`,
            headers: { cookie: plainCookie },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: "GET",
            url: `/api/v1/m/${docModel.name}?orderBy=audit_finding%20ASC`,
            headers: { cookie: plainCookie },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: "GET",
            url: `/api/v1/m/${docModel.name}?fields=title,audit_finding`,
            headers: { cookie: plainCookie },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: "GET",
            url: `/api/v1/m/${docModel.name}/read-group?groupBy=audit_finding`,
            headers: { cookie: plainCookie },
          })
        ).statusCode,
      ).toBe(403);
      const plainSearchGroup = await app.inject({
        method: "GET",
        url: `/api/v1/m/${docModel.name}/read-group?groupBy=classification&q=pg-audit-only-needle`,
        headers: { cookie: plainCookie },
      });
      expect(plainSearchGroup.statusCode).toBe(200);
      expect(plainSearchGroup.json().groups).toEqual([]);

      // Plain viewer RPC input on restricted field fails with 403
      const plainRpc = await app.inject({
        method: "POST",
        url: "/api/v1/rpc",
        headers: { cookie: plainCookie },
        payload: {
          model: docModel.name,
          method: "update_finding",
          id: docId,
          kwargs: { audit_finding: "blocked" },
        },
      });
      expect(plainRpc.statusCode).toBe(403);
      expect(plainRpc.json().code).toBe("FIELD_WRITE_FORBIDDEN");

      // Lead viewer reads hydrated relation + runs RPC + reads group-protected readGroup
      const leadRead = await app.inject({
        method: "GET",
        url: `/api/v1/m/${docModel.name}/${docId}?with=dept_id`,
        headers: { cookie: leadCookie },
      });
      expect(leadRead.statusCode).toBe(200);
      expect(leadRead.json().data.audit_finding).toBe("pg-audit-only-needle");
      expect(leadRead.json().data.lead_secret).toBe("lead-pg-secret");
      expect(leadRead.json().data.$dept_id.audit_budget).toBe(12000);
      expect(leadRead.json().data.$dept_id.secret_vault_key).toBe("vault-secret");

      const leadRpc = await app.inject({
        method: "POST",
        url: "/api/v1/rpc",
        headers: { cookie: leadCookie },
        payload: {
          model: docModel.name,
          method: "update_finding",
          id: docId,
          kwargs: { audit_finding: "pg-audit-updated" },
        },
      });
      expect(leadRpc.statusCode).toBe(200);
      expect(leadRpc.json().result.audit_finding).toBe("pg-audit-updated");

      const leadGroup = await app.inject({
        method: "GET",
        url: `/api/v1/m/${docModel.name}/read-group?groupBy=audit_finding&q=pg-audit-updated`,
        headers: { cookie: leadCookie },
      });
      expect(leadGroup.statusCode).toBe(200);
      expect(leadGroup.json().groups).toEqual([{ audit_finding: "pg-audit-updated", count: 1 }]);
    });

    it("2. enforces model semantics on PostgreSQL: defaults, constrains, many2one, many2many + query budget, computed DAG, hook rollback vs isolation, 409 optimistic locking, and _orm_audit_log", async () => {
      const isolated = await createIsolatedPostgresDb(POSTGRES_CONFORMANCE_URL);
      let app: FastifyInstance | null = null;
      cleanups.push(async () => {
        if (app) {
          await app.close();
          app = null;
        }
        await closeDbAsync();
        await isolated.drop();
      });

      await initPostgresDb(isolated.dbUrl);
      const suffix = isolated.dbName.slice(-8);
      const actorA = createActorContext("actor-a", "api", "req-sem-a", "tenant-a");
      const actorB = createActorContext("actor-b", "api", "req-sem-b", "tenant-b");

      let failBeforeSave = false;
      let failAfterHook = false;

      const orgModel = defineModel({
        name: `sem.org_${suffix}`,
        table: `sem_orgs_${suffix}`,
        schema: z.object({ name: z.string().min(1) }),
      });

      const tagModel = defineModel({
        name: `sem.tag_${suffix}`,
        table: `sem_tags_${suffix}`,
        schema: z.object({ name: z.string().min(1) }),
      });

      const orderModel = defineModel({
        name: `sem.order_${suffix}`,
        table: `sem_orders_${suffix}`,
        restEnabled: true,
        schema: z.object({
          org_id: z.string(),
          created_by_actor: z.string(),
          unit_price: z.number().int(),
          qty: z.number().int(),
        }),
        defaults: {
          created_by_actor: (actor) => actor.actorId ?? "system",
        },
        relations: {
          org_id: { model: orgModel.name, targetField: "id", onDelete: "restrict" },
          tags: {
            model: tagModel.name,
            type: "many2many",
            through: `sem_order_tags_${suffix}`,
            sourceKey: "order_id",
            targetKey: "tag_id",
          },
        },
        computed: {
          subtotal: {
            depends: ["unit_price", "qty"],
            compute: (r) => Number(r.unit_price) * Number(r.qty),
            stored: true,
            type: "integer",
          },
          tax: {
            depends: ["subtotal"],
            compute: (r) => Math.round(Number(r.subtotal) * 0.1),
            stored: true,
            type: "integer",
          },
          label: {
            depends: ["subtotal", "tax"],
            compute: (r) => `sub=${String(r.subtotal)},tax=${String(r.tax)}`,
          },
        },
        constrains: [
          ({ after }) => {
            if (Number(after.qty) <= 0) {
              throw new Error("qty must be positive");
            }
          },
        ],
        hooks: {
          beforeSave: () => {
            if (failBeforeSave) throw new Error("beforeSave aborted");
          },
          afterSave: () => {
            if (failAfterHook) throw new Error("afterSave non-fatal");
          },
        },
      });

      await syncModels([orgModel, tagModel, orderModel]);

      const orgA = await orgModel.repository.create({ name: "Org A" }, actorA);
      const orgB = await orgModel.repository.create({ name: "Org B" }, actorB);

      // Constraint & many2one tenant guard
      await expect(
        orderModel.repository.create({ org_id: orgA.id, unit_price: 100, qty: 0 }, actorA),
      ).rejects.toThrow(/qty must be positive/);
      await expect(
        orderModel.repository.create({ org_id: orgB.id, unit_price: 100, qty: 2 }, actorA),
      ).rejects.toThrow(/relation/i);

      // Computed field direct-write guard + DAG persistence
      await expect(
        orderModel.repository.create(
          { org_id: orgA.id, unit_price: 100, qty: 2, subtotal: 999 },
          actorA,
        ),
      ).rejects.toThrow(/Cannot directly write computed field/);

      const o1 = (await orderModel.repository.create(
        { org_id: orgA.id, unit_price: 100, qty: 3 },
        actorA,
      )) as unknown as Record<string, unknown>;
      const o2 = (await orderModel.repository.create(
        { org_id: orgA.id, unit_price: 50, qty: 4 },
        actorA,
      )) as unknown as Record<string, unknown>;
      expect(o1.created_by_actor).toBe("actor-a");
      expect(o1.subtotal).toBe(300);
      expect(o1.tax).toBe(30);
      expect(o1.label).toBe("sub=300,tax=30");

      // many2one onDelete: "restrict"
      await expect(orgModel.repository.delete(orgA.id, actorA)).rejects.toThrow(
        /restrict|referenced/i,
      );

      // Stored computed SQL filter & recomputation on update
      const highSubtotal = await orderModel.repository.find(
        { subtotal: { $gte: 250 } },
        { tenantId: "tenant-a" },
      );
      expect(highSubtotal).toHaveLength(1);

      const updatedO1 = (await orderModel.repository.update(
        String(o1.id),
        { qty: 5 },
        actorA,
      )) as unknown as Record<string, unknown>;
      expect(updatedO1.subtotal).toBe(500);
      expect(updatedO1.tax).toBe(50);
      expect(updatedO1.label).toBe("sub=500,tax=50");

      // many2many attach/detach/replace + cross-tenant guard + query budget (3 queries max)
      const t1 = await tagModel.repository.create({ name: "priority" }, actorA);
      const t2 = await tagModel.repository.create({ name: "postgres" }, actorA);
      const tForeign = await tagModel.repository.create({ name: "foreign" }, actorB);

      await expect(
        orderModel.repository.attachRelation(String(o1.id), "tags", tForeign.id, actorA),
      ).rejects.toBeInstanceOf(PolicyError);

      expect(
        await orderModel.repository.attachRelation(String(o1.id), "tags", [t1.id, t2.id], actorA),
      ).toEqual({ attached: 2 });
      expect(
        await orderModel.repository.attachRelation(String(o2.id), "tags", [t1.id], actorA),
      ).toEqual({ attached: 1 });

      const hydrated = await withQueryBudget(3, () =>
        orderModel.repository.find({}, { tenantId: "tenant-a", with: ["tags"] }),
      );
      expect(hydrated).toHaveLength(2);
      const h1 = hydrated.find((r) => r.id === o1.id) as unknown as Record<string, unknown>;
      expect((h1.$tags as Array<{ name: string }>).map((t) => t.name).sort()).toEqual([
        "postgres",
        "priority",
      ]);

      await expect(
        withQueryBudget(1, () =>
          orderModel.repository.find({}, { tenantId: "tenant-a", with: ["tags"] }),
        ),
      ).rejects.toThrow(/Query budget exceeded/);

      expect(
        await orderModel.repository.replaceRelation(String(o1.id), "tags", [t2.id], actorA),
      ).toEqual({ attached: 0, detached: 1 });
      expect(
        await orderModel.repository.detachRelation(String(o1.id), "tags", [t2.id], actorA),
      ).toEqual({ detached: 1 });

      // beforeSave rollback vs afterSave hook isolation via recordHookError
      failBeforeSave = true;
      await expect(orderModel.repository.update(String(o1.id), { qty: 9 }, actorA)).rejects.toThrow(
        /beforeSave aborted/,
      );
      expect(
        (await orderModel.repository.findOne(String(o1.id), { tenantId: "tenant-a" }))?.qty,
      ).toBe(5);

      failBeforeSave = false;
      failAfterHook = true;
      const postAfterErr = await orderModel.repository.update(String(o1.id), { qty: 6 }, actorA);
      expect(postAfterErr?.qty).toBe(6);
      expect(modelRegistry.getHookErrors()).toHaveLength(1);
      expect(modelRegistry.getHookErrors()[0]).toMatchObject({
        model: orderModel.name,
        hook: "afterSave",
        error: "afterSave non-fatal",
      });
      failAfterHook = false;

      // Optimistic locking: repository ConflictError + Fastify HTTP 409
      await expect(
        orderModel.repository.update(String(o1.id), { qty: 7, version: 1 }, actorA),
      ).rejects.toBeInstanceOf(ConflictError);

      const runtime = new AddonRuntimeController();
      app = Fastify();
      await runtime.syncAll(
        [
          { manifest: { name: "__base", version: "1.0.0", autoInstall: true } },
          {
            manifest: {
              name: `sem_addon_${suffix}`,
              version: "1.0.0",
              depends: ["__base"],
              provides: { models: [orderModel.name] },
            },
            models: [orderModel],
            rules: [
              {
                rule_key: `sem.order.admin_${suffix}`,
                model_name: orderModel.name,
                role: "admin",
                can_read: true,
                can_create: true,
                can_update: true,
                can_delete: true,
              },
            ],
          },
        ],
        app,
      );
      await registerBaseAddon(app, {
        runtime,
        auth: createHeaderAuthBridge(),
        apiPrefix: "/api/v1",
      });
      await app.ready();

      const conflictRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/m/${orderModel.name}/${String(o1.id)}`,
        headers: { "x-role": "admin", "x-actor-id": "actor-a", "x-tenant-id": "tenant-a" },
        payload: { qty: 8, version: 1 },
      });
      expect(conflictRes.statusCode).toBe(409);
      expect(conflictRes.json().code).toBe("CONFLICT");

      // _orm_audit_log verification on PostgreSQL
      const auditRows = await getDb().all<{ action: string; changed_by: string | null }>(
        "SELECT action, changed_by FROM _orm_audit_log WHERE model = ? AND entity_id = ? ORDER BY changed_at ASC, id ASC",
        [orderModel.name, String(o1.id)],
      );
      expect(auditRows.map((r) => r.action)).toEqual(["CREATE", "UPDATE", "UPDATE"]);
    });

    it("3. enforces transactional rollback atomicity & OutboxDispatcher delivery/backoff/dead-letter/lease-recovery on PostgreSQL", async () => {
      const isolated = await createIsolatedPostgresDb(POSTGRES_CONFORMANCE_URL);
      cleanups.push(async () => {
        await closeDbAsync();
        await isolated.drop();
      });

      await initPostgresDb(isolated.dbUrl);
      await ensureOutboxSchema();
      const suffix = isolated.dbName.slice(-8);
      const actor = createActorContext("outbox-u", "api", "req-outbox", "tenant-a");

      const accountModel = defineModel({
        name: `outbox.account_${suffix}`,
        table: `outbox_accounts_${suffix}`,
        schema: z.object({
          username: z.string().min(1),
          api_token: z.string(),
          secret_pin: z.string().default("9999"),
        }),
        fieldPolicies: {
          secret_pin: { sensitive: true },
        },
        constrains: [
          ({ after }) => {
            if (after.username === "rollback-me") {
              throw new Error("constraint rollback");
            }
          },
        ],
      });
      await syncModels([accountModel]);

      // Failure injection: rollback leaves 0 audit and 0 outbox rows
      await expect(
        accountModel.repository.create({ username: "rollback-me", api_token: "tok-0" }, actor),
      ).rejects.toThrow(/constraint rollback/);

      const auditsAfterFail = await getDb().all("SELECT id FROM _orm_audit_log WHERE model = ?", [
        accountModel.name,
      ]);
      const outboxAfterFail = await getDb().all(
        "SELECT id FROM _orm_outbox_events WHERE model = ?",
        [accountModel.name],
      );
      expect(auditsAfterFail).toHaveLength(0);
      expect(outboxAfterFail).toHaveLength(0);

      // Committed write produces 1 sanitized outbox row
      const created = await accountModel.repository.create(
        { username: "committed-user", api_token: "secret-tok", secret_pin: "1234" },
        actor,
      );
      const outboxRows = await getDb().all<{
        id: string;
        action: string;
        status: string;
        payload_json: string;
      }>("SELECT id, action, status, payload_json FROM _orm_outbox_events WHERE model = ?", [
        accountModel.name,
      ]);
      expect(outboxRows).toHaveLength(1);
      expect(outboxRows[0]?.action).toBe("CREATE");
      expect(outboxRows[0]?.status).toBe("pending");
      const parsedPayload = JSON.parse(outboxRows[0]!.payload_json) as {
        record: Record<string, unknown>;
      };
      expect(parsedPayload.record.username).toBe("committed-user");
      expect(parsedPayload.record).not.toHaveProperty("api_token");
      expect(parsedPayload.record).not.toHaveProperty("secret_pin");

      // OutboxDispatcher: per-subscriber isolation, backoff retry, and delivery
      const t0 = new Date("2026-11-19T12:00:00.000Z");
      await getDb().run("UPDATE _orm_outbox_events SET next_attempt_at = ? WHERE id = ?", [
        t0.toISOString(),
        outboxRows[0]!.id,
      ]);

      const auditCalls: string[] = [];
      const webhookCalls: string[] = [];
      let failWebhook = true;

      const dispatcher = new OutboxDispatcher({
        workerId: "pg-w1",
        maxAttempts: 3,
        baseBackoffMs: 1_000,
        leaseTtlMs: 30_000,
      });
      dispatcher.subscribe({
        name: "audit",
        pattern: "*",
        handler: ({ event }) => {
          auditCalls.push(event.id);
        },
      });
      dispatcher.subscribe({
        name: "webhook",
        pattern: `outbox.account_${suffix}`,
        handler: ({ event }) => {
          webhookCalls.push(event.id);
          if (failWebhook) throw new Error("downstream 503");
        },
      });

      const b1 = await dispatcher.dispatchBatch({ now: t0 });
      expect(b1.delivered).toBe(1);
      expect(b1.retried).toBe(1);
      expect(auditCalls).toHaveLength(1);
      expect(webhookCalls).toHaveLength(1);

      const early = await dispatcher.dispatchBatch({ now: new Date(t0.getTime() + 500) });
      expect(early.processed).toBe(0);

      failWebhook = false;
      const b2 = await dispatcher.dispatchBatch({ now: new Date(t0.getTime() + 1_500) });
      expect(b2.delivered).toBe(1);
      expect(auditCalls).toHaveLength(1);
      expect(webhookCalls).toHaveLength(2);
      expect((await dispatcher.getEvent(outboxRows[0]!.id))?.status).toBe("delivered");

      // Dead-lettering after maxAttempts
      const failAcc = await accountModel.repository.create(
        { username: "dead-letter-user", api_token: "tok-dl" },
        actor,
      );
      const failEv = (await getDb().get<{ id: string }>(
        "SELECT id FROM _orm_outbox_events WHERE model = ? AND entity_id = ?",
        [accountModel.name, failAcc.id],
      ))!;
      await getDb().run("UPDATE _orm_outbox_events SET next_attempt_at = ? WHERE id = ?", [
        t0.toISOString(),
        failEv.id,
      ]);

      const deadDispatcher = new OutboxDispatcher({
        workerId: "pg-dead-w",
        maxAttempts: 2,
        baseBackoffMs: 1_000,
      });
      deadDispatcher.subscribe({
        name: "always-fail",
        pattern: `outbox.account_${suffix}`,
        handler: () => {
          throw new Error("permanent failure");
        },
      });
      expect((await deadDispatcher.dispatchBatch({ now: t0 })).retried).toBe(1);
      expect(
        (await deadDispatcher.dispatchBatch({ now: new Date(t0.getTime() + 2_000) })).deadLettered,
      ).toBe(1);
      expect((await deadDispatcher.getEvent(failEv.id))?.status).toBe("dead_letter");

      // Lease-expiry recovery & concurrent atomic claim
      const leaseAcc = await accountModel.repository.create(
        { username: "lease-user", api_token: "tok-lease" },
        actor,
      );
      const leaseEv = (await getDb().get<{ id: string }>(
        "SELECT id FROM _orm_outbox_events WHERE model = ? AND entity_id = ?",
        [accountModel.name, leaseAcc.id],
      ))!;
      const staleCreated = new Date(t0.getTime() - 120_000).toISOString();
      const staleExpires = new Date(t0.getTime() - 60_000).toISOString();
      await getDb().run(
        `INSERT INTO _orm_outbox_deliveries (
          event_id, subscriber, status, attempts, next_attempt_at,
          lease_owner, lease_expires_at, last_error, delivered_at, created_at, updated_at
        ) VALUES (?, ?, 'processing', 1, ?, 'crashed-worker', ?, NULL, NULL, ?, ?)`,
        [leaseEv.id, "pg-lease-sub", staleCreated, staleExpires, staleCreated, staleCreated],
      );

      const rec = await recoverExpiredOutboxLeases({ now: t0, leaseTtlMs: 30_000 });
      expect(rec.recoveredDeliveries).toBe(1);

      const claimedBy: string[] = [];
      const sub = {
        name: "pg-lease-sub",
        pattern: `outbox.account_${suffix}`,
        handler: async ({ event }: { event: { id: string } }) => {
          claimedBy.push(event.id);
        },
      };
      const [w1, w2] = await Promise.all([
        dispatchOutboxBatch([sub], { workerId: "pg-claim-1", now: t0 }),
        dispatchOutboxBatch([sub], { workerId: "pg-claim-2", now: t0 }),
      ]);
      expect(w1.delivered + w2.delivered).toBe(1);
      expect(claimedBy).toEqual([leaseEv.id]);
      void created;
    });

    it("4. enforces addon lifecycle on PostgreSQL: dependency ordering, SemVer validation, planUpgrade dry-run, pre-route migrations, seed failure persistence + 503, and reconcileAddon recovery", async () => {
      const isolated = await createIsolatedPostgresDb(POSTGRES_CONFORMANCE_URL);
      let app: FastifyInstance | null = null;
      cleanups.push(async () => {
        if (app) {
          await app.close();
          app = null;
        }
        await closeDbAsync();
        await isolated.drop();
      });

      await initPostgresDb(isolated.dbUrl);
      const suffix = isolated.dbName.slice(-8);

      // SemVer validation failure
      const badRuntime = new AddonRuntimeController();
      await expect(
        badRuntime.syncAll([
          { manifest: { name: "__base", version: "1.0.0", autoInstall: true } },
          {
            manifest: {
              name: "semver_broken",
              version: "1.0.0",
              depends: ["__base@^2.0.0"],
              autoInstall: true,
            },
          },
        ]),
      ).rejects.toThrow(AddonRegistryError);

      let failSeed = true;
      let coreSeeds = 0;

      const buildV1 = (): AddonDefinition[] => [
        { manifest: { name: "__base", version: "1.0.0", autoInstall: true } },
        {
          manifest: {
            name: `lc_core_${suffix}`,
            version: "1.0.0",
            depends: ["__base@^1.0.0"],
            autoInstall: true,
            provides: { migrations: [`lc_m1_${suffix}`] },
          },
          migrations: [
            {
              id: `lc_m1_${suffix}`,
              up: `CREATE TABLE IF NOT EXISTS lc_mig_${suffix} (id TEXT PRIMARY KEY, label TEXT NOT NULL)`,
            },
          ],
          registerRoutes: (scope) => {
            scope.get(`/lc-${suffix}/items`, async () => {
              const rows = await getDb().all<{ id: string; label: string }>(
                `SELECT id, label FROM lc_mig_${suffix}`,
              );
              return { rows };
            });
          },
          seed: async () => {
            coreSeeds += 1;
            if (failSeed) {
              throw new Error("seed failed token=secret-value");
            }
            await getDb().run(
              `INSERT INTO lc_mig_${suffix} (id, label) VALUES (?, ?) ON CONFLICT (id) DO NOTHING`,
              ["seed-1", "migrated-before-ready"],
            );
          },
        },
        {
          manifest: {
            name: `lc_dep_${suffix}`,
            version: "1.0.0",
            depends: [`lc_core_${suffix}@>=1.0.0 <2.0.0`],
            autoInstall: true,
          },
          registerRoutes: (scope) => {
            scope.get(`/lc-dep-${suffix}/ping`, async () => ({ ok: true }));
          },
        },
      ];

      const runtime = new AddonRuntimeController();

      // Dry-run planUpgrade before install leaves PostgreSQL untouched
      const initialPlan = await runtime.planUpgrade(buildV1());
      expect(initialPlan.order).toEqual(["__base", `lc_core_${suffix}`, `lc_dep_${suffix}`]);
      expect(initialPlan.installs).toEqual(["__base", `lc_core_${suffix}`, `lc_dep_${suffix}`]);
      const irAddonsCheck = await getDb().get<{ rel: string | null }>(
        "SELECT to_regclass('public.ir_addons') AS rel",
      );
      expect(irAddonsCheck?.rel).toBeNull();

      // Seed failure persists state="error", failed_phase="seed", blocks dependent, and fails closed with 503 ADDON_DISABLED
      app = Fastify();
      await expect(runtime.syncAll(buildV1(), app)).rejects.toThrow(/seed failed/);
      await app.ready();

      expect(coreSeeds).toBe(1);
      expect(runtime.getOrder()).toEqual(["__base", `lc_core_${suffix}`, `lc_dep_${suffix}`]);

      // Migration ran before seed & route readiness
      const migTableCheck = await getDb().get<{ rel: string | null }>(
        `SELECT to_regclass('public.lc_mig_${suffix}') AS rel`,
      );
      expect(migTableCheck?.rel).toBe(`lc_mig_${suffix}`);

      const coreErr = (await irAddonModel.repository.find({ name: `lc_core_${suffix}` }))[0];
      expect(coreErr?.state).toBe("error");
      expect(coreErr?.failed_phase).toBe("seed");
      expect(coreErr?.last_error).not.toContain("secret-value");

      const core503 = await app.inject({ url: `/lc-${suffix}/items` });
      expect(core503.statusCode).toBe(503);
      expect(core503.json().code).toBe("ADDON_DISABLED");

      const dep503 = await app.inject({ url: `/lc-dep-${suffix}/ping` });
      expect(dep503.statusCode).toBe(503);
      expect(dep503.json().code).toBe("ADDON_DISABLED");

      // Recover via reconcileAddon()
      failSeed = false;
      const recCore = await runtime.reconcileAddon(`lc_core_${suffix}`);
      expect(recCore.state).toBe("installed");
      expect(recCore.seeded).toBe(true);
      expect(coreSeeds).toBe(2);

      const recDep = await runtime.reconcileAddon(`lc_dep_${suffix}`);
      expect(recDep.state).toBe("installed");

      const core200 = await app.inject({ url: `/lc-${suffix}/items` });
      expect(core200.statusCode).toBe(200);
      expect(core200.json().rows).toEqual([{ id: "seed-1", label: "migrated-before-ready" }]);

      const dep200 = await app.inject({ url: `/lc-dep-${suffix}/ping` });
      expect(dep200.statusCode).toBe(200);

      // planUpgrade() dry-run on v1 -> v1.1 does not mutate PostgreSQL
      const v2 = buildV1();
      v2[1] = {
        ...v2[1]!,
        manifest: {
          ...v2[1]!.manifest,
          version: "1.1.0",
          provides: { migrations: [`lc_m1_${suffix}`, `lc_m2_${suffix}`] },
        },
        migrations: [
          ...v2[1]!.migrations!,
          {
            id: `lc_m2_${suffix}`,
            up: `CREATE TABLE IF NOT EXISTS lc_mig_v2_${suffix} (id TEXT PRIMARY KEY)`,
          },
        ],
      };
      const upgradePlan = await runtime.planUpgrade(v2);
      expect(upgradePlan.upgrades).toEqual([`lc_core_${suffix}`]);
      expect(upgradePlan.affectedDependents[`lc_core_${suffix}`]).toEqual([`lc_dep_${suffix}`]);

      const v2TableCheck = await getDb().get<{ rel: string | null }>(
        `SELECT to_regclass('public.lc_mig_v2_${suffix}') AS rel`,
      );
      expect(v2TableCheck?.rel).toBeNull();
    });
  },
);
