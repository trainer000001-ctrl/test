import { ensureCoreOrmTables, getDb, type OutboxEventEntry } from "@moonwitness/orm";

export interface OutboxDispatchOptions {
  readonly batchSize?: number;
  readonly maxAttempts?: number;
  readonly baseBackoffMs?: number;
  readonly handler: (event: OutboxEventEntry) => Promise<void>;
}

export interface OutboxDispatchResult {
  readonly processed: number;
  readonly delivered: number;
  readonly retried: number;
  readonly deadLettered: number;
}

export async function ensureOutboxSchema(): Promise<void> {
  const db = getDb();
  await ensureCoreOrmTables(db);
}

export async function recoverExpiredOutboxLeases(maxAgeMs = 300_000): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const res = await db.run(
    `UPDATE _orm_outbox_events
     SET next_attempt_at = ?, updated_at = ?
     WHERE status = 'pending' AND updated_at < ?`,
    [new Date().toISOString(), new Date().toISOString(), cutoff],
  );
  return res.changes;
}

export async function dispatchOutboxBatch(
  options: OutboxDispatchOptions,
): Promise<OutboxDispatchResult> {
  const db = getDb();
  const batchSize = Math.max(1, Math.min(200, options.batchSize ?? 25));
  const maxAttempts = Math.max(1, options.maxAttempts ?? 5);
  const baseBackoffMs = Math.max(100, options.baseBackoffMs ?? 1_000);
  const nowIso = new Date().toISOString();

  const events = await db.all<OutboxEventEntry>(
    `SELECT * FROM _orm_outbox_events
     WHERE status = 'pending' AND next_attempt_at <= ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [nowIso, batchSize],
  );

  let delivered = 0;
  let retried = 0;
  let deadLettered = 0;

  for (const event of events) {
    try {
      await options.handler(event);
      await db.run(
        `UPDATE _orm_outbox_events
         SET status = 'delivered', attempts = attempts + 1, last_error = NULL, updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), event.id],
      );
      delivered += 1;
    } catch (err) {
      const nextAttempts = Number(event.attempts ?? 0) + 1;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isDead = nextAttempts >= maxAttempts;
      const nextStatus = isDead ? "dead_letter" : "pending";
      const backoffMs = baseBackoffMs * Math.pow(2, Math.min(8, nextAttempts - 1));
      const nextAttemptAt = new Date(Date.now() + backoffMs).toISOString();

      await db.run(
        `UPDATE _orm_outbox_events
         SET status = ?, attempts = ?, last_error = ?, next_attempt_at = ?, updated_at = ?
         WHERE id = ?`,
        [nextStatus, nextAttempts, errMsg, nextAttemptAt, new Date().toISOString(), event.id],
      );
      if (isDead) deadLettered += 1;
      else retried += 1;
    }
  }

  return {
    processed: events.length,
    delivered,
    retried,
    deadLettered,
  };
}

export class OutboxDispatcher {
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly listeners: Array<(event: OutboxEventEntry) => Promise<void>> = [];

  constructor(options: { maxAttempts?: number; baseBackoffMs?: number } = {}) {
    this.maxAttempts = options.maxAttempts ?? 5;
    this.baseBackoffMs = options.baseBackoffMs ?? 1_000;
  }

  subscribe(listener: (event: OutboxEventEntry) => Promise<void>): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  async flush(batchSize = 25): Promise<OutboxDispatchResult> {
    await ensureOutboxSchema();
    return dispatchOutboxBatch({
      batchSize,
      maxAttempts: this.maxAttempts,
      baseBackoffMs: this.baseBackoffMs,
      handler: async (event) => {
        for (const fn of this.listeners) {
          await fn(event);
        }
      },
    });
  }
}
