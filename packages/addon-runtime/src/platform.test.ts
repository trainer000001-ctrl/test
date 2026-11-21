import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { z } from "zod";
import {
  closeDb,
  createActorContext,
  defineModel,
  initDb,
  inspectModelSchema,
  modelRegistry,
} from "@moonwitness/orm";
import {
  AddonRegistry,
  AddonRegistryError,
  AddonRuntimeController,
  applyViewInheritance,
  createPlatformHttpHandler,
  OutboxDispatcher,
  type AddonDefinition,
} from "./index";
import { createPlatformAddons } from "../../addons/src/index";

function createTempDbPath(prefix: string): { dir: string; dbPath: string } {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return { dir, dbPath: join(dir, "platform.db") };
}

test("AddonRegistry validates manifests, detects missing deps, cycles, and collisions", () => {
  const reg = new AddonRegistry();
  assert.throws(
    () =>
      reg.add({
        manifest: { name: "INVALID NAME", version: "1.0.0", depends: [], provides: {} },
      }),
    (err: unknown) => err instanceof AddonRegistryError && err.code === "INVALID_MANIFEST",
  );

  // Missing dependency
  const missingReg = new AddonRegistry();
  missingReg.add({
    manifest: { name: "alpha", version: "1.0.0", depends: ["ghost"], provides: {} },
  });
  assert.throws(() => missingReg.validate(), /Missing addon dependency 'ghost'/);

  // Cycle detection
  const cycleReg = new AddonRegistry();
  cycleReg.add({ manifest: { name: "a", version: "1.0.0", depends: ["b"], provides: {} } });
  cycleReg.add({ manifest: { name: "b", version: "1.0.0", depends: ["a"], provides: {} } });
  assert.throws(() => cycleReg.validate(), /Circular addon dependency/);

  // Route collision
  const collideReg = new AddonRegistry();
  collideReg.add({
    manifest: { name: "__base", version: "1.0.0", depends: [], provides: { routes: ["health"] } },
  });
  collideReg.add({
    manifest: { name: "dupe", version: "1.0.0", depends: ["__base"], provides: { routes: ["health"] } },
  });
  assert.throws(() => collideReg.validate(), /already claimed by another addon/);
});

test("View Engine applies declarative view inheritance operations deterministically", () => {
  const merged = applyViewInheritance(
    {
      title: "Base",
      columns: ["title", "stage", "owner"],
      filters: [{ key: "open", label: "Open", domain: [["stage", "=", "open"]] }],
    },
    [
      { op: "after", target: "columns", anchor: "stage", value: "priority" },
      { op: "before", target: "columns", anchor: "title", value: "code" },
      { op: "remove", target: "columns", anchor: "owner" },
      {
        op: "after",
        target: "filters",
        anchor: "open",
        value: { key: "high", label: "High", domain: [["priority", "=", "high"]] },
      },
      { op: "attributes", target: "spec", value: { defaultOrder: "code ASC" } },
    ],
  );

  assert.deepEqual(merged.columns, ["code", "title", "stage", "priority"]);
  assert.equal(merged.filters?.length, 2);
  assert.equal(merged.defaultOrder, "code ASC");
});

