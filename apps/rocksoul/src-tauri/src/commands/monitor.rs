use chrono::{DateTime, Utc};
use serde_json::Value;
use std::{
    fs::{self, File},
    io::{BufRead, BufReader, Read, Seek, SeekFrom},
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::Command,
    time::{Duration, Instant, SystemTime},
};
use tauri::AppHandle;

use crate::{
    commands::repositories::query_repositories,
    db,
    models::{
        AgentSessionActivity, DiskVolumeStatus, EcosystemServiceStatus, MonitorSnapshot,
        PlanTrackerEntry, RepoMonitorEntry, Repository,
    },
};

const PATCH_MAX_BYTES: usize = 24_576;
const TRANSCRIPT_TAIL_BYTES: usize = 65_536;
const MAX_AGENT_SESSIONS: usize = 5;
const MAX_CHANGED_FILES: usize = 25;
const SERVICE_TIMEOUT_MS: u64 = 150;

const ALLOWLISTED_ORIGINS: [&str; 8] = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3002",
    "http://localhost:3002",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://127.0.0.1:8787",
    "http://localhost:8787",
];

struct ProbeSpec {
    id: &'static str,
    name: &'static str,
    addr: &'static str,
    display_url: &'static str,
    path: &'static str,
}

const SERVICE_PROBES: [ProbeSpec; 5] = [
    ProbeSpec {
        id: "allah",
        name: "A-L-L-A-H Sanctuary",
        addr: "127.0.0.1:3000",
        display_url: "http://127.0.0.1:3000",
        path: "/",
    },
    ProbeSpec {
        id: "web",
        name: "MoonWitness Web",
        addr: "127.0.0.1:3000",
        display_url: "http://127.0.0.1:3000/moonwitness",
        path: "/moonwitness",
    },
    ProbeSpec {
        id: "api",
        name: "Core API",
        addr: "127.0.0.1:3002",
        display_url: "http://127.0.0.1:3002",
        path: "/api/v1/healthz",
    },
    ProbeSpec {
        id: "arsy",
        name: "ARSY Control Plane",
        addr: "127.0.0.1:8787",
        display_url: "http://127.0.0.1:8787",
        path: "/v1/health",
    },
    ProbeSpec {
        id: "memory",
        name: "Memory Engine",
        addr: "127.0.0.1:8000",
        display_url: "http://127.0.0.1:8000",
        path: "/health",
    },
];

fn round_two_decimals(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn disk_tier(free_gb: f64) -> &'static str {
    if free_gb >= 10.0 {
        "calm"
    } else if free_gb >= 5.0 {
        "watch"
    } else if free_gb >= 2.0 {
        "alert"
    } else {
        "critical"
    }
}

#[cfg(windows)]
fn query_disk_volume(drive: &str, mount_path: &str) -> DiskVolumeStatus {
    extern "system" {
        fn GetDiskFreeSpaceExW(
            lp_directory_name: *const u16,
            lp_free_bytes_available_to_caller: *mut u64,
            lp_total_number_of_bytes: *mut u64,
            lp_total_number_of_free_bytes: *mut u64,
        ) -> i32;
    }

    let wide_path: Vec<u16> = mount_path
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let mut free_available: u64 = 0;
    let mut total_bytes: u64 = 0;
    let mut total_free: u64 = 0;

    // SAFETY: `wide_path` is null-terminated UTF-16 valid for the duration of the Win32 call,
    // and all output pointers reference initialized stack variables.
    let ok = unsafe {
        GetDiskFreeSpaceExW(
            wide_path.as_ptr(),
            &mut free_available,
            &mut total_bytes,
            &mut total_free,
        )
    };

    if ok == 0 || total_bytes == 0 {
        return DiskVolumeStatus {
            drive: drive.to_string(),
            mount_path: mount_path.to_string(),
            available: false,
            total_gb: 0.0,
            free_gb: 0.0,
            used_pct: 0.0,
            tier: "unavailable".to_string(),
        };
    }

    let bytes_per_gb = 1_073_741_824.0;
    let total_gb = round_two_decimals(total_bytes as f64 / bytes_per_gb);
    let free_gb = round_two_decimals(free_available as f64 / bytes_per_gb);
    let used_bytes = total_bytes.saturating_sub(free_available);
    let used_pct = round_two_decimals((used_bytes as f64 / total_bytes as f64) * 100.0);

    DiskVolumeStatus {
        drive: drive.to_string(),
        mount_path: mount_path.to_string(),
        available: true,
        total_gb,
        free_gb,
        used_pct,
        tier: disk_tier(free_gb).to_string(),
    }
}

