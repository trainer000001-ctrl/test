use rusqlite::{params, Connection, OptionalExtension};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::{
    db,
    models::{EdgeOrmSyncStatus, Project},
    orm,
};

pub fn query_projects(connection: &Connection) -> Result<Vec<Project>, String> {
    let mut statement = connection
        .prepare("SELECT id, name, description, status FROM projects ORDER BY created_at DESC")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn list_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let connection = db::connect(&app)?;
        query_projects(&connection)
    })
    .await
    .map_err(|error| format!("Project worker failed: {error}"))?
}

#[tauri::command]
pub async fn create_project(
    app: AppHandle,
    name: String,
    description: Option<String>,
) -> Result<Project, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let clean_name = name.trim().to_string();
        if clean_name.is_empty() {
            return Err("Project name cannot be empty.".into());
        }
        let description = description.unwrap_or_default();
        let id = Uuid::new_v4().to_string();
        let mut connection = db::connect(&app)?;
        let transaction = connection
            .transaction()
            .map_err(|error| error.to_string())?;
        transaction
            .execute(
                "INSERT INTO projects (id, workspace_id, name, description) VALUES (?1, 'local', ?2, ?3)",
                params![id, clean_name, description],
            )
            .map_err(|error| error.to_string())?;
        orm::mirror_legacy_project_to_orm(&transaction, &id, &clean_name, &description, "active", true)?;
        db::record_event(
            &transaction,
            "project",
            &format!("Created project {}", clean_name),
            "{}",
        )?;
        transaction.commit().map_err(|error| error.to_string())?;
        orm::notify_edge_sync();

        let mut statement = connection
            .prepare("SELECT id, name, description, status FROM projects WHERE id = ?1")
            .map_err(|error| error.to_string())?;
        statement
            .query_row([id], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    status: row.get(3)?,
                })
            })
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| format!("Project creation worker failed: {error}"))?
}

#[tauri::command]
pub async fn update_project(
    app: AppHandle,
    project_id: String,
    name: String,
    description: String,
    status: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let clean_name = name.trim().to_string();
        if clean_name.is_empty() {
            return Err("Project name cannot be empty.".into());
        }
        if !["active", "paused", "done", "archived"].contains(&status.as_str()) {
            return Err("Unsupported project status.".into());
        }
        let mut connection = db::connect(&app)?;
        update_project_with_connection(
            &mut connection,
            &project_id,
            &clean_name,
            &description,
            &status,
        )
    })
    .await
    .map_err(|error| format!("Project update worker failed: {error}"))?
}

fn update_project_with_connection(
    connection: &mut Connection,
    project_id: &str,
    name: &str,
    description: &str,
    status: &str,
) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let changed = transaction
        .execute(
            "UPDATE projects SET name = ?1, description = ?2, status = ?3 WHERE id = ?4",
            params![name, description, status, project_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Project not found.".into());
    }
    orm::mirror_legacy_project_to_orm(&transaction, project_id, name, description, status, true)?;
    db::record_event(
        &transaction,
        "project",
        &format!("Updated project {name}"),
        "{}",
    )?;
    transaction.commit().map_err(|error| error.to_string())?;
    orm::notify_edge_sync();
    Ok(())
}

#[tauri::command]
pub async fn delete_project(app: AppHandle, project_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut connection = db::connect(&app)?;
        delete_project_with_connection(&mut connection, &project_id)
    })
    .await
    .map_err(|error| format!("Project delete worker failed: {error}"))?
}

#[tauri::command]
pub async fn sync_edge_orm(app: AppHandle) -> Result<EdgeOrmSyncStatus, String> {
    let handle = app.clone();
    let status = tauri::async_runtime::spawn_blocking(move || {
        let mut connection = db::connect(&handle)?;
        orm::sync_with_edge_pubsub(&mut connection, None, None)
    })
    .await
    .map_err(|error| format!("Edge ORM pub/sub sync worker failed: {error}"))??;
    let _ = app.emit("orm://pubsub", &status);
    Ok(status)
}

fn delete_project_with_connection(
    connection: &mut Connection,
    project_id: &str,
) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let project_name: String = transaction
        .query_row(
            "SELECT name FROM projects WHERE id = ?1",
            [project_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Project not found.".to_string())?;
    transaction
        .execute("DELETE FROM projects WHERE id = ?1", [project_id])
        .map_err(|error| error.to_string())?;
    orm::soft_delete_orm_project(&transaction, project_id)?;
    db::record_event(
        &transaction,
        "project",
        &format!("Deleted project {project_name}"),
        "{}",
    )?;
    transaction.commit().map_err(|error| error.to_string())?;
    orm::notify_edge_sync();
    Ok(())
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    #[test]
    fn project_deletion_removes_milestones_and_detaches_related_records() {
        let mut connection = Connection::open_in_memory().expect("SQLite should open");
        connection
            .execute_batch(include_str!("../../migrations/001_init.sql"))
            .expect("schema should apply");
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .expect("foreign keys should enable");
        connection
            .execute(
                "INSERT INTO workspaces (id, name) VALUES ('local', 'Local')",
                [],
            )
            .expect("workspace should insert");
        connection
            .execute(
                "INSERT INTO projects (id, workspace_id, name) VALUES ('p1', 'local', 'Project')",
                [],
            )
            .expect("project should insert");
        connection.execute("INSERT INTO repositories (id, workspace_id, project_id, name, path) VALUES ('r1', 'local', 'p1', 'Repo', '/repo')", [])
            .expect("repository should insert");
        connection.execute("INSERT INTO issues (id, issue_key, project_id, repository_id, title) VALUES ('i1', 'DX-001', 'p1', 'r1', 'Task')", [])
            .expect("issue should insert");
        connection
            .execute(
                "INSERT INTO milestones (id, project_id, title) VALUES ('m1', 'p1', 'Checkpoint')",
                [],
            )
            .expect("milestone should insert");
        super::delete_project_with_connection(&mut connection, "p1")
            .expect("project deletion should complete");

        let milestone_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM milestones", [], |row| row.get(0))
            .unwrap();
        let project_id: Option<String> = connection
            .query_row("SELECT project_id FROM issues WHERE id = 'i1'", [], |row| {
                row.get(0)
            })
            .unwrap();
        let repository_project: Option<String> = connection
            .query_row(
                "SELECT project_id FROM repositories WHERE id = 'r1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(milestone_count, 0);
        assert_eq!(project_id, None);
        assert_eq!(repository_project, None);
    }

    #[test]
    fn project_updates_validate_status_and_record_activity() {
        let mut connection = Connection::open_in_memory().expect("SQLite should open");
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
            .execute(
                "INSERT INTO projects (id, workspace_id, name) VALUES ('p1', 'local', 'Old')",
                [],
            )
            .expect("project should insert");

        super::update_project_with_connection(&mut connection, "p1", "New", "Brief", "paused")
            .expect("project should update");
        let (name, status): (String, String) = connection
            .query_row(
                "SELECT name, status FROM projects WHERE id = 'p1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("updated project should reload");
        assert_eq!((name.as_str(), status.as_str()), ("New", "paused"));
        let message: String = connection
            .query_row("SELECT message FROM events", [], |row| row.get(0))
            .expect("project event should exist");
        assert_eq!(message, "Updated project New");
    }
}
