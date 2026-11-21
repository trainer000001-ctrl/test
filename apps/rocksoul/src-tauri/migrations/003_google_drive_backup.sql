CREATE TABLE IF NOT EXISTS cloud_backup_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    google_account TEXT,
    refresh_token_encrypted TEXT,
    last_backup_at TEXT,
    remote_file_id TEXT
);
