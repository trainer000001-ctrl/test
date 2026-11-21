use rusqlite::{backup::Backup, params, Connection};
use std::{
    fs,
    ops::{Deref, DerefMut},
    path::{Path, PathBuf},
    sync::{OnceLock, RwLock, RwLockReadGuard, RwLockWriteGuard},
    time::Duration,
};
use tauri::{AppHandle, Manager};
use url::Url;
use uuid::Uuid;

static DATABASE_ACCESS: OnceLock<RwLock<()>> = OnceLock::new();

pub struct DbConnection {
    connection: Connection,
    _access: RwLockReadGuard<'static, ()>,
}

impl Deref for DbConnection {
    type Target = Connection;

    fn deref(&self) -> &Self::Target {
        &self.connection
    }
}

impl DerefMut for DbConnection {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.connection
    }
}

fn database_access() -> &'static RwLock<()> {
    DATABASE_ACCESS.get_or_init(|| RwLock::new(()))
}

pub fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("rocksoul.sqlite3"))
}

fn connect_unlocked(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let connection = Connection::open(path).map_err(|error| error.to_string())?;
    connection
        .busy_timeout(std::time::Duration::from_secs(5))
        .map_err(|error| error.to_string())?;
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| error.to_string())?;
    Ok(connection)
}

pub fn connect(app: &AppHandle) -> Result<DbConnection, String> {
    let access = database_access()
        .read()
        .map_err(|error| format!("Database access lock is unavailable: {error}"))?;
    let connection = connect_unlocked(app)?;
    Ok(DbConnection {
        connection,
        _access: access,
    })
}

pub fn init(app: &AppHandle) -> Result<(), String> {
    let connection = connect(app)?;
    initialize_connection(&connection)
}

fn initialize_connection(connection: &Connection) -> Result<(), String> {
    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(|error| error.to_string())?;
    migrate(connection)?;
    let _ = crate::commands::agent_execution::reconcile_stale_agent_runs(connection);

    connection.execute(
        "INSERT OR IGNORE INTO workspaces (id, name, root_path) VALUES ('local', 'LOCAL WORKSPACE', NULL)",
        [],
    ).map_err(|error| error.to_string())?;

    Ok(())
}

fn acquire_exclusive_access() -> Result<RwLockWriteGuard<'static, ()>, String> {
    database_access()
        .write()
        .map_err(|error| format!("Database access lock is unavailable: {error}"))
}

fn backup_connection(from: &Connection, to: &mut Connection) -> Result<(), String> {
    let backup = Backup::new(from, to).map_err(|error| error.to_string())?;
    backup
        .run_to_completion(128, Duration::from_millis(20), None)
        .map_err(|error| error.to_string())
}

fn verify_integrity(connection: &Connection) -> Result<(), String> {
    let result: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if result == "ok" {
        Ok(())
    } else {
        Err(format!("SQLite integrity check failed: {result}"))
    }
}

fn finish_standalone_backup(connection: &Connection) -> Result<(), String> {
    connection
        .pragma_update(None, "journal_mode", "DELETE")
        .map_err(|error| error.to_string())?;
    verify_integrity(connection)
}

fn temporary_database_path(path: &Path, purpose: &str) -> PathBuf {
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("rocksoul.sqlite3");
    path.with_file_name(format!("{name}.{purpose}-{}.sqlite3", Uuid::new_v4()))
}

fn remove_database_files(path: &Path) -> Result<(), String> {
    for suffix in ["", "-wal", "-shm"] {
        let candidate = if suffix.is_empty() {
            path.to_path_buf()
        } else {
            let mut name = path.as_os_str().to_os_string();
            name.push(suffix);
            PathBuf::from(name)
        };
        match fs::remove_file(&candidate) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => {
                return Err(format!(
                    "Could not remove temporary SQLite file {}: {error}",
                    candidate.display()
                ))
            }
        }
    }
    Ok(())
}

