use rusqlite::{params, Connection, OptionalExtension};
use tauri::AppHandle;
use uuid::Uuid;

use crate::{db, models::Milestone};

pub fn query_milestones(connection: &Connection) -> Result<Vec<Milestone>, String> {
    let mut statement = connection
        .prepare(
            "SELECT m.id, m.project_id, p.name, m.title, m.description, m.due_at, m.status
         FROM milestones m
         JOIN projects p ON p.id = m.project_id
         ORDER BY
           CASE WHEN m.due_at IS NULL THEN 1 ELSE 0 END,
           m.due_at ASC,
           m.rowid DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(Milestone {
                id: row.get(0)?,
                project_id: row.get(1)?,
                project_name: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                due_at: row.get(5)?,
                status: row.get(6)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_milestones(app: AppHandle) -> Result<Vec<Milestone>, String> {
    let connection = db::connect(&app)?;
    query_milestones(&connection)
}

#[tauri::command]
pub fn create_milestone(
    app: AppHandle,
    project_id: String,
    title: String,
    description: Option<String>,
    due_at: Option<String>,
) -> Result<Milestone, String> {
    let clean_title = title.trim();
    if clean_title.is_empty() {
        return Err("Milestone title cannot be empty.".into());
    }
    let description = description.unwrap_or_default();
    let due_at = due_at.filter(|value| !value.trim().is_empty());
    let id = Uuid::new_v4().to_string();
    let mut connection = db::connect(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO milestones (id, project_id, title, description, due_at, status)
         VALUES (?1, ?2, ?3, ?4, ?5, 'planned')",
            params![id, project_id, clean_title, description, due_at],
        )
        .map_err(|error| {
            if error.to_string().contains("FOREIGN KEY") {
                "Select an existing project for this milestone.".to_string()
            } else {
                error.to_string()
            }
        })?;
    db::record_event(
        &transaction,
        "milestone",
        &format!("Created milestone {}", clean_title),
        "{}",
    )?;
    transaction.commit().map_err(|error| error.to_string())?;
    query_milestones(&connection)?
        .into_iter()
        .find(|milestone| milestone.id == id)
        .ok_or_else(|| "Created milestone could not be reloaded.".into())
}

#[tauri::command]
pub fn update_milestone(
    app: AppHandle,
    milestone_id: String,
    title: String,
    description: String,
    due_at: Option<String>,
) -> Result<(), String> {
    let clean_title = title.trim();
    if clean_title.is_empty() {
        return Err("Milestone title cannot be empty.".into());
    }
    let due_at = due_at.filter(|value| !value.trim().is_empty());
    let mut connection = db::connect(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let changed = transaction
        .execute(
            "UPDATE milestones SET title = ?1, description = ?2, due_at = ?3 WHERE id = ?4",
            params![clean_title, description, due_at, milestone_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Milestone not found.".into());
    }
    db::record_event(
        &transaction,
        "milestone",
        &format!("Updated milestone {clean_title}"),
        "{}",
    )?;
    transaction.commit().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_milestone(app: AppHandle, milestone_id: String) -> Result<(), String> {
    let mut connection = db::connect(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let title: String = transaction
        .query_row(
            "SELECT title FROM milestones WHERE id = ?1",
            [&milestone_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Milestone not found.".to_string())?;
    transaction
        .execute("DELETE FROM milestones WHERE id = ?1", [&milestone_id])
        .map_err(|error| error.to_string())?;
    db::record_event(
        &transaction,
        "milestone",
        &format!("Deleted milestone {title}"),
        "{}",
    )?;
    transaction.commit().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_milestone_status(
    app: AppHandle,
    milestone_id: String,
    status: String,
) -> Result<(), String> {
    if !["planned", "in_progress", "done", "blocked"].contains(&status.as_str()) {
        return Err("Unsupported milestone status.".into());
    }
    let mut connection = db::connect(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let changed = transaction
        .execute(
            "UPDATE milestones SET status = ?1 WHERE id = ?2",
            params![status, milestone_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Milestone not found.".into());
    }
    db::record_event(
        &transaction,
        "milestone",
        &format!("Milestone moved to {}", status.to_uppercase()),
        "{}",
    )?;
    transaction.commit().map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::query_milestones;
    use rusqlite::Connection;

    #[test]
    fn milestones_are_project_scoped_and_start_planned() {
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
            .execute(
                "INSERT INTO projects (id, workspace_id, name) VALUES ('p1', 'local', 'Project')",
                [],
            )
            .expect("project should insert");
        connection.execute(
            "INSERT INTO milestones (id, project_id, title) VALUES ('m1', 'p1', 'First milestone')",
            [],
        ).expect("milestone should insert");

        let milestones = query_milestones(&connection).expect("milestones should list");
        assert_eq!(milestones.len(), 1);
        assert_eq!(milestones[0].project_name, "Project");
        assert_eq!(milestones[0].status, "planned");
    }
}
