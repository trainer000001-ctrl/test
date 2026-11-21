import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  closeDb,
  createActorContext,
  getDb,
  initDb,
  modelRegistry,
  syncModels,
} from "@moonwitness/orm";
import { generateToken, ensureAuthSchema } from "@moonwitness/addons/auth";
import { recordAuditLog } from "@moonwitness/addons/audit";
import { alertModel, workflowModel } from "@moonwitness/addons/command-center";
import { controlCommandModel } from "@moonwitness/addons/control";
import { memoryRecordModel } from "@moonwitness/addons/ai";
import { opsEventModel, probeEventModel, probeNodeModel } from "@moonwitness/addons/probes";
import { radiusClientModel, radiusSessionModel } from "@moonwitness/addons/radius";
import { snmpDeviceModel, snmpSampleModel, snmpTargetModel } from "@moonwitness/addons/snmp";
import {
  storageBucketModel,
  storageObjectModel,
  storageUploadSessionModel,
} from "@moonwitness/addons/storage";
import { syslogEntryModel } from "@moonwitness/addons/syslog";

const tempDirs: string[] = [];

async function createTempDbPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mw-domain-migrations-"));
  tempDirs.push(dir);
  return join(dir, "domain.db");
}

const zeroMigrationDomainModels = [
  controlCommandModel,
  workflowModel,
  alertModel,
  probeNodeModel,
  probeEventModel,
  opsEventModel,
  memoryRecordModel,
  storageBucketModel,
  storageObjectModel,
  storageUploadSessionModel,
  syslogEntryModel,
  snmpDeviceModel,
  snmpTargetModel,
  snmpSampleModel,
  radiusClientModel,
  radiusSessionModel,
];

describe("zero-migration domain auto-sync (Odoo++)", () => {
  afterEach(() => {
    closeDb();
  });

  afterAll(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }).catch(
        () => {},
      );
    }
  });

  it("syncs all domain tables idempotently via syncModels without SQL migration files", async () => {
    await initDb(await createTempDbPath());
    await ensureAuthSchema();
    const first = await syncModels(zeroMigrationDomainModels);
    expect(first.createdTables.length).toBe(zeroMigrationDomainModels.length);

    const second = await syncModels(zeroMigrationDomainModels);
    expect(second.createdTables).toHaveLength(0);
    expect(second.addedColumns).toHaveLength(0);

    const tables = await getDb().all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const names = tables.map((t) => t.name);

    for (const t of [
      "auth_users",
      "auth_sessions",
      "auth_oauth_tokens",
      "ops_audit_logs",
      "storage_buckets",
      "storage_objects",
      "storage_upload_sessions",
      "ops_events",
      "orm_probe_nodes",
      "orm_probe_events",
      "command_center_workflows_orm",
      "command_center_alerts_orm",
      "control_command_history",
      "memory_records",
      "syslog_entries",
      "snmp_devices",
      "snmp_targets",
      "snmp_samples",
      "radius_clients",
      "radius_sessions",
    ]) {
      expect(names, `missing domain table ${t}`).toContain(t);
    }
  });

  it("supports audit log and ops event smoke writes", async () => {
    await initDb(await createTempDbPath());
    await ensureAuthSchema();
    await syncModels([opsEventModel]);

    await recordAuditLog({
      domain: "test",
      entity: "thing",
      entityId: "1",
      action: "CREATE",
      outcome: "success",
      occurredAt: new Date().toISOString(),
    });
    const audit = await getDb().all<Record<string, unknown>>("SELECT * FROM ops_audit_logs");
    expect(audit).toHaveLength(1);
    expect(audit[0]?.domain).toBe("test");

    const actor = createActorContext(null, "api");
    await opsEventModel.repository.create(
      {
        event_key: "evt-smoke-1",
        kind: "PROJECT",
        title: "Smoke event",
        era: null,
        date: "2026-11-17",
        excerpt: null,
        body: null,
        location: null,
        tags_json: null,
        sources_count: 0,
        notes_count: 0,
        image_key: null,
        image_position: null,
        related_json: null,
        payload_json: null,
      },
      actor,
    );
    const ops = await opsEventModel.repository.find({ event_key: "evt-smoke-1" });
    expect(ops).toHaveLength(1);
    expect(ops[0]?.title).toBe("Smoke event");
  });

  it("does not pollute modelRegistry with ghost identity.* models and exports generateToken from @moonwitness/addons/auth", () => {
    const names = modelRegistry.list().map((m) => m.name);
    for (const ghost of [
      "identity.user_profile",
      "identity.session",
      "identity.oauth_token",
      "identity.auth_event",
    ]) {
      expect(names).not.toContain(ghost);
    }

    expect(generateToken(24)).toMatch(/^[0-9a-f]{48}$/);
  });
});
