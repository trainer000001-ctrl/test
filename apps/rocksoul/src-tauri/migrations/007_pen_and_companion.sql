PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS studio_drafts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'story' CHECK (kind IN ('story', 'episode', 'character', 'research', 'general')),
  version INTEGER NOT NULL DEFAULT 1,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_claims (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  claim TEXT NOT NULL,
  source_citation TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'verified',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companion_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  personality TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'idle' CHECK (state IN ('idle', 'thinking', 'working', 'creating', 'waiting', 'warning')),
  daily_briefing TEXT NOT NULL DEFAULT '',
  evening_recap TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
