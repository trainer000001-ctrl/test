import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  OrmDialect,
  OrmDriverHandle,
  RunResult,
} from "./types";

interface QueryBudgetState {
  maxQueries: number;
  count: number;
}

const queryBudgetStorage = new AsyncLocalStorage<QueryBudgetState>();

/**
 * Enforces a hard SQL query budget on the enclosed async operation to catch
 * N+1 regressions deterministically.
 */
export async function withQueryBudget<T>(maxQueries: number, fn: () => Promise<T>): Promise<T> {
  if (!Number.isInteger(maxQueries) || maxQueries < 0) {
    throw new Error(`Invalid query budget: ${maxQueries}`);
  }
  const state: QueryBudgetState = { maxQueries, count: 0 };
  return queryBudgetStorage.run(state, fn);
}

export function trackQueryExecution(sql: string): void {
  const budget = queryBudgetStorage.getStore();
  if (!budget) return;
  budget.count += 1;
  if (budget.count > budget.maxQueries) {
    throw new Error(
      `Query budget exceeded (${budget.count}/${budget.maxQueries}) executing: ${sql.slice(0, 120)}`,
    );
  }
}

export function isPostgresUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  return normalized.startsWith("postgres://") || normalized.startsWith("postgresql://");
}

function normalizeSqliteTarget(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === ":memory:" || trimmed.startsWith("file::memory:")) {
    return ":memory:";
  }
  const stripped = trimmed.startsWith("file:") ? trimmed.slice(5) : trimmed;
  const pathOnly = stripped.split("?")[0] ?? stripped;
  if (pathOnly && pathOnly !== ":memory:") {
    mkdirSync(dirname(pathOnly), { recursive: true });
  }
  return pathOnly || ":memory:";
}

function coerceSqliteParam(val: unknown): string | number | Uint8Array | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "boolean") return val ? 1 : 0;
  if (typeof val === "number" || typeof val === "string") return val;
  if (val instanceof Uint8Array) return val;
  if (val instanceof Date) return val.toISOString();
  return JSON.stringify(val);
}

interface NodeSqliteStatement {
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid?: number | bigint };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Array<Record<string, unknown>>;
}

interface NodeSqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeSqliteStatement;
  close(): void;
}

/**
 * Zero-dependency SQLite driver powered by Node.js built-in `node:sqlite`,
 * enforcing WAL mode, foreign keys, `synchronous = NORMAL`, and `busy_timeout >= 5000`.
 */
export class SqliteOrmDriver implements OrmDriverHandle {
  readonly dialect: OrmDialect = "sqlite";
  readonly kind = "sqlite";
  private db: NodeSqliteDatabase | null = null;
  private connectionString = ":memory:";
  private txDepth = 0;

  getConnectionString(): string {
    return this.connectionString;
  }

  async init(targetUrl = ":memory:"): Promise<this> {
    if (this.db) {
      this.close();
    }
    const resolved = normalizeSqliteTarget(targetUrl);
    this.connectionString = resolved;
    const sqliteModule = (await import("node:sqlite")) as unknown as {
      DatabaseSync: new (path: string) => NodeSqliteDatabase;
    };
    const db = new sqliteModule.DatabaseSync(resolved);
    this.db = db;

    // Enforce canonical SQLite data ownership & durability pragmas
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("PRAGMA busy_timeout = 5000;");
    if (resolved !== ":memory:") {
      db.exec("PRAGMA journal_mode = WAL;");
      db.exec("PRAGMA synchronous = NORMAL;");
    }
    return this;
  }

  private requireDb(): NodeSqliteDatabase {
    if (!this.db) {
      throw new Error("ORM database driver is not initialized. Call initDb() first.");
    }
    return this.db;
  }

  async exec(sql: string): Promise<void> {
    trackQueryExecution(sql);
    this.requireDb().exec(sql);
  }

  async run(sql: string, params: readonly unknown[] = []): Promise<RunResult> {
    trackQueryExecution(sql);
    const stmt = this.requireDb().prepare(sql);
    const coerced = params.map(coerceSqliteParam);
    const res = stmt.run(...coerced);
    return {
      changes: Number(res.changes ?? 0),
      lastInsertRowid: res.lastInsertRowid,
    };
  }

  async get<T = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<T | undefined> {
    trackQueryExecution(sql);
    const stmt = this.requireDb().prepare(sql);
    const coerced = params.map(coerceSqliteParam);
    const row = stmt.get(...coerced);
    return row ? ({ ...row } as T) : undefined;
  }

