use crate::db;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    io::Read,
    path::{Component, Path},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex, OnceLock},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::AppHandle;
use uuid::Uuid;

const ALLOWLISTED_EXECUTABLES: &[&str] = &["git", "node", "pnpm", "cargo", "gh", "timeout"];
const SAFE_ENV_ALLOWLIST: &[&str] = &[
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "COMSPEC",
    "WINDIR",
    "HOME",
    "USERPROFILE",
    "TMP",
    "TEMP",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "TERM",
];
const MAX_CAPTURED_OUTPUT_BYTES: usize = 256 * 1024;

#[allow(dead_code)]
struct SupervisedHandle {
    child: Child,
    output: Arc<Mutex<String>>,
    drainers: Vec<thread::JoinHandle<()>>,
    started_at: Instant,
    timeout: Duration,
}

fn supervised_children() -> &'static Mutex<HashMap<String, SupervisedHandle>> {
    static REGISTRY: OnceLock<Mutex<HashMap<String, SupervisedHandle>>> = OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

fn append_bounded_output(buf: &Arc<Mutex<String>>, chunk: &[u8]) {
    const TRUNCATION_MARKER: &str = "\n...[truncated]";
    if chunk.is_empty() {
        return;
    }
    let text = String::from_utf8_lossy(chunk);
    if let Ok(mut guard) = buf.lock() {
        if guard.ends_with(TRUNCATION_MARKER) {
            return;
        }
        let remaining = MAX_CAPTURED_OUTPUT_BYTES.saturating_sub(guard.len());
        if text.len() <= remaining {
            guard.push_str(&text);
        } else {
            let mut end = remaining;
            while end > 0 && !text.is_char_boundary(end) {
                end -= 1;
            }
            guard.push_str(&text[..end]);
            guard.push_str(TRUNCATION_MARKER);
        }
    }
}

fn spawn_pipe_drainer<R: Read + Send + 'static>(
    reader: R,
    buf: Arc<Mutex<String>>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let mut reader = reader;
        let mut chunk = [0u8; 4096];
        loop {
            match reader.read(&mut chunk) {
                Ok(0) | Err(_) => break,
                Ok(n) => append_bounded_output(&buf, &chunk[..n]),
            }
        }
    })
}

fn terminate_process_tree(pid: u32, child: &mut Child) {
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(not(windows))]
    {
        let _ = pid;
    }
    let _ = child.kill();
    let _ = child.wait();
}

