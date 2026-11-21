use std::{
    collections::{HashMap, VecDeque},
    io::{BufRead, BufReader, Read},
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

use tauri::{AppHandle, State};

use crate::{commands::repositories::query_repositories, db, models::DevServiceEntry};

const MAX_LOG_LINES: usize = 40;
const PROBE_TIMEOUT_MS: u64 = 150;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct DevTargetSpec {
    id: &'static str,
    name: &'static str,
    filter_pkg: &'static str,
    port: u16,
}

const DEV_TARGETS: [DevTargetSpec; 2] = [
    DevTargetSpec {
        id: "api",
        name: "Core API",
        filter_pkg: "@moonwitness/api",
        port: 3002,
    },
    DevTargetSpec {
        id: "web",
        name: "MoonWitness Web",
        filter_pkg: "@moonwitness/web",
        port: 3000,
    },
];

#[derive(Default)]
struct ManagedService {
    child: Option<Child>,
    pid: Option<u32>,
    logs: Arc<Mutex<VecDeque<String>>>,
    last_error: Option<String>,
}

#[derive(Default, Clone)]
pub struct DevServicesState(Arc<Mutex<HashMap<String, ManagedService>>>);

impl DevServicesState {
    pub fn stop_all_managed(&self) {
        if let Ok(mut guard) = self.0.lock() {
            for service in guard.values_mut() {
                if let Some(mut child) = service.child.take() {
                    let pid = child.id();
                    let _ = terminate_pid_tree(pid);
                    let _ = child.kill();
                    let _ = child.wait();
                }
                service.pid = None;
            }
        }
    }
}

fn find_target_spec(id: &str) -> Option<&'static DevTargetSpec> {
    DEV_TARGETS.iter().find(|spec| spec.id == id)
}

fn resolve_targets(target: &str, stop_order: bool) -> Result<Vec<&'static DevTargetSpec>, String> {
    match target.trim() {
        "all" | "dev" => {
            if stop_order {
                Ok(vec![&DEV_TARGETS[1], &DEV_TARGETS[0]])
            } else {
                Ok(vec![&DEV_TARGETS[0], &DEV_TARGETS[1]])
            }
        }
        "web" | "api" => find_target_spec(target.trim())
            .map(|spec| vec![spec])
            .ok_or_else(|| format!("Unknown dev service target: {target}")),
        other => Err(format!("Unsupported dev service target: {other}")),
    }
}

fn is_monorepo_root(path: &Path) -> bool {
    path.join("pnpm-workspace.yaml").is_file()
        && path.join("apps").join("web").join("package.json").is_file()
        && path.join("apps").join("api").join("package.json").is_file()
}

fn find_workspace_in_ancestors(start: &Path) -> Option<PathBuf> {
    for ancestor in start.ancestors() {
        if is_monorepo_root(ancestor) {
            return Some(ancestor.to_path_buf());
        }
    }
    None
}

fn resolve_workspace_root(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(connection) = db::connect(app) {
        if let Ok(repositories) = query_repositories(&connection) {
            for repo in repositories {
                let candidate = PathBuf::from(&repo.path);
                if let Some(root) = find_workspace_in_ancestors(&candidate) {
                    return Ok(root);
                }
            }
        }
    }

    let mut seeds = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        seeds.push(cwd);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            seeds.push(parent.to_path_buf());
        }
    }
    seeds.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")));

    for seed in seeds {
        if let Some(root) = find_workspace_in_ancestors(&seed) {
            return Ok(root);
        }
    }

    Err("MoonWitness workspace root (pnpm-workspace.yaml) not found.".into())
}

fn is_port_listening(port: u16) -> bool {
    let timeout = Duration::from_millis(PROBE_TIMEOUT_MS);
    let ipv4: SocketAddr = format!("127.0.0.1:{port}")
        .parse()
        .expect("valid ipv4 addr");
    if TcpStream::connect_timeout(&ipv4, timeout).is_ok() {
        return true;
    }
    let ipv6: SocketAddr = format!("[::1]:{port}").parse().expect("valid ipv6 addr");
    TcpStream::connect_timeout(&ipv6, timeout).is_ok()
}

fn spawn_log_reader<R: Read + Send + 'static>(
    reader: R,
    logs: Arc<Mutex<VecDeque<String>>>,
    prefix: &'static str,
) {
    thread::spawn(move || {
        let buf = BufReader::new(reader);
        for line in buf.lines().map_while(Result::ok) {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            if let Ok(mut queue) = logs.lock() {
                if queue.len() >= MAX_LOG_LINES {
                    queue.pop_front();
                }
                queue.push_back(format!("[{prefix}] {trimmed}"));
            }
        }
    });
}