  async all<T = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<T[]> {
    trackQueryExecution(sql);
    const stmt = this.requireDb().prepare(sql);
    const coerced = params.map(coerceSqliteParam);
    return stmt.all(...coerced).map((row) => ({ ...row }) as T);
  }

  async transaction<T>(fn: (tx: OrmDriverHandle) => Promise<T>): Promise<T> {
    const db = this.requireDb();
    const savepoint = this.txDepth > 0 ? `sp_orm_${this.txDepth}` : null;
    this.txDepth += 1;
    try {
      if (savepoint) {
        db.exec(`SAVEPOINT ${savepoint}`);
      } else {
        db.exec("BEGIN IMMEDIATE");
      }
      const result = await fn(this);
      if (savepoint) {
        db.exec(`RELEASE SAVEPOINT ${savepoint}`);
      } else {
        db.exec("COMMIT");
      }
      return result;
    } catch (error) {
      try {
        if (savepoint) {
          db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
          db.exec(`RELEASE SAVEPOINT ${savepoint}`);
        } else {
          db.exec("ROLLBACK");
        }
      } catch {
        // Preserve original transaction error
      }
      throw error;
    } finally {
      this.txDepth = Math.max(0, this.txDepth - 1);
    }
  }

  close(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch {
        // Ignore already-closed handles
      }
      this.db = null;
    }
  }

  async closeAsync(): Promise<void> {
    this.close();
  }
}

/** Alias exported for `@moonwitness/edge` and `@moonwitness/api` test compatibility. */
export class LibSqlDriver extends SqliteOrmDriver {}

/**
 * Wraps any Cloudflare D1 binding (`env.DB`) into a standard `OrmDriverHandle`.
 */
export class D1OrmDriver implements OrmDriverHandle {
  readonly dialect: OrmDialect = "d1";
  readonly kind = "d1";
  private readonly d1: D1DatabaseLike;

  constructor(d1: D1DatabaseLike) {
    this.d1 = d1;
  }

  async exec(sql: string): Promise<void> {
    trackQueryExecution(sql);
    await this.d1.exec(sql);
  }

  async run(sql: string, params: readonly unknown[] = []): Promise<RunResult> {
    trackQueryExecution(sql);
    const res = await this.d1.prepare(sql).bind(...params).run();
    return {
      changes: Number(res.meta?.changes ?? 0),
      lastInsertRowid: res.meta?.last_row_id,
    };
  }

  async get<T = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<T | undefined> {
    trackQueryExecution(sql);
    const row = await this.d1.prepare(sql).bind(...params).first<T>();
    return row ?? undefined;
  }

  async all<T = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<T[]> {
    trackQueryExecution(sql);
    const res = await this.d1.prepare(sql).bind(...params).all<T>();
    return res.results ?? [];
  }

  async transaction<T>(fn: (tx: OrmDriverHandle) => Promise<T>): Promise<T> {
    return fn(this);
  }

  close(): void {
    // D1 binding lifecycle is managed by the Workers runtime.
  }

  async closeAsync(): Promise<void> {
    this.close();
  }
}

/**
 * Bridges an active `OrmDriverHandle` into a Cloudflare `D1DatabaseLike`
 * interface so Core API and MID share one database handle without lock races.
 */
export function createD1DatabaseFromOrm(driver: OrmDriverHandle): D1DatabaseLike {
  return {
    prepare(sql: string): D1PreparedStatementLike {
      let boundParams: unknown[] = [];
      const stmt: D1PreparedStatementLike = {
        bind(...values: unknown[]) {
          boundParams = values;
          return stmt;
        },
        async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
          const row = await driver.get<Record<string, unknown>>(sql, boundParams);
          if (!row) return null;
          if (colName !== undefined) {
            return (row[colName] as T | undefined) ?? null;
          }
          return row as T;
        },
        async all<T = Record<string, unknown>>() {
          const results = await driver.all<T>(sql, boundParams);
          return { results, success: true };
        },
        async run() {
          const res = await driver.run(sql, boundParams);
          return {
            success: true,
            meta: {
              changes: res.changes,
              last_row_id:
                typeof res.lastInsertRowid === "number" ? res.lastInsertRowid : undefined,
            },
          };
        },
      };
      return stmt;
    },
    async exec(sql: string) {
      await driver.exec(sql);
      return { count: 1 };
    },
  };
}

let activeDriver: OrmDriverHandle | null = null;

