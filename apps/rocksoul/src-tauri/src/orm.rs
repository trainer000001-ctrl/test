use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::mpsc::{self, Receiver, SyncSender};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use uuid::Uuid;

use crate::models::EdgeOrmSyncStatus;

pub const DEFAULT_EDGE_URL: &str = "https://moonwitness-edge-tasks.bjo163.workers.dev";
pub const DEFAULT_TENANT_ID: &str = "default";

pub const ORM_AUDIT_DDL: &str = r#"
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
"#;

pub const ORM_OUTBOX_DDL: &str = r#"
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
"#;

pub const PROJECT_MODELS_DDL: &str = r##"
CREATE TABLE IF NOT EXISTS pj_projects (
    id TEXT PRIMARY KEY,
    create_uid TEXT,
    create_date TEXT NOT NULL,
    write_uid TEXT,
    write_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    deleted_uid TEXT,
    deleted_date TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    source TEXT NOT NULL DEFAULT 'api',
    source_ref TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    project_status TEXT NOT NULL DEFAULT 'active',
    github_repo TEXT,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    _attrs TEXT NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pj_projects_tenant_code ON pj_projects (tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_pj_projects_status ON pj_projects (project_status);
CREATE INDEX IF NOT EXISTS idx_pj_projects_github_repo ON pj_projects (github_repo);

CREATE TABLE IF NOT EXISTS pj_tasks (
    id TEXT PRIMARY KEY,
    create_uid TEXT,
    create_date TEXT NOT NULL,
    write_uid TEXT,
    write_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    deleted_uid TEXT,
    deleted_date TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    source TEXT NOT NULL DEFAULT 'api',
    source_ref TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    project_code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'normal',
    task_status TEXT NOT NULL DEFAULT 'todo',
    estimated_hours REAL NOT NULL DEFAULT 0,
    assignee TEXT,
    labels TEXT NOT NULL DEFAULT '[]',
    due_date TEXT,
    github_issue_number INTEGER,
    github_repo TEXT,
    github_url TEXT,
    github_state TEXT,
    _attrs TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_pj_tasks_project_code ON pj_tasks (project_code);
CREATE INDEX IF NOT EXISTS idx_pj_tasks_priority ON pj_tasks (priority);
CREATE INDEX IF NOT EXISTS idx_pj_tasks_status ON pj_tasks (task_status);
CREATE INDEX IF NOT EXISTS idx_pj_tasks_tenant_proj_status ON pj_tasks (tenant_id, project_code, task_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pj_tasks_github_unique ON pj_tasks (tenant_id, github_repo, github_issue_number);

CREATE TABLE IF NOT EXISTS pj_sync_logs (
    id TEXT PRIMARY KEY,
    create_uid TEXT,
    create_date TEXT NOT NULL,
    write_uid TEXT,
    write_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    deleted_uid TEXT,
    deleted_date TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    source TEXT NOT NULL DEFAULT 'api',
    source_ref TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    repo TEXT NOT NULL,
    project_code TEXT NOT NULL,
    synced_count INTEGER NOT NULL DEFAULT 0,
    created_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'ok',
    error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_pj_sync_logs_tenant_repo ON pj_sync_logs (tenant_id, repo);

CREATE TABLE IF NOT EXISTS _orm_sync_state (
    key TEXT PRIMARY KEY,
    cursor TEXT,
    updated_at TEXT NOT NULL
);
"##;

#[derive(Debug, Clone)]
pub struct OrmActorContext {
    pub actor_id: String,
    pub tenant_id: String,
    pub source: String,
    pub request_id: String,
}

impl Default for OrmActorContext {
    fn default() -> Self {
        Self {
            actor_id: "rocksoul-desktop".to_string(),
            tenant_id: DEFAULT_TENANT_ID.to_string(),
            source: "api".to_string(),
            request_id: Uuid::new_v4().to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrmProjectInput {
    pub id: Option<String>,
    pub code: String,
    pub name: String,
    pub summary: String,
    pub project_status: String,
    pub github_repo: Option<String>,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrmProjectRecord {
    pub id: String,
    pub tenant_id: String,
    pub version: i64,
    pub status: String,
    pub create_date: String,
    pub write_date: String,
    pub code: String,
    pub name: String,
    pub summary: String,
    pub project_status: String,
    pub github_repo: Option<String>,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrmTaskInput {
    pub id: Option<String>,
    pub project_code: String,
    pub title: String,
    pub description: String,
    pub priority: String,
    pub task_status: String,
    pub estimated_hours: f64,
    pub assignee: Option<String>,
    pub labels: Vec<String>,
    pub due_date: Option<String>,
    pub github_issue_number: Option<i64>,
    pub github_repo: Option<String>,
    pub github_url: Option<String>,
    pub github_state: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrmTaskRecord {
    pub id: String,
    pub tenant_id: String,
    pub version: i64,
    pub status: String,
    pub create_date: String,
    pub write_date: String,
    pub project_code: String,
    pub title: String,
    pub description: String,
    pub priority: String,
    pub task_status: String,
    pub estimated_hours: f64,
    pub assignee: Option<String>,
    pub labels: Vec<String>,
    pub due_date: Option<String>,
    pub github_issue_number: Option<i64>,
    pub github_repo: Option<String>,
    pub github_url: Option<String>,
    pub github_state: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RemotePubsubEventEnvelope {
    ok: bool,
    cursor: Option<String>,
    #[serde(default)]
    projects: Vec<RemoteProjectDto>,
    #[serde(default)]
    tasks: Vec<RemoteTaskDto>,
}

#[derive(Debug, Deserialize)]
struct RemoteProjectDto {
    id: Option<String>,
    code: String,
    name: String,
    #[serde(default)]
    summary: String,
    #[serde(default = "default_active")]
    project_status: String,
    #[serde(default)]
    github_repo: Option<String>,
    #[serde(default = "default_color")]
    color: String,
}

#[derive(Debug, Deserialize)]
struct RemoteTaskDto {
    id: Option<String>,
    project_code: String,
    title: String,
    #[serde(default)]
    description: String,
    #[serde(default = "default_normal")]
    priority: String,
    #[serde(default = "default_todo")]
    task_status: String,
    #[serde(default)]
    estimated_hours: f64,
    #[serde(default)]
    assignee: Option<String>,
    #[serde(default)]
    labels: Vec<String>,
    #[serde(default)]
    due_date: Option<String>,
    #[serde(default)]
    github_issue_number: Option<i64>,
    #[serde(default)]
    github_repo: Option<String>,
    #[serde(default)]
    github_url: Option<String>,
    #[serde(default)]
    github_state: Option<String>,
}

fn default_active() -> String {
    "active".to_string()
}

fn default_color() -> String {
    "#3b82f6".to_string()
}

fn default_normal() -> String {
    "normal".to_string()
}

fn default_todo() -> String {
    "todo".to_string()
}

pub fn has_orm_tables(connection: &Connection) -> bool {
    connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'pj_tasks')",
            [],
            |row| row.get::<_, bool>(0),
        )
        .unwrap_or(false)
}

pub fn init_orm_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(ORM_AUDIT_DDL)
        .map_err(|e| e.to_string())?;
    connection
        .execute_batch(ORM_OUTBOX_DDL)
        .map_err(|e| e.to_string())?;
    connection
        .execute_batch(PROJECT_MODELS_DDL)
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn slugify_project_code(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let mut prev_dash = false;
    for ch in value.trim().to_ascii_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
            prev_dash = false;
        } else if !prev_dash && !out.is_empty() {
            out.push('-');
            prev_dash = true;
        }
    }
    let trimmed = out.trim_end_matches('-');
    let result = if trimmed.is_empty() {
        "project"
    } else {
        trimmed
    };
    result.chars().take(120).collect()
}

pub fn map_legacy_project_status_to_orm(status: &str) -> &'static str {
    match status {
        "paused" => "on_hold",
        "done" => "completed",
        "archived" => "archived",
        _ => "active",
    }
}

pub fn map_orm_project_status_to_legacy(status: &str) -> &'static str {
    match status {
        "on_hold" => "paused",
        "completed" => "done",
        "archived" => "archived",
        _ => "active",
    }
}

pub fn map_legacy_priority_to_orm(priority: &str) -> &'static str {
    match priority {
        "P0" => "critical",
        "P1" => "high",
        "P3" => "low",
        _ => "normal",
    }
}

pub fn map_orm_priority_to_legacy(priority: &str) -> &'static str {
    match priority {
        "critical" | "urgent" => "P0",
        "high" => "P1",
        "low" => "P3",
        _ => "P2",
    }
}

pub fn map_legacy_issue_status_to_orm(status: &str) -> &'static str {
    match status {
        "blocked" => "review",
        "done" | "closed" => "done",
        _ => "todo",
    }
}

pub fn map_orm_task_status_to_legacy(task_status: &str) -> &'static str {
    match task_status {
        "review" | "in_progress" => "blocked",
        "done" => "done",
        _ => "open",
    }
}

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

#[allow(clippy::too_many_arguments)]
fn record_audit_and_outbox(
    connection: &Connection,
    actor: &OrmActorContext,
    model: &str,
    entity_id: &str,
    action: &str,
    version: i64,
    payload: &serde_json::Value,
    enqueue_outbox: bool,
) -> Result<(), String> {
    let ts = now_iso();
    let payload_str = payload.to_string();
    connection
        .execute(
            "INSERT INTO _orm_audit_log (id, model, entity_id, action, changed_by, changed_at, diff, entity_version, source, request_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                Uuid::new_v4().to_string(),
                model,
                entity_id,
                action,
                actor.actor_id,
                ts,
                payload_str,
                version,
                actor.source,
                actor.request_id,
            ],
        )
        .map_err(|e| e.to_string())?;

    if enqueue_outbox {
        connection
            .execute(
                "INSERT INTO _orm_outbox_events (id, model, entity_id, action, tenant_id, actor_id, request_id, event_version, payload_json, status, attempts, next_attempt_at, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, 'pending', 0, ?9, ?9, ?9)",
                params![
                    Uuid::new_v4().to_string(),
                    model,
                    entity_id,
                    action,
                    actor.tenant_id,
                    actor.actor_id,
                    actor.request_id,
                    payload_str,
                    ts,
                ],
            )
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub struct ScopedProjectRepository<'a> {
    connection: &'a Connection,
    actor: OrmActorContext,
}

impl<'a> ScopedProjectRepository<'a> {
    pub fn for_actor(connection: &'a Connection, actor: OrmActorContext) -> Self {
        Self { connection, actor }
    }

    pub fn upsert(
        &self,
        input: &OrmProjectInput,
        enqueue_outbox: bool,
    ) -> Result<OrmProjectRecord, String> {
        let now = now_iso();
        let existing: Option<(String, i64, String)> = self
            .connection
            .query_row(
                "SELECT id, version, create_date FROM pj_projects WHERE tenant_id = ?1 AND code = ?2 LIMIT 1",
                params![self.actor.tenant_id, input.code],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()
            .map_err(|e| e.to_string())?;

        let (record_id, new_version, action, create_date) = match existing {
            Some((existing_id, prev_version, created)) => {
                let next_ver = prev_version + 1;
                let affected = self
                    .connection
                    .execute(
                        "UPDATE pj_projects
                         SET name = ?1, summary = ?2, project_status = ?3, github_repo = ?4, color = ?5,
                             write_uid = ?6, write_date = ?7, version = ?8, status = 'active'
                         WHERE id = ?9 AND tenant_id = ?10 AND version = ?11",
                        params![
                            input.name,
                            input.summary,
                            input.project_status,
                            input.github_repo,
                            input.color,
                            self.actor.actor_id,
                            now,
                            next_ver,
                            existing_id,
                            self.actor.tenant_id,
                            prev_version,
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                if affected == 0 {
                    return Err(format!(
                        "CONFLICT: optimistic lock version mismatch updating project {existing_id} (expected version {prev_version})"
                    ));
                }
                (existing_id, next_ver, "UPDATE", created)
            }
            None => {
                let new_id = input
                    .id
                    .as_deref()
                    .filter(|s| !s.trim().is_empty())
                    .map(str::to_string)
                    .unwrap_or_else(|| Uuid::new_v4().to_string());
                self.connection
                    .execute(
                        "INSERT INTO pj_projects (
                            id, create_uid, create_date, write_uid, write_date, status, version,
                            source, tenant_id, code, name, summary, project_status, github_repo, color
                        ) VALUES (?1, ?2, ?3, ?2, ?3, 'active', 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                        params![
                            new_id,
                            self.actor.actor_id,
                            now,
                            self.actor.source,
                            self.actor.tenant_id,
                            input.code,
                            input.name,
                            input.summary,
                            input.project_status,
                            input.github_repo,
                            input.color,
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                (new_id, 1, "CREATE", now.clone())
            }
        };

        let record = OrmProjectRecord {
            id: record_id.clone(),
            tenant_id: self.actor.tenant_id.clone(),
            version: new_version,
            status: "active".to_string(),
            create_date,
            write_date: now,
            code: input.code.clone(),
            name: input.name.clone(),
            summary: input.summary.clone(),
            project_status: input.project_status.clone(),
            github_repo: input.github_repo.clone(),
            color: input.color.clone(),
        };

        let payload = serde_json::to_value(&record).map_err(|e| e.to_string())?;
        record_audit_and_outbox(
            self.connection,
            &self.actor,
            "project.project",
            &record_id,
            action,
            new_version,
            &payload,
            enqueue_outbox,
        )?;

        Ok(record)
    }

    pub fn list(&self) -> Result<Vec<OrmProjectRecord>, String> {
        let mut stmt = self
            .connection
            .prepare(
                "SELECT id, tenant_id, version, status, create_date, write_date, code, name, summary, project_status, github_repo, color
                 FROM pj_projects
                 WHERE tenant_id = ?1 AND status != 'deleted'
                 ORDER BY write_date DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([&self.actor.tenant_id], |row| {
                Ok(OrmProjectRecord {
                    id: row.get(0)?,
                    tenant_id: row.get(1)?,
                    version: row.get(2)?,
                    status: row.get(3)?,
                    create_date: row.get(4)?,
                    write_date: row.get(5)?,
                    code: row.get(6)?,
                    name: row.get(7)?,
                    summary: row.get(8)?,
                    project_status: row.get(9)?,
                    github_repo: row.get(10)?,
                    color: row.get(11)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }
}

pub struct ScopedTaskRepository<'a> {
    connection: &'a Connection,
    actor: OrmActorContext,
}

impl<'a> ScopedTaskRepository<'a> {
    pub fn for_actor(connection: &'a Connection, actor: OrmActorContext) -> Self {
        Self { connection, actor }
    }

    pub fn upsert(
        &self,
        input: &OrmTaskInput,
        enqueue_outbox: bool,
    ) -> Result<OrmTaskRecord, String> {
        let now = now_iso();
        let labels_json = serde_json::to_string(&input.labels).map_err(|e| e.to_string())?;

        let existing_by_gh = match (&input.github_repo, input.github_issue_number) {
            (Some(repo), Some(num)) if !repo.trim().is_empty() => self
                .connection
                .query_row(
                    "SELECT id, version, create_date FROM pj_tasks WHERE tenant_id = ?1 AND github_repo = ?2 AND github_issue_number = ?3 LIMIT 1",
                    params![self.actor.tenant_id, repo, num],
                    |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, String>(2)?)),
                )
                .optional()
                .map_err(|e| e.to_string())?,
            _ => None,
        };

        let existing_by_id = if existing_by_gh.is_none() {
            if let Some(ref req_id) = input.id {
                self.connection
                    .query_row(
                        "SELECT id, version, create_date FROM pj_tasks WHERE tenant_id = ?1 AND id = ?2 LIMIT 1",
                        params![self.actor.tenant_id, req_id],
                        |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, String>(2)?)),
                    )
                    .optional()
                    .map_err(|e| e.to_string())?
            } else {
                None
            }
        } else {
            existing_by_gh
        };

        let existing = if existing_by_id.is_none() {
            self.connection
                .query_row(
                    "SELECT id, version, create_date FROM pj_tasks WHERE tenant_id = ?1 AND project_code = ?2 AND title = ?3 LIMIT 1",
                    params![self.actor.tenant_id, input.project_code, input.title],
                    |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, String>(2)?)),
                )
                .optional()
                .map_err(|e| e.to_string())?
        } else {
            existing_by_id
        };

        let (record_id, new_version, action, create_date) = match existing {
            Some((existing_id, prev_version, created)) => {
                let next_ver = prev_version + 1;
                let affected = self
                    .connection
                    .execute(
                        "UPDATE pj_tasks
                         SET project_code = ?1, title = ?2, description = ?3, priority = ?4, task_status = ?5,
                             estimated_hours = ?6, assignee = ?7, labels = ?8, due_date = ?9,
                             github_issue_number = ?10, github_repo = ?11, github_url = ?12, github_state = ?13,
                             write_uid = ?14, write_date = ?15, version = ?16, status = 'active'
                         WHERE id = ?17 AND tenant_id = ?18 AND version = ?19",
                        params![
                            input.project_code,
                            input.title,
                            input.description,
                            input.priority,
                            input.task_status,
                            input.estimated_hours,
                            input.assignee,
                            labels_json,
                            input.due_date,
                            input.github_issue_number,
                            input.github_repo,
                            input.github_url,
                            input.github_state,
                            self.actor.actor_id,
                            now,
                            next_ver,
                            existing_id,
                            self.actor.tenant_id,
                            prev_version,
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                if affected == 0 {
                    return Err(format!(
                        "CONFLICT: optimistic lock version mismatch updating task {existing_id} (expected version {prev_version})"
                    ));
                }
                (existing_id, next_ver, "UPDATE", created)
            }
            None => {
                let new_id = input
                    .id
                    .as_deref()
                    .filter(|s| !s.trim().is_empty())
                    .map(str::to_string)
                    .unwrap_or_else(|| Uuid::new_v4().to_string());
                self.connection
                    .execute(
                        "INSERT INTO pj_tasks (
                            id, create_uid, create_date, write_uid, write_date, status, version,
                            source, tenant_id, project_code, title, description, priority, task_status,
                            estimated_hours, assignee, labels, due_date, github_issue_number,
                            github_repo, github_url, github_state
                        ) VALUES (
                            ?1, ?2, ?3, ?2, ?3, 'active', 1,
                            ?4, ?5, ?6, ?7, ?8, ?9, ?10,
                            ?11, ?12, ?13, ?14, ?15,
                            ?16, ?17, ?18
                        )",
                        params![
                            new_id,
                            self.actor.actor_id,
                            now,
                            self.actor.source,
                            self.actor.tenant_id,
                            input.project_code,
                            input.title,
                            input.description,
                            input.priority,
                            input.task_status,
                            input.estimated_hours,
                            input.assignee,
                            labels_json,
                            input.due_date,
                            input.github_issue_number,
                            input.github_repo,
                            input.github_url,
                            input.github_state,
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                (new_id, 1, "CREATE", now.clone())
            }
        };

        let record = OrmTaskRecord {
            id: record_id.clone(),
            tenant_id: self.actor.tenant_id.clone(),
            version: new_version,
            status: "active".to_string(),
            create_date,
            write_date: now,
            project_code: input.project_code.clone(),
            title: input.title.clone(),
            description: input.description.clone(),
            priority: input.priority.clone(),
            task_status: input.task_status.clone(),
            estimated_hours: input.estimated_hours,
            assignee: input.assignee.clone(),
            labels: input.labels.clone(),
            due_date: input.due_date.clone(),
            github_issue_number: input.github_issue_number,
            github_repo: input.github_repo.clone(),
            github_url: input.github_url.clone(),
            github_state: input.github_state.clone(),
        };

        let payload = serde_json::to_value(&record).map_err(|e| e.to_string())?;
        record_audit_and_outbox(
            self.connection,
            &self.actor,
            "project.task",
            &record_id,
            action,
            new_version,
            &payload,
            enqueue_outbox,
        )?;

        Ok(record)
    }

    pub fn list(&self) -> Result<Vec<OrmTaskRecord>, String> {
        let mut stmt = self
            .connection
            .prepare(
                "SELECT id, tenant_id, version, status, create_date, write_date, project_code, title, description,
                        priority, task_status, estimated_hours, assignee, labels, due_date,
                        github_issue_number, github_repo, github_url, github_state
                 FROM pj_tasks
                 WHERE tenant_id = ?1 AND status != 'deleted'
                 ORDER BY write_date DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([&self.actor.tenant_id], |row| {
                let labels_raw: String = row.get(13)?;
                let labels = serde_json::from_str::<Vec<String>>(&labels_raw).unwrap_or_default();
                Ok(OrmTaskRecord {
                    id: row.get(0)?,
                    tenant_id: row.get(1)?,
                    version: row.get(2)?,
                    status: row.get(3)?,
                    create_date: row.get(4)?,
                    write_date: row.get(5)?,
                    project_code: row.get(6)?,
                    title: row.get(7)?,
                    description: row.get(8)?,
                    priority: row.get(9)?,
                    task_status: row.get(10)?,
                    estimated_hours: row.get(11)?,
                    assignee: row.get(12)?,
                    labels,
                    due_date: row.get(14)?,
                    github_issue_number: row.get(15)?,
                    github_repo: row.get(16)?,
                    github_url: row.get(17)?,
                    github_state: row.get(18)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }
}

pub fn mirror_legacy_project_to_orm(
    connection: &Connection,
    project_id: &str,
    name: &str,
    summary: &str,
    legacy_status: &str,
    enqueue_outbox: bool,
) -> Result<Option<OrmProjectRecord>, String> {
    if !has_orm_tables(connection) {
        return Ok(None);
    }
    let repo = ScopedProjectRepository::for_actor(connection, OrmActorContext::default());
    let input = OrmProjectInput {
        id: Some(project_id.to_string()),
        code: slugify_project_code(name),
        name: name.to_string(),
        summary: summary.to_string(),
        project_status: map_legacy_project_status_to_orm(legacy_status).to_string(),
        github_repo: None,
        color: "#3b82f6".to_string(),
    };
    repo.upsert(&input, enqueue_outbox).map(Some)
}

#[allow(clippy::too_many_arguments)]
pub fn mirror_legacy_issue_to_orm(
    connection: &Connection,
    issue_id: &str,
    project_id: Option<&str>,
    title: &str,
    description: &str,
    legacy_priority: &str,
    legacy_status: &str,
    enqueue_outbox: bool,
) -> Result<Option<OrmTaskRecord>, String> {
    if !has_orm_tables(connection) {
        return Ok(None);
    }
    let project_code = if let Some(pid) = project_id {
        let found_name: Option<String> = connection
            .query_row("SELECT name FROM projects WHERE id = ?1", [pid], |row| {
                row.get(0)
            })
            .optional()
            .map_err(|e| e.to_string())?;
        found_name
            .map(|n| slugify_project_code(&n))
            .unwrap_or_else(|| "rocksoul-local".to_string())
    } else {
        "rocksoul-local".to_string()
    };

    let proj_repo = ScopedProjectRepository::for_actor(connection, OrmActorContext::default());
    if proj_repo
        .list()?
        .into_iter()
        .all(|p| p.code != project_code)
    {
        let _ = proj_repo.upsert(
            &OrmProjectInput {
                id: project_id.map(str::to_string),
                code: project_code.clone(),
                name: project_code.clone(),
                summary: "ROCKSOUL Workspace Project".to_string(),
                project_status: "active".to_string(),
                github_repo: None,
                color: "#3b82f6".to_string(),
            },
            enqueue_outbox,
        )?;
    }

    let task_repo = ScopedTaskRepository::for_actor(connection, OrmActorContext::default());
    task_repo
        .upsert(
            &OrmTaskInput {
                id: Some(issue_id.to_string()),
                project_code,
                title: title.to_string(),
                description: description.to_string(),
                priority: map_legacy_priority_to_orm(legacy_priority).to_string(),
                task_status: map_legacy_issue_status_to_orm(legacy_status).to_string(),
                estimated_hours: 0.0,
                assignee: None,
                labels: Vec::new(),
                due_date: None,
                github_issue_number: None,
                github_repo: None,
                github_url: None,
                github_state: None,
            },
            enqueue_outbox,
        )
        .map(Some)
}

pub fn soft_delete_orm_task(connection: &Connection, task_id: &str) -> Result<(), String> {
    if !has_orm_tables(connection) {
        return Ok(());
    }
    let actor = OrmActorContext::default();
    let existing_version: Option<i64> = connection
        .query_row(
            "SELECT version FROM pj_tasks WHERE id = ?1 AND tenant_id = ?2 AND status != 'deleted' LIMIT 1",
            params![task_id, actor.tenant_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    let Some(prev_version) = existing_version else {
        return Ok(());
    };
    let next_ver = prev_version + 1;
    let now = now_iso();
    let affected = connection
        .execute(
            "UPDATE pj_tasks
             SET status = 'deleted', deleted_uid = ?1, deleted_date = ?2, write_uid = ?1, write_date = ?2, version = ?3
             WHERE id = ?4 AND tenant_id = ?5 AND version = ?6",
            params![actor.actor_id, now, next_ver, task_id, actor.tenant_id, prev_version],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err(format!(
            "CONFLICT: optimistic lock version mismatch deleting task {task_id}"
        ));
    }
    let payload = serde_json::json!({ "id": task_id, "status": "deleted", "version": next_ver });
    record_audit_and_outbox(
        connection,
        &actor,
        "project.task",
        task_id,
        "DELETE",
        next_ver,
        &payload,
        true,
    )?;
    Ok(())
}

pub fn soft_delete_orm_project(connection: &Connection, project_id: &str) -> Result<(), String> {
    if !has_orm_tables(connection) {
        return Ok(());
    }
    let actor = OrmActorContext::default();
    let existing_version: Option<i64> = connection
        .query_row(
            "SELECT version FROM pj_projects WHERE id = ?1 AND tenant_id = ?2 AND status != 'deleted' LIMIT 1",
            params![project_id, actor.tenant_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    let Some(prev_version) = existing_version else {
        return Ok(());
    };
    let next_ver = prev_version + 1;
    let now = now_iso();
    let affected = connection
        .execute(
            "UPDATE pj_projects
             SET status = 'deleted', deleted_uid = ?1, deleted_date = ?2, write_uid = ?1, write_date = ?2, version = ?3
             WHERE id = ?4 AND tenant_id = ?5 AND version = ?6",
            params![actor.actor_id, now, next_ver, project_id, actor.tenant_id, prev_version],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err(format!(
            "CONFLICT: optimistic lock version mismatch deleting project {project_id}"
        ));
    }
    let payload = serde_json::json!({ "id": project_id, "status": "deleted", "version": next_ver });
    record_audit_and_outbox(
        connection,
        &actor,
        "project.project",
        project_id,
        "DELETE",
        next_ver,
        &payload,
        true,
    )?;
    Ok(())
}

/// Mirrors `pj_projects` and `pj_tasks` rows into ROCKSOUL's local `projects` and `issues`
/// tables inside one SQLite transaction so every UI panel displays synchronized ORM state.
pub fn sync_orm_to_legacy_tables(connection: &mut Connection) -> Result<(), String> {
    let actor = OrmActorContext::default();
    let projects = ScopedProjectRepository::for_actor(connection, actor.clone()).list()?;
    let tasks = ScopedTaskRepository::for_actor(connection, actor).list()?;

    let tx = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT OR IGNORE INTO workspaces (id, name, root_path) VALUES ('local', 'LOCAL WORKSPACE', NULL)",
        [],
    )
    .map_err(|e| e.to_string())?;

    let mut code_to_project_id = std::collections::HashMap::new();
    for proj in &projects {
        let legacy_status = map_orm_project_status_to_legacy(&proj.project_status);
        let existing_id: Option<String> = tx
            .query_row(
                "SELECT id FROM projects WHERE id = ?1 OR LOWER(name) = LOWER(?2) LIMIT 1",
                params![proj.id, proj.name],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;

        let target_id = match existing_id {
            Some(eid) => {
                tx.execute(
                    "UPDATE projects SET name = ?1, description = ?2, status = ?3 WHERE id = ?4",
                    params![proj.name, proj.summary, legacy_status, eid],
                )
                .map_err(|e| e.to_string())?;
                eid
            }
            None => {
                tx.execute(
                    "INSERT INTO projects (id, workspace_id, name, description, status) VALUES (?1, 'local', ?2, ?3, ?4)",
                    params![proj.id, proj.name, proj.summary, legacy_status],
                )
                .map_err(|e| e.to_string())?;
                proj.id.clone()
            }
        };
        code_to_project_id.insert(proj.code.clone(), target_id);
    }

    let mut next_edge_seq: i64 = tx
        .query_row(
            "SELECT COALESCE(MAX(CAST(SUBSTR(issue_key, 4) AS INTEGER)), 0) + 1
             FROM issues WHERE issue_key GLOB 'DX-[0-9]*'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(1);
    let mut used_keys: HashSet<String> = {
        let mut stmt = tx
            .prepare("SELECT issue_key FROM issues")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        rows.filter_map(Result::ok).collect()
    };

    for task in &tasks {
        let legacy_priority = map_orm_priority_to_legacy(&task.priority);
        let legacy_status = map_orm_task_status_to_legacy(&task.task_status);
        let mapped_project_id = code_to_project_id.get(&task.project_code).cloned();

        let existing_by_id: Option<String> = tx
            .query_row(
                "SELECT id FROM issues WHERE id = ?1 LIMIT 1",
                [&task.id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;

        let desired_key = match task.github_issue_number {
            Some(num) => format!("GH-{num}"),
            None => {
                let mut candidate = format!("DX-{next_edge_seq:03}");
                while used_keys.contains(&candidate) {
                    next_edge_seq += 1;
                    candidate = format!("DX-{next_edge_seq:03}");
                }
                next_edge_seq += 1;
                candidate
            }
        };

        let existing_id = if existing_by_id.is_some() {
            existing_by_id
        } else if task.github_issue_number.is_some() {
            tx.query_row(
                "SELECT id FROM issues WHERE issue_key = ?1 LIMIT 1",
                [&desired_key],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
        } else {
            tx.query_row(
                "SELECT id FROM issues WHERE title = ?1 LIMIT 1",
                [&task.title],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
        };

        match existing_id {
            Some(eid) => {
                tx.execute(
                    "UPDATE issues SET title = ?1, description = ?2, priority = ?3, status = ?4,
                     project_id = COALESCE(?5, project_id), updated_at = ?6 WHERE id = ?7",
                    params![
                        task.title,
                        task.description,
                        legacy_priority,
                        legacy_status,
                        mapped_project_id,
                        task.write_date,
                        eid,
                    ],
                )
                .map_err(|e| e.to_string())?;
            }
            None => {
                let final_key = if used_keys.contains(&desired_key) {
                    format!("ORM-{}", task.id.chars().take(8).collect::<String>())
                } else {
                    desired_key.clone()
                };
                used_keys.insert(final_key.clone());
                tx.execute(
                    "INSERT INTO issues (id, issue_key, title, description, priority, status, assignee, project_id, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    params![
                        task.id,
                        final_key,
                        task.title,
                        task.description,
                        legacy_priority,
                        legacy_status,
                        task.assignee.as_deref().unwrap_or(""),
                        mapped_project_id,
                        task.write_date,
                    ],
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())
}

pub fn resolve_edge_url(override_url: Option<&str>) -> String {
    if let Some(url) = override_url {
        let trimmed = url.trim().trim_end_matches('/');
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    if let Ok(env_url) = std::env::var("MOONWITNESS_EDGE_URL") {
        let trimmed = env_url.trim().trim_end_matches('/');
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    DEFAULT_EDGE_URL.to_string()
}

pub fn read_sync_cursor(connection: &Connection) -> Result<Option<String>, String> {
    connection
        .query_row(
            "SELECT cursor FROM _orm_sync_state WHERE key = 'edge_pubsub'",
            [],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()
        .map(|opt| opt.flatten())
        .map_err(|e| e.to_string())
}

fn write_sync_cursor(connection: &Connection, cursor: Option<&str>) -> Result<(), String> {
    let now = now_iso();
    connection
        .execute(
            "INSERT INTO _orm_sync_state (key, cursor, updated_at)
             VALUES ('edge_pubsub', ?1, ?2)
             ON CONFLICT(key) DO UPDATE SET cursor = excluded.cursor, updated_at = excluded.updated_at",
            params![cursor, now],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Bi-directional realtime pub/sub sync between ROCKSOUL's Rust ORM and `@moonwitness/edge`.
pub fn sync_with_edge_pubsub(
    connection: &mut Connection,
    edge_url_override: Option<&str>,
    since_override: Option<&str>,
) -> Result<EdgeOrmSyncStatus, String> {
    init_orm_schema(connection)?;
    let edge_url = resolve_edge_url(edge_url_override);
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(6))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    // 1. Flush pending local _orm_outbox_events ready for delivery to /api/pubsub/publish
    let mut pending_ids: Vec<String> = Vec::new();
    let mut outbox_projects: Vec<serde_json::Value> = Vec::new();
    let mut outbox_tasks: Vec<serde_json::Value> = Vec::new();
    let dispatch_now = now_iso();
    {
        let mut stmt = connection
            .prepare(
                "SELECT id, model, payload_json FROM _orm_outbox_events
                 WHERE status = 'pending' AND next_attempt_at <= ?1 AND model IN ('project.project', 'project.task')
                 ORDER BY created_at ASC LIMIT 100",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([&dispatch_now], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(|e| e.to_string())?;
        for item in rows {
            let (id, model, payload_str) = item.map_err(|e| e.to_string())?;
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&payload_str) {
                if model == "project.project" {
                    outbox_projects.push(parsed);
                } else if model == "project.task" {
                    outbox_tasks.push(parsed);
                }
            }
            pending_ids.push(id);
        }
    }

    let mut outbox_pushed: i64 = 0;
    if !outbox_projects.is_empty() || !outbox_tasks.is_empty() {
        let publish_resp = client
            .post(format!("{edge_url}/api/pubsub/publish"))
            .json(&serde_json::json!({
                "projects": outbox_projects,
                "tasks": outbox_tasks,
            }))
            .send();
        let now = now_iso();
        match publish_resp {
            Ok(resp) if resp.status().is_success() => {
                for id in &pending_ids {
                    let _ = connection.execute(
                        "UPDATE _orm_outbox_events SET status = 'delivered', attempts = attempts + 1, last_error = NULL, updated_at = ?1 WHERE id = ?2",
                        params![now, id],
                    );
                }
                outbox_pushed = (outbox_projects.len() + outbox_tasks.len()) as i64;
            }
            Ok(resp) => {
                let err_msg = format!("HTTP {}", resp.status());
                let next_retry = (Utc::now() + chrono::Duration::seconds(30)).to_rfc3339();
                for id in &pending_ids {
                    let _ = connection.execute(
                        "UPDATE _orm_outbox_events
                         SET attempts = attempts + 1,
                             status = CASE WHEN attempts + 1 >= 5 THEN 'dead_letter' ELSE 'pending' END,
                             next_attempt_at = ?1,
                             last_error = ?2,
                             updated_at = ?3
                         WHERE id = ?4",
                        params![next_retry, err_msg, now, id],
                    );
                }
            }
            Err(err) => {
                let err_msg = err.to_string();
                let next_retry = (Utc::now() + chrono::Duration::seconds(30)).to_rfc3339();
                for id in &pending_ids {
                    let _ = connection.execute(
                        "UPDATE _orm_outbox_events
                         SET attempts = attempts + 1,
                             status = CASE WHEN attempts + 1 >= 5 THEN 'dead_letter' ELSE 'pending' END,
                             next_attempt_at = ?1,
                             last_error = ?2,
                             updated_at = ?3
                         WHERE id = ?4",
                        params![next_retry, err_msg, now, id],
                    );
                }
            }
        }
    }

    // 2. Pull incremental pub/sub events from /api/pubsub/events
    let stored_cursor = read_sync_cursor(connection)?;
    let effective_since = since_override
        .map(str::to_string)
        .or_else(|| stored_cursor.clone());
    let events_url = format!("{edge_url}/api/pubsub/events");
    let mut request_builder = client.get(&events_url);
    if let Some(ref since_val) = effective_since {
        request_builder = request_builder.query(&[("since", since_val.as_str())]);
    }

    let response = match request_builder.send() {
        Ok(resp) => resp,
        Err(err) => {
            return Ok(EdgeOrmSyncStatus {
                connected: false,
                edge_url,
                cursor: stored_cursor,
                projects_synced: 0,
                tasks_synced: 0,
                outbox_pushed,
                last_synced_at: None,
                error: Some(format!("Edge pub/sub unreachable: {err}")),
            });
        }
    };

    if !response.status().is_success() {
        let status = response.status();
        return Ok(EdgeOrmSyncStatus {
            connected: false,
            edge_url,
            cursor: stored_cursor,
            projects_synced: 0,
            tasks_synced: 0,
            outbox_pushed,
            last_synced_at: None,
            error: Some(format!("Edge pub/sub returned HTTP {status}")),
        });
    }

    let envelope = response
        .json::<RemotePubsubEventEnvelope>()
        .map_err(|e| format!("Invalid Edge pub/sub JSON: {e}"))?;

    if !envelope.ok {
        return Ok(EdgeOrmSyncStatus {
            connected: false,
            edge_url,
            cursor: stored_cursor,
            projects_synced: 0,
            tasks_synced: 0,
            outbox_pushed,
            last_synced_at: None,
            error: Some("Edge pub/sub returned ok=false".to_string()),
        });
    }

    let actor = OrmActorContext {
        actor_id: "edge-pubsub".to_string(),
        tenant_id: DEFAULT_TENANT_ID.to_string(),
        source: "sync".to_string(),
        request_id: Uuid::new_v4().to_string(),
    };
    let proj_repo = ScopedProjectRepository::for_actor(connection, actor.clone());
    let mut projects_synced: i64 = 0;
    for proj in &envelope.projects {
        proj_repo.upsert(
            &OrmProjectInput {
                id: proj.id.clone(),
                code: proj.code.clone(),
                name: proj.name.clone(),
                summary: proj.summary.clone(),
                project_status: proj.project_status.clone(),
                github_repo: proj.github_repo.clone(),
                color: proj.color.clone(),
            },
            false,
        )?;
        projects_synced += 1;
    }

    let task_repo = ScopedTaskRepository::for_actor(connection, actor);
    let mut tasks_synced: i64 = 0;
    for task in &envelope.tasks {
        task_repo.upsert(
            &OrmTaskInput {
                id: task.id.clone(),
                project_code: task.project_code.clone(),
                title: task.title.clone(),
                description: task.description.clone(),
                priority: task.priority.clone(),
                task_status: task.task_status.clone(),
                estimated_hours: task.estimated_hours,
                assignee: task.assignee.clone(),
                labels: task.labels.clone(),
                due_date: task.due_date.clone(),
                github_issue_number: task.github_issue_number,
                github_repo: task.github_repo.clone(),
                github_url: task.github_url.clone(),
                github_state: task.github_state.clone(),
            },
            false,
        )?;
        tasks_synced += 1;
    }

    if projects_synced > 0 || tasks_synced > 0 {
        sync_orm_to_legacy_tables(connection)?;
    }

    let next_cursor = envelope.cursor.or(stored_cursor);
    write_sync_cursor(connection, next_cursor.as_deref())?;

    Ok(EdgeOrmSyncStatus {
        connected: true,
        edge_url,
        cursor: next_cursor,
        projects_synced,
        tasks_synced,
        outbox_pushed,
        last_synced_at: Some(now_iso()),
        error: None,
    })
}

static SYNC_WAKE_TX: OnceLock<Mutex<Option<SyncSender<()>>>> = OnceLock::new();

pub fn register_edge_sync_wakeup() -> Receiver<()> {
    let (tx, rx) = mpsc::sync_channel(8);
    let slot = SYNC_WAKE_TX.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = slot.lock() {
        *guard = Some(tx);
    }
    rx
}

pub fn notify_edge_sync() {
    if let Some(slot) = SYNC_WAKE_TX.get() {
        if let Ok(guard) = slot.lock() {
            if let Some(tx) = guard.as_ref() {
                let _ = tx.try_send(());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        init_orm_schema, mirror_legacy_issue_to_orm, mirror_legacy_project_to_orm,
        slugify_project_code, sync_orm_to_legacy_tables, OrmActorContext, OrmProjectInput,
        OrmTaskInput, ScopedProjectRepository, ScopedTaskRepository,
    };
    use rusqlite::Connection;

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory SQLite should open");
        conn.execute_batch(include_str!("../migrations/001_init.sql"))
            .expect("001_init should apply");
        init_orm_schema(&conn).expect("ORM schema should apply");
        conn
    }

    #[test]
    fn scoped_orm_repositories_create_update_audit_and_outbox() {
        let mut conn = setup_conn();
        let actor = OrmActorContext::default();
        let project_repo = ScopedProjectRepository::for_actor(&conn, actor.clone());

        let created = project_repo
            .upsert(
                &OrmProjectInput {
                    id: None,
                    code: slugify_project_code("A-L-L-A-H/moonwitness"),
                    name: "A-L-L-A-H/moonwitness".to_string(),
                    summary: "Core monorepo".to_string(),
                    project_status: "active".to_string(),
                    github_repo: Some("A-L-L-A-H/moonwitness".to_string()),
                    color: "#6366f1".to_string(),
                },
                true,
            )
            .expect("project should create");
        assert_eq!(created.code, "a-l-l-a-h-moonwitness");
        assert_eq!(created.version, 1);

        let updated = project_repo
            .upsert(
                &OrmProjectInput {
                    id: None,
                    code: created.code.clone(),
                    name: "MoonWitness Core".to_string(),
                    summary: "Updated".to_string(),
                    project_status: "active".to_string(),
                    github_repo: Some("A-L-L-A-H/moonwitness".to_string()),
                    color: "#6366f1".to_string(),
                },
                true,
            )
            .expect("project upsert should increment version");
        assert_eq!(updated.id, created.id);
        assert_eq!(updated.version, 2);

        let task_repo = ScopedTaskRepository::for_actor(&conn, actor);
        let task = task_repo
            .upsert(
                &OrmTaskInput {
                    id: None,
                    project_code: created.code.clone(),
                    title: "#288 Standardize PG".to_string(),
                    description: "Synced task".to_string(),
                    priority: "high".to_string(),
                    task_status: "done".to_string(),
                    estimated_hours: 4.0,
                    assignee: Some("bjo163".to_string()),
                    labels: vec!["p1".to_string()],
                    due_date: None,
                    github_issue_number: Some(288),
                    github_repo: Some("A-L-L-A-H/moonwitness".to_string()),
                    github_url: Some(
                        "https://github.com/A-L-L-A-H/moonwitness/issues/288".to_string(),
                    ),
                    github_state: Some("closed".to_string()),
                },
                false,
            )
            .expect("task should create");
        assert_eq!(task.version, 1);

        let audit_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM _orm_audit_log", [], |row| row.get(0))
            .unwrap();
        let outbox_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM _orm_outbox_events", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(audit_count, 3);
        assert_eq!(outbox_count, 2);

        sync_orm_to_legacy_tables(&mut conn).expect("legacy projection should succeed");
        let issue_key: String = conn
            .query_row(
                "SELECT issue_key FROM issues WHERE id = ?1",
                [&task.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(issue_key, "GH-288");
    }

    #[test]
    fn legacy_project_and_issue_writes_mirror_to_orm_and_outbox() {
        let conn = setup_conn();
        conn.execute(
            "INSERT OR IGNORE INTO workspaces (id, name) VALUES ('local', 'Local')",
            [],
        )
        .unwrap();
        let proj = mirror_legacy_project_to_orm(
            &conn,
            "proj-1",
            "Local Sprint",
            "Desktop tasks",
            "active",
            true,
        )
        .expect("project mirror should succeed")
        .expect("orm schema should be active");
        assert_eq!(proj.code, "local-sprint");

        conn.execute(
            "INSERT INTO projects (id, workspace_id, name, description) VALUES ('proj-1', 'local', 'Local Sprint', 'Desktop tasks')",
            [],
        )
        .unwrap();
        let task = mirror_legacy_issue_to_orm(
            &conn,
            "iss-1",
            Some("proj-1"),
            "Build Rust ORM",
            "Identical schema",
            "P1",
            "open",
            true,
        )
        .expect("issue mirror should succeed")
        .expect("orm schema should be active");
        assert_eq!(task.project_code, "local-sprint");
        assert_eq!(task.priority, "high");
        assert_eq!(task.task_status, "todo");

        let pending_outbox: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM _orm_outbox_events WHERE status = 'pending'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(pending_outbox >= 2);
    }
}