pub fn backup_to_file(app: &AppHandle, target_path: &Path) -> Result<(), String> {
    let _access = acquire_exclusive_access()?;
    let source = connect_unlocked(app)?;
    let mut target = Connection::open(target_path).map_err(|error| error.to_string())?;
    target
        .busy_timeout(Duration::from_secs(5))
        .map_err(|error| error.to_string())?;
    backup_connection(&source, &mut target)?;
    finish_standalone_backup(&target)
}

fn restore_file_unlocked(app: &AppHandle, source_path: &Path) -> Result<(), String> {
    let source = Connection::open(source_path).map_err(|error| error.to_string())?;
    verify_integrity(&source)?;
    let mut target = connect_unlocked(app)?;
    backup_connection(&source, &mut target)?;
    initialize_connection(&target)?;
    verify_integrity(&target)
}

pub fn restore_from_file(app: &AppHandle, source_path: &Path) -> Result<(), String> {
    let _access = acquire_exclusive_access()?;
    let target_path = db_path(app)?;
    let rollback_path = temporary_database_path(&target_path, "restore-rollback");

    let backup_result = (|| {
        let current = connect_unlocked(app)?;
        let mut rollback = Connection::open(&rollback_path).map_err(|error| error.to_string())?;
        backup_connection(&current, &mut rollback)?;
        finish_standalone_backup(&rollback)
    })();
    if let Err(error) = backup_result {
        return match remove_database_files(&rollback_path) {
            Ok(()) => Err(format!("Could not preserve the current database: {error}")),
            Err(cleanup_error) => Err(format!(
                "Could not preserve the current database: {error}. Rollback cleanup failed: {cleanup_error}"
            )),
        };
    }

    let restore_result = restore_file_unlocked(app, source_path);
    if let Err(error) = restore_result {
        let rollback_result = restore_file_unlocked(app, &rollback_path);
        if let Err(rollback_error) = rollback_result {
            return Err(format!(
                "Database restore failed: {error}. Restoring the safety copy also failed: {rollback_error}. Safety copy retained at {}.",
                rollback_path.display()
            ));
        }
        return match remove_database_files(&rollback_path) {
            Ok(()) => Err(format!(
                "Database restore failed; the previous database was restored: {error}"
            )),
            Err(cleanup_error) => Err(format!(
                "Database restore failed; the previous database was restored: {error}. Safety copy cleanup failed: {cleanup_error}"
            )),
        };
    }

    remove_database_files(&rollback_path).map_err(|error| {
        format!("Database restore succeeded, but safety copy cleanup failed: {error}")
    })
}

fn migrate(connection: &Connection) -> Result<(), String> {
    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    transaction
        .execute_batch(include_str!("../migrations/001_init.sql"))
        .map_err(|error| error.to_string())?;
    let has_issues_table: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'issues')",
            [],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if has_issues_table {
        let closed_at_exists: bool = transaction
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM pragma_table_info('issues') WHERE name = 'closed_at')",
                [],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if !closed_at_exists {
            transaction
                .execute_batch(include_str!("../migrations/002_local_workflows.sql"))
                .map_err(|error| error.to_string())?;
        }
    }
    let version: i64 = transaction
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if version < 3 {
        transaction
            .execute_batch(include_str!("../migrations/003_google_drive_backup.sql"))
            .map_err(|error| error.to_string())?;
    }
    if version < 4 {
        transaction
            .execute_batch(include_str!("../migrations/004_continuity.sql"))
            .map_err(|error| error.to_string())?;
    }
    if version < 5 {
        transaction
            .execute_batch(include_str!("../migrations/005_agent_execution.sql"))
            .map_err(|error| error.to_string())?;
    }
    if version < 6 {
        transaction
            .execute_batch(include_str!("../migrations/006_orchestration.sql"))
            .map_err(|error| error.to_string())?;
    }
    if version < 7 {
        transaction
            .execute_batch(include_str!("../migrations/007_pen_and_companion.sql"))
            .map_err(|error| error.to_string())?;
    }
    transaction
        .pragma_update(None, "user_version", 7)
        .map_err(|error| error.to_string())?;
    crate::orm::init_orm_schema(&transaction)?;
    transaction.commit().map_err(|error| error.to_string())
}