export const ORM_CORE_TABLES_DDL = `
CREATE TABLE IF NOT EXISTS _orm_audit_log (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  diff TEXT NOT NULL,
  entity_version INTEGER NOT NULL,
  source TEXT NOT NULL,
  request_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_model_entity ON _orm_audit_log (model, entity_id, changed_at);

CREATE TABLE IF NOT EXISTS _orm_outbox_events (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  actor_id TEXT,
  request_id TEXT,
  event_version INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outbox_status_next_attempt ON _orm_outbox_events (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_outbox_model_entity ON _orm_outbox_events (model, entity_id, created_at);
`;

export async function ensureCoreOrmTables(driver: OrmDriverHandle): Promise<void> {
  await driver.exec(ORM_CORE_TABLES_DDL);
}

export async function initDb(dbUrl = ":memory:"): Promise<OrmDriverHandle> {
  if (isPostgresUrl(dbUrl)) {
    return initPostgresDb(dbUrl);
  }
  const driver = new SqliteOrmDriver();
  await driver.init(dbUrl);
  await ensureCoreOrmTables(driver);
  activeDriver = driver;
  return driver;
}

export function initD1Db(d1: D1DatabaseLike): OrmDriverHandle {
  const driver = new D1OrmDriver(d1);
  activeDriver = driver;
  return driver;
}

export async function initPostgresDb(connectionString: string): Promise<OrmDriverHandle> {
  if (!isPostgresUrl(connectionString)) {
    throw new Error("initPostgresDb requires a postgres:// or postgresql:// connection URL.");
  }
  // Runtime loader keeps `pg` optional for SQLite/Edge/Next.js runtimes without bundler failure.
  const runtimeImport = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<unknown>;
  const pg = (await runtimeImport("pg")) as {
    Pool: new (opts: { connectionString: string }) => {
      query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
      connect: () => Promise<{
        query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
        release: () => void;
      }>;
      end: () => Promise<void>;
    };
  };

  const pool = new pg.Pool({ connectionString });
  const convertPlaceholders = (sql: string): string => {
    let idx = 0;
    return sql.replace(/\?/g, () => `$${++idx}`);
  };

  const wrapQueryable = (q: {
    query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  }): OrmDriverHandle => ({
    dialect: "postgres",
    kind: "postgres",
    getConnectionString: () => connectionString,
    async exec(sql: string) {
      trackQueryExecution(sql);
      await q.query(sql);
    },
    async run(sql: string, params: readonly unknown[] = []) {
      trackQueryExecution(sql);
      const res = await q.query(convertPlaceholders(sql), [...params]);
      return { changes: Number(res.rowCount ?? 0) };
    },
    async get<T = Record<string, unknown>>(sql: string, params: readonly unknown[] = []) {
      trackQueryExecution(sql);
      const res = await q.query(convertPlaceholders(sql), [...params]);
      return (res.rows[0] as T | undefined) ?? undefined;
    },
    async all<T = Record<string, unknown>>(sql: string, params: readonly unknown[] = []) {
      trackQueryExecution(sql);
      const res = await q.query(convertPlaceholders(sql), [...params]);
      return res.rows as T[];
    },
    async transaction<T>(fn: (tx: OrmDriverHandle) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(wrapQueryable(client));
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close() {
      void pool.end();
    },
    async closeAsync() {
      await pool.end();
    },
  });

  const driver = wrapQueryable(pool);
  await ensureCoreOrmTables(driver);
  activeDriver = driver;
  return driver;
}

export function getDb(): OrmDriverHandle {
  if (!activeDriver) {
    throw new Error("ORM database is not initialized. Call initDb() first.");
  }
  return activeDriver;
}

export function hasDb(): boolean {
  return activeDriver !== null;
}

export function closeDb(): void {
  if (activeDriver) {
    activeDriver.close();
    activeDriver = null;
  }
}

export async function closeDbAsync(): Promise<void> {
  if (activeDriver) {
    if (activeDriver.closeAsync) {
      await activeDriver.closeAsync();
    } else {
      activeDriver.close();
    }
    activeDriver = null;
  }
}

export async function verifyIntegrity(): Promise<{ ok: boolean; errors: string[] }> {
  const db = getDb();
  if (db.dialect === "postgres") {
    await db.get("SELECT 1 AS ok");
    return { ok: true, errors: [] };
  }
  const rows = await db.all<{ integrity_check?: string }>("PRAGMA integrity_check");
  const messages = rows.map((r) => String(r.integrity_check ?? "ok"));
  const errors = messages.filter((m) => m.toLowerCase() !== "ok");
  return { ok: errors.length === 0, errors };
}