fn configure_background_command(command: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(CREATE_NO_WINDOW);
    }
}

fn terminate_pid_tree(pid: u32) -> Result<(), String> {
    #[cfg(windows)]
    {
        let mut command = Command::new("taskkill");
        command.args(["/PID", &pid.to_string(), "/T", "/F"]);
        configure_background_command(&mut command);
        let output = command
            .output()
            .map_err(|error| format!("Failed to invoke taskkill: {error}"))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            if !stderr.is_empty() && !stderr.contains("not found") {
                return Err(stderr);
            }
        }
        Ok(())
    }

    #[cfg(not(windows))]
    {
        let output = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .output()
            .map_err(|error| format!("Failed to send SIGTERM: {error}"))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            if !stderr.is_empty() {
                return Err(stderr);
            }
        }
        Ok(())
    }
}

fn parse_netstat_listening_pids(output: &str, port: u16, self_pid: u32) -> Vec<u32> {
    let suffix = format!(":{port}");
    let mut pids = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 || !parts[0].eq_ignore_ascii_case("TCP") {
            continue;
        }
        let local_addr = parts[1];
        let state = parts[3];
        if !state.eq_ignore_ascii_case("LISTENING") {
            continue;
        }
        if !local_addr.ends_with(&suffix) {
            continue;
        }
        let host_part = &local_addr[..local_addr.len() - suffix.len()];
        let is_local_bind = matches!(host_part, "127.0.0.1" | "0.0.0.0" | "[::1]" | "[::]");
        if !is_local_bind {
            continue;
        }
        if let Ok(pid) = parts[4].parse::<u32>() {
            if pid > 0 && pid != self_pid && !pids.contains(&pid) {
                pids.push(pid);
            }
        }
    }
    pids
}

fn find_listening_pids_on_port(port: u16) -> Vec<u32> {
    let self_pid = std::process::id();

    #[cfg(windows)]
    {
        let mut command = Command::new("netstat");
        command.args(["-ano", "-p", "TCP"]);
        configure_background_command(&mut command);
        if let Ok(output) = command.output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            return parse_netstat_listening_pids(&stdout, port, self_pid);
        }
        Vec::new()
    }

    #[cfg(not(windows))]
    {
        if let Ok(output) = Command::new("lsof")
            .args([&format!("-tiTCP:{port}"), "-sTCP:LISTEN"])
            .output()
        {
            return String::from_utf8_lossy(&output.stdout)
                .lines()
                .filter_map(|line| line.trim().parse::<u32>().ok())
                .filter(|pid| *pid > 0 && *pid != self_pid)
                .collect();
        }
        Vec::new()
    }
}

fn refresh_managed_child(service: &mut ManagedService) {
    let Some(child) = service.child.as_mut() else {
        service.pid = None;
        return;
    };
    match child.try_wait() {
        Ok(Some(status)) => {
            if !status.success() {
                service.last_error = Some(format!("Exited with status {status}"));
            }
            service.child = None;
            service.pid = None;
        }
        Ok(None) => {
            service.pid = Some(child.id());
        }
        Err(error) => {
            service.last_error = Some(format!("Process status error: {error}"));
            service.child = None;
            service.pid = None;
        }
    }
}

fn collect_status(state: &DevServicesState) -> Result<Vec<DevServiceEntry>, String> {
    let mut guard = state.0.lock().map_err(|error| error.to_string())?;
    let mut entries = Vec::with_capacity(DEV_TARGETS.len());
    for spec in &DEV_TARGETS {
        let service = guard.entry(spec.id.to_string()).or_default();
        refresh_managed_child(service);
        let listening = is_port_listening(spec.port);
        let recent_logs = service
            .logs
            .lock()
            .map(|queue| queue.iter().cloned().collect())
            .unwrap_or_default();
        entries.push(DevServiceEntry {
            id: spec.id.to_string(),
            name: spec.name.to_string(),
            port: spec.port,
            managed: service.child.is_some(),
            listening,
            pid: service.pid,
            recent_logs,
            last_error: service.last_error.clone(),
        });
    }
    Ok(entries)
}