pub fn record_event(
    connection: &Connection,
    kind: &str,
    message: &str,
    metadata: &str,
) -> Result<(), String> {
    connection
        .execute(
            "INSERT INTO events (id, kind, message, metadata) VALUES (?1, ?2, ?3, ?4)",
            params![Uuid::new_v4().to_string(), kind, message, metadata],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[allow(dead_code)]
const ROCKSOUL_POSTGRES_ENV_KEY: &str = "ROCKSOUL_DATABASE_URL";

#[allow(dead_code)]
fn is_loopback_postgres_host(host: &str) -> bool {
    matches!(
        host.to_ascii_lowercase().as_str(),
        "localhost" | "127.0.0.1" | "[::1]" | "::1"
    )
}

/// Validates that a PostgreSQL connection URL targets only a local workstation loopback host.
#[allow(dead_code)]
pub fn validate_private_postgres_url(url: &str) -> Result<(), String> {
    let parsed = Url::parse(url).map_err(|error| format!("Invalid PostgreSQL URL: {error}"))?;
    match parsed.scheme() {
        "postgres" | "postgresql" => {}
        scheme => {
            return Err(format!(
                "Unsupported ROCKSOUL PostgreSQL scheme '{scheme}'; expected postgres:// or postgresql://"
            ));
        }
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| "PostgreSQL URL must include a loopback host".to_string())?;
    if !is_loopback_postgres_host(host) {
        return Err(format!(
            "Refusing non-loopback PostgreSQL host '{host}': Zone C ROCKSOUL data must stay workstation-local"
        ));
    }

    if let Some((_, override_host)) = parsed.query_pairs().find(|(key, _)| key == "host") {
        if !is_loopback_postgres_host(&override_host) {
            return Err(format!(
                "Refusing non-loopback PostgreSQL host query override '{override_host}': Zone C ROCKSOUL data must stay workstation-local"
            ));
        }
    }

    Ok(())
}

/// Resolves and validates the optional workstation-local PostgreSQL URL from `ROCKSOUL_DATABASE_URL`.
#[allow(dead_code)]
pub fn resolve_rocksoul_postgres_url() -> Option<String> {
    let raw = std::env::var(ROCKSOUL_POSTGRES_ENV_KEY).ok()?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    validate_private_postgres_url(trimmed).ok()?;
    Some(trimmed.to_string())
}

/// Non-destructively exports table row counts from the local SQLite database for
/// source-to-target PostgreSQL migration reconciliation without modifying or deleting the source DB.
#[allow(dead_code)]
pub fn export_sqlite_reconciliation_manifest(
    connection: &Connection,
) -> Result<serde_json::Value, String> {
    const TABLES: [&str; 14] = [
        "workspaces",
        "projects",
        "repositories",
        "issues",
        "approvals",
        "agent_runs",
        "agent_execution_steps",
        "agent_supervisors",
        "orchestration_plans",
        "orchestration_tasks",
        "events",
        "pj_projects",
        "pj_tasks",
        "pj_sync_logs",
    ];
    let mut counts = serde_json::Map::new();
    let mut total_rows: i64 = 0;

    for table in TABLES {
        let query = format!("SELECT COUNT(*) FROM {table}");
        let count: i64 = connection
            .query_row(&query, [], |row| row.get(0))
            .map_err(|error| format!("Failed counting table {table}: {error}"))?;
        total_rows += count;
        counts.insert(table.to_string(), serde_json::json!(count));
    }

    Ok(serde_json::json!({
        "engine": "sqlite-source-snapshot",
        "tables": counts,
        "total_rows": total_rows,
    }))
}

#[cfg(test)]
mod tests {
    use super::{
        backup_connection, export_sqlite_reconciliation_manifest, migrate, remove_database_files,
        resolve_rocksoul_postgres_url, validate_private_postgres_url, verify_integrity,
    };
    use rusqlite::Connection;
    use std::{fs, path::PathBuf};
    use uuid::Uuid;

    #[test]
    fn online_backup_captures_wal_data_and_replaces_existing_database() {
        let directory = std::env::temp_dir();
        let source_path =
            directory.join(format!("rocksoul-backup-source-{}.sqlite3", Uuid::new_v4()));
        let target_path =
            directory.join(format!("rocksoul-backup-target-{}.sqlite3", Uuid::new_v4()));

        {
            let source = Connection::open(&source_path).expect("source database should open");
            source
                .pragma_update(None, "journal_mode", "WAL")
                .expect("source should enable WAL");
            source
                .execute_batch(
                    "CREATE TABLE sample (value TEXT); INSERT INTO sample VALUES ('wal value');",
                )
                .expect("source row should be written");

            let mut target = Connection::open(&target_path).expect("target database should open");
            target
                .execute_batch(
                    "CREATE TABLE sample (value TEXT); INSERT INTO sample VALUES ('old value');",
                )
                .expect("old target row should be written");
            backup_connection(&source, &mut target).expect("online backup should complete");
            verify_integrity(&target).expect("target database should be integral");

            let value: String = target
                .query_row("SELECT value FROM sample", [], |row| row.get(0))
                .expect("backed-up row should be readable");
            assert_eq!(value, "wal value");
        }

        remove_database_files(&source_path).expect("source files should be removed");
        remove_database_files(&target_path).expect("target files should be removed");
    }

    #[test]
    fn corrupt_restore_source_is_rejected_by_integrity_check() {
        let path: PathBuf =
            std::env::temp_dir().join(format!("rocksoul-corrupt-{}.sqlite3", Uuid::new_v4()));
        fs::write(&path, b"not a sqlite database").expect("test source should be written");
        let source = Connection::open(&path).expect("SQLite should open the file handle");
        assert!(verify_integrity(&source).is_err());
        drop(source);
        remove_database_files(&path).expect("test source should be removed");
    }

    #[test]
    fn initial_schema_creates_the_local_workflow_tables() {
        let connection = Connection::open_in_memory().expect("in-memory SQLite should open");
        connection
            .execute_batch(include_str!("../migrations/001_init.sql"))
            .expect("initial migration should apply");

        for table in ["workspaces", "projects", "repositories", "issues", "events"] {
            let exists: i64 = connection
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
                    [table],
                    |row| row.get(0),
                )
                .expect("table lookup should work");
            assert_eq!(exists, 1, "missing table: {table}");
        }
    }

    #[test]
    fn migration_preserves_existing_issues_and_is_idempotent() {
        let connection = Connection::open_in_memory().expect("in-memory SQLite should open");
        connection
            .execute_batch(include_str!("../migrations/001_init.sql"))
            .expect("base schema should apply");
        connection
            .execute(
                "INSERT INTO workspaces (id, name) VALUES ('local', 'Local')",
                [],
            )
            .expect("workspace should insert");
        connection.execute("INSERT INTO issues (id, issue_key, title) VALUES ('i1', 'DX-001', 'Existing issue')", [])
            .expect("existing issue should insert");
        migrate(&connection).expect("migration should apply");
        migrate(&connection).expect("repeat migration should be a no-op");

        let closed_at_column: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('issues') WHERE name = 'closed_at'",
                [],
                |row| row.get(0),
            )
            .expect("column metadata should load");
        let issue_title: String = connection
            .query_row("SELECT title FROM issues WHERE id = 'i1'", [], |row| {
                row.get(0)
            })
            .expect("existing issue should remain");
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("schema version should load");
        assert_eq!(closed_at_column, 1);
        let backup_table: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'cloud_backup_settings'",
                [],
                |row| row.get(0),
            )
            .expect("cloud backup settings table should exist");
        assert_eq!(issue_title, "Existing issue");
        assert_eq!(backup_table, 1);
        assert_eq!(version, 7);
        for table in [
            "memories",
            "memory_corrections",
            "memories_fts",
            "work_sessions",
            "resume_points",
            "experiences",
            "lessons",
            "agent_execution_steps",
            "agent_supervisors",
            "orchestration_plans",
            "orchestration_tasks",
            "studio_drafts",
            "research_claims",
            "companion_profiles",
        ] {
            let exists: i64 = connection
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type IN ('table', 'virtual') AND name = ?1",
                    [table],
                    |row| row.get(0),
                )
                .expect("continuity table lookup should work");
            assert_eq!(exists, 1, "missing continuity table: {table}");
        }
    }

    #[test]
    fn migration_from_the_legacy_schema_preserves_agent_tables_and_records() {
        let connection = Connection::open_in_memory().expect("in-memory SQLite should open");
        connection
            .execute_batch(include_str!("../migrations/001_init.sql"))
            .expect("legacy schema should apply");
        connection
            .execute(
                "INSERT INTO workspaces (id, name) VALUES ('local', 'Local')",
                [],
            )
            .expect("workspace should insert");
        connection.execute(
            "INSERT INTO issues (id, issue_key, title) VALUES ('i1', 'DX-001', 'Existing issue')",
            [],
        ).expect("legacy issue should insert");
        connection.execute(
            "INSERT INTO agents (id, name, role, provider, executable) VALUES ('a1', 'Legacy agent', 'builder', 'legacy', 'legacy')",
            [],
        ).expect("legacy agent record should insert");
        migrate(&connection).expect("additive migration should apply");

        let (issue_title, agent_name): (String, String) = connection.query_row(
            "SELECT issues.title, agents.name FROM issues JOIN agents ON agents.id = 'a1' WHERE issues.id = 'i1'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).expect("legacy records should remain");
        assert_eq!(issue_title, "Existing issue");
        assert_eq!(agent_name, "Legacy agent");
    }

    #[test]
    fn migration_repairs_a_partial_legacy_upgrade_without_losing_records() {
        let connection = Connection::open_in_memory().expect("in-memory SQLite should open");
        connection
            .execute_batch(include_str!("../migrations/001_init.sql"))
            .expect("base schema should apply");
        connection
            .execute(
                "INSERT INTO workspaces (id, name) VALUES ('local', 'Local')",
                [],
            )
            .expect("workspace should insert");
        connection
            .execute(
                "INSERT INTO issues (id, issue_key, title) VALUES ('i1', 'DX-001', 'Kept issue')",
                [],
            )
            .expect("issue should insert");
        migrate(&connection).expect("legacy migration should complete");
        migrate(&connection).expect("repeat migration should be idempotent");

        let closed_at_columns: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('issues') WHERE name = 'closed_at'",
                [],
                |row| row.get(0),
            )
            .expect("column metadata should load");
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("schema version should load");
        assert_eq!(closed_at_columns, 1);
        assert_eq!(version, 7);
        let title: String = connection
            .query_row("SELECT title FROM issues WHERE id = 'i1'", [], |row| {
                row.get(0)
            })
            .expect("legacy issue should remain");
        assert_eq!(title, "Kept issue");
    }

    #[test]
    fn migration_recognizes_an_already_upgraded_unversioned_database() {
        let connection = Connection::open_in_memory().expect("in-memory SQLite should open");
        connection
            .execute_batch(include_str!("../migrations/001_init.sql"))
            .expect("legacy schema should apply");
        connection
            .execute_batch(include_str!("../migrations/002_local_workflows.sql"))
            .expect("workflow migration should apply");
        connection.execute("INSERT INTO issues (id, issue_key, title) VALUES ('i1', 'DX-001', 'Existing issue')", [])
            .expect("existing issue should insert");

        migrate(&connection).expect("already-applied migration should be recognized");

        let closed_at_columns: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('issues') WHERE name = 'closed_at'",
                [],
                |row| row.get(0),
            )
            .expect("column metadata should load");
        let title: String = connection
            .query_row("SELECT title FROM issues WHERE id = 'i1'", [], |row| {
                row.get(0)
            })
            .expect("existing issue should remain");
        assert_eq!(closed_at_columns, 1);
        assert_eq!(title, "Existing issue");
    }

    #[test]
    fn validate_private_postgres_url_accepts_loopback_hosts() {
        for url in [
            "postgres://postgres@127.0.0.1:5432/rocksoul",
            "postgresql://localhost:5432/rocksoul",
            "postgres://postgres@[::1]:5432/rocksoul",
        ] {
            assert!(
                validate_private_postgres_url(url).is_ok(),
                "expected loopback PostgreSQL URL to be accepted: {url}"
            );
        }
    }

    #[test]
    fn validate_private_postgres_url_rejects_remote_hosts_and_non_postgres_schemes() {
        for url in [
            "postgres://user:pass@api.moonwitness.biz.id:5432/moonwitness",
            "postgresql://10.0.0.5:5432/rocksoul",
            "postgres://localhost:5432/rocksoul?host=api.moonwitness.biz.id",
            "postgres:///rocksoul",
            "mysql://localhost:3306/rocksoul",
            "sqlite:///tmp/rocksoul.sqlite3",
            "http://127.0.0.1:5432/rocksoul",
            "not-a-url",
        ] {
            assert!(
                validate_private_postgres_url(url).is_err(),
                "expected non-private or non-postgres URL to be rejected: {url}"
            );
        }
    }

    #[test]
    fn resolve_rocksoul_postgres_url_enforces_private_loopback_boundary() {
        let previous = std::env::var_os("ROCKSOUL_DATABASE_URL");
        struct EnvGuard(Option<std::ffi::OsString>);
        impl Drop for EnvGuard {
            fn drop(&mut self) {
                match self.0.take() {
                    Some(value) => std::env::set_var("ROCKSOUL_DATABASE_URL", value),
                    None => std::env::remove_var("ROCKSOUL_DATABASE_URL"),
                }
            }
        }
        let _guard = EnvGuard(previous);

        std::env::remove_var("ROCKSOUL_DATABASE_URL");
        assert_eq!(resolve_rocksoul_postgres_url(), None);

        std::env::set_var("ROCKSOUL_DATABASE_URL", "   ");
        assert_eq!(resolve_rocksoul_postgres_url(), None);

        std::env::set_var(
            "ROCKSOUL_DATABASE_URL",
            "postgres://user:pass@api.moonwitness.biz.id:5432/moonwitness",
        );
        assert_eq!(resolve_rocksoul_postgres_url(), None);

        std::env::set_var(
            "ROCKSOUL_DATABASE_URL",
            "  postgresql://localhost:5432/rocksoul  ",
        );
        assert_eq!(
            resolve_rocksoul_postgres_url().as_deref(),
            Some("postgresql://localhost:5432/rocksoul")
        );
    }

    #[test]
    fn export_sqlite_reconciliation_manifest_preserves_source_rows() {
        let connection = Connection::open_in_memory().expect("in-memory SQLite should open");
        migrate(&connection).expect("migrations should apply");
        connection
            .execute(
                "INSERT INTO workspaces (id, name) VALUES ('local', 'Local')",
                [],
            )
            .expect("workspace insert should succeed");
        connection
            .execute(
                "INSERT INTO issues (id, issue_key, title) VALUES ('i1', 'MW-288', 'PG migration')",
                [],
            )
            .expect("issue insert should succeed");

        let manifest = export_sqlite_reconciliation_manifest(&connection)
            .expect("reconciliation manifest should succeed");
        assert_eq!(manifest["engine"], "sqlite-source-snapshot");
        assert_eq!(manifest["tables"]["workspaces"], 1);
        assert_eq!(manifest["tables"]["issues"], 1);
        assert_eq!(manifest["total_rows"], 2);
    }
}
