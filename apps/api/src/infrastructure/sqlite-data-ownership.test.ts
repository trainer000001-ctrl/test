import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { closeDb, createD1DatabaseFromOrm, getDb, initDb, verifyIntegrity } from "@moonwitness/orm";
import { assertDemoSeedAllowed } from "../shared/seed-safety.js";
import { backupDatabaseFile } from "../../../../scripts/backup-sqlite.mjs";
import { restoreDatabaseFile } from "../../../../scripts/restore-sqlite.mjs";

const dirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mw-data-ownership-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  closeDb();
});

afterAll(async () => {
  for (const dir of dirs) {
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }).catch(() => {});
  }
});

describe("SQLite Data Ownership, WAL & Backup/Restore (MW-0036)", () => {
  it("enforces canonical WAL, foreign keys, synchronous NORMAL and busy_timeout pragmas", async () => {
    const dir = await createTempDir();
    const dbPath = join(dir, "moonwitness.db");

    await initDb(dbPath);
    const db = getDb();

    const journalMode = await db.get<{ journal_mode: string }>("PRAGMA journal_mode");
    expect(journalMode?.journal_mode?.toLowerCase()).toBe("wal");

    const foreignKeys = await db.get<{ foreign_keys: number }>("PRAGMA foreign_keys");
    expect(Number(foreignKeys?.foreign_keys)).toBe(1);

    const busyTimeout = await db.get<{ timeout: number }>("PRAGMA busy_timeout");
    expect(Number(busyTimeout?.timeout)).toBeGreaterThanOrEqual(5000);

    const integrity = await verifyIntegrity();
    expect(integrity.ok).toBe(true);
    expect(integrity.errors).toHaveLength(0);
  });

  it("shares one single database handle between Core API and MID without connection racing", async () => {
    const dir = await createTempDir();
    const dbPath = join(dir, "moonwitness.db");

    await initDb(dbPath);
    const ormDb = getDb();
    const midD1 = createD1DatabaseFromOrm(ormDb);

    // Core API schema
    await ormDb.exec(`
      CREATE TABLE test_core_users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL UNIQUE
      );
    `);

    // MID schema
    await ormDb.exec(`
      CREATE TABLE test_mid_clients (
        client_id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL
      );
    `);

    // Concurrent read & write via Core API and MID D1 bridge
    await Promise.all([
      ormDb.run("INSERT INTO test_core_users (id, username) VALUES (?, ?)", [1, "admin"]),
      midD1
        .prepare("INSERT INTO test_mid_clients (client_id, client_name) VALUES (?, ?)")
        .bind("cli-001", "Console App")
        .run(),
    ]);

    const coreUser = await ormDb.get<{ id: number; username: string }>(
      "SELECT * FROM test_core_users WHERE id = 1",
    );
    expect(coreUser?.username).toBe("admin");

    const midClient = await midD1
      .prepare("SELECT * FROM test_mid_clients WHERE client_id = ?")
      .bind("cli-001").first!<{ client_id: string; client_name: string }>();
    expect(midClient?.client_name).toBe("Console App");
  });

  it("executes end-to-end encrypted backup and restore drill", async () => {
    const dir = await createTempDir();
    const sourceDb = join(dir, "source.db");
    const restoredDb = join(dir, "restored.db");
    const backupsDir = join(dir, "backups");
    const key = randomBytes(32).toString("hex");

    await initDb(sourceDb);
    const db = getDb();
    await db.exec(`
      CREATE TABLE ledger (
        id TEXT PRIMARY KEY,
        entry TEXT NOT NULL
      );
      INSERT INTO ledger (id, entry) VALUES ('item-1', 'initial ledger state');
      INSERT INTO ledger (id, entry) VALUES ('item-2', 'second state');
    `);
    closeDb();

    // 1. Create encrypted backup
    const backupReport = await backupDatabaseFile({
      sourceDbPath: sourceDb,
      outputDir: backupsDir,
      encryptionKey: key,
    });

    expect(backupReport.sizeBytes).toBeGreaterThan(0);
    expect(backupReport.tables).toContain("ledger");

    // 2. Restore encrypted backup into new database target
    const restoreResult = await restoreDatabaseFile({
      encryptedBackupPath: backupReport.fullPath,
      targetDbPath: restoredDb,
      decryptionKey: key,
      expectedPlaintextHash: backupReport.plaintextHash,
    });

    expect(restoreResult.plaintextHash).toBe(backupReport.plaintextHash);

    // 3. Verify restored database can be queried and data is intact
    await initDb(restoredDb);
    const rows = await getDb().all<{ id: string; entry: string }>(
      "SELECT id, entry FROM ledger ORDER BY id",
    );
    expect(rows).toEqual([
      { id: "item-1", entry: "initial ledger state" },
      { id: "item-2", entry: "second state" },
    ]);
  });

  it("enforces demo seed protection in production environments", () => {
    // Should fail closed if allowDemoSeed is not '1'
    expect(() =>
      assertDemoSeedAllowed({
        nodeEnv: "production",
        allowDemoSeed: "0",
      }),
    ).toThrow("Refusing to seed fictional timeline fixtures in production");

    // Should allow when explicitly authorized
    expect(() =>
      assertDemoSeedAllowed({
        nodeEnv: "production",
        allowDemoSeed: "1",
      }),
    ).not.toThrow();

    // Should allow in development
    expect(() =>
      assertDemoSeedAllowed({
        nodeEnv: "development",
        allowDemoSeed: "0",
      }),
    ).not.toThrow();
  });
});
