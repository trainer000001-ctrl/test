PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agent_execution_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'blocked')),
  payload_json TEXT NOT NULL DEFAULT '{}',
  output_text TEXT NOT NULL DEFAULT '',
  error_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_execution_steps_run ON agent_execution_steps(run_id, step_index);

CREATE TABLE IF NOT EXISTS agent_supervisors (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  pid INTEGER,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('starting', 'running', 'terminating', 'exited', 'killed', 'recovered')),
  worktree_path TEXT NOT NULL,
  timeout_seconds INTEGER NOT NULL DEFAULT 600,
  heartbeat_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_supervisors_run ON agent_supervisors(run_id);