pub fn validate_worktree_dir(worktree_dir: &Path) -> Result<(), String> {
    if worktree_dir.as_os_str().is_empty()
        || worktree_dir
            .components()
            .any(|component| matches!(component, Component::ParentDir))
    {
        return Err(format!(
            "Worktree path rejected due to traversal or empty path: {}",
            worktree_dir.display()
        ));
    }
    if !worktree_dir.exists() || !worktree_dir.is_dir() {
        return Err(format!(
            "Worktree path must exist and be an isolated directory: {}",
            worktree_dir.display()
        ));
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
struct StructuredAgentCommand {
    command: String,
    #[serde(default)]
    args: Vec<String>,
}

fn resolve_command_executable(command: &str) -> Result<String, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() || !ALLOWLISTED_EXECUTABLES.contains(&trimmed) {
        return Err(format!(
            "Command '{trimmed}' is not in the supervised agent allowlist"
        ));
    }
    Ok(trimmed.to_string())
}

fn validate_command_args(args: &[String]) -> Result<(), String> {
    for arg in args {
        if arg.contains('\0') || arg.contains('\n') || arg.contains('\r') {
            return Err("Command argument contains disallowed control characters".to_string());
        }
    }
    Ok(())
}

pub fn spawn_supervised_process(
    run_id: &str,
    worktree_dir: &Path,
    command: &str,
    args: &[String],
) -> Result<u32, String> {
    spawn_supervised_process_with_timeout(run_id, worktree_dir, command, args, 600)
}

pub fn spawn_supervised_process_with_timeout(
    run_id: &str,
    worktree_dir: &Path,
    command: &str,
    args: &[String],
    timeout_seconds: u64,
) -> Result<u32, String> {
    validate_worktree_dir(worktree_dir)?;
    let executable = resolve_command_executable(command)?;
    validate_command_args(args)?;

    let mut cmd = Command::new(&executable);
    cmd.args(args)
        .current_dir(worktree_dir)
        .env_clear()
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    for key in SAFE_ENV_ALLOWLIST {
        if let Ok(val) = std::env::var(key) {
            cmd.env(key, val);
        }
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn supervised executable '{executable}': {e}"))?;

    let output = Arc::new(Mutex::new(String::new()));
    let mut drainers = Vec::new();
    if let Some(stdout) = child.stdout.take() {
        drainers.push(spawn_pipe_drainer(stdout, Arc::clone(&output)));
    }
    if let Some(stderr) = child.stderr.take() {
        drainers.push(spawn_pipe_drainer(stderr, Arc::clone(&output)));
    }

    let pid = child.id();
    let clamped_timeout = Duration::from_secs(timeout_seconds.clamp(1, 3600));
    let mut guard = supervised_children()
        .lock()
        .map_err(|_| "Supervised process registry lock poisoned".to_string())?;
    guard.insert(
        run_id.to_string(),
        SupervisedHandle {
            child,
            output,
            drainers,
            started_at: Instant::now(),
            timeout: clamped_timeout,
        },
    );
    Ok(pid)
}

fn finished_outputs() -> &'static Mutex<HashMap<String, String>> {
    static FINISHED: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
    FINISHED.get_or_init(|| Mutex::new(HashMap::new()))
}

fn store_finished_output(run_id: &str, mut handle: SupervisedHandle) {
    for drainer in handle.drainers.drain(..) {
        let _ = drainer.join();
    }
    if let (Ok(raw_guard), Ok(mut store)) = (handle.output.lock(), finished_outputs().lock()) {
        store.insert(run_id.to_string(), redact_secrets(&raw_guard));
    }
}

#[allow(dead_code)]
pub fn poll_supervised_process(run_id: &str) -> Result<Option<i32>, String> {
    let mut guard = supervised_children()
        .lock()
        .map_err(|_| "Supervised process registry lock poisoned".to_string())?;
    let Some(handle) = guard.get_mut(run_id) else {
        return Ok(None);
    };
    if handle.started_at.elapsed() >= handle.timeout {
        let mut removed = guard.remove(run_id).expect("checked entry exists");
        drop(guard);
        let pid = removed.child.id();
        terminate_process_tree(pid, &mut removed.child);
        store_finished_output(run_id, removed);
        return Err("timed_out".to_string());
    }
    match handle.child.try_wait().map_err(|e| e.to_string())? {
        Some(status) => {
            let removed = guard.remove(run_id).expect("checked entry exists");
            drop(guard);
            store_finished_output(run_id, removed);
            Ok(Some(status.code().unwrap_or(-1)))
        }
        None => Ok(None),
    }
}

#[allow(dead_code)]
pub fn read_supervised_output(run_id: &str) -> Option<String> {
    if let Ok(guard) = supervised_children().lock() {
        if let Some(handle) = guard.get(run_id) {
            return handle.output.lock().ok().map(|raw| redact_secrets(&raw));
        }
    }
    finished_outputs().lock().ok()?.get(run_id).cloned()
}

pub fn kill_supervised_process(run_id: &str) -> Result<Option<u32>, String> {
    let handle_opt = {
        let mut guard = supervised_children()
            .lock()
            .map_err(|_| "Supervised process registry lock poisoned".to_string())?;
        guard.remove(run_id)
    };
    let Some(mut handle) = handle_opt else {
        return Ok(None);
    };
    let pid = handle.child.id();
    terminate_process_tree(pid, &mut handle.child);
    store_finished_output(run_id, handle);
    Ok(Some(pid))
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionApprovalBound {
    pub run_id: String,
    pub executable: String,
    pub args: Vec<String>,
    pub worktree_path: String,
    pub approved: bool,
    pub expires_at_unix: u64,
}

#[allow(dead_code)]
pub fn verify_action_approval(
    approval: &ActionApprovalBound,
    run_id: &str,
    executable: &str,
    args: &[String],
    worktree_dir: &Path,
    now_unix: u64,
) -> Result<(), String> {
    if !approval.approved {
        return Err("Execution blocked: action approval has not been granted".to_string());
    }
    if approval.expires_at_unix <= now_unix {
        return Err("Execution blocked: action approval record is expired".to_string());
    }
    if approval.run_id != run_id
        || approval.executable != executable
        || approval.args != args
        || Path::new(&approval.worktree_path) != worktree_dir
    {
        return Err(
            "Execution blocked: action parameters do not match durable approval record".to_string(),
        );
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentExecutionStep {
    pub id: String,
    pub run_id: String,
    pub step_index: i64,
    pub kind: String,
    pub summary: String,
    pub status: String,
    pub payload_json: String,
    pub output_text: String,
    pub error_text: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSupervisorStatus {
    pub run_id: String,
    pub pid: Option<i64>,
    pub status: String,
    pub worktree_path: String,
    pub timeout_seconds: i64,
    pub heartbeat_at: String,
    pub started_at: String,
    pub ended_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRunExecutionResult {
    pub run_id: String,
    pub status: String,
    pub exit_code: Option<i64>,
    pub summary: String,
    pub changed_files: Vec<String>,
    pub diff_stat: String,
}

fn redact_secrets(input: &str) -> String {
    let mut sanitized = input.to_string();
    let keywords = ["ghp_", "gho_", "bearer ", "Bearer ", "password=", "secret="];
    for keyword in keywords {
        if let Some(pos) = sanitized.find(keyword) {
            let start = pos + keyword.len();
            let end = sanitized[start..]
                .find(|c: char| c.is_whitespace() || c == '"' || c == '\'')
                .map(|offset| start + offset)
                .unwrap_or(sanitized.len());
            sanitized.replace_range(start..end, "[REDACTED]");
        }
    }
    sanitized
}

#[tauri::command]
pub async fn discover_local_providers() -> Result<Vec<String>, String> {
    let mut available = Vec::new();
    let candidates = [
        ("git", ["--version"]),
        ("node", ["--version"]),
        ("pnpm", ["--version"]),
        ("cargo", ["--version"]),
        ("gh", ["--version"]),
    ];

    for (executable, args) in candidates {
        if Command::new(executable).args(args).output().is_ok() {
            available.push(executable.to_string());
        }
    }

    Ok(available)
}

#[tauri::command]
pub async fn start_supervised_agent_run(
    app: AppHandle,
    agent_id: String,
    repository_id: String,
    worktree_path: String,
    prompt: String,
) -> Result<AgentSupervisorStatus, String> {
    let safe_prompt = redact_secrets(&prompt);
    let worktree_dir = Path::new(&worktree_path);
    if !worktree_dir.exists() || !worktree_dir.is_dir() {
        return Err(format!(
            "Worktree path must exist and be an isolated directory: {worktree_path}"
        ));
    }

    let connection = db::connect(&app)?;
    let run_id = Uuid::new_v4().to_string();
    let supervisor_id = Uuid::new_v4().to_string();
    let branch_name = format!("agent/{}", &run_id[..8]);

    let spawned_pid: Option<i64> = if let Ok(parsed) =
        serde_json::from_str::<StructuredAgentCommand>(&prompt)
    {
        Some(spawn_supervised_process(&run_id, worktree_dir, &parsed.command, &parsed.args)? as i64)
    } else {
        None
    };

    let transaction = connection
        .unchecked_transaction()
        .map_err(|e| e.to_string())?;

    transaction
        .execute(
            "INSERT INTO agent_runs (id, agent_id, repository_id, worktree_path, branch_name, prompt, status, started_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'running', CURRENT_TIMESTAMP)",
            rusqlite::params![run_id, agent_id, repository_id, worktree_path, branch_name, safe_prompt],
        )
        .map_err(|e| e.to_string())?;

    transaction
        .execute(
            "INSERT INTO agent_supervisors (id, run_id, pid, status, worktree_path, timeout_seconds, heartbeat_at, started_at)
             VALUES (?1, ?2, ?3, 'running', ?4, 600, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            rusqlite::params![supervisor_id, run_id, spawned_pid, worktree_path],
        )
        .map_err(|e| e.to_string())?;

    let step_id = Uuid::new_v4().to_string();
    let step_output = match spawned_pid {
        Some(pid) => format!("Target worktree: {worktree_path} (supervised OS pid: {pid})"),
        None => format!("Target worktree: {worktree_path}"),
    };
    transaction
        .execute(
            "INSERT INTO agent_execution_steps (id, run_id, step_index, kind, summary, status, payload_json, output_text)
             VALUES (?1, ?2, 1, 'init', 'Agent process supervisor initialized in worktree', 'completed', '{}', ?3)",
            rusqlite::params![step_id, run_id, step_output],
        )
        .map_err(|e| e.to_string())?;

    transaction.commit().map_err(|e| e.to_string())?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string();

    Ok(AgentSupervisorStatus {
        run_id,
        pid: spawned_pid,
        status: "running".to_string(),
        worktree_path,
        timeout_seconds: 600,
        heartbeat_at: timestamp.clone(),
        started_at: timestamp,
        ended_at: None,
    })
}

#[tauri::command]
pub async fn cancel_supervised_agent_run(
    app: AppHandle,
    run_id: String,
) -> Result<AgentSupervisorStatus, String> {
    let killed_pid = kill_supervised_process(&run_id)?.map(|pid| pid as i64);
    let connection = db::connect(&app)?;
    let transaction = connection
        .unchecked_transaction()
        .map_err(|e| e.to_string())?;

    transaction
        .execute(
            "UPDATE agent_runs SET status = 'cancelled', finished_at = CURRENT_TIMESTAMP WHERE id = ?1",
            rusqlite::params![run_id],
        )
        .map_err(|e| e.to_string())?;

    transaction
        .execute(
            "UPDATE agent_supervisors SET status = 'killed', ended_at = CURRENT_TIMESTAMP WHERE run_id = ?1",
            rusqlite::params![run_id],
        )
        .map_err(|e| e.to_string())?;

    let step_id = Uuid::new_v4().to_string();
    let next_index: i64 = transaction
        .query_row(
            "SELECT COALESCE(MAX(step_index), 0) + 1 FROM agent_execution_steps WHERE run_id = ?1",
            rusqlite::params![run_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let cancel_output = match killed_pid {
        Some(pid) => {
            format!("Terminated supervised OS process pid {pid} and cleaned up boundaries")
        }
        None => "Cleaned up process supervisor and boundaries".to_string(),
    };
    transaction
        .execute(
            "INSERT INTO agent_execution_steps (id, run_id, step_index, kind, summary, status, output_text)
             VALUES (?1, ?2, ?3, 'cancellation', 'Agent run cancelled by supervisor policy', 'cancelled', ?4)",
            rusqlite::params![step_id, run_id, next_index, cancel_output],
        )
        .map_err(|e| e.to_string())?;

    transaction.commit().map_err(|e| e.to_string())?;

    Ok(AgentSupervisorStatus {
        run_id,
        pid: killed_pid,
        status: "killed".to_string(),
        worktree_path: String::new(),
        timeout_seconds: 600,
        heartbeat_at: String::new(),
        started_at: String::new(),
        ended_at: Some("now".to_string()),
    })
}

#[tauri::command]
pub async fn get_agent_execution_steps(
    app: AppHandle,
    run_id: String,
) -> Result<Vec<AgentExecutionStep>, String> {
    let connection = db::connect(&app)?;
    let mut stmt = connection
        .prepare(
            "SELECT id, run_id, step_index, kind, summary, status, payload_json, output_text, error_text, created_at, updated_at
             FROM agent_execution_steps WHERE run_id = ?1 ORDER BY step_index ASC",
        )
        .map_err(|e| e.to_string())?;

    let steps = stmt
        .query_map(rusqlite::params![run_id], |row| {
            Ok(AgentExecutionStep {
                id: row.get(0)?,
                run_id: row.get(1)?,
                step_index: row.get(2)?,
                kind: row.get(3)?,
                summary: row.get(4)?,
                status: row.get(5)?,
                payload_json: row.get(6)?,
                output_text: row.get(7)?,
                error_text: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(steps)
}

#[tauri::command]
pub async fn evaluate_agent_worktree_evidence(
    worktree_path: String,
) -> Result<AgentRunExecutionResult, String> {
    let worktree_dir = Path::new(&worktree_path);
    validate_worktree_dir(worktree_dir)?;

    let status_output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(worktree_dir)
        .output()
        .map_err(|e| format!("Failed to run git status: {e}"))?;

    if !status_output.status.success() {
        let exit_code = status_output.status.code().unwrap_or(-1) as i64;
        let stderr = redact_secrets(&String::from_utf8_lossy(&status_output.stderr));
        return Ok(AgentRunExecutionResult {
            run_id: Uuid::new_v4().to_string(),
            status: "failed".to_string(),
            exit_code: Some(exit_code),
            summary: format!("git status failed with exit {exit_code}: {}", stderr.trim()),
            changed_files: Vec::new(),
            diff_stat: String::new(),
        });
    }

    let changed = String::from_utf8_lossy(&status_output.stdout);
    let changed_files: Vec<String> = changed
        .lines()
        .filter(|line| line.len() > 3)
        .map(|line| line[3..].trim().to_string())
        .collect();

    let diff_output = Command::new("git")
        .args(["diff", "--stat"])
        .current_dir(worktree_dir)
        .output()
        .map_err(|e| format!("Failed to run git diff: {e}"))?;

    let diff_stat = String::from_utf8_lossy(&diff_output.stdout)
        .trim()
        .to_string();

    Ok(AgentRunExecutionResult {
        run_id: Uuid::new_v4().to_string(),
        status: "completed".to_string(),
        exit_code: Some(status_output.status.code().unwrap_or(0) as i64),
        summary: format!("Captured {} changed files in worktree", changed_files.len()),
        changed_files,
        diff_stat,
    })
}

#[allow(dead_code)]
pub fn reconcile_stale_agent_runs(connection: &rusqlite::Connection) -> Result<usize, String> {
    let updated_runs = connection
        .execute(
            "UPDATE agent_runs SET status = 'failed', finished_at = CURRENT_TIMESTAMP WHERE status = 'running'",
            [],
        )
        .map_err(|e| e.to_string())?;
    connection
        .execute(
            "UPDATE agent_supervisors SET status = 'recovered', ended_at = CURRENT_TIMESTAMP WHERE status IN ('starting', 'running')",
            [],
        )
        .map_err(|e| e.to_string())?;
    Ok(updated_runs)
}

#[cfg(test)]
mod tests {
    use super::{
        evaluate_agent_worktree_evidence, kill_supervised_process, poll_supervised_process,
        read_supervised_output, reconcile_stale_agent_runs, resolve_command_executable,
        spawn_supervised_process, spawn_supervised_process_with_timeout, validate_command_args,
        validate_worktree_dir, verify_action_approval, ActionApprovalBound,
    };
    use rusqlite::Connection;
    use std::{
        env,
        path::Path,
        thread::sleep,
        time::{Duration, Instant},
    };
    use uuid::Uuid;

    #[test]
    fn rejects_non_allowlisted_shells_and_control_characters() {
        assert!(resolve_command_executable("bash").is_err());
        assert!(resolve_command_executable("cmd").is_err());
        assert!(resolve_command_executable("powershell").is_err());
        assert!(resolve_command_executable("sh").is_err());
        assert!(resolve_command_executable("").is_err());
        assert_eq!(resolve_command_executable("git").as_deref(), Ok("git"));

        assert!(validate_command_args(&["-e".to_string(), "ok".to_string()]).is_ok());
        assert!(validate_command_args(&["bad\narg".to_string()]).is_err());
        assert!(validate_command_args(&["bad\0arg".to_string()]).is_err());
    }

    #[test]
    fn rejects_missing_worktree_directory() {
        let bogus = Path::new("/nonexistent-rocksoul-worktree-dir-12345");
        let err = spawn_supervised_process("run-missing", bogus, "git", &[])
            .expect_err("expected missing worktree error");
        assert!(err.contains("Worktree path must exist"));
    }

    #[test]
    fn spawns_polls_and_kills_real_os_child_process() {
        let run_id = format!("test-run-{}", Uuid::new_v4());
        let worktree_dir = env::temp_dir();

        // Spawn short-lived allowlisted command first and observe real OS PID + completion.
        let done_id = format!("{run_id}-quick");
        let quick_pid =
            spawn_supervised_process(&done_id, &worktree_dir, "git", &["--version".to_string()])
                .expect("git --version should spawn cleanly");
        assert!(quick_pid > 0);
        let mut exited = None;
        for _ in 0..40 {
            if let Some(code) = poll_supervised_process(&done_id).expect("poll") {
                exited = Some(code);
                break;
            }
            sleep(Duration::from_millis(25));
        }
        assert_eq!(exited, Some(0));

        // Spawn long-running node child and verify real OS kill cleanup.
        let live_id = format!("{run_id}-live");
        let args = vec!["-e".to_string(), "setTimeout(() => {}, 15000)".to_string()];
        let live_pid = spawn_supervised_process(&live_id, &worktree_dir, "node", &args)
            .expect("node sleep child should spawn cleanly");
        assert!(live_pid > 0);
        assert!(read_supervised_output(&live_id).is_some());
        assert_eq!(poll_supervised_process(&live_id).expect("live poll"), None);

        let killed = kill_supervised_process(&live_id).expect("kill child");
        assert_eq!(killed, Some(live_pid));
        assert_eq!(
            kill_supervised_process(&live_id).expect("idempotent kill"),
            None
        );
    }

    #[test]
    fn enforces_timeout_and_rejects_traversal_and_non_git_truthfully() {
        assert!(validate_worktree_dir(Path::new("../escape")).is_err());

        let run_id = format!("timeout-run-{}", Uuid::new_v4());
        let worktree_dir = env::temp_dir();
        let args = vec!["-e".to_string(), "setTimeout(() => {}, 15000)".to_string()];
        spawn_supervised_process_with_timeout(&run_id, &worktree_dir, "node", &args, 1)
            .expect("node sleep child should spawn cleanly");
        sleep(Duration::from_millis(1150));
        let err = poll_supervised_process(&run_id).expect_err("expected timeout");
        assert_eq!(err, "timed_out");

        let non_git = tauri::async_runtime::block_on(evaluate_agent_worktree_evidence(
            worktree_dir.to_string_lossy().to_string(),
        ))
        .expect("non-git status returns truthful failed result");
        assert_eq!(non_git.status, "failed");
        assert_ne!(non_git.exit_code, Some(0));
    }

    #[test]
    fn reconciles_stale_running_supervisors_on_startup() {
        let conn = Connection::open_in_memory().expect("in-memory sqlite");
        conn.execute_batch(
            "CREATE TABLE agent_runs (id TEXT PRIMARY KEY, status TEXT NOT NULL, finished_at TEXT);
             CREATE TABLE agent_supervisors (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, status TEXT NOT NULL, ended_at TEXT);
             INSERT INTO agent_runs (id, status) VALUES ('run-1', 'running');
             INSERT INTO agent_supervisors (id, run_id, status) VALUES ('sup-1', 'run-1', 'running');",
        )
        .expect("seed schema");

        let updated = reconcile_stale_agent_runs(&conn).expect("reconcile");
        assert_eq!(updated, 1);
        let run_status: String = conn
            .query_row(
                "SELECT status FROM agent_runs WHERE id = 'run-1'",
                [],
                |r| r.get(0),
            )
            .expect("query run");
        let sup_status: String = conn
            .query_row(
                "SELECT status FROM agent_supervisors WHERE id = 'sup-1'",
                [],
                |r| r.get(0),
            )
            .expect("query sup");
        assert_eq!(run_status, "failed");
        assert_eq!(sup_status, "recovered");
    }

    fn poll_until_exit_or_deadline(run_id: &str, deadline: Instant) -> Result<Option<i32>, String> {
        loop {
            match poll_supervised_process(run_id) {
                Ok(Some(code)) => return Ok(Some(code)),
                Ok(None) => {
                    if Instant::now() >= deadline {
                        return Err(format!(
                            "supervised process {run_id} did not exit before deadline"
                        ));
                    }
                    sleep(Duration::from_millis(25));
                }
                Err(error) => return Err(error),
            }
        }
    }

    #[test]
    fn strips_secrets_drains_large_pipes_and_enforces_durable_approval() {
        let worktree_dir = env::temp_dir();

        // 1. Secret env stripping via env_clear()
        env::set_var("MW_TEST_SECRET_TOKEN", "ghp_supersecret_value_123");
        let env_run_id = format!("env-run-{}", Uuid::new_v4());
        spawn_supervised_process(
            &env_run_id,
            &worktree_dir,
            "node",
            &[
                "-e".to_string(),
                "process.stdout.write(process.env.MW_TEST_SECRET_TOKEN || 'STRIPPED')".to_string(),
            ],
        )
        .expect("spawn env check");
        let exited =
            poll_until_exit_or_deadline(&env_run_id, Instant::now() + Duration::from_secs(30))
                .expect("poll env within deadline");
        assert_eq!(exited, Some(0));
        sleep(Duration::from_millis(40));
        let env_out = read_supervised_output(&env_run_id).unwrap_or_default();
        assert_eq!(env_out.trim(), "STRIPPED");

        // 2. Large (> 300 KiB) stdout drain & truncation without deadlock
        let flood_run_id = format!("flood-run-{}", Uuid::new_v4());
        spawn_supervised_process(
            &flood_run_id,
            &worktree_dir,
            "node",
            &[
                "-e".to_string(),
                "process.stdout.write('A'.repeat(320 * 1024))".to_string(),
            ],
        )
        .expect("spawn flood check");
        let flood_exit =
            poll_until_exit_or_deadline(&flood_run_id, Instant::now() + Duration::from_secs(30))
                .expect("poll flood within deadline");
        assert_eq!(flood_exit, Some(0));
        sleep(Duration::from_millis(40));
        let flood_out = read_supervised_output(&flood_run_id).unwrap_or_default();
        assert!(flood_out.contains("...[truncated]"));
        assert!(flood_out.len() <= 270_000);

        // 3. Durable exact-action approval binding
        let approval = ActionApprovalBound {
            run_id: "run-99".to_string(),
            executable: "git".to_string(),
            args: vec!["status".to_string()],
            worktree_path: worktree_dir.to_string_lossy().to_string(),
            approved: true,
            expires_at_unix: 2000,
        };
        assert!(verify_action_approval(
            &approval,
            "run-99",
            "git",
            &["status".to_string()],
            &worktree_dir,
            1000,
        )
        .is_ok());
        assert!(verify_action_approval(
            &approval,
            "run-99",
            "git",
            &["push".to_string()],
            &worktree_dir,
            1000,
        )
        .is_err());
        assert!(verify_action_approval(
            &approval,
            "run-99",
            "git",
            &["status".to_string()],
            &worktree_dir,
            2500,
        )
        .is_err());
    }
}
