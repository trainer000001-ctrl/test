use crate::db;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudioDraftRecord {
    pub id: String,
    pub title: String,
    pub content: String,
    pub kind: String,
    pub version: i64,
    pub project_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchClaimRecord {
    pub id: String,
    pub question: String,
    pub claim: String,
    pub source_citation: String,
    pub confidence: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanionProfileRecord {
    pub id: String,
    pub name: String,
    pub personality: String,
    pub state: String,
    pub daily_briefing: String,
    pub evening_recap: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn save_studio_draft(
    app: AppHandle,
    draft_id: Option<String>,
    title: String,
    content: String,
    kind: String,
    project_id: Option<String>,
) -> Result<StudioDraftRecord, String> {
    let connection = db::connect(&app)?;
    let id = draft_id.unwrap_or_else(|| Uuid::new_v4().to_string());

    connection
        .execute(
            "INSERT INTO studio_drafts (id, title, content, kind, version, project_id, updated_at)
             VALUES (?1, ?2, ?3, ?4, 1, ?5, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET
               title = excluded.title,
               content = excluded.content,
               kind = excluded.kind,
               version = studio_drafts.version + 1,
               project_id = excluded.project_id,
               updated_at = CURRENT_TIMESTAMP",
            rusqlite::params![id, title, content, kind, project_id],
        )
        .map_err(|e| e.to_string())?;

    let draft = connection
        .query_row(
            "SELECT id, title, content, kind, version, project_id, created_at, updated_at
             FROM studio_drafts WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(StudioDraftRecord {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    kind: row.get(3)?,
                    version: row.get(4)?,
                    project_id: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(draft)
}

#[tauri::command]
pub fn list_studio_drafts(
    app: AppHandle,
    project_id: Option<String>,
) -> Result<Vec<StudioDraftRecord>, String> {
    let connection = db::connect(&app)?;
    let mut stmt = connection
        .prepare(
            "SELECT id, title, content, kind, version, project_id, created_at, updated_at
             FROM studio_drafts
             WHERE ?1 IS NULL OR project_id = ?1
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let drafts = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok(StudioDraftRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                kind: row.get(3)?,
                version: row.get(4)?,
                project_id: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(drafts)
}

#[tauri::command]
pub fn record_research_claim(
    app: AppHandle,
    question: String,
    claim: String,
    source_citation: String,
    confidence: String,
) -> Result<ResearchClaimRecord, String> {
    let connection = db::connect(&app)?;
    let id = Uuid::new_v4().to_string();

    connection
        .execute(
            "INSERT INTO research_claims (id, question, claim, source_citation, confidence)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![id, question, claim, source_citation, confidence],
        )
        .map_err(|e| e.to_string())?;

    let record = connection
        .query_row(
            "SELECT id, question, claim, source_citation, confidence, created_at
             FROM research_claims WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(ResearchClaimRecord {
                    id: row.get(0)?,
                    question: row.get(1)?,
                    claim: row.get(2)?,
                    source_citation: row.get(3)?,
                    confidence: row.get(4)?,
                    created_at: row.get(5)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(record)
}

#[tauri::command]
pub fn list_research_claims(app: AppHandle) -> Result<Vec<ResearchClaimRecord>, String> {
    let connection = db::connect(&app)?;
    let mut stmt = connection
        .prepare("SELECT id, question, claim, source_citation, confidence, created_at FROM research_claims ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let claims = stmt
        .query_map([], |row| {
            Ok(ResearchClaimRecord {
                id: row.get(0)?,
                question: row.get(1)?,
                claim: row.get(2)?,
                source_citation: row.get(3)?,
                confidence: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(claims)
}

#[tauri::command]
pub fn get_companion_profile(app: AppHandle) -> Result<CompanionProfileRecord, String> {
    let connection = db::connect(&app)?;
    let default_id = "default";

    connection
        .execute(
            "INSERT OR IGNORE INTO companion_profiles (id, name, personality, state, daily_briefing, evening_recap)
             VALUES (?1, 'RockSoul Sentinel', 'Stoic, analytical, loyal companion', 'idle', 'Systems nominal. 0 open security alerts.', 'Daily operations verified.')",
            rusqlite::params![default_id],
        )
        .map_err(|e| e.to_string())?;

    let profile = connection
        .query_row(
            "SELECT id, name, personality, state, daily_briefing, evening_recap, updated_at
             FROM companion_profiles WHERE id = ?1",
            rusqlite::params![default_id],
            |row| {
                Ok(CompanionProfileRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    personality: row.get(2)?,
                    state: row.get(3)?,
                    daily_briefing: row.get(4)?,
                    evening_recap: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(profile)
}

#[tauri::command]
pub fn update_companion_state(
    app: AppHandle,
    companion_state: String,
) -> Result<CompanionProfileRecord, String> {
    let valid_states = [
        "idle", "thinking", "working", "creating", "waiting", "warning",
    ];
    if !valid_states.contains(&companion_state.as_str()) {
        return Err(format!("Invalid companion state: {companion_state}"));
    }

    let connection = db::connect(&app)?;
    let default_id = "default";

    connection
        .execute(
            "UPDATE companion_profiles SET state = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            rusqlite::params![companion_state, default_id],
        )
        .map_err(|e| e.to_string())?;

    get_companion_profile(app)
}
