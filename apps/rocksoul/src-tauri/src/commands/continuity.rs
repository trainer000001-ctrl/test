use rusqlite::{params, OptionalExtension};
use serde::Serialize;
use tauri::AppHandle;
use uuid::Uuid;

use crate::db;

const MEMORY_CATEGORIES: [&str; 6] = [
    "working",
    "project",
    "episodic",
    "semantic",
    "procedural",
    "preference",
];
const MEMORY_STATUSES: [&str; 4] = ["active", "corrected", "archived", "deleted"];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryRecord {
    pub id: String,
    pub category: String,
    pub title: String,
    pub content: String,
    pub source_type: String,
    pub source_ref: String,
    pub confidence: String,
    pub status: String,
    pub retention: String,
    pub project_id: Option<String>,
    pub repository_id: Option<String>,
    pub issue_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkSessionRecord {
    pub id: String,
    pub name: String,
    pub status: String,
    pub project_id: Option<String>,
    pub repository_id: Option<String>,
    pub issue_id: Option<String>,
    pub context_json: String,
    pub created_at: String,
    pub updated_at: String,
    pub closed_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumePointRecord {
    pub id: String,
    pub work_session_id: String,
    pub title: String,
    pub summary: String,
    pub context_json: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperienceRecord {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub evidence_json: String,
    pub task_id: Option<String>,
    pub run_id: Option<String>,
    pub artifact_id: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LessonRecord {
    pub id: String,
    pub experience_id: Option<String>,
    pub proposal: String,
    pub status: String,
    pub accepted_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SoulJournalEntry {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub summary: String,
    pub status: String,
    pub evidence_json: String,
    pub created_at: String,
}

fn validate_category(category: &str) -> Result<(), String> {
    if MEMORY_CATEGORIES.contains(&category) {
        Ok(())
    } else {
        Err("Unsupported memory category.".into())
    }
}

fn validate_memory_status(status: &str) -> Result<(), String> {
    if MEMORY_STATUSES.contains(&status) {
        Ok(())
    } else {
        Err("Unsupported memory status.".into())
    }
}

fn validate_json_object(value: &str) -> Result<(), String> {
    let parsed: serde_json::Value =
        serde_json::from_str(value).map_err(|_| "Context JSON is invalid.".to_string())?;
    if parsed.is_object() {
        Ok(())
    } else {
        Err("Context JSON must be an object.".into())
    }
}

fn memory_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<MemoryRecord> {
    Ok(MemoryRecord {
        id: row.get(0)?,
        category: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        source_type: row.get(4)?,
        source_ref: row.get(5)?,
        confidence: row.get(6)?,
        status: row.get(7)?,
        retention: row.get(8)?,
        project_id: row.get(9)?,
        repository_id: row.get(10)?,
        issue_id: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

#[tauri::command]
pub fn capture_memory(
    app: AppHandle,
    title: String,
    content: String,
    category: Option<String>,
    source_ref: Option<String>,
    project_id: Option<String>,
) -> Result<MemoryRecord, String> {
    create_memory(
        app,
        category.unwrap_or_else(|| "working".into()),
        title,
        content,
        "owner".into(),
        source_ref.unwrap_or_default(),
        "owner".into(),
        "keep".into(),
        project_id,
        None,
        None,
    )
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn create_memory(
    app: AppHandle,
    category: String,
    title: String,
    content: String,
    source_type: String,
    source_ref: String,
    confidence: String,
    retention: String,
    project_id: Option<String>,
    repository_id: Option<String>,
    issue_id: Option<String>,
) -> Result<MemoryRecord, String> {
    let title = title.trim();
    let content = content.trim();
    if title.is_empty() {
        return Err("Memory title cannot be empty.".into());
    }
    if content.is_empty() {
        return Err("Memory content cannot be empty.".into());
    }
    validate_category(&category)?;
    if source_type.is_empty() {
        return Err("Memory source type cannot be empty.".into());
    }
    let connection = db::connect(&app)?;
    let id = Uuid::new_v4().to_string();
    connection
        .execute(
            "INSERT INTO memories (
                id, category, title, content, source_type, source_ref, confidence,
                status, retention, project_id, repository_id, issue_id
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active', ?8, ?9, ?10, ?11)",
            params![
                id,
                category,
                title,
                content,
                source_type,
                source_ref,
                confidence,
                retention,
                project_id,
                repository_id,
                issue_id
            ],
        )
        .map_err(|error| error.to_string())?;
    connection
        .query_row(
            "SELECT id, category, title, content, source_type, source_ref, confidence,
                    status, retention, project_id, repository_id, issue_id, created_at, updated_at
             FROM memories WHERE id = ?1",
            [id],
            memory_from_row,
        )
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn search_memories(
    app: AppHandle,
    query: Option<String>,
    category: Option<String>,
) -> Result<Vec<MemoryRecord>, String> {
    if let Some(category) = category.as_deref() {
        validate_category(category)?;
    }
    let connection = db::connect(&app)?;
    let mut rows = if let Some(query) = query
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        let escaped = query.replace('"', "\"\"");
        let fts = format!("\"{escaped}\"");
        let mut statement = connection
            .prepare(
                "SELECT m.id, m.category, m.title, m.content, m.source_type, m.source_ref,
                        m.confidence, m.status, m.retention, m.project_id, m.repository_id,
                        m.issue_id, m.created_at, m.updated_at
                 FROM memories m
                 JOIN memories_fts f ON f.rowid = m.rowid
                 WHERE m.status != 'deleted' AND memories_fts MATCH ?1",
            )
            .map_err(|error| error.to_string())?;
        let found = statement
            .query_map([fts], memory_from_row)
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        found
    } else {
        let mut statement = connection
            .prepare(
                "SELECT id, category, title, content, source_type, source_ref, confidence,
                        status, retention, project_id, repository_id, issue_id, created_at, updated_at
                 FROM memories
                 WHERE status != 'deleted'
                 ORDER BY updated_at DESC",
            )
            .map_err(|error| error.to_string())?;
        let found = statement
            .query_map([], memory_from_row)
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        found
    };
    if let Some(category) = category {
        rows.retain(|memory| memory.category == category);
    }
    Ok(rows)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn update_memory(
    app: AppHandle,
    memory_id: String,
    title: String,
    content: String,
    category: String,
    status: String,
    retention: String,
    source_ref: String,
) -> Result<MemoryRecord, String> {
    let title = title.trim();
    let content = content.trim();
    if title.is_empty() || content.is_empty() {
        return Err("Memory title and content cannot be empty.".into());
    }
    validate_category(&category)?;
    validate_memory_status(&status)?;
    let connection = db::connect(&app)?;
    let previous: Option<(String,)> = connection
        .query_row(
            "SELECT content FROM memories WHERE id = ?1",
            [&memory_id],
            |row| Ok((row.get(0)?,)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let Some((previous_content,)) = previous else {
        return Err("Memory not found.".into());
    };
    if previous_content != content {
        connection
            .execute(
                "INSERT INTO memory_corrections (id, memory_id, previous_content, correction)
                 VALUES (?1, ?2, ?3, ?4)",
                params![
                    Uuid::new_v4().to_string(),
                    memory_id,
                    previous_content,
                    content
                ],
            )
            .map_err(|error| error.to_string())?;
    }
    connection
        .execute(
            "UPDATE memories SET title = ?1, content = ?2, category = ?3,
             status = ?4, retention = ?5, source_ref = ?6,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?7",
            params![title, content, category, status, retention, source_ref, memory_id],
        )
        .map_err(|error| error.to_string())?;
    connection
        .query_row(
            "SELECT id, category, title, content, source_type, source_ref, confidence,
                    status, retention, project_id, repository_id, issue_id, created_at, updated_at
             FROM memories WHERE id = ?1",
            [memory_id],
            memory_from_row,
        )
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_memory(app: AppHandle, memory_id: String) -> Result<(), String> {
    let connection = db::connect(&app)?;
    let changed = connection
        .execute(
            "UPDATE memories SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            [&memory_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        Err("Memory not found.".into())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn create_work_session(
    app: AppHandle,
    name: String,
    project_id: Option<String>,
    repository_id: Option<String>,
    issue_id: Option<String>,
    context_json: Option<String>,
) -> Result<WorkSessionRecord, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Work session name cannot be empty.".into());
    }
    let context = context_json.unwrap_or_else(|| "{}".into());
    validate_json_object(&context)?;
    let connection = db::connect(&app)?;
    let id = Uuid::new_v4().to_string();
    connection
        .execute(
            "INSERT INTO work_sessions (
                id, name, status, project_id, repository_id, issue_id, context_json
             ) VALUES (?1, ?2, 'active', ?3, ?4, ?5, ?6)",
            params![id, name, project_id, repository_id, issue_id, context],
        )
        .map_err(|error| error.to_string())?;
    list_work_sessions(app).map(|sessions| {
        sessions
            .into_iter()
            .find(|session| session.id == id)
            .ok_or_else(|| "Created work session could not be loaded.".to_string())
    })?
}

#[tauri::command]
pub fn list_work_sessions(app: AppHandle) -> Result<Vec<WorkSessionRecord>, String> {
    let connection = db::connect(&app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, name, status, project_id, repository_id, issue_id, context_json,
                    created_at, updated_at, closed_at
             FROM work_sessions
             ORDER BY updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(WorkSessionRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                status: row.get(2)?,
                project_id: row.get(3)?,
                repository_id: row.get(4)?,
                issue_id: row.get(5)?,
                context_json: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                closed_at: row.get(9)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn close_work_session(app: AppHandle, session_id: String) -> Result<(), String> {
    let connection = db::connect(&app)?;
    let changed = connection
        .execute(
            "UPDATE work_sessions
             SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?1",
            [&session_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        Err("Work session not found.".into())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn create_resume_point(
    app: AppHandle,
    work_session_id: String,
    title: String,
    summary: String,
    context_json: Option<String>,
) -> Result<ResumePointRecord, String> {
    let title = title.trim();
    let summary = summary.trim();
    if title.is_empty() || summary.is_empty() {
        return Err("Resume point title and summary cannot be empty.".into());
    }
    let context = context_json.unwrap_or_else(|| "{}".into());
    validate_json_object(&context)?;
    let connection = db::connect(&app)?;
    let exists: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM work_sessions WHERE id = ?1",
            [&work_session_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if exists == 0 {
        return Err("Work session not found.".into());
    }
    let id = Uuid::new_v4().to_string();
    connection
        .execute(
            "INSERT INTO resume_points (id, work_session_id, title, summary, context_json)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, work_session_id, title, summary, context],
        )
        .map_err(|error| error.to_string())?;
    list_resume_points(app).map(|points| {
        points
            .into_iter()
            .find(|point| point.id == id)
            .ok_or_else(|| "Created resume point could not be loaded.".to_string())
    })?
}

#[tauri::command]
pub fn list_resume_points(app: AppHandle) -> Result<Vec<ResumePointRecord>, String> {
    let connection = db::connect(&app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, work_session_id, title, summary, context_json, created_at
             FROM resume_points
             ORDER BY created_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(ResumePointRecord {
                id: row.get(0)?,
                work_session_id: row.get(1)?,
                title: row.get(2)?,
                summary: row.get(3)?,
                context_json: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_experience(
    app: AppHandle,
    title: String,
    summary: String,
    evidence_json: Option<String>,
    task_id: Option<String>,
    run_id: Option<String>,
    artifact_id: Option<String>,
) -> Result<ExperienceRecord, String> {
    let title = title.trim();
    let summary = summary.trim();
    if title.is_empty() || summary.is_empty() {
        return Err("Experience title and summary cannot be empty.".into());
    }
    let evidence = evidence_json.unwrap_or_else(|| "{}".into());
    validate_json_object(&evidence)?;
    let connection = db::connect(&app)?;
    let id = Uuid::new_v4().to_string();
    connection
        .execute(
            "INSERT INTO experiences (
                id, title, summary, evidence_json, task_id, run_id, artifact_id, status
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'observed')",
            params![id, title, summary, evidence, task_id, run_id, artifact_id],
        )
        .map_err(|error| error.to_string())?;
    list_soul_journal(app).map(|entries| {
        entries
            .into_iter()
            .find(|entry| entry.id == id)
            .map(|entry| ExperienceRecord {
                id: entry.id,
                title: entry.title,
                summary: entry.summary,
                evidence_json: entry.evidence_json,
                task_id: None,
                run_id: None,
                artifact_id: None,
                status: entry.status,
                created_at: entry.created_at,
            })
            .ok_or_else(|| "Created experience could not be loaded.".to_string())
    })?
}

#[tauri::command]
pub fn list_soul_journal(app: AppHandle) -> Result<Vec<SoulJournalEntry>, String> {
    let connection = db::connect(&app)?;
    let mut entries = Vec::new();

    let mut experiences = connection
        .prepare(
            "SELECT id, title, summary, status, evidence_json, created_at
             FROM experiences ORDER BY created_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let experience_rows = experiences
        .query_map([], |row| {
            Ok(SoulJournalEntry {
                id: row.get(0)?,
                kind: "experience".into(),
                title: row.get(1)?,
                summary: row.get(2)?,
                status: row.get(3)?,
                evidence_json: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|error| error.to_string())?;
    entries.extend(
        experience_rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?,
    );

    let mut lessons = connection
        .prepare(
            "SELECT id, proposal, status, created_at
             FROM lessons ORDER BY created_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let lesson_rows = lessons
        .query_map([], |row| {
            Ok(SoulJournalEntry {
                id: row.get(0)?,
                kind: "lesson".into(),
                title: "Lesson proposal".into(),
                summary: row.get(1)?,
                status: row.get(2)?,
                evidence_json: "{}".into(),
                created_at: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;
    entries.extend(
        lesson_rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?,
    );
    entries.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    Ok(entries)
}

#[tauri::command]
pub fn create_lesson(
    app: AppHandle,
    experience_id: Option<String>,
    proposal: String,
) -> Result<LessonRecord, String> {
    let proposal = proposal.trim();
    if proposal.is_empty() {
        return Err("Lesson proposal cannot be empty.".into());
    }
    let connection = db::connect(&app)?;
    if let Some(experience_id) = experience_id.as_deref() {
        let exists: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM experiences WHERE id = ?1",
                [experience_id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if exists == 0 {
            return Err("Experience not found.".into());
        }
    }
    let id = Uuid::new_v4().to_string();
    connection
        .execute(
            "INSERT INTO lessons (id, experience_id, proposal, status)
             VALUES (?1, ?2, ?3, 'proposed')",
            params![id, experience_id, proposal],
        )
        .map_err(|error| error.to_string())?;
    connection
        .query_row(
            "SELECT id, experience_id, proposal, status, accepted_at, created_at
             FROM lessons WHERE id = ?1",
            [id],
            |row| {
                Ok(LessonRecord {
                    id: row.get(0)?,
                    experience_id: row.get(1)?,
                    proposal: row.get(2)?,
                    status: row.get(3)?,
                    accepted_at: row.get(4)?,
                    created_at: row.get(5)?,
                })
            },
        )
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn resolve_lesson(
    app: AppHandle,
    lesson_id: String,
    status: String,
) -> Result<LessonRecord, String> {
    if !["accepted", "rejected"].contains(&status.as_str()) {
        return Err("Lesson status must be accepted or rejected.".into());
    }
    let connection = db::connect(&app)?;
    let accepted_at = if status == "accepted" {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };
    let changed = connection
        .execute(
            "UPDATE lessons
             SET status = ?1, accepted_at = ?2
             WHERE id = ?3",
            params![status, accepted_at, lesson_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Lesson not found.".into());
    }
    connection
        .query_row(
            "SELECT id, experience_id, proposal, status, accepted_at, created_at
             FROM lessons WHERE id = ?1",
            [lesson_id],
            |row| {
                Ok(LessonRecord {
                    id: row.get(0)?,
                    experience_id: row.get(1)?,
                    proposal: row.get(2)?,
                    status: row.get(3)?,
                    accepted_at: row.get(4)?,
                    created_at: row.get(5)?,
                })
            },
        )
        .map_err(|error| error.to_string())
}