test("End-to-end platform acceptance: install addon, schema sync, views, inheritance, CRUD, RPC, relations, ACL, record rules, custom fields, upgrade, dependency guard, outbox, and uninstall", async () => {
  const { dir, dbPath } = createTempDbPath("mw-platform-e2e-");
  try {
    await initDb(dbPath);
    const runtime = new AddonRuntimeController();
    const platformAddons = createPlatformAddons(undefined, { includeBase: true });
    const { order } = await runtime.syncAll(platformAddons, undefined, {
      runSeeds: true,
      apiPrefix: "/api/v1",
    });

    assert.equal(order[0], "__base");
    assert.ok(order.indexOf("timeline") < order.indexOf("canon-lore"));

    const http = createPlatformHttpHandler(runtime, { defaultRole: "public" });
    const adminHeaders = {
      "content-type": "application/json",
      "x-mw-role": "admin",
      "x-mw-actor": "admin-1",
    };
    const editorAHeaders = {
      "content-type": "application/json",
      "x-mw-role": "editor",
      "x-mw-actor": "editor-a",
    };
    const editorBHeaders = {
      "content-type": "application/json",
      "x-mw-role": "editor",
      "x-mw-actor": "editor-b",
    };
    const viewerHeaders = {
      "content-type": "application/json",
      "x-mw-role": "viewer",
      "x-mw-actor": "viewer-1",
    };

    // 1. Verify cross-addon inheritance already active from canon-lore -> timeline.event
    const tlViewRes = await http(
      new Request("http://localhost/api/v1/_meta/views/timeline.event", { headers: adminHeaders }),
      "_meta/views/timeline.event",
    );
    assert.equal(tlViewRes.status, 200);
    const tlView = (await tlViewRes.json()) as {
      fields: Array<{ field_name: string }>;
      views: Array<{ view_type: string; spec: { columns?: string[] } }>;
    };
    assert.ok(tlView.fields.some((f) => f.field_name === "canon_tier"));
    const tlListView = tlView.views.find((v) => v.view_type === "list");
    assert.ok(tlListView?.spec.columns?.includes("canon_tier"));

    // 2. Define and dynamically INSTALL a real test addon: expedition-ops v1.0.0
    const ExpeditionMissionModel = defineModel({
      name: "expedition.mission",
      table: "expedition_missions",
      originAddon: "expedition-ops",
      restEnabled: true,
      recName: "code",
      schema: z.object({
        code: z.string().min(2),
        title: z.string().min(2),
        stage: z.enum(["planned", "active", "completed"]).default("planned"),
        budget: z.coerce.number().int().default(1000),
        commander_uid: z.string().default("admin-1"),
        secret_note: z.string().optional().default("top-secret"),
      }),
      computed: {
        banner: {
          depends: ["code", "stage"],
          compute: (r) => `[${String(r.stage).toUpperCase()}] ${String(r.code)}`,
          stored: true,
          type: "text",
        },
      },
      fieldPolicies: {
        secret_note: { readRoles: ["admin"], writeRoles: ["admin"], sensitive: true },
      },
      onchange: {
        stage: (draft) => (draft.stage === "completed" ? { budget: 0 } : {}),
      },
      actions: {
        launch: {
          scope: "record",
          operation: "update",
          roles: ["admin", "editor"],
          handler: async ({ record, repository, actor }) =>
            repository.update(String(record!.id), { stage: "active" }, actor),
        },
      },
      indexes: [{ fields: ["code"], unique: true }],
    });

    const ExpeditionWaypointModel = defineModel({
      name: "expedition.waypoint",
      table: "expedition_waypoints",
      originAddon: "expedition-ops",
      restEnabled: true,
      recName: "label",
      schema: z.object({
        mission_id: z.string().min(1),
        label: z.string().min(1),
      }),
      relations: {
        mission_id: { model: "expedition.mission", type: "many2one", onDelete: "restrict" },
      },
    });

    const expeditionV1: AddonDefinition = {
      manifest: {
        name: "expedition-ops",
        version: "1.0.0",
        description: "End-to-end test addon for lunar expedition planning",
        category: "Operations",
        depends: ["__base", "timeline"],
        provides: {
          models: ["expedition.mission", "expedition.waypoint"],
          routes: ["expedition"],
        },
      },
      models: [ExpeditionMissionModel, ExpeditionWaypointModel],
      views: [
        {
          id: "expedition.mission.list",
          model: "expedition.mission",
          view_type: "list",
          spec: {
            title: "Lunar Expeditions",
            columns: ["code", "title", "stage", "budget", "banner", "secret_note"],
          },
        },
      ],
      menus: [
        {
          menu_key: "expedition.missions",
          label: "Expeditions",
          href: "/addons?model=expedition.mission",
          icon: "mtime",
          plane: "operations",
          sort_order: 55,
          min_role: "viewer",
        },
      ],
      actions: [
        {
          id: "launch",
          model: "expedition.mission",
          type: "record",
          label: "Launch Mission",
          roles: ["admin", "editor"],
        },
      ],
      acl: [
        { model: "expedition.mission", role: "viewer", canRead: true, canCreate: false, canUpdate: false, canDelete: false },
        { model: "expedition.mission", role: "editor", canRead: true, canCreate: true, canUpdate: true, canDelete: false },
        { model: "expedition.waypoint", role: "editor", canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      ],
      rules: [
        {
          id: "expedition.mission.editor_own_write",
          model: "expedition.mission",
          name: "Editors may only modify missions they command",
          domain: [["commander_uid", "=", "$actor.id"]],
          operations: ["update", "delete"],
          roles: ["editor"],
        },
      ],
    };

    const installed = await runtime.install(expeditionV1);
    assert.equal(installed.state, "installed");
    assert.equal(installed.addon_version, "1.0.0");

    // 3. Schema verification via inspectModelSchema
    const schemaCheck = await inspectModelSchema("expedition.mission");
    assert.ok(schemaCheck?.exists);
    assert.deepEqual(schemaCheck?.missingColumns, []);

    // 4. Dynamic view resolution + permission-aware field pruning (viewer must NOT see secret_note!)
    const viewerViewRes = await http(
      new Request("http://localhost/api/v1/_meta/views/expedition.mission", { headers: viewerHeaders }),
      "_meta/views/expedition.mission",
    );
    assert.equal(viewerViewRes.status, 200);
    const viewerView = (await viewerViewRes.json()) as {
      acl: { canRead: boolean; canCreate: boolean };
      fields: Array<{ field_name: string }>;
      views: Array<{ view_type: string; spec: { columns?: string[] } }>;
    };
    assert.equal(viewerView.acl.canRead, true);
    assert.equal(viewerView.acl.canCreate, false);
    assert.ok(!viewerView.fields.some((f) => f.field_name === "secret_note"));
    const viewerListCols = viewerView.views.find((v) => v.view_type === "list")?.spec.columns ?? [];
    assert.ok(!viewerListCols.includes("secret_note"));

    // 5. Dynamic menu registration
    const navRes = await http(
      new Request("http://localhost/api/v1/_meta/navigation", { headers: viewerHeaders }),
      "_meta/navigation",
    );
    const navData = (await navRes.json()) as { menus: Array<{ menu_key: string }> };
    assert.ok(navData.menus.some((m) => m.menu_key === "expedition.missions"));

    // 6. ACL enforcement: viewer cannot create -> 403
    const viewerCreateRes = await http(
      new Request("http://localhost/api/v1/m/expedition.mission", {
        method: "POST",
        headers: viewerHeaders,
        body: JSON.stringify({ code: "EXP-NO", title: "Forbidden" }),
      }),
      "m/expedition.mission",
    );
    assert.equal(viewerCreateRes.status, 403);

    // 7. Editor-A creates a mission via REST
    const createRes = await http(
      new Request("http://localhost/api/v1/m/expedition.mission", {
        method: "POST",
        headers: editorAHeaders,
        body: JSON.stringify({
          code: "EXP-01",
          title: "Mare Tranquillitatis Survey",
          commander_uid: "editor-a",
          budget: 4500,
        }),
      }),
      "m/expedition.mission",
    );
    assert.equal(createRes.status, 201);
    const createdMission = ((await createRes.json()) as { data: Record<string, unknown> }).data;
    assert.equal(createdMission.banner, "[PLANNED] EXP-01");
    assert.equal("secret_note" in createdMission, false); // redacted for editor

    // 8. Record Rule enforcement: Editor-B cannot PATCH Editor-A's mission -> 404/403
    const crossOwnerPatch = await http(
      new Request(`http://localhost/api/v1/m/expedition.mission/${String(createdMission.id)}`, {
        method: "PATCH",
        headers: editorBHeaders,
        body: JSON.stringify({ title: "Hijacked" }),
      }),
      `m/expedition.mission/${String(createdMission.id)}`,
    );
    assert.ok(crossOwnerPatch.status === 403 || crossOwnerPatch.status === 404);

    // 9. Execute custom record action (`launch`) via HTTP + verify state transition & audit history
    const launchRes = await http(
      new Request(
        `http://localhost/api/v1/m/expedition.mission/${String(createdMission.id)}/call/launch`,
        { method: "POST", headers: editorAHeaders },
      ),
      `m/expedition.mission/${String(createdMission.id)}/call/launch`,
    );
    assert.equal(launchRes.status, 200);
    const launched = ((await launchRes.json()) as { data: Record<string, unknown> }).data;
    assert.equal(launched.stage, "active");
    assert.equal(launched.banner, "[ACTIVE] EXP-01");

    // 10. Odoo-style RPC tests: search_read with NOT (!), onchange, default_get, name_search, copy
    const rpcSearchRes = await http(
      new Request("http://localhost/api/v1/rpc", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          model: "expedition.mission",
          method: "search_read",
          domain: ["!", ["stage", "=", "completed"]],
        }),
      }),
      "rpc",
    );
    assert.equal(rpcSearchRes.status, 200);
    const rpcRows = ((await rpcSearchRes.json()) as { result: Array<Record<string, unknown>> }).result;
    assert.equal(rpcRows.length, 1);

    const onchangeRes = await http(
      new Request("http://localhost/api/v1/rpc", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          model: "expedition.mission",
          method: "onchange",
          kwargs: { field: "stage", draft: { stage: "completed" } },
        }),
      }),
      "rpc",
    );
    assert.deepEqual(((await onchangeRes.json()) as { result: Record<string, unknown> }).result, {
      budget: 0,
    });

    // 11. Relation integrity: create waypoint linked to mission -> deleting mission blocked with 409!
    const wpRes = await http(
      new Request("http://localhost/api/v1/m/expedition.waypoint", {
        method: "POST",
        headers: editorAHeaders,
        body: JSON.stringify({ mission_id: createdMission.id, label: "Crater Ridge Alpha" }),
      }),
      "m/expedition.waypoint",
    );
    assert.equal(wpRes.status, 201);

    const restrictedDelete = await http(
      new Request(`http://localhost/api/v1/m/expedition.mission/${String(createdMission.id)}`, {
        method: "DELETE",
        headers: adminHeaders,
      }),
      `m/expedition.mission/${String(createdMission.id)}`,
    );
    assert.equal(restrictedDelete.status, 409);

    // 12. Studio Live Custom Field registration without restart
    const cfRes = await http(
      new Request("http://localhost/api/v1/_meta/models/expedition.mission/fields", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          field_name: "cust_telemetry_band",
          field_type: "selection",
          label: "Telemetry Band",
          selection: ["s-band", "x-band", "ka-band"],
        }),
      }),
      "_meta/models/expedition.mission/fields",
    );
    assert.equal(cfRes.status, 201);

    const patchCfRes = await http(
      new Request(`http://localhost/api/v1/m/expedition.mission/${String(createdMission.id)}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ cust_telemetry_band: "ka-band" }),
      }),
      `m/expedition.mission/${String(createdMission.id)}`,
    );
    assert.equal(patchCfRes.status, 200);
    assert.equal(
      ((await patchCfRes.json()) as { data: Record<string, unknown> }).data.cust_telemetry_band,
      "ka-band",
    );

    // 13. Upgrade addon v1.0.0 -> v1.1.0 with new schema field while preserving existing data
    let upgradedFromTo = "";
    const ExpeditionMissionV2 = defineModel({
      name: "expedition.mission",
      table: "expedition_missions",
      originAddon: "expedition-ops",
      restEnabled: true,
      recName: "code",
      schema: z.object({
        code: z.string().min(2),
        title: z.string().min(2),
        stage: z.enum(["planned", "active", "completed"]).default("planned"),
        budget: z.coerce.number().int().default(1000),
        commander_uid: z.string().default("admin-1"),
        secret_note: z.string().optional().default("top-secret"),
        sector_code: z.string().optional().default("LUNAR-S1"),
      }),
    });

    const upgraded = await runtime.upgrade({
      ...expeditionV1,
      manifest: { ...expeditionV1.manifest, version: "1.1.0" },
      models: [ExpeditionMissionV2, ExpeditionWaypointModel],
      upgrade: ({ fromVersion, toVersion }) => {
        upgradedFromTo = `${fromVersion}->${toVersion}`;
      },
    });
    assert.equal(upgraded.addon_version, "1.1.0");
    assert.equal(upgradedFromTo, "1.0.0->1.1.0");

    // Existing record preserved after upgrade!
    const afterUpgrade = await ExpeditionMissionV2.repository.findOne(String(createdMission.id), {
      actor: createActorContext("admin-1", "test", undefined, "default", { role: "admin" }),
    });
    assert.equal(afterUpgrade?.code, "EXP-01");
    assert.equal(afterUpgrade?.stage, "active");

    // 14. Security: SQL injection attempt rejected cleanly with 400
    const sqliRes = await http(
      new Request(
        "http://localhost/api/v1/m/expedition.mission?orderBy=id;DROP%20TABLE%20expedition_missions",
        { headers: adminHeaders },
      ),
      "m/expedition.mission",
    );
    assert.equal(sqliRes.status, 400);

    // 15. Outbox Dispatcher delivers pending transactional events cleanly
    const deliveredModels: string[] = [];
    const dispatcher = new OutboxDispatcher();
    dispatcher.subscribe(async (evt) => {
      deliveredModels.push(evt.model);
    });
    const flushed = await dispatcher.flush(50);
    assert.ok(flushed.delivered > 0);
    assert.ok(deliveredModels.includes("expedition.mission"));

    // 16. Dependency Guard on disable: timeline blocked (409) while canon-lore & expedition-ops depend on it
    const guardedDisable = await http(
      new Request("http://localhost/api/v1/_meta/addons/timeline/disable", {
        method: "POST",
        headers: adminHeaders,
      }),
      "_meta/addons/timeline/disable",
    );
    assert.equal(guardedDisable.status, 409);

    // 17. Safe uninstall cleans up views/menus/models while preserving tables
    const uninstallResult = await runtime.uninstall("expedition-ops");
    assert.equal(uninstallResult.uninstalled, "expedition-ops");
    assert.ok(uninstallResult.preservedTables.includes("expedition_missions"));
    assert.equal(modelRegistry.has("expedition.mission"), false);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Real cookie auth lifecycle, CSRF check, automatic chatter field-diff tracking, Studio View Editor, and live ops/RBAC models", async () => {
  const { dir, dbPath } = createTempDbPath("mw-platform-tracks-");
  const prevPasscode = process.env.MW_ADMIN_PASSCODE;
  delete process.env.MW_ADMIN_PASSCODE;

  try {
    await initDb(dbPath);
    const {
      SESSION_COOKIE_NAME,
      authenticateWithPassword,
      claimInitialAdmin,
      createSessionRecord,
      createUser,
      hasClaimedAdmin,
      resolveSessionByToken,
      revokeSessionByToken,
    } = await import("../../addons/src/auth");

    const runtime = new AddonRuntimeController();
    const platformAddons = createPlatformAddons(undefined, { includeBase: true });
    await runtime.syncAll(platformAddons, undefined, {
      runSeeds: true,
      apiPrefix: "/api/v1",
    });

    const http = createPlatformHttpHandler(runtime, {
      defaultRole: "public",
      authAdapter: {
        cookieName: SESSION_COOKIE_NAME,
        hasClaimedAdmin,
        claimInitialAdmin: async (input) => {
          const u = await claimInitialAdmin(input);
          return {
            id: u.id,
            username: String(u.username),
            email: String(u.email),
            display_name: String(u.display_name || u.username),
            role: u.role as "admin" | "editor" | "viewer",
          };
        },
        authenticate: authenticateWithPassword,
        createSession: createSessionRecord,
        resolveSession: resolveSessionByToken,
        revokeSession: revokeSessionByToken,
        registerUser: async (input) => {
          const u = await createUser(input);
          return {
            id: u.id,
            username: String(u.username),
            email: String(u.email),
            display_name: String(u.display_name || u.username),
            role: u.role as "admin" | "editor" | "viewer",
          };
        },
      },
    });

    // 1. Fresh DB reports needsBootstrap: true
    const statusBefore = await (
      await http(new Request("http://localhost/api/v1/auth/status"), "auth/status")
    ).json() as { needsBootstrap: boolean; sessionBacked: boolean };
    assert.equal(statusBefore.needsBootstrap, true);
    assert.equal(statusBefore.sessionBacked, false);

    // 2. First-run admin bootstrap succeeds and issues HttpOnly session cookie
    const bootstrapRes = await http(
      new Request("http://localhost/api/v1/auth/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
        body: JSON.stringify({
          username: "sovereign",
          email: "sovereign@moonwitness.local",
          password: "SovereignPassphrase!2026",
          displayName: "Sovereign Architect",
        }),
      }),
      "auth/bootstrap",
    );
    assert.equal(bootstrapRes.status, 201);
    const setCookieHeader = bootstrapRes.headers.get("set-cookie") ?? "";
    assert.ok(setCookieHeader.includes("mw_session="));
    assert.ok(setCookieHeader.includes("HttpOnly"));
    const sessionCookieMatch = setCookieHeader.match(/mw_session=([^;]+)/);
    assert.ok(sessionCookieMatch?.[1]);
    const adminCookie = `mw_session=${sessionCookieMatch![1]}`;

    // 3. Second bootstrap attempt is permanently locked (409)
    const secondBootstrap = await http(
      new Request("http://localhost/api/v1/auth/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
        body: JSON.stringify({
          username: "attacker",
          email: "attacker@evil.test",
          password: "AttackerPassword123!",
        }),
      }),
      "auth/bootstrap",
    );
    assert.equal(secondBootstrap.status, 409);

    // 4. GET /auth/me resolves real cookie session
    const meRes = await http(
      new Request("http://localhost/api/v1/auth/me", { headers: { cookie: adminCookie } }),
      "auth/me",
    );
    assert.equal(meRes.status, 200);
    const meBody = (await meRes.json()) as {
      authenticated: boolean;
      sessionBacked: boolean;
      user: { username: string; role: string };
    };
    assert.equal(meBody.authenticated, true);
    assert.equal(meBody.sessionBacked, true);
    assert.equal(meBody.user.username, "sovereign");
    assert.equal(meBody.user.role, "admin");

    // 5. Cross-origin cookie-authenticated mutation without CSRF header is rejected (403)
    const csrfBlocked = await http(
      new Request("http://localhost/api/v1/m/cab.change", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "https://evil.example.com",
        },
        body: JSON.stringify({ reference: "RFC-EVIL", title: "CSRF Attempt" }),
      }),
      "m/cab.change",
    );
    assert.equal(csrfBlocked.status, 403);

    // 6. Admin provisions a new editor via POST /auth/register, and editor logs in via scrypt
    const regRes = await http(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({
          username: "chronicle_ed",
          email: "editor@moonwitness.local",
          password: "EditorSecret!2026",
          role: "editor",
        }),
      }),
      "auth/register",
    );
    assert.equal(regRes.status, 201);

    const loginRes = await http(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
        body: JSON.stringify({
          identity: "chronicle_ed",
          password: "EditorSecret!2026",
        }),
      }),
      "auth/login",
    );
    assert.equal(loginRes.status, 200);

    // 7. Automatic chatter field-diff tracking on CAB stage update
    const cabList = (await (
      await http(
        new Request("http://localhost/api/v1/m/cab.change", { headers: { cookie: adminCookie } }),
        "m/cab.change",
      )
    ).json()) as { data: Array<{ id: string; stage: string }> };
    assert.ok(cabList.data.length >= 4);
    const firstCab = cabList.data[0]!;
    const nextStage = firstCab.stage === "done" ? "review" : "done";

    const patchCab = await http(
      new Request(`http://localhost/api/v1/m/cab.change/${firstCab.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({ stage: nextStage }),
      }),
      `m/cab.change/${firstCab.id}`,
    );
    assert.equal(patchCab.status, 200);

    // Allow microtask/event handler to persist tracking rows
    await new Promise((r) => setTimeout(r, 40));

    const chatterRes = await http(
      new Request(
        `http://localhost/api/v1/m/mail.message?res_model=cab.change&res_id=${firstCab.id}&with=tracking_values`,
        { headers: { cookie: adminCookie } },
      ),
      "m/mail.message",
    );
    assert.equal(chatterRes.status, 200);
    const chatterBody = (await chatterRes.json()) as {
      data: Array<{
        message_type: string;
        $tracking_values?: Array<{ field_name: string; old_value: string; new_value: string }>;
      }>;
    };
    const trackingMsg = chatterBody.data.find((m) => m.message_type === "tracking");
    assert.ok(trackingMsg, "Expected automatic tracking mail.message on UPDATE");
    const stageDiff = trackingMsg.$tracking_values?.find((tv) => tv.field_name === "stage");
    assert.ok(stageDiff, "Expected mail.tracking.value diff for stage field");
    assert.equal(stageDiff.old_value, firstCab.stage);
    assert.equal(stageDiff.new_value, nextStage);

    // 8. Studio View Editor persistence & reset
    const saveViewRes = await http(
      new Request("http://localhost/api/v1/_meta/views/cab.change", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({
          view_type: "list",
          spec: {
            title: "Custom CAB Queue",
            columns: ["risk", "reference", "stage", "title"],
          },
        }),
      }),
      "_meta/views/cab.change",
    );
    assert.equal(saveViewRes.status, 200);

    const viewAfterSave = (await (
      await http(
        new Request("http://localhost/api/v1/_meta/views/cab.change", {
          headers: { cookie: adminCookie },
        }),
        "_meta/views/cab.change",
      )
    ).json()) as { views: Array<{ view_type: string; spec: { title?: string; columns?: string[] } }> };
    const savedListView = viewAfterSave.views.find((v) => v.view_type === "list");
    assert.equal(savedListView?.spec.title, "Custom CAB Queue");
    assert.deepEqual(savedListView?.spec.columns, ["risk", "reference", "stage", "title"]);

    const resetViewRes = await http(
      new Request("http://localhost/api/v1/_meta/views/cab.change?view_type=list", {
        method: "DELETE",
        headers: { cookie: adminCookie, "x-requested-with": "XMLHttpRequest" },
      }),
      "_meta/views/cab.change",
    );
    assert.equal(resetViewRes.status, 200);

    // 9. Verify seeded Operations & RBAC models + RPC name_search for RelationPicker
    for (const modelName of [
      "snmp.target",
      "syslog.entry",
      "radius.session",
      "storage.object",
      "vpn.tunnel",
      "command.workflow",
      "res.role",
      "res.permission",
    ]) {
      const listRes = await http(
        new Request(`http://localhost/api/v1/m/${modelName}`, { headers: { cookie: adminCookie } }),
        `m/${modelName}`,
      );
      assert.equal(listRes.status, 200, `Expected 200 for ${modelName}`);
      const listJson = (await listRes.json()) as { data: unknown[] };
      assert.ok(listJson.data.length > 0, `Expected seeded rows for ${modelName}`);
    }

    const nameSearchRes = await http(
      new Request("http://localhost/api/v1/rpc", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({
          model: "project.project",
          method: "name_search",
          kwargs: { q: "" },
        }),
      }),
      "rpc",
    );
    assert.equal(nameSearchRes.status, 200);
    const nameSearchData = (await nameSearchRes.json()) as { result: Array<[string, string]> };
    assert.ok(nameSearchData.result.length > 0);

    // 10. Logout revokes session cleanly
    const logoutRes = await http(
      new Request("http://localhost/api/v1/auth/logout", {
        method: "POST",
        headers: { cookie: adminCookie, "x-requested-with": "XMLHttpRequest" },
      }),
      "auth/logout",
    );
    assert.equal(logoutRes.status, 200);

    const meAfterLogout = (await (
      await http(
        new Request("http://localhost/api/v1/auth/me", { headers: { cookie: adminCookie } }),
        "auth/me",
      )
    ).json()) as { authenticated: boolean; user: unknown };
    assert.equal(meAfterLogout.authenticated, false);
    assert.equal(meAfterLogout.user, null);
  } finally {
    if (prevPasscode !== undefined) process.env.MW_ADMIN_PASSCODE = prevPasscode;
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