#[cfg(not(windows))]
fn query_disk_volume(drive: &str, mount_path: &str) -> DiskVolumeStatus {
    DiskVolumeStatus {
        drive: drive.to_string(),
        mount_path: mount_path.to_string(),
        available: false,
        total_gb: 0.0,
        free_gb: 0.0,
        used_pct: 0.0,
        tier: "unavailable".to_string(),
    }
}

fn collect_disks(repositories: &[Repository]) -> Vec<DiskVolumeStatus> {
    let mut mounts: Vec<(String, String)> = vec![("C:".to_string(), "C:\\".to_string())];
    if Path::new("Z:\\").exists() {
        mounts.push(("Z:".to_string(), "Z:\\".to_string()));
    }
    for repo in repositories {
        let raw_path = repo.path.strip_prefix(r"\\?\").unwrap_or(&repo.path);
        let bytes = raw_path.as_bytes();
        if bytes.len() >= 2 && bytes[1] == b':' && bytes[0].is_ascii_alphabetic() {
            let letter = (bytes[0] as char).to_ascii_uppercase();
            let drive = format!("{letter}:");
            if !mounts.iter().any(|(existing, _)| existing == &drive) {
                mounts.push((drive, format!("{letter}:\\")));
            }
        }
    }
    mounts
        .into_iter()
        .map(|(drive, mount)| query_disk_volume(&drive, &mount))
        .collect()
}

fn parse_http_status_code(raw: &str) -> Option<u16> {
    let first_line = raw.lines().next()?;
    let mut parts = first_line.split_whitespace();
    let proto = parts.next()?;
    if !proto.starts_with("HTTP/") {
        return None;
    }
    parts.next()?.parse::<u16>().ok()
}

fn probe_loopback_http(spec: &ProbeSpec) -> EcosystemServiceStatus {
    let started = Instant::now();
    let Ok(addr) = spec.addr.parse::<SocketAddr>() else {
        return EcosystemServiceStatus {
            id: spec.id.to_string(),
            name: spec.name.to_string(),
            url: spec.display_url.to_string(),
            status: "offline".to_string(),
            http_status: None,
            latency_ms: None,
        };
    };

    let timeout = Duration::from_millis(SERVICE_TIMEOUT_MS);
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, timeout) else {
        return EcosystemServiceStatus {
            id: spec.id.to_string(),
            name: spec.name.to_string(),
            url: spec.display_url.to_string(),
            status: "offline".to_string(),
            http_status: None,
            latency_ms: None,
        };
    };

    let _ = stream.set_read_timeout(Some(timeout));
    let _ = stream.set_write_timeout(Some(timeout));

    let request = format!(
        "GET {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
        spec.path, spec.addr
    );
    if std::io::Write::write_all(&mut stream, request.as_bytes()).is_err() {
        return EcosystemServiceStatus {
            id: spec.id.to_string(),
            name: spec.name.to_string(),
            url: spec.display_url.to_string(),
            status: "degraded".to_string(),
            http_status: None,
            latency_ms: Some(started.elapsed().as_millis() as u64),
        };
    }

    let mut buffer = [0u8; 256];
    let bytes_read = stream.read(&mut buffer).unwrap_or(0);
    let latency_ms = started.elapsed().as_millis() as u64;
    let header_text = String::from_utf8_lossy(&buffer[..bytes_read]);
    let http_status = parse_http_status_code(&header_text);
    let status = match http_status {
        Some(code) if (200..400).contains(&code) => "online",
        Some(_) => "degraded",
        None => "degraded",
    };

    EcosystemServiceStatus {
        id: spec.id.to_string(),
        name: spec.name.to_string(),
        url: spec.display_url.to_string(),
        status: status.to_string(),
        http_status,
        latency_ms: Some(latency_ms),
    }
}

