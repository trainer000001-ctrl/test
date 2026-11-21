PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS orchestration_plans (
  id TEXT PRIMARY KEY,
  objective TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'supervised' CHECK (mode IN ('assisted', 'supervised', 'autonomous')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  concurrency_limit INTEGER NOT NULL DEFAULT 1,
  budget_seconds INTEGER NOT NULL DEFAULT 3600,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orchestration_tasks (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES orchestration_plans(id) ON DELETE CASCADE,
  task_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  specialist_role TEXT NOT NULL,
  depends_on_task_id TEXT REFERENCES orchestration_tasks(id) ON DELETE SET NULL,
  agent_run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
  worktree_path TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'running', 'completed', 'failed', 'blocked', 'cancelled')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orchestration_tasks_plan ON orchestration_tasks(plan_id, task_index);
CREATE INDEX IF NOT EXISTS idx_orchestration_tasks_status ON orchestration_tasks(status);
