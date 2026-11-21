import { afterEach, describe, expect, it, vi } from "vitest";
import {
  persistInferenceAudit,
  setInferenceAuditWriterForTests,
  writeInferenceAudit,
  type InferenceAuditRecord,
  type InferenceSummaryWriter,
} from "@moonwitness/addons/ai";

describe("RIOT inference audit records", () => {
  afterEach(() => {
    setInferenceAuditWriterForTests();
    vi.restoreAllMocks();
  });

  it("writes measured safe metadata without storing raw prompt content", () => {
    const records: InferenceAuditRecord[] = [];
    setInferenceAuditWriterForTests((record) => records.push(record));
    const record = {
      actorId: "user-7",
      requestId: "req-42",
      provider: "ollama",
      model: "llama3.2",
      outcome: "success",
      durationMs: 125,
      usage: { promptTokens: 10, completionTokens: 4, totalTokens: 14 },
    } as const;
    writeInferenceAudit(record);

    expect(records).toEqual([
      {
        actorId: "user-7",
        requestId: "req-42",
        provider: "ollama",
        model: "llama3.2",
        outcome: "success",
        durationMs: 125,
        usage: { promptTokens: 10, completionTokens: 4, totalTokens: 14 },
      },
    ]);
    expect(JSON.stringify(records)).not.toContain('"content"');
    expect(JSON.stringify(records)).not.toContain("Hello private prompt");
  });

  it("awaits the persistent usage writer without exposing prompt content", async () => {
    const summaries: Parameters<InferenceSummaryWriter>[0][] = [];
    setInferenceAuditWriterForTests(vi.fn(), async (record) => {
      summaries.push(record);
    });

    await persistInferenceAudit({
      actorId: "user-8",
      requestId: "req-43",
      provider: "ollama",
      model: "llama3.2",
      outcome: "success",
      durationMs: 42,
      usage: { promptTokens: 10, completionTokens: null, totalTokens: null },
    });

    expect(summaries).toMatchObject([
      {
        actorId: "user-8",
        model: "llama3.2",
        promptTokens: 10,
        completionTokens: null,
        totalTokens: null,
      },
    ]);
    expect(JSON.stringify(summaries)).not.toContain("prompt content");
  });

  it("does not emit the audit event when persistence fails", async () => {
    const auditWriter = vi.fn();
    const usageWriter = vi.fn<InferenceSummaryWriter>().mockRejectedValue(new Error("disk full"));
    setInferenceAuditWriterForTests(auditWriter, usageWriter);

    await expect(
      persistInferenceAudit({
        actorId: "user-9",
        requestId: "req-44",
        provider: "ollama",
        model: "llama3.2",
        outcome: "success",
        durationMs: 42,
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }),
    ).rejects.toThrow("disk full");
    expect(auditWriter).not.toHaveBeenCalled();
  });
});