fn probe_all_services() -> Vec<EcosystemServiceStatus> {
    std::thread::scope(|scope| {
        let handles: Vec<_> = SERVICE_PROBES
            .iter()
            .map(|spec| scope.spawn(|| probe_loopback_http(spec)))
            .collect();
        handles
            .into_iter()
            .filter_map(|handle| handle.join().ok())
            .collect()
    })
}

fn format_system_time(time: SystemTime) -> String {
    let dt: DateTime<Utc> = time.into();
    dt.to_rfc3339()
}

fn parse_transcript_summary(
    session_id: String,
    path: &Path,
    modified: SystemTime,
) -> AgentSessionActivity {
    let fallback = AgentSessionActivity {
        session_id: session_id.clone(),
        updated_at: format_system_time(modified),
        step_count: 0,
        last_type: "UNKNOWN".to_string(),
        last_status: "IDLE".to_string(),
        last_tool: "-".to_string(),
    };

    let Ok(mut file) = File::open(path) else {
        return fallback;
    };
    let Ok(meta) = file.metadata() else {
        return fallback;
    };

    let total_len = meta.len();
    let tail_start = total_len.saturating_sub(TRANSCRIPT_TAIL_BYTES as u64);

    if file.seek(SeekFrom::Start(tail_start)).is_err() {
        return fallback;
    }
    let mut tail_bytes = Vec::new();
    if file.read_to_end(&mut tail_bytes).is_err() {
        return fallback;
    }
    let tail_text = String::from_utf8_lossy(&tail_bytes);

    let mut updated_at = format_system_time(modified);
    let mut last_type = "SESSION".to_string();
    let mut last_status = "ACTIVE".to_string();
    let mut last_tool = "-".to_string();
    let mut max_step_index = 0usize;

    for raw_line in tail_text.lines().rev() {
        let trimmed = raw_line.trim();
        if !trimmed.starts_with('{') {
            continue;
        }
        let Ok(json) = serde_json::from_str::<Value>(trimmed) else {
            continue;
        };
        if let Some(idx) = json.get("step_index").and_then(Value::as_u64) {
            max_step_index = max_step_index.max((idx + 1) as usize);
        }
        if last_type == "SESSION" {
            if let Some(step_type) = json.get("type").and_then(Value::as_str) {
                last_type = step_type.to_string();
            }
            if let Some(status) = json.get("status").and_then(Value::as_str) {
                last_status = status.to_string();
            }
            if let Some(ts) = json.get("created_at").and_then(Value::as_str) {
                updated_at = ts.to_string();
            }
        }
        if last_tool == "-" {
            if let Some(tool_calls) = json.get("tool_calls").and_then(Value::as_array) {
                let names: Vec<&str> = tool_calls
                    .iter()
                    .filter_map(|call| call.get("name").and_then(Value::as_str))
                    .collect();
                if !names.is_empty() {
                    last_tool = names.join(", ");
                }
            }
        }
        if last_type != "SESSION" && last_tool != "-" && max_step_index > 0 {
            break;
        }
    }

    if max_step_index == 0 && total_len <= 256 * 1024 && file.seek(SeekFrom::Start(0)).is_ok() {
        let mut reader = BufReader::new(&file);
        let mut line = String::new();
        while reader.read_line(&mut line).unwrap_or(0) > 0 {
            max_step_index += 1;
            line.clear();
        }
    }

    AgentSessionActivity {
        session_id,
        updated_at,
        step_count: max_step_index,
        last_type,
        last_status,
        last_tool,
    }
}

