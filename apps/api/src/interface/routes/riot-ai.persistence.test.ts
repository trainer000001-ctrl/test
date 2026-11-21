import { afterAll, afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import {
  closeDb,
  createActorContext,
  extendModel,
  getDb,
  initDb,
  modelRegistry,
  onModelWrite,
} from "@moonwitness/orm";

describe("RIOT Intelligence persistence", () => {
  const tempDirs: string[] = [];

  function nextDbPath(): string {
    const dir = mkdtempSync(join(tmpdir(), "mw-riotai-persist-"));
    tempDirs.push(dir);
    return join(dir, "riot.db");
  }

  afterEach(() => {
    closeDb();
    modelRegistry.clearCustomFieldsForTests();
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Ignore transient Windows SQLite lock on cleanup.
      }
    }
  });

  it("syncs models idempotently and preserves provider configuration audit and outbox hooks", async () => {
    await initDb(nextDbPath());
    const persistence = await import("@moonwitness/addons/ai");
    await persistence.initializeRiotAiPersistence();
    await persistence.initializeRiotAiPersistence();

    const writeEvents: Array<{ model: string; tenantId?: string }> = [];
    const unsubscribe = onModelWrite("riot_ai.provider_config", (event) => {
      writeEvents.push({ model: event.model, tenantId: event.actor.tenantId });
    });

    try {
      const config = await persistence.upsertProviderConfig(
        {
          profileKey: "default",
          label: "Local runtime",
          enabled: true,
          preferredModel: "llama3.2",
        },
        createActorContext("operator-1", "api", "request-1", "tenant-alpha"),
      );
      expect(config.create_uid).toBe("operator-1");
      expect(config.tenant_id).toBe("tenant-alpha");
      expect(writeEvents).toEqual([{ model: "riot_ai.provider_config", tenantId: "tenant-alpha" }]);

      expect(await persistence.getProviderConfig("default")).toMatchObject({
        enabled: true,
        preferred_model: "llama3.2",
      });
      const history = await persistence.getProviderConfigHistory("default");
      expect(history[0]).toMatchObject({
        action: "CREATE",
        changed_by: "operator-1",
        request_id: "request-1",
      });
      await persistence.upsertProviderConfig(
        {
          profileKey: "default",
          label: "Updated runtime",
          enabled: false,
          preferredModel: "llama3.2",
        },
        createActorContext("operator-2", "api", "request-2", "tenant-alpha"),
      );
      const updatedHistory = await persistence.getProviderConfigHistory("default");
      expect(updatedHistory.find((entry) => entry.action === "UPDATE")).toMatchObject({
        action: "UPDATE",
        changed_by: "operator-2",
        request_id: "request-2",
      });

      extendModel("riot_ai.provider_config", {
        addon: "test-ext",
        fields: z.object({ x_region: z.string().default("us-east") }),
      });
      await expect(persistence.initializeRiotAiPersistence()).resolves.toBeUndefined();
    } finally {
      unsubscribe();
    }
  });

  it("stores usage per actor/tenant and applies ORM soft-delete retention", async () => {
    await initDb(nextDbPath());
    const persistence = await import("@moonwitness/addons/ai");
    await persistence.initializeRiotAiPersistence();
    const now = new Date();
    await persistence.writeUsageSummary({
      actorId: "operator-1",
      provider: "ollama",
      model: "llama3.2",
      outcome: "success",
      durationMs: 120,
      promptTokens: 10,
      completionTokens: null,
      totalTokens: null,
      occurredAt: now.toISOString(),
      tenantId: "tenant-alpha",
    });
    await persistence.writeUsageSummary({
      actorId: "operator-3",
      provider: "ollama",
      model: "llama3.2",
      outcome: "success",
      durationMs: 80,
      promptTokens: 12,
      completionTokens: null,
      totalTokens: null,
      occurredAt: now.toISOString(),
      tenantId: "tenant-beta",
    });
    await persistence.writeUsageSummary({
      actorId: "operator-2",
      provider: "ollama",
      model: "llama3.2",
      outcome: "failure",
      durationMs: 50,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      occurredAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(),
      tenantId: "tenant-alpha",
    });

    const alphaEntries = await persistence.listOperatorUsageSummary({
      limit: 10,
      since: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      tenantId: "tenant-alpha",
    });
    expect(alphaEntries.map((entry) => entry.actorId)).toEqual(["operator-1"]);

    const removed = await persistence.maintainUsageRetention(90);
    expect(removed).toBe(1);
    const remaining = await getDb().all<{ status: string }>(
      "SELECT status FROM riot_ai_usage_summaries WHERE status != 'deleted' ORDER BY occurred_at",
    );
    expect(remaining.map((row) => row.status)).toEqual(["active", "active"]);
    const retained = await getDb().all<{ status: string }>(
      "SELECT status FROM riot_ai_usage_summaries ORDER BY occurred_at",
    );
    expect(retained.map((row) => row.status)).toEqual(["deleted", "active", "active"]);
    const auditRows = await getDb().all<{ action: string; model: string }>(
      "SELECT action, model FROM _orm_audit_log WHERE model = 'riot_ai.usage_summary'",
    );
    expect(auditRows).toHaveLength(4);
    const retentionAudit = await getDb().get<{
      changed_by: string;
      source: string;
    }>(
      "SELECT changed_by, source FROM _orm_audit_log WHERE model = 'riot_ai.usage_summary' AND action = 'DELETE'",
    );
    expect(retentionAudit).toMatchObject({
      changed_by: "system:retention",
      source: "migration",
    });
  });
});
