PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('working','project','episodic','semantic','procedural','preference')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'owner',
  source_ref TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','corrected','archived','deleted')),
  retention TEXT NOT NULL DEFAULT 'keep',
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  repository_id TEXT REFERENCES repositories(id) ON DELETE SET NULL,
  issue_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memory_corrections (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  previous_content TEXT NOT NULL,
  correction TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  title,
  content,
  source_ref,
  content='memories',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, title, content, source_ref)
  VALUES (new.rowid, new.title, new.content, new.source_ref);
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, title, content, source_ref)
  VALUES ('delete', old.rowid, old.title, old.content, old.source_ref);
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, title, content, source_ref)
  VALUES ('delete', old.rowid, old.title, old.content, old.source_ref);
  INSERT INTO memories_fts(rowid, title, content, source_ref)
  VALUES (new.rowid, new.title, new.content, new.source_ref);
END;

CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','interrupted')),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  repository_id TEXT REFERENCES repositories(id) ON DELETE SET NULL,
  issue_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS resume_points (
  id TEXT PRIMARY KEY,
  work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  task_id TEXT,
  run_id TEXT,
  artifact_id TEXT,
  status TEXT NOT NULL DEFAULT 'observed' CHECK (status IN ('observed','verified','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  experience_id TEXT REFERENCES experiences(id) ON DELETE CASCADE,
  proposal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','rejected')),
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memories_category_updated ON memories(category, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON work_sessions(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_points_session ON resume_points(work_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experiences_status ON experiences(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status, created_at DESC);