fn collect_agent_sessions_from(brain_root: &Path) -> Vec<AgentSessionActivity> {
    let Ok(entries) = fs::read_dir(brain_root) else {
        return Vec::new();
    };

    let mut transcripts: Vec<(SystemTime, String, PathBuf)> = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let transcript_path = path
            .join(".system_generated")
            .join("logs")
            .join("transcript.jsonl");
        let Ok(meta) = fs::metadata(&transcript_path) else {
            continue;
        };
        let Ok(modified) = meta.modified() else {
            continue;
        };
        let session_id = entry.file_name().to_string_lossy().to_string();
        transcripts.push((modified, session_id, transcript_path));
    }

    transcripts.sort_by_key(|entry| std::cmp::Reverse(entry.0));
    transcripts.truncate(MAX_AGENT_SESSIONS);
    transcripts
        .into_iter()
        .map(|(modified, session_id, path)| parse_transcript_summary(session_id, &path, modified))
        .collect()
}

fn collect_agent_sessions() -> Vec<AgentSessionActivity> {
    let Some(home) = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")) else {
        return Vec::new();
    };
    let brain_root = PathBuf::from(home)
        .join(".gemini")
        .join("antigravity")
        .join("brain");
    collect_agent_sessions_from(&brain_root)
}

fn parse_markdown_checklist(name: &str, path: &Path) -> Option<PlanTrackerEntry> {
    let content = fs::read_to_string(path).ok()?;
    let mut total_tasks = 0usize;
    let mut completed_tasks = 0usize;
    let mut partial_tasks = 0usize;

    for line in content.lines() {
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix("- [") {
            if let Some(marker) = rest.chars().next() {
                if rest.get(1..2) == Some("]") {
                    total_tasks += 1;
                    match marker {
                        'x' | 'X' => completed_tasks += 1,
                        '~' | '-' => partial_tasks += 1,
                        _ => {}
                    }
                }
            }
        }
    }

    if total_tasks == 0 {
        return None;
    }

    Some(PlanTrackerEntry {
        name: name.to_string(),
        path: path.to_string_lossy().to_string(),
        total_tasks,
        completed_tasks,
        partial_tasks,
    })
}

fn collect_plans(repositories: &[Repository]) -> Vec<PlanTrackerEntry> {
    let mut plans = Vec::new();
    for repo in repositories {
        let root = Path::new(&repo.path);
        if !root.is_dir() {
            continue;
        }
        let work_plan = root.join("WORK_PLAN.md");
        if let Some(entry) = parse_markdown_checklist("WORK_PLAN.md", &work_plan) {
            plans.push(entry);
        }
        let plan_dir = root.join(".plan");
        if let Ok(dirs) = fs::read_dir(&plan_dir) {
            for sub in dirs.flatten() {
                let sub_path = sub.path();
                if !sub_path.is_dir() {
                    continue;
                }
                let task_md = sub_path.join("task.md");
                if task_md.is_file() {
                    let label = sub.file_name().to_string_lossy().to_string();
                    if let Some(entry) = parse_markdown_checklist(&label, &task_md) {
                        plans.push(entry);
                    }
                }
            }
        }
    }
    plans
}

fn run_git_readonly(path: &Path, args: &[&str]) -> Option<String> {
    let mut command = Command::new("git");
    command
        .arg("--no-optional-locks")
        .arg("-C")
        .arg(path)
        .args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let output = command.output().ok()?;
    if !output.status.success() {
        return None;
    }
    Some(
        String::from_utf8_lossy(&output.stdout)
            .trim_end()
            .to_string(),
    )
}