fn start_single_target(
    state: &DevServicesState,
    workspace_root: &Path,
    spec: &'static DevTargetSpec,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|error| error.to_string())?;
    let service = guard.entry(spec.id.to_string()).or_default();
    refresh_managed_child(service);
    service.last_error = None;

    if service.child.is_some() || is_port_listening(spec.port) {
        return Ok(());
    }

    if let Ok(mut queue) = service.logs.lock() {
        queue.clear();
    }

    #[cfg(windows)]
    let executable = "pnpm.cmd";
    #[cfg(not(windows))]
    let executable = "pnpm";

    let mut command = Command::new(executable);
    command
        .args(["--filter", spec.filter_pkg, "dev"])
        .current_dir(workspace_root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    configure_background_command(&mut command);

    let mut child = command.spawn().map_err(|error| {
        let message = format!(
            "Failed to start {} ({}): {error}",
            spec.name, spec.filter_pkg
        );
        service.last_error = Some(message.clone());
        message
    })?;

    let pid = child.id();
    if let Some(stdout) = child.stdout.take() {
        spawn_log_reader(stdout, Arc::clone(&service.logs), "out");
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_log_reader(stderr, Arc::clone(&service.logs), "err");
    }

    service.child = Some(child);
    service.pid = Some(pid);
    Ok(())
}

fn stop_single_target(
    state: &DevServicesState,
    spec: &'static DevTargetSpec,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|error| error.to_string())?;
    let service = guard.entry(spec.id.to_string()).or_default();
    refresh_managed_child(service);

    if let Some(mut child) = service.child.take() {
        let pid = child.id();
        let _ = terminate_pid_tree(pid);
        let _ = child.kill();
        let _ = child.wait();
    }
    service.pid = None;
    service.last_error = None;
    drop(guard);

    for pid in find_listening_pids_on_port(spec.port) {
        let _ = terminate_pid_tree(pid);
    }

    Ok(())
}

#[tauri::command]
pub async fn get_dev_services_status(
    state: State<'_, DevServicesState>,
) -> Result<Vec<DevServiceEntry>, String> {
    let shared_state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || collect_status(&shared_state))
        .await
        .map_err(|error| format!("Dev status worker failed: {error}"))?
}

#[tauri::command]
pub async fn start_dev_service(
    app: AppHandle,
    state: State<'_, DevServicesState>,
    target: String,
) -> Result<Vec<DevServiceEntry>, String> {
    let targets = resolve_targets(&target, false)?;
    let workspace_root = resolve_workspace_root(&app)?;
    let shared_state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        for spec in targets {
            start_single_target(&shared_state, &workspace_root, spec)?;
        }
        collect_status(&shared_state)
    })
    .await
    .map_err(|error| format!("Dev start worker failed: {error}"))?
}

#[tauri::command]
pub async fn stop_dev_service(
    state: State<'_, DevServicesState>,
    target: String,
) -> Result<Vec<DevServiceEntry>, String> {
    let targets = resolve_targets(&target, true)?;
    let shared_state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        for spec in targets {
            stop_single_target(&shared_state, spec)?;
        }
        collect_status(&shared_state)
    })
    .await
    .map_err(|error| format!("Dev stop worker failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_valid_targets_and_rejects_unknown() {
        let all_start = resolve_targets("all", false).unwrap();
        assert_eq!(
            all_start.iter().map(|spec| spec.id).collect::<Vec<_>>(),
            vec!["api", "web"]
        );

        let all_stop = resolve_targets("dev", true).unwrap();
        assert_eq!(
            all_stop.iter().map(|spec| spec.id).collect::<Vec<_>>(),
            vec!["web", "api"]
        );

        assert_eq!(resolve_targets("web", false).unwrap()[0].port, 3000);
        assert_eq!(resolve_targets("api", false).unwrap()[0].port, 3002);
        assert!(resolve_targets("rocksoul", false).is_err());
        assert!(resolve_targets("../etc", false).is_err());
    }

    #[test]
    fn parses_netstat_listening_pids_for_exact_port_and_loopback() {
        let sample = "\
  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1111\n\
  TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       2222\n\
  TCP    [::]:3000              [::]:0                 LISTENING       1111\n\
  TCP    127.0.0.1:30001        0.0.0.0:0              LISTENING       3333\n\
  TCP    127.0.0.1:3000         127.0.0.1:51000        ESTABLISHED     4444\n\
  TCP    192.168.1.50:3000      0.0.0.0:0              LISTENING       5555\n\
  TCP    127.0.0.1:3002         0.0.0.0:0              LISTENING       9999\n";
        assert_eq!(
            parse_netstat_listening_pids(sample, 3000, 9999),
            vec![1111, 2222]
        );
        assert_eq!(
            parse_netstat_listening_pids(sample, 3002, 9999),
            Vec::<u32>::new()
        );
    }
}
