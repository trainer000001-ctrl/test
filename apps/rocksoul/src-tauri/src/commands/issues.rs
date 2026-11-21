use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use std::path::Path;
use tauri::AppHandle;
use uuid::Uuid;

use crate::{db, models::Issue};

pub fn query_issues(connection: &Connection) -> Result<Vec<Issue>, String> {
    let mut statement = connection
        .prepare(
            "SELECT i.id, i.issue_key, i.title, i.description, i.priority, i.status, i.assignee,
                i.project_id, i.repository_id, r.name, i.updated_at
         FROM issues i LEFT JOIN repositories r ON r.id = i.repository_id
         ORDER BY i.updated_at DESC LIMIT 250",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(Issue {
                id: row.get(0)?,
                issue_key: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                priority: row.get(4)?,
                status: row.get(5)?,
                assignee: row.get(6)?,
                project_id: row.get(7)?,
                repository_id: row.get(8)?,
                repository_name: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn next_issue_key(connection: &Connection) -> Result<String, String> {
    let next_number: i64 = connection
        .query_row(
            "SELECT COALESCE(MAX(CAST(SUBSTR(issue_key, 4) AS INTEGER)), 0) + 1
         FROM issues
         WHERE issue_key GLOB 'DX-[0-9]*'",
            [],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    Ok(format!("DX-{next_number:03}"))
}

fn validate_issue_status(status: &str) -> Result<(), String> {
    if ["open", "blocked", "done", "closed"].contains(&status) {
        Ok(())
    } else {
        Err("Unsupported issue status.".into())
    }
}

#[tauri::command]
pub async fn list_issues(app: AppHandle) -> Result<Vec<Issue>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let connection = db::connect(&app)?;
        query_issues(&connection)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn create_issue(
    app: AppHandle,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    project_id: Option<String>,
    repository_id: Option<String>,
) -> Result<Issue, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let chosen_priority = priority.unwrap_or_else(|| "P2".into());
        let mut connection = db::connect(&app)?;
        let description = description.unwrap_or_default();
        let created = create_issue_with_connection(
            &mut connection,
            &title,
            &description,
            &chosen_priority,
            project_id.as_deref(),
            repository_id.as_deref(),
        )?;
        crate::orm::notify_edge_sync();
        Ok(created)
    })
    .await
    .map_err(|error| error.to_string())?
}