fn inspect_repository_activity(repo: &Repository) -> RepoMonitorEntry {
    let root = Path::new(&repo.path);
    if !root.is_dir() {
        return RepoMonitorEntry {
            id: repo.id.clone(),
            name: repo.name.clone(),
            path: repo.path.clone(),
            branch: repo.branch.clone(),
            head_hash: String::new(),
            head_subject: "Directory unavailable".to_string(),
            head_age: String::new(),
            dirty_count: 0,
            staged_count: 0,
            untracked_count: 0,
            worktree_count: 0,
            changed_files: Vec::new(),
            recent_commits: Vec::new(),
        };
    }

    let branch = crate::commands::repositories::read_current_branch_fast(root, &repo.branch);
    let (log_raw, porcelain, worktree_raw) = std::thread::scope(|scope| {
        let log_job = scope.spawn(|| {
            run_git_readonly(root, &["log", "-8", "--format=%h\x1f%an\x1f%ar\x1f%s"])
                .unwrap_or_default()
        });
        let porcelain_job =
            scope.spawn(|| run_git_readonly(root, &["status", "--porcelain"]).unwrap_or_default());
        let worktree_job = scope.spawn(|| {
            run_git_readonly(root, &["worktree", "list", "--porcelain"]).unwrap_or_default()
        });
        (
            log_job.join().unwrap_or_default(),
            porcelain_job.join().unwrap_or_default(),
            worktree_job.join().unwrap_or_default(),
        )
    });
    let mut head_hash = String::new();
    let mut head_subject = String::new();
    let mut head_age = String::new();
    let mut recent_commits = Vec::new();

    for (idx, line) in log_raw.lines().enumerate() {
        let parts: Vec<&str> = line.split('\x1f').collect();
        if parts.len() == 4 {
            if idx == 0 {
                head_hash = parts[0].to_string();
                head_age = parts[2].to_string();
                head_subject = parts[3].to_string();
            }
            recent_commits.push(format!(
                "{} · {} ({}) — {}",
                parts[0], parts[3], parts[2], parts[1]
            ));
        }
    }

    let mut dirty_count = 0usize;
    let mut staged_count = 0usize;
    let mut untracked_count = 0usize;
    let mut changed_files = Vec::new();

    for line in porcelain.lines() {
        if line.len() < 4 {
            continue;
        }
        dirty_count += 1;
        let bytes = line.as_bytes();
        if bytes[0] == b'?' && bytes[1] == b'?' {
            untracked_count += 1;
        } else if bytes[0] != b' ' {
            staged_count += 1;
        }
        if changed_files.len() < MAX_CHANGED_FILES {
            changed_files.push(line.to_string());
        }
    }

    let worktree_count = worktree_raw
        .lines()
        .filter(|line| line.starts_with("worktree "))
        .count()
        .max(1);

    RepoMonitorEntry {
        id: repo.id.clone(),
        name: repo.name.clone(),
        path: repo.path.clone(),
        branch,
        head_hash,
        head_subject,
        head_age,
        dirty_count,
        staged_count,
        untracked_count,
        worktree_count,
        changed_files,
        recent_commits,
    }
}

pub fn truncate_utf8_patch(input: String) -> String {
    if input.len() <= PATCH_MAX_BYTES {
        return input;
    }
    let mut cut = PATCH_MAX_BYTES;
    while cut > 0 && !input.is_char_boundary(cut) {
        cut -= 1;
    }
    format!(
        "{}\n\n... [patch truncated at {} bytes — inspect full diff in terminal or Git]",
        &input[..cut],
        cut
    )
}

pub fn validate_ecosystem_url(raw: &str) -> Result<String, String> {
    let url = raw.trim();
    if url.is_empty() || url.chars().any(char::is_whitespace) || url.chars().any(char::is_control) {
        return Err("URL must be a clean loopback MoonWitness endpoint.".into());
    }
    for origin in ALLOWLISTED_ORIGINS {
        if let Some(rest) = url.strip_prefix(origin) {
            if rest.is_empty()
                || rest.starts_with('/')
                || rest.starts_with('?')
                || rest.starts_with('#')
            {
                return Ok(url.to_string());
            }
        }
    }
    Err("Only local MoonWitness endpoints on ports 3000, 3002, 8000, or 8787 may be opened.".into())
}

fn collect_monitor_snapshot(repositories: Vec<Repository>) -> MonitorSnapshot {
    std::thread::scope(|scope| {
        let disks_job = scope.spawn(|| collect_disks(&repositories));
        let services_job = scope.spawn(probe_all_services);
        let sessions_job = scope.spawn(collect_agent_sessions);
        let plans_job = scope.spawn(|| collect_plans(&repositories));
        let repos_job = scope.spawn(|| {
            repositories
                .iter()
                .map(inspect_repository_activity)
                .collect::<Vec<_>>()
        });

        MonitorSnapshot {
            generated_at: Utc::now().to_rfc3339(),
            disks: disks_job.join().unwrap_or_default(),
            services: services_job.join().unwrap_or_default(),
            agent_sessions: sessions_job.join().unwrap_or_default(),
            repositories: repos_job.join().unwrap_or_default(),
            plans: plans_job.join().unwrap_or_default(),
        }
    })
}

