import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import {
  ConflictError,
  PolicyError,
  ValidationError,
  assertSafeIdentifier,
  closeDb,
  compileTupleDomainToFilter,
  createActorContext,
  createD1DatabaseFromOrm,
  defineModel,
  extendModel,
  getDb,
  initDb,
  modelRegistry,
  normalizeTenantId,
  onModelWrite,
  syncModels,
  verifyIntegrity,
  withQueryBudget,
} from "./index";

function createTempDbPath(prefix = "mw-orm-test-"): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return { dir, path: join(dir, "test.sqlite") };
}

test("enforces SQLite WAL, foreign_keys, busy_timeout pragmas and D1 bridge", async () => {
  const { dir, path } = createTempDbPath();
  try {
    await initDb(path);
    const db = getDb();

    const journal = await db.get<{ journal_mode: string }>("PRAGMA journal_mode");
    assert.equal(journal?.journal_mode?.toLowerCase(), "wal");

    const fk = await db.get<{ foreign_keys: number }>("PRAGMA foreign_keys");
    assert.equal(Number(fk?.foreign_keys), 1);

    const timeout = await db.get<{ timeout: number }>("PRAGMA busy_timeout");
    assert.ok(Number(timeout?.timeout) >= 5000);

    const integrity = await verifyIntegrity();
    assert.equal(integrity.ok, true);
    assert.deepEqual(integrity.errors, []);

    const d1 = createD1DatabaseFromOrm(db);
    await db.exec("CREATE TABLE d1_bridge_check (id TEXT PRIMARY KEY, name TEXT NOT NULL)");
    await d1.prepare("INSERT INTO d1_bridge_check (id, name) VALUES (?, ?)").bind("c1", "Sanctuary").run();
    const fetched = await d1
      .prepare("SELECT id, name FROM d1_bridge_check WHERE id = ?")
      .bind("c1")
      .first<{ id: string; name: string }>();
    assert.deepEqual(fetched, { id: "c1", name: "Sanctuary" });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("blocks unsafe SQL identifiers and invalid tenant IDs", () => {
  assert.equal(assertSafeIdentifier("valid_col_1"), "valid_col_1");
  assert.throws(() => assertSafeIdentifier("id; DROP TABLE users;--"), PolicyError);
  assert.equal(normalizeTenantId("Tenant-Alpha_01"), "tenant-alpha_01");
  assert.throws(() => normalizeTenantId("bad tenant; --"), PolicyError);
});

test("supports zero-migration syncModels, extendModel, multi-tenant isolation, optimistic locking, audit & outbox", async () => {
  const { dir, path } = createTempDbPath();
  try {
    await initDb(path);

    const taskModel = defineModel({
      name: "test.audit_task",
      table: "test_audit_tasks",
      schema: z.object({
        title: z.string().min(1),
        stage: z.enum(["todo", "doing", "done"]).default("todo"),
        secret_note: z.string().default("top-secret"),
      }),
      indexes: [{ fields: ["stage"] }],
      fieldPolicies: {
        secret_note: {
          sensitive: true,
          readRoles: ["admin"],
          writeRoles: ["admin"],
        },
      },
    });

    const firstSync = await syncModels([taskModel]);
    assert.deepEqual(firstSync.createdTables, ["test_audit_tasks"]);

    const secondSync = await syncModels([taskModel]);
    assert.deepEqual(secondSync.createdTables, []);
    assert.deepEqual(secondSync.addedColumns, []);

    extendModel("test.audit_task", {
      addon: "ext-test",
      fields: z.object({ x_region: z.string().default("ap-southeast") }),
    });
    const thirdSync = await syncModels([taskModel]);
    assert.deepEqual(thirdSync.addedColumns, [{ table: "test_audit_tasks", column: "x_region" }]);

    const adminAlpha = createActorContext("admin-1", "api", "req-1", "tenant-alpha", { role: "admin" });
    const viewerAlpha = createActorContext("viewer-1", "api", "req-2", "tenant-alpha", { role: "viewer" });
    const adminBeta = createActorContext("admin-2", "api", "req-3", "tenant-beta", { role: "admin" });

    const writeEvents: string[] = [];
    const unsub = onModelWrite("test.audit_task", (ev) => writeEvents.push(`${ev.action}:${ev.version}`));

    try {
      // Viewer blocked from writing admin-only field
      await assert.rejects(
        () => taskModel.repository.create({ title: "Blocked", secret_note: "forged" }, viewerAlpha),
        (err: unknown) => err instanceof PolicyError && err.code === "FIELD_WRITE_FORBIDDEN",
      );

      const created = await taskModel.repository.create(
        { title: "Harden ORM", stage: "todo", secret_note: "classified-token" },
        adminAlpha,
      );
      assert.equal(created.version, 1);
      assert.equal(created.tenant_id, "tenant-alpha");

      // Tenant B cannot see Tenant A's record
      assert.equal(await taskModel.repository.count({}, { tenantId: "tenant-beta" }), 0);
      assert.equal(await taskModel.repository.findOne(created.id, { actor: adminBeta }), null);

      // Viewer read strips restricted secret_note & blocks filtering by secret_note
      const viewerView = await taskModel.repository.findOne(created.id, { actor: viewerAlpha });
      assert.equal(viewerView?.title, "Harden ORM");
      assert.equal((viewerView as Record<string, unknown>)?.secret_note, undefined);

      await assert.rejects(
        () => taskModel.repository.find({ secret_note: "classified-token" }, { actor: viewerAlpha }),
        (err: unknown) => err instanceof PolicyError && err.code === "FIELD_READ_FORBIDDEN",
      );

      // Optimistic locking: valid version succeeds, stale version throws ConflictError (409)
      const updated = await taskModel.repository.update(
        created.id,
        { stage: "doing", version: 1 },
        adminAlpha,
      );
      assert.equal(updated?.version, 2);
      assert.equal(updated?.stage, "doing");

      await assert.rejects(
        () => taskModel.repository.update(created.id, { stage: "done", version: 1 }, adminAlpha),
        (err: unknown) => err instanceof ConflictError && err.statusCode === 409,
      );

      // Audit log redacts sensitive fields and records outbox events
      const history = await taskModel.repository.history(created.id);
      assert.equal(history.length, 2);
      assert.equal(history[0]?.action, "CREATE");
      assert.equal(JSON.parse(history[0]!.diff).secret_note, "[REDACTED]");
      assert.equal(history[1]?.action, "UPDATE");

      const outbox = await getDb().all<{ action: string; status: string }>(
        "SELECT action, status FROM _orm_outbox_events WHERE model = 'test.audit_task' ORDER BY created_at ASC",
      );
      assert.equal(outbox.length, 2);
      assert.equal(outbox[0]?.status, "pending");

      // Archive, restore, and soft-delete
      const archived = await taskModel.repository.archive(created.id, adminAlpha);
      assert.equal(archived?.status, "archived");
      const restored = await taskModel.repository.restore(created.id, adminAlpha);
      assert.equal(restored?.status, "active");
      const deleted = await taskModel.repository.delete(created.id, adminAlpha);
      assert.equal(deleted?.status, "deleted");
      assert.equal(await taskModel.repository.count({}, { tenantId: "tenant-alpha" }), 0);

      assert.deepEqual(writeEvents, ["CREATE:1", "UPDATE:2", "DELETE:5"]);
    } finally {
      unsub();
    }
  } finally {
    modelRegistry.clearCustomFieldsForTests();
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("enforces computed DAG, constrains, relations (onDelete restrict + many2many), query budget, hooks & tuple domains", async () => {
  const { dir, path } = createTempDbPath();
  try {
    await initDb(path);

    let failBeforeSave = false;
    let failAfterSave = false;

    const orgModel = defineModel({
      name: "test.sem_org",
      table: "test_sem_orgs",
      schema: z.object({ name: z.string().min(1) }),
    });

    const tagModel = defineModel({
      name: "test.sem_tag",
      table: "test_sem_tags",
      schema: z.object({ name: z.string().min(1) }),
    });

    const orderModel = defineModel({
      name: "test.sem_order",
      table: "test_sem_orders",
      schema: z.object({
        org_id: z.string(),
        unit_price: z.number().int(),
        qty: z.number().int(),
      }),
      relations: {
        org_id: { model: orgModel.name, targetField: "id", onDelete: "restrict" },
        tags: {
          model: tagModel.name,
          type: "many2many",
          through: "test_sem_order_tags",
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
          if (Number(after.qty) <= 0) throw new Error("qty must be positive");
        },
      ],
      hooks: {
        beforeSave: () => {
          if (failBeforeSave) throw new Error("beforeSave aborted");
        },
        afterSave: () => {
          if (failAfterSave) throw new Error("afterSave non-fatal");
        },
      },
    });

    await syncModels([orgModel, tagModel, orderModel]);

    const actorA = createActorContext("u-a", "api", "r-a", "tenant-a");
    const actorB = createActorContext("u-b", "api", "r-b", "tenant-b");

    const orgA = await orgModel.repository.create({ name: "Org A" }, actorA);
    const orgB = await orgModel.repository.create({ name: "Org B" }, actorB);

    // Constrain & cross-tenant relation check
    await assert.rejects(
      () => orderModel.repository.create({ org_id: orgA.id, unit_price: 100, qty: 0 }, actorA),
      /qty must be positive/,
    );
    await assert.rejects(
      () => orderModel.repository.create({ org_id: orgB.id, unit_price: 100, qty: 2 }, actorA),
      PolicyError,
    );
    await assert.rejects(
      () => orderModel.repository.create({ org_id: orgA.id, unit_price: 100, qty: 2, subtotal: 999 }, actorA),
      ValidationError,
    );

    const o1 = (await orderModel.repository.create(
      { org_id: orgA.id, unit_price: 100, qty: 3 },
      actorA,
    )) as unknown as Record<string, unknown>;
    assert.equal(o1.subtotal, 300);
    assert.equal(o1.tax, 30);
    assert.equal(o1.label, "sub=300,tax=30");

    // onDelete: restrict blocks deleting referenced org
    await assert.rejects(() => orgModel.repository.delete(orgA.id, actorA), PolicyError);

    // Tuple domain compiler + stored computed SQL filter
    const compiledDomain = compileTupleDomainToFilter([["subtotal", ">=", 250]]);
    const matched = await orderModel.repository.find(compiledDomain, { tenantId: "tenant-a" });
    assert.equal(matched.length, 1);

    // many2many attach + query budget (batched hydration uses <= 3 queries, 1 fails)
    const t1 = await tagModel.repository.create({ name: "priority" }, actorA);
    const t2 = await tagModel.repository.create({ name: "sqlite" }, actorA);
    const tForeign = await tagModel.repository.create({ name: "foreign" }, actorB);

    await assert.rejects(
      () => orderModel.repository.attachRelation(String(o1.id), "tags", tForeign.id, actorA),
      PolicyError,
    );
    assert.deepEqual(
      await orderModel.repository.attachRelation(String(o1.id), "tags", [t1.id, t2.id], actorA),
      { attached: 2 },
    );

    const hydrated = await withQueryBudget(3, () =>
      orderModel.repository.find({}, { tenantId: "tenant-a", with: ["tags", "org_id"] }),
    );
    assert.equal(hydrated.length, 1);
    const first = hydrated[0] as unknown as Record<string, unknown>;
    assert.deepEqual(
      (first.$tags as Array<{ name: string }>).map((t) => t.name).sort(),
      ["priority", "sqlite"],
    );
    assert.equal((first.$org_id as { name: string }).name, "Org A");

    await assert.rejects(
      () =>
        withQueryBudget(1, () =>
          orderModel.repository.find({}, { tenantId: "tenant-a", with: ["tags"] }),
        ),
      /Query budget exceeded/,
    );

    // Hook transactional rollback vs afterSave isolation
    failBeforeSave = true;
    await assert.rejects(
      () => orderModel.repository.update(String(o1.id), { qty: 9 }, actorA),
      /beforeSave aborted/,
    );
    assert.equal(
      (await orderModel.repository.findOne(String(o1.id), { tenantId: "tenant-a" }))?.qty,
      3,
    );

    failBeforeSave = false;
    failAfterSave = true;
    const postAfter = await orderModel.repository.update(String(o1.id), { qty: 5 }, actorA);
    assert.equal(postAfter?.qty, 5);
    assert.equal(modelRegistry.getHookErrors().length, 1);
    assert.equal(modelRegistry.getHookErrors()[0]?.hook, "afterSave");

    // readGroup
    const groups = await orderModel.repository.readGroup("qty", {}, { tenantId: "tenant-a" });
    assert.deepEqual(groups, [{ qty: 5, count: 1 }]);
  } finally {
    modelRegistry.clearHookErrors();
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});