fn create_issue_with_connection(
    connection: &mut Connection,
    title: &str,
    description: &str,
    priority: &str,
    project_id: Option<&str>,
    repository_id: Option<&str>,
) -> Result<Issue, String> {
    let clean_title = title.trim();
    if clean_title.is_empty() {
        return Err("Issue title cannot be empty.".into());
    }
    if !["P0", "P1", "P2", "P3"].contains(&priority) {
        return Err("Priority must be P0, P1, P2, or P3.".into());
    }
    let id = Uuid::new_v4().to_string();
    let issue_key;
    {
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        validate_optional_reference(&transaction, "projects", project_id, "project")?;
        validate_optional_reference(&transaction, "repositories", repository_id, "repository")?;
        if let Some(repository_id) = repository_id {
            let repository_path: String = transaction
                .query_row(
                    "SELECT path FROM repositories WHERE id = ?1",
                    [repository_id],
                    |row| row.get(0),
                )
                .map_err(|error| error.to_string())?;
            if !Path::new(&repository_path).is_dir() {
                return Err("Repository folder is unavailable.".into());
            }
        }
        issue_key = next_issue_key(&transaction)?;
        transaction.execute(
            "INSERT INTO issues (id, issue_key, title, description, priority, status, project_id, repository_id) VALUES (?1, ?2, ?3, ?4, ?5, 'open', ?6, ?7)",
            params![id, issue_key, clean_title, description, priority, project_id, repository_id],
        ).map_err(|error| error.to_string())?;
        crate::orm::mirror_legacy_issue_to_orm(
            &transaction,
            &id,
            project_id,
            clean_title,
            description,
            priority,
            "open",
            true,
        )?;
        db::record_event(
            &transaction,
            "issue",
            &format!("Created {} — {}", issue_key, clean_title),
            "{}",
        )?;
        transaction.commit().map_err(|error| error.to_string())?;
    }

    connection
        .query_row(
            "SELECT i.id, i.issue_key, i.title, i.description, i.priority, i.status, i.assignee,
                i.project_id, i.repository_id, r.name, i.updated_at
         FROM issues i LEFT JOIN repositories r ON r.id = i.repository_id
         WHERE i.id = ?1",
            [&id],
            |row| {
                Ok(Issue {
                    id: row.get(0)?,
                    issue_key: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    priority: row.get(4)?,
                    status: row.get(5)?,
                    assignee: row.get(6)?,
                    project_id: row.get(7)?,
                    repository_id: row.get(8)?,
                    repository_name: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            },
        )
        .map_err(|error| error.to_string())
}

fn validate_optional_reference(
    connection: &Connection,
    table: &str,
    id: Option<&str>,
    label: &str,
) -> Result<(), String> {
    let Some(id) = id else {
        return Ok(());
    };
    let exists: bool = connection
        .query_row(
            &format!("SELECT EXISTS(SELECT 1 FROM {table} WHERE id = ?1)"),
            [id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if exists {
        Ok(())
    } else {
        Err(format!("Select an existing {label}."))
    }
}

#[tauri::command]
pub async fn set_issue_status(
    app: AppHandle,
    issue_id: String,
    status: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_issue_status(&status)?;
        let mut connection = db::connect(&app)?;
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        let changed = transaction
            .execute(
                "UPDATE issues
             SET status = ?1,
                 updated_at = CURRENT_TIMESTAMP,
                 closed_at = CASE
                   WHEN ?1 IN ('done', 'closed') THEN COALESCE(closed_at, CURRENT_TIMESTAMP)
                   ELSE NULL
                 END
             WHERE id = ?2",
                params![status, issue_id],
            )
            .map_err(|error| error.to_string())?;
        if changed == 0 {
            return Err("Issue not found.".into());
        }
        let (issue_key, project_id, title, description, priority): (
            String,
            Option<String>,
            String,
            String,
            String,
        ) = transaction
            .query_row(
                "SELECT issue_key, project_id, title, description, priority FROM issues WHERE id = ?1",
                [&issue_id],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                    ))
                },
            )
            .map_err(|error| error.to_string())?;
        crate::orm::mirror_legacy_issue_to_orm(
            &transaction,
            &issue_id,
            project_id.as_deref(),
            &title,
            &description,
            &priority,
            &status,
            true,
        )?;
        db::record_event(
            &transaction,
            "issue",
            &format!("{issue_key} moved to {}", status.to_uppercase()),
            "{}",
        )?;
        transaction.commit().map_err(|error| error.to_string())?;
        crate::orm::notify_edge_sync();
        Ok(())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn update_issue(
    app: AppHandle,
    issue_id: String,
    title: String,
    description: String,
    priority: String,
    project_id: Option<String>,
    repository_id: Option<String>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let clean_title = title.trim().to_string();
        if clean_title.is_empty() {
            return Err("Issue title cannot be empty.".into());
        }
        if !["P0", "P1", "P2", "P3"].contains(&priority.as_str()) {
            return Err("Priority must be P0, P1, P2, or P3.".into());
        }
        let mut connection = db::connect(&app)?;
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        validate_optional_reference(&transaction, "projects", project_id.as_deref(), "project")?;
        validate_optional_reference(
            &transaction,
            "repositories",
            repository_id.as_deref(),
            "repository",
        )?;
        if let Some(repository_id) = repository_id.as_deref() {
            let repository_path: String = transaction
                .query_row(
                    "SELECT path FROM repositories WHERE id = ?1",
                    [repository_id],
                    |row| row.get(0),
                )
                .map_err(|error| error.to_string())?;
            if !Path::new(&repository_path).is_dir() {
                return Err("Repository folder is unavailable.".into());
            }
        }
        let changed = transaction
            .execute(
                "UPDATE issues
             SET title = ?1, description = ?2, priority = ?3, project_id = ?4,
                 repository_id = ?5, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?6",
                params![
                    clean_title,
                    description,
                    priority,
                    project_id,
                    repository_id,
                    issue_id
                ],
            )
            .map_err(|error| error.to_string())?;
        if changed == 0 {
            return Err("Issue not found.".into());
        }
        let current_status: String = transaction
            .query_row(
                "SELECT status FROM issues WHERE id = ?1",
                [&issue_id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        crate::orm::mirror_legacy_issue_to_orm(
            &transaction,
            &issue_id,
            project_id.as_deref(),
            &clean_title,
            &description,
            &priority,
            &current_status,
            true,
        )?;
        db::record_event(
            &transaction,
            "issue",
            &format!("Updated {clean_title}"),
            "{}",
        )?;
        transaction.commit().map_err(|error| error.to_string())?;
        crate::orm::notify_edge_sync();
        Ok(())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn delete_issue(app: AppHandle, issue_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut connection = db::connect(&app)?;
        let issue_key: String = connection
            .query_row(
                "SELECT issue_key FROM issues WHERE id = ?1",
                [&issue_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "Issue not found.".to_string())?;
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        transaction
            .execute("DELETE FROM issues WHERE id = ?1", [&issue_id])
            .map_err(|error| error.to_string())?;
        crate::orm::soft_delete_orm_task(&transaction, &issue_id)?;
        db::record_event(&transaction, "issue", &format!("Deleted {issue_key}"), "{}")?;
        transaction.commit().map_err(|error| error.to_string())?;
        crate::orm::notify_edge_sync();
        Ok(())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::{
        create_issue_with_connection, next_issue_key, validate_issue_status,
        validate_optional_reference,
    };
    use rusqlite::Connection;
    use std::fs;
    use std::time::Duration;

    fn workflow_connection() -> Connection {
        let connection = Connection::open_in_memory().expect("SQLite should open");
        connection
            .execute_batch(include_str!("../../migrations/001_init.sql"))
            .expect("schema should apply");
        connection
            .execute(
                "INSERT INTO workspaces (id, name) VALUES ('local', 'Local')",
                [],
            )
            .expect("workspace should insert");
        connection
    }

    #[test]
    fn issue_key_allocation_uses_the_highest_existing_number_not_row_count() {
        let connection = Connection::open_in_memory().expect("SQLite should open");
        connection
            .execute_batch(include_str!("../../migrations/001_init.sql"))
            .expect("schema should apply");
        connection
            .execute(
                "INSERT INTO issues (id, issue_key, title) VALUES
             ('i1', 'DX-001', 'First'), ('i3', 'DX-003', 'Third')",
                [],
            )
            .expect("sample issues should insert");

        assert_eq!(
            next_issue_key(&connection).expect("key should allocate"),
            "DX-004"
        );
        connection
            .execute("DELETE FROM issues WHERE id = 'i3'", [])
            .expect("issue should delete");
        assert_eq!(
            next_issue_key(&connection).expect("key should allocate"),
            "DX-002"
        );
    }

    #[test]
    fn issue_key_allocation_starts_at_one_for_an_empty_workspace() {
        let connection = Connection::open_in_memory().expect("SQLite should open");
        connection
            .execute_batch(include_str!("../../migrations/001_init.sql"))
            .expect("schema should apply");

        assert_eq!(
            next_issue_key(&connection).expect("key should allocate"),
            "DX-001"
        );
    }

    #[test]
    fn project_and_repository_references_are_validated_without_dynamic_user_identifiers() {
        let connection = workflow_connection();
        connection
            .execute(
                "INSERT INTO projects (id, workspace_id, name) VALUES ('p1', 'local', 'Project')",
                [],
            )
            .expect("project should insert");
        connection.execute("INSERT INTO repositories (id, workspace_id, name, path) VALUES ('r1', 'local', 'Repo', '/repo')", [])
            .expect("repository should insert");
        assert!(
            validate_optional_reference(&connection, "projects", Some("p1"), "project").is_ok()
        );
        assert!(
            validate_optional_reference(&connection, "repositories", Some("r1"), "repository")
                .is_ok()
        );
        assert_eq!(
            validate_optional_reference(&connection, "projects", Some("missing"), "project")
                .unwrap_err(),
            "Select an existing project."
        );
        assert!(validate_optional_reference(
            &connection,
            "issues; DROP TABLE projects",
            Some("p1"),
            "project"
        )
        .is_err());
    }

    #[test]
    fn issue_status_validation_rejects_agent_only_states() {
        for status in ["running", "review", "unknown"] {
            assert!(validate_issue_status(status).is_err());
        }
        for status in ["open", "blocked", "done", "closed"] {
            assert!(validate_issue_status(status).is_ok());
        }
    }

    #[test]
    fn closure_timestamp_is_available_for_completed_issues() {
        let connection = workflow_connection();
        connection
            .execute(
                "INSERT INTO issues (id, issue_key, title) VALUES ('i1', 'DX-001', 'Task')",
                [],
            )
            .expect("issue should insert");
        connection
            .execute_batch(include_str!("../../migrations/002_local_workflows.sql"))
            .expect("closure migration should apply");
        connection.execute(
            "UPDATE issues SET status = 'done', closed_at = '2026-11-15 00:00:00' WHERE id = 'i1'",
            [],
        ).expect("issue should close");
        let (status, closed_at): (String, Option<String>) = connection
            .query_row(
                "SELECT status, closed_at FROM issues WHERE id = 'i1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("issue state should reload");
        assert_eq!(status, "done");
        assert_eq!(closed_at.as_deref(), Some("2026-11-15 00:00:00"));
    }

    #[test]
    fn workflow_statuses_exclude_agent_execution_states() {
        let connection = workflow_connection();
        for status in ["running", "review", "unknown"] {
            assert!(validate_issue_status(status).is_err());
        }
        for status in ["open", "blocked", "done", "closed"] {
            assert!(validate_issue_status(status).is_ok());
        }
        assert_eq!(
            connection
                .query_row("SELECT COUNT(*) FROM issues", [], |row| row
                    .get::<_, i64>(0))
                .unwrap(),
            0
        );
    }

    #[test]
    fn create_issue_persists_project_and_repository_links() {
        let mut connection = workflow_connection();
        let repository_path =
            std::env::temp_dir().join(format!("rocksoul-issue-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&repository_path).expect("temporary repository path should create");
        connection
            .execute(
                "INSERT INTO projects (id, workspace_id, name) VALUES ('p1', 'local', 'Project')",
                [],
            )
            .expect("project should insert");
        connection.execute(
            "INSERT INTO repositories (id, workspace_id, name, path) VALUES ('r1', 'local', 'Repo', ?1)",
            [repository_path.to_string_lossy().to_string()],
        ).expect("repository should insert");

        let issue = create_issue_with_connection(
            &mut connection,
            "  Linked task  ",
            "Details",
            "P1",
            Some("p1"),
            Some("r1"),
        )
        .expect("linked issue should create");
        assert_eq!(issue.title, "Linked task");
        assert_eq!(issue.issue_key, "DX-001");
        assert_eq!(issue.repository_id.as_deref(), Some("r1"));
        assert_eq!(issue.repository_name.as_deref(), Some("Repo"));

        fs::remove_dir_all(repository_path).expect("temporary repository path should clean up");
    }

    #[test]
    fn concurrent_issue_creation_serializes_key_allocation() {
        let connection = workflow_connection();
        let database_path =
            std::env::temp_dir().join(format!("rocksoul-issues-{}.sqlite3", uuid::Uuid::new_v4()));
        drop(connection);
        let setup = Connection::open(&database_path).expect("temporary database should open");
        setup
            .execute_batch(include_str!("../../migrations/001_init.sql"))
            .expect("schema should apply");
        setup
            .execute_batch(include_str!("../../migrations/002_local_workflows.sql"))
            .expect("migration should apply");
        drop(setup);

        let mut workers = Vec::new();
        for index in 0..8 {
            let database_path = database_path.clone();
            workers.push(std::thread::spawn(move || {
                let mut connection =
                    Connection::open(database_path).expect("worker database should open");
                connection
                    .busy_timeout(Duration::from_secs(5))
                    .expect("busy timeout should set");
                create_issue_with_connection(
                    &mut connection,
                    &format!("Task {index}"),
                    "",
                    "P2",
                    None,
                    None,
                )
                .expect("concurrent issue should create")
                .issue_key
            }));
        }
        let keys = workers
            .into_iter()
            .map(|worker| worker.join().expect("worker should finish"))
            .collect::<Vec<_>>();
        let mut sorted = keys;
        sorted.sort();
        assert_eq!(
            sorted,
            (1..=8)
                .map(|number| format!("DX-{number:03}"))
                .collect::<Vec<_>>()
        );
        fs::remove_file(database_path).expect("temporary database should clean up");
    }
}