#[tauri::command]
pub async fn get_monitor_snapshot(app: AppHandle) -> Result<MonitorSnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let repositories = {
            let connection = db::connect(&app)?;
            query_repositories(&connection)?
        };
        Ok(collect_monitor_snapshot(repositories))
    })
    .await
    .map_err(|error| format!("Monitor worker failed: {error}"))?
}

#[tauri::command]
pub fn open_ecosystem_url(url: String) -> Result<(), String> {
    let safe_url = validate_ecosystem_url(&url)?;
    open::that(&safe_url).map_err(|error| format!("Failed to launch browser: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn validates_loopback_ecosystem_urls_strictly() {
        assert!(validate_ecosystem_url("http://127.0.0.1:3000").is_ok());
        assert!(validate_ecosystem_url("http://127.0.0.1:3000/moonwitness").is_ok());
        assert!(validate_ecosystem_url("http://localhost:3000/dock").is_ok());
        assert!(validate_ecosystem_url("http://127.0.0.1:3002/api/v1/healthz").is_ok());
        assert!(validate_ecosystem_url("http://127.0.0.1:3003").is_err());
        assert!(validate_ecosystem_url("https://example.com").is_err());
        assert!(validate_ecosystem_url("http://127.0.0.1:3000.attacker.tld").is_err());
        assert!(validate_ecosystem_url("file:///C:/Windows/System32/cmd.exe").is_err());
        assert!(validate_ecosystem_url("http://localhost:3000/\ncmd").is_err());
    }

    #[test]
    fn parses_transcript_tail_and_checklist_markdown_safely() {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let temp_dir = std::env::temp_dir().join(format!("rocksoul-monitor-test-{nanos}"));
        let session_logs = temp_dir
            .join("session-alpha")
            .join(".system_generated")
            .join("logs");
        fs::create_dir_all(&session_logs).unwrap();

        let transcript = session_logs.join("transcript.jsonl");
        fs::write(
            &transcript,
            concat!(
                r#"{"step_index":0,"type":"USER_INPUT","status":"DONE","created_at":"2026-11-16T06:00:00Z"}"#,
                "\n",
                r#"{"step_index":1,"type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-11-16T06:59:00Z","tool_calls":[{"name":"edit_file"},{"name":"run_command"}]}"#,
                "\n"
            ),
        )
        .unwrap();

        let sessions = collect_agent_sessions_from(&temp_dir);
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].session_id, "session-alpha");
        assert_eq!(sessions[0].step_count, 2);
        assert_eq!(sessions[0].last_tool, "edit_file, run_command");
        assert_eq!(sessions[0].last_status, "DONE");

        let plan_file = temp_dir.join("task.md");
        fs::write(
            &plan_file,
            "- [x] Task one\n- [ ] Task two\n- [~] Task three\n",
        )
        .unwrap();
        let plan = parse_markdown_checklist("sample-plan", &plan_file).unwrap();
        assert_eq!(plan.total_tasks, 3);
        assert_eq!(plan.completed_tasks, 1);
        assert_eq!(plan.partial_tasks, 1);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn parses_http_status_lines_and_truncates_large_patches_cleanly() {
        assert_eq!(
            parse_http_status_code("HTTP/1.1 200 OK\r\nContent-Length: 2"),
            Some(200)
        );
        assert_eq!(
            parse_http_status_code("HTTP/1.0 503 Unavailable"),
            Some(503)
        );
        assert_eq!(parse_http_status_code("INVALID"), None);

        let oversized = "x".repeat(PATCH_MAX_BYTES + 200);
        let truncated = truncate_utf8_patch(oversized);
        assert!(truncated.contains("patch truncated"));
        assert!(truncated.len() < PATCH_MAX_BYTES + 200);
    }
}
