use crate::db;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tauri::AppHandle;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestrationPlanRecord {
    pub id: String,
    pub objective: String,
    pub mode: String,
    pub status: String,
    pub concurrency_limit: i64,
    pub budget_seconds: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestrationTaskRecord {
    pub id: String,
    pub plan_id: String,
    pub task_index: i64,
    pub title: String,
    pub specialist_role: String,
    pub depends_on_task_id: Option<String>,
    pub agent_run_id: Option<String>,
    pub worktree_path: String,
    pub status: String,
    pub retry_count: i64,
    pub max_retries: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrchestrationTaskInput {
    pub title: String,
    pub specialist_role: String,
    pub depends_on_task_index: Option<i64>,
}

fn fetch_tasks_by_plan(
    connection: &db::DbConnection,
    plan_id: &str,
) -> Result<Vec<OrchestrationTaskRecord>, String> {
    let mut stmt = connection
        .prepare(
            "SELECT id, plan_id, task_index, title, specialist_role, depends_on_task_id, agent_run_id, worktree_path, status, retry_count, max_retries, created_at, updated_at
             FROM orchestration_tasks WHERE plan_id = ?1 ORDER BY task_index ASC",
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map(rusqlite::params![plan_id], |row| {
            Ok(OrchestrationTaskRecord {
                id: row.get(0)?,
                plan_id: row.get(1)?,
                task_index: row.get(2)?,
                title: row.get(3)?,
                specialist_role: row.get(4)?,
                depends_on_task_id: row.get(5)?,
                agent_run_id: row.get(6)?,
                worktree_path: row.get(7)?,
                status: row.get(8)?,
                retry_count: row.get(9)?,
                max_retries: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn create_orchestration_plan(
    app: AppHandle,
    objective: String,
    mode: String,
    concurrency_limit: i64,
    budget_seconds: i64,
) -> Result<OrchestrationPlanRecord, String> {
    let valid_modes = ["assisted", "supervised", "autonomous"];
    if !valid_modes.contains(&mode.as_str()) {
        return Err(format!("Invalid orchestration mode: {mode}"));
    }

    let connection = db::connect(&app)?;
    let plan_id = Uuid::new_v4().to_string();

    connection
        .execute(
            "INSERT INTO orchestration_plans (id, objective, mode, status, concurrency_limit, budget_seconds)
             VALUES (?1, ?2, ?3, 'planned', ?4, ?5)",
            rusqlite::params![plan_id, objective, mode, concurrency_limit, budget_seconds],
        )
        .map_err(|e| e.to_string())?;

    let record = connection
        .query_row(
            "SELECT id, objective, mode, status, concurrency_limit, budget_seconds, created_at, updated_at
             FROM orchestration_plans WHERE id = ?1",
            rusqlite::params![plan_id],
            |row| {
                Ok(OrchestrationPlanRecord {
                    id: row.get(0)?,
                    objective: row.get(1)?,
                    mode: row.get(2)?,
                    status: row.get(3)?,
                    concurrency_limit: row.get(4)?,
                    budget_seconds: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(record)
}

#[tauri::command]
pub fn add_orchestration_tasks(
    app: AppHandle,
    plan_id: String,
    tasks_json: String,
) -> Result<Vec<OrchestrationTaskRecord>, String> {
    let input_tasks: Vec<CreateOrchestrationTaskInput> =
        serde_json::from_str(&tasks_json).map_err(|e| format!("Invalid tasks JSON: {e}"))?;

    let connection = db::connect(&app)?;
    let transaction = connection
        .unchecked_transaction()
        .map_err(|e| e.to_string())?;

    let existing_count: i64 = transaction
        .query_row(
            "SELECT COUNT(*) FROM orchestration_tasks WHERE plan_id = ?1",
            rusqlite::params![plan_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let mut task_index = existing_count;

    for input in &input_tasks {
        task_index += 1;
        let task_id = Uuid::new_v4().to_string();
        let depends_on_id = if let Some(dep_idx) = input.depends_on_task_index {
            transaction
                .query_row(
                    "SELECT id FROM orchestration_tasks WHERE plan_id = ?1 AND task_index = ?2",
                    rusqlite::params![plan_id, dep_idx],
                    |row| row.get::<_, String>(0),
                )
                .ok()
        } else {
            None
        };

        transaction
            .execute(
                "INSERT INTO orchestration_tasks (id, plan_id, task_index, title, specialist_role, depends_on_task_id, status)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')",
                rusqlite::params![task_id, plan_id, task_index, input.title, input.specialist_role, depends_on_id],
            )
            .map_err(|e| e.to_string())?;
    }

    transaction.commit().map_err(|e| e.to_string())?;

    fetch_tasks_by_plan(&connection, &plan_id)
}

#[tauri::command]
pub fn get_orchestration_tasks(
    app: AppHandle,
    plan_id: String,
) -> Result<Vec<OrchestrationTaskRecord>, String> {
    let connection = db::connect(&app)?;
    fetch_tasks_by_plan(&connection, &plan_id)
}

#[tauri::command]
pub fn update_orchestration_plan_status(
    app: AppHandle,
    plan_id: String,
    status: String,
) -> Result<OrchestrationPlanRecord, String> {
    let valid_statuses = [
        "planned",
        "running",
        "paused",
        "completed",
        "failed",
        "cancelled",
    ];
    if !valid_statuses.contains(&status.as_str()) {
        return Err(format!("Invalid plan status: {status}"));
    }

    let connection = db::connect(&app)?;
    connection
        .execute(
            "UPDATE orchestration_plans SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            rusqlite::params![status, plan_id],
        )
        .map_err(|e| e.to_string())?;

    let record = connection
        .query_row(
            "SELECT id, objective, mode, status, concurrency_limit, budget_seconds, created_at, updated_at
             FROM orchestration_plans WHERE id = ?1",
            rusqlite::params![plan_id],
            |row| {
                Ok(OrchestrationPlanRecord {
                    id: row.get(0)?,
                    objective: row.get(1)?,
                    mode: row.get(2)?,
                    status: row.get(3)?,
                    concurrency_limit: row.get(4)?,
                    budget_seconds: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(record)
}

#[tauri::command]
pub fn step_orchestration_cycle(
    app: AppHandle,
    plan_id: String,
) -> Result<Vec<OrchestrationTaskRecord>, String> {
    let connection = db::connect(&app)?;
    let transaction = connection
        .unchecked_transaction()
        .map_err(|e| e.to_string())?;

    let mut completed_set = HashSet::new();
    {
        let mut stmt = transaction
            .prepare(
                "SELECT id FROM orchestration_tasks WHERE plan_id = ?1 AND status = 'completed'",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![plan_id], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        for row in rows.flatten() {
            completed_set.insert(row);
        }
    }

    let mut ready_candidates = Vec::new();
    {
        let mut stmt = transaction
            .prepare(
                "SELECT id, depends_on_task_id FROM orchestration_tasks WHERE plan_id = ?1 AND status = 'pending' ORDER BY task_index ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![plan_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
            })
            .map_err(|e| e.to_string())?;
        for row in rows.flatten() {
            ready_candidates.push(row);
        }
    }

    for (task_id, dep_id) in ready_candidates {
        let is_ready = match dep_id {
            None => true,
            Some(parent_id) => completed_set.contains(&parent_id),
        };

        if is_ready {
            transaction
                .execute(
                    "UPDATE orchestration_tasks SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                    rusqlite::params![task_id],
                )
                .map_err(|e| e.to_string())?;
        }
    }

    transaction.commit().map_err(|e| e.to_string())?;

    fetch_tasks_by_plan(&connection, &plan_id)
}
