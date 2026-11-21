use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Output},
};
use tauri::AppHandle;
use uuid::Uuid;

use crate::{
    db,
    models::{GitSnapshot, Repository},
};

fn configure_hidden_git_command(command: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
}

fn git_output(path: &Path, args: &[&str]) -> Result<String, String> {
    let output = run_git(path, args)?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn git_output_readonly(path: &Path, args: &[&str]) -> Result<String, String> {
    let output = run_git_readonly(path, args)?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn run_git(path: &Path, args: &[&str]) -> Result<Output, String> {
    let mut command = Command::new("git");
    command.arg("-C").arg(path).args(args);
    configure_hidden_git_command(&mut command);
    command
        .output()
        .map_err(|error| format!("Unable to start Git: {error}"))
}

fn run_git_readonly(path: &Path, args: &[&str]) -> Result<Output, String> {
    let mut command = Command::new("git");
    command
        .arg("--no-optional-locks")
        .arg("-C")
        .arg(path)
        .args(args);
    configure_hidden_git_command(&mut command);
    command
        .output()
        .map_err(|error| format!("Unable to start Git: {error}"))
}

/// Reads `.git/HEAD` directly in O(1) without spawning a child `git.exe` process.
/// Falls back to `git --no-optional-locks branch --show-current` only on detached HEAD or unreadable metadata.
pub fn read_current_branch_fast(root: &Path, fallback: &str) -> String {
    let dot_git = root.join(".git");
    let head_path = if dot_git.is_dir() {
        Some(dot_git.join("HEAD"))
    } else if dot_git.is_file() {
        fs::read_to_string(&dot_git).ok().and_then(|content| {
            let trimmed = content.trim();
            let raw_dir = trimmed.strip_prefix("gitdir:")?.trim();
            let git_dir = Path::new(raw_dir);
            let resolved = if git_dir.is_absolute() {
                git_dir.to_path_buf()
            } else {
                root.join(git_dir)
            };
            Some(resolved.join("HEAD"))
        })
    } else {
        None
    };

    if let Some(head_file) = head_path {
        if let Ok(head_contents) = fs::read_to_string(head_file) {
            if let Some(branch_ref) = head_contents.trim().strip_prefix("ref: refs/heads/") {
                let branch = branch_ref.trim();
                if !branch.is_empty() {
                    return branch.to_string();
                }
            }
        }
    }

    git_output_readonly(root, &["branch", "--show-current"])
        .ok()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

trait GitRunner {
    fn run(&self, path: &Path, args: &[&str]) -> Result<Output, String>;
    fn validate_branch(&self, branch: &str) -> Result<(), String>;
}

struct SystemGit;

impl GitRunner for SystemGit {
    fn run(&self, path: &Path, args: &[&str]) -> Result<Output, String> {
        run_git(path, args)
    }

    fn validate_branch(&self, branch: &str) -> Result<(), String> {
        validate_branch_name(branch)
    }
}

fn git_arguments(
    runner: &impl GitRunner,
    operation: &str,
    branch: Option<&str>,
    message: Option<&str>,
) -> Result<Vec<String>, String> {
    let branch_value = branch.unwrap_or_default().trim();
    let message_value = message.unwrap_or_default().trim();
    let args: Vec<&str> = match operation {
        "create_branch" => {
            runner.validate_branch(branch_value)?;
            vec!["switch", "-c", branch_value]
        }
        "switch_branch" => {
            runner.validate_branch(branch_value)?;
            vec!["switch", branch_value]
        }
        "commit" => {
            if message_value.is_empty() {
                return Err("Enter a commit message.".into());
            }
            vec!["commit", "-m", message_value]
        }
        "fetch" => vec!["fetch", "--all", "--prune"],
        "pull" => vec!["pull", "--ff-only"],
        "push" => vec!["push"],
        "merge" => {
            runner.validate_branch(branch_value)?;
            vec!["merge", "--no-edit", "--", branch_value]
        }
        "rebase" => {
            runner.validate_branch(branch_value)?;
            vec!["rebase", "--", branch_value]
        }
        "abort_merge" => vec!["merge", "--abort"],
        "abort_rebase" => vec!["rebase", "--abort"],
        _ => return Err("Unsupported Git operation.".into()),
    };
    Ok(args.into_iter().map(str::to_string).collect())
}

fn validate_branch_name(branch: &str) -> Result<(), String> {
    if branch.trim().is_empty() || branch.starts_with('-') {
        return Err("Enter a valid branch name.".into());
    }
    let mut command = Command::new("git");
    command.args(["check-ref-format", "--branch", branch]);
    configure_hidden_git_command(&mut command);
    let output = command
        .output()
        .map_err(|error| format!("Unable to start Git: {error}"))?;
    if output.status.success() {
        Ok(())
    } else {
        Err("Git rejected this branch name.".into())
    }
}

fn resolve_repository(
    connection: &Connection,
    repository_id: &str,
) -> Result<(String, String, String), String> {
    connection
        .query_row(
            "SELECT name, path, default_branch FROM repositories WHERE id = ?1",
            [repository_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| "Repository is not registered.".to_string())
}

fn git_metadata_path(root: &Path, entry: &str) -> PathBuf {
    let git_directory = git_output(root, &["rev-parse", "--git-dir"])
        .map(PathBuf::from)
        .unwrap_or_else(|_| root.join(".git"));
    let git_directory = if git_directory.is_absolute() {
        git_directory
    } else {
        root.join(git_directory)
    };
    git_directory.join(entry)
}

pub fn query_repositories(connection: &Connection) -> Result<Vec<Repository>, String> {
    let mut statement = connection.prepare(
        "SELECT id, name, path, remote_url, default_branch FROM repositories ORDER BY name COLLATE NOCASE"
    ).map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|error| error.to_string())?;

    let mut repositories = Vec::new();
    for row in rows {
        let (id, name, path, remote_url, default_branch) =
            row.map_err(|error| error.to_string())?;
        let branch = read_current_branch_fast(Path::new(&path), &default_branch);
        repositories.push(Repository {
            id,
            name,
            path,
            remote_url,
            default_branch,
            branch,
        });
    }
    Ok(repositories)
}

#[tauri::command]
pub async fn list_repositories(app: AppHandle) -> Result<Vec<Repository>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let connection = db::connect(&app)?;
        query_repositories(&connection)
    })
    .await
    .map_err(|error| format!("Repository worker failed: {error}"))?
}

#[tauri::command]
pub async fn add_repository(app: AppHandle, path: String) -> Result<Repository, String> {
    tauri::async_runtime::spawn_blocking(move || add_repository_sync(&app, &path))
        .await
        .map_err(|error| format!("Repository registration failed: {error}"))?
}

fn add_repository_sync(app: &AppHandle, path: &str) -> Result<Repository, String> {
    let requested = Path::new(path.trim());
    if requested.as_os_str().is_empty() || !requested.exists() || !requested.is_dir() {
        return Err("Choose an existing local directory.".into());
    }
    let canonical = requested
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let root = git_output_readonly(&canonical, &["rev-parse", "--show-toplevel"])
        .map_err(|_| "This directory is not inside a Git repository.".to_string())?;
    let root_path = Path::new(&root)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if root_path != canonical && !canonical.starts_with(&root_path) {
        return Err("Git returned an invalid repository root.".into());
    }
    let name = root_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("repository")
        .to_string();
    let branch = read_current_branch_fast(&root_path, "HEAD");
    let remote_url =
        git_output_readonly(&root_path, &["remote", "get-url", "origin"]).unwrap_or_default();
    let id = Uuid::new_v4().to_string();
    let mut connection = db::connect(app)?;
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;

    let canonical_path = root_path.to_string_lossy().to_string();
    let existing_id: Option<String> = transaction
        .query_row(
            "SELECT id FROM repositories WHERE path = ?1",
            [&canonical_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let repository_id = match existing_id {
        Some(existing_id) => existing_id,
        None => {
            transaction.execute(
                "INSERT INTO repositories (id, workspace_id, name, path, remote_url, default_branch) VALUES (?1, 'local', ?2, ?3, ?4, ?5)",
                params![id, name, canonical_path, remote_url, if branch.is_empty() { "main" } else { &branch }],
            ).map_err(|error| error.to_string())?;
            db::record_event(
                &transaction,
                "git",
                &format!("Registered repository {}", name),
                "{}",
            )?;
            id
        }
    };

    let repository = transaction
        .query_row(
            "SELECT id, name, path, remote_url, default_branch FROM repositories WHERE id = ?1",
            [repository_id],
            |row| {
                Ok(Repository {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    remote_url: row.get(3)?,
                    default_branch: row.get(4)?,
                    branch: branch.clone(),
                })
            },
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(repository)
}

#[tauri::command]
pub async fn git_snapshot(
    app: AppHandle,
    repository_id: String,
    view: Option<String>,
) -> Result<GitSnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || git_snapshot_sync(&app, &repository_id, view))
        .await
        .map_err(|error| format!("Git snapshot worker failed: {error}"))?
}

fn git_snapshot_sync(
    app: &AppHandle,
    repository_id: &str,
    view: Option<String>,
) -> Result<GitSnapshot, String> {
    let connection = db::connect(app)?;
    let (name, path, default_branch) = resolve_repository(&connection, repository_id)?;

    let root = Path::new(&path);
    if !root.is_dir() {
        return Err("Repository directory is no longer available.".into());
    }
    let branch = read_current_branch_fast(root, &default_branch);
    let view = view.unwrap_or_else(|| "status".into());
    let output = if view == "patch" {
        let diff = git_output_readonly(root, &["diff", "--no-color", "HEAD"])
            .or_else(|_| git_output_readonly(root, &["diff", "--no-color"]))?;
        super::monitor::truncate_utf8_patch(diff)
    } else {
        let args: &[&str] = match view.as_str() {
            "status" => &["status", "--short", "--branch"],
            "log" => &["log", "-8", "--oneline", "--decorate"],
            "diff" => &["diff", "--stat"],
            "branches" => &["branch", "--all", "--no-color"],
            _ => return Err("Unsupported Git inspection view.".into()),
        };
        git_output_readonly(root, args)?
    };
    Ok(GitSnapshot {
        name,
        branch,
        view,
        output,
    })
}

fn find_monorepo_root(start: &Path) -> Option<PathBuf> {
    let mut cursor = Some(start);
    for _ in 0..8 {
        let candidate = cursor?;
        if candidate.join(".git").exists() && candidate.join("pnpm-workspace.yaml").is_file() {
            return Some(candidate.to_path_buf());
        }
        cursor = candidate.parent();
    }
    None
}

fn auto_register_workspace_with_connection(
    connection: &mut Connection,
    candidates: &[PathBuf],
) -> Result<bool, String> {
    let existing_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM repositories", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if existing_count > 0 {
        return Ok(false);
    }

    let Some(root_path) = candidates.iter().find_map(|path| find_monorepo_root(path)) else {
        return Ok(false);
    };
    let canonical = root_path
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let name = canonical
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("moonwitness")
        .to_string();
    let branch =
        git_output(&canonical, &["branch", "--show-current"]).unwrap_or_else(|_| "dev".into());
    let remote_url = git_output(&canonical, &["remote", "get-url", "origin"]).unwrap_or_default();
    let canonical_path = canonical.to_string_lossy().to_string();

    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT OR IGNORE INTO repositories (id, workspace_id, name, path, remote_url, default_branch) VALUES (?1, 'local', ?2, ?3, ?4, ?5)",
            params![
                Uuid::new_v4().to_string(),
                name,
                canonical_path,
                remote_url,
                if branch.is_empty() { "main" } else { &branch }
            ],
        )
        .map_err(|error| error.to_string())?;
    db::record_event(
        &transaction,
        "git",
        &format!("Auto-connected workspace repository {}", name),
        "{}",
    )?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(true)
}

pub fn ensure_default_workspace_repository(app: &AppHandle) -> Result<(), String> {
    let mut connection = db::connect(app)?;
    let mut candidates = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.to_path_buf());
        }
    }
    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")));
    let _ = auto_register_workspace_with_connection(&mut connection, &candidates)?;
    Ok(())
}

#[tauri::command]
pub async fn git_execute(
    app: AppHandle,
    repository_id: String,
    operation: String,
    branch: Option<String>,
    message: Option<String>,
) -> Result<GitSnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let connection = db::connect(&app)?;
        execute_git_operation(
            &connection,
            &SystemGit,
            &repository_id,
            &operation,
            branch.as_deref(),
            message.as_deref(),
        )
    })
    .await
    .map_err(|error| format!("Git execution worker failed: {error}"))?
}

fn execute_git_operation(
    connection: &Connection,
    runner: &impl GitRunner,
    repository_id: &str,
    operation: &str,
    branch: Option<&str>,
    message: Option<&str>,
) -> Result<GitSnapshot, String> {
    let (name, path, default_branch) = resolve_repository(connection, repository_id)?;
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err("Repository directory is no longer available.".into());
    }
    let repository_check = runner.run(root, &["rev-parse", "--show-toplevel"])?;
    if !repository_check.status.success() {
        return Err("Registered directory is no longer a Git repository.".into());
    }

    let owned_args = git_arguments(runner, operation, branch, message)?;
    let args = owned_args.iter().map(String::as_str).collect::<Vec<_>>();

    let status_result = runner.run(root, &["status", "--porcelain"])?;
    if !status_result.status.success() {
        return Err(String::from_utf8_lossy(&status_result.stderr)
            .trim()
            .to_string());
    }
    let status_before = String::from_utf8_lossy(&status_result.stdout)
        .trim()
        .to_string();
    let merge_in_progress = git_metadata_path(root, "MERGE_HEAD").exists();
    let rebase_in_progress = git_metadata_path(root, "rebase-merge").exists()
        || git_metadata_path(root, "rebase-apply").exists();
    let abort_operation = matches!(operation, "abort_merge" | "abort_rebase");
    if abort_operation {
        if operation == "abort_merge" && !merge_in_progress {
            return Err("No merge is currently in progress.".into());
        }
        if operation == "abort_rebase" && !rebase_in_progress {
            return Err("No rebase is currently in progress.".into());
        }
    } else if merge_in_progress || rebase_in_progress {
        return Err(
            "Resolve or abort the in-progress merge/rebase before another Git operation.".into(),
        );
    }
    if matches!(operation, "switch_branch" | "merge" | "rebase" | "pull")
        && !status_before.is_empty()
    {
        return Err(
            "Commit or stash local changes before switching, merging, rebasing, or pulling.".into(),
        );
    }
    if operation == "commit" && status_before.is_empty() {
        return Err("There are no local changes to commit.".into());
    }

    let output = runner.run(root, &args)?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let combined = [stdout, stderr]
        .into_iter()
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    if !output.status.success() {
        return Err(if combined.is_empty() {
            "Git operation failed.".into()
        } else {
            combined
        });
    }
    db::record_event(
        connection,
        "git",
        &format!("Git {operation} in {name}"),
        "{}",
    )?;
    let branch_result = runner.run(root, &["branch", "--show-current"])?;
    let branch = if branch_result.status.success() {
        String::from_utf8_lossy(&branch_result.stdout)
            .trim()
            .to_string()
    } else {
        default_branch
    };
    let status_result = runner.run(root, &["status", "--short", "--branch"])?;
    if !status_result.status.success() {
        return Err(String::from_utf8_lossy(&status_result.stderr)
            .trim()
            .to_string());
    }
    let status = String::from_utf8_lossy(&status_result.stdout)
        .trim()
        .to_string();
    let output = if combined.is_empty() {
        status
    } else {
        format!("{combined}\n\n{status}")
    };
    Ok(GitSnapshot {
        name,
        branch,
        view: "status".into(),
        output,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        auto_register_workspace_with_connection, execute_git_operation, git_arguments,
        git_metadata_path, git_output, read_current_branch_fast, run_git, GitRunner,
    };
    use rusqlite::Connection;
    use std::{
        fs,
        path::{Path, PathBuf},
        process::{Command, Output},
    };
    use uuid::Uuid;

    fn successful_output(stdout: &str) -> Output {
        #[cfg(windows)]
        let mut output = {
            use std::os::windows::process::ExitStatusExt;
            Output {
                status: std::process::ExitStatus::from_raw(0),
                stdout: Vec::new(),
                stderr: Vec::new(),
            }
        };
        #[cfg(unix)]
        let mut output = {
            use std::os::unix::process::ExitStatusExt;
            Output {
                status: std::process::ExitStatus::from_raw(0),
                stdout: Vec::new(),
                stderr: Vec::new(),
            }
        };
        output.stdout = stdout.as_bytes().to_vec();
        output
    }

    fn failed_output(stderr: &str) -> Output {
        #[cfg(windows)]
        let mut output = {
            use std::os::windows::process::ExitStatusExt;
            Output {
                status: std::process::ExitStatus::from_raw(1),
                stdout: Vec::new(),
                stderr: Vec::new(),
            }
        };
        #[cfg(unix)]
        let mut output = {
            use std::os::unix::process::ExitStatusExt;
            Output {
                status: std::process::ExitStatus::from_raw(1 << 8),
                stdout: Vec::new(),
                stderr: Vec::new(),
            }
        };
        output.stderr = stderr.as_bytes().to_vec();
        output
    }

    #[derive(Default)]
    struct MockGit {
        responses: std::sync::Mutex<Vec<(Vec<String>, Output)>>,
        calls: std::sync::Mutex<Vec<Vec<String>>>,
        branch_validation_error: Option<String>,
    }

    impl MockGit {
        fn with_responses(responses: Vec<(Vec<String>, Output)>) -> Self {
            Self {
                responses: std::sync::Mutex::new(responses),
                calls: std::sync::Mutex::new(Vec::new()),
                branch_validation_error: None,
            }
        }

        fn calls(&self) -> Vec<Vec<String>> {
            self.calls
                .lock()
                .expect("mock calls should be readable")
                .clone()
        }
    }

    impl GitRunner for MockGit {
        fn run(&self, _path: &Path, args: &[&str]) -> Result<Output, String> {
            let actual = args
                .iter()
                .map(|argument| (*argument).to_string())
                .collect::<Vec<_>>();
            self.calls
                .lock()
                .expect("mock calls should be writable")
                .push(actual.clone());
            let mut responses = self
                .responses
                .lock()
                .expect("mock responses should be readable");
            let (expected, output) = responses
                .drain(..1)
                .next()
                .expect("mock Git response should be configured");
            assert_eq!(actual, expected);
            Ok(output)
        }

        fn validate_branch(&self, branch: &str) -> Result<(), String> {
            if let Some(error) = &self.branch_validation_error {
                return Err(error.clone());
            }
            if branch.is_empty() || branch.starts_with('-') {
                Err("Enter a valid branch name.".into())
            } else {
                Ok(())
            }
        }
    }

    struct TemporaryRepository(PathBuf);

    impl TemporaryRepository {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!("rocksoul-git-{}", Uuid::new_v4()));
            fs::create_dir_all(&path).expect("temporary repository directory should be created");
            let repository = Self(path);
            repository.git(&["init", "-b", "main"]);
            repository.git(&["config", "user.name", "ROCKSOUL Test"]);
            repository.git(&["config", "user.email", "test@example.invalid"]);
            fs::write(repository.0.join("README.md"), "base\n")
                .expect("test file should be written");
            repository.git(&["add", "README.md"]);
            repository.git(&["commit", "-m", "initial"]);
            repository
        }

        fn git(&self, args: &[&str]) {
            let output = run_git(&self.0, args).expect("Git should start");
            assert!(
                output.status.success(),
                "Git command failed: {}",
                String::from_utf8_lossy(&output.stderr)
            );
        }

        fn connection(&self) -> Connection {
            let connection = Connection::open_in_memory().expect("test database should open");
            connection
                .execute_batch(include_str!("../../migrations/001_init.sql"))
                .expect("schema should apply");
            connection
                .execute(
                    "INSERT INTO workspaces (id, name) VALUES ('local', 'Local')",
                    [],
                )
                .expect("workspace should insert");
            connection.execute(
                "INSERT INTO repositories (id, workspace_id, name, path, default_branch) VALUES ('repo-1', 'local', 'Fixture', ?1, 'main')",
                [self.0.to_string_lossy().to_string()],
            ).expect("repository should register");
            connection
        }
    }

    impl Drop for TemporaryRepository {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn branch_names_are_checked_by_git() {
        let output = Command::new("git")
            .args(["check-ref-format", "--branch", "feature/safe-name"])
            .output()
            .expect("Git should validate branch names");
        assert!(output.status.success());
        for invalid in ["", "-unsafe", "bad..name", "bad name"] {
            let output = Command::new("git")
                .args(["check-ref-format", "--branch", invalid])
                .output()
                .expect("Git should validate branch names");
            assert!(!output.status.success(), "unexpectedly accepted {invalid}");
        }
    }

    #[test]
    fn mock_fetch_passes_only_the_allowlisted_remote_arguments() {
        let repository = TemporaryRepository::new();
        let connection = repository.connection();
        let runner = MockGit::with_responses(vec![
            (
                vec!["rev-parse".into(), "--show-toplevel".into()],
                successful_output("."),
            ),
            (
                vec!["status".into(), "--porcelain".into()],
                successful_output(""),
            ),
            (
                vec!["fetch".into(), "--all".into(), "--prune".into()],
                successful_output("Fetching origin"),
            ),
            (
                vec!["branch".into(), "--show-current".into()],
                successful_output("main"),
            ),
            (
                vec!["status".into(), "--short".into(), "--branch".into()],
                successful_output("## main"),
            ),
        ]);
        let result = execute_git_operation(&connection, &runner, "repo-1", "fetch", None, None)
            .expect("mocked fetch should succeed");
        assert_eq!(result.branch, "main");
        assert!(result.output.contains("Fetching origin"));
        assert_eq!(
            runner
                .calls()
                .iter()
                .map(|args| args[0].as_str())
                .collect::<Vec<_>>(),
            ["rev-parse", "status", "fetch", "branch", "status"]
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT COUNT(*) FROM events WHERE kind = 'git'",
                    [],
                    |row| row.get::<_, i64>(0)
                )
                .unwrap(),
            1
        );
    }

    #[test]
    fn mock_push_reports_remote_authentication_failure_without_success_event() {
        let repository = TemporaryRepository::new();
        let connection = repository.connection();
        let runner = MockGit::with_responses(vec![
            (
                vec!["rev-parse".into(), "--show-toplevel".into()],
                successful_output("."),
            ),
            (
                vec!["status".into(), "--porcelain".into()],
                successful_output(""),
            ),
            (vec!["push".into()], failed_output("Authentication failed")),
        ]);
        let error = execute_git_operation(&connection, &runner, "repo-1", "push", None, None)
            .expect_err("failed remote push should propagate");
        assert_eq!(error, "Authentication failed");
        assert_eq!(
            connection
                .query_row(
                    "SELECT COUNT(*) FROM events WHERE kind = 'git'",
                    [],
                    |row| row.get::<_, i64>(0)
                )
                .unwrap(),
            0
        );
    }

    #[test]
    fn every_operation_maps_to_fixed_git_arguments() {
        type OperationCase<'a> = (&'a str, Option<&'a str>, Option<&'a str>, Vec<&'a str>);
        let operations: [OperationCase<'_>; 10] = [
            (
                "create_branch",
                Some("feature/test"),
                None,
                vec!["switch", "-c", "feature/test"],
            ),
            (
                "switch_branch",
                Some("feature/test"),
                None,
                vec!["switch", "feature/test"],
            ),
            (
                "commit",
                None,
                Some("commit message"),
                vec!["commit", "-m", "commit message"],
            ),
            ("fetch", None, None, vec!["fetch", "--all", "--prune"]),
            ("pull", None, None, vec!["pull", "--ff-only"]),
            ("push", None, None, vec!["push"]),
            (
                "merge",
                Some("feature/test"),
                None,
                vec!["merge", "--no-edit", "--", "feature/test"],
            ),
            (
                "rebase",
                Some("feature/test"),
                None,
                vec!["rebase", "--", "feature/test"],
            ),
            ("abort_merge", None, None, vec!["merge", "--abort"]),
            ("abort_rebase", None, None, vec!["rebase", "--abort"]),
        ];
        for (operation, branch, message, expected_write) in operations {
            let repository = TemporaryRepository::new();
            if matches!(operation, "switch_branch" | "merge" | "rebase" | "pull") {
                repository.git(&["switch", "-c", "feature/test"]);
                repository.git(&["switch", "main"]);
            }
            if operation == "commit" {
                fs::write(repository.0.join("README.md"), "changed\n")
                    .expect("tracked file should change");
            }
            if operation == "abort_merge" {
                repository.git(&["switch", "-c", "feature/conflict"]);
                fs::write(repository.0.join("README.md"), "feature\n").expect("file should change");
                repository.git(&["commit", "-am", "feature"]);
                repository.git(&["switch", "main"]);
                fs::write(repository.0.join("README.md"), "main\n").expect("file should change");
                repository.git(&["commit", "-am", "main"]);
                let output = run_git(&repository.0, &["merge", "feature/conflict"]).unwrap();
                assert!(!output.status.success());
            }
            if operation == "abort_rebase" {
                repository.git(&["switch", "-c", "feature/rebase"]);
                fs::write(repository.0.join("README.md"), "feature\n").expect("file should change");
                repository.git(&["commit", "-am", "feature"]);
                repository.git(&["switch", "main"]);
                fs::write(repository.0.join("README.md"), "main\n").expect("file should change");
                repository.git(&["commit", "-am", "main"]);
                let output = run_git(&repository.0, &["rebase", "feature/rebase"]).unwrap();
                assert!(!output.status.success());
            }
            let connection = repository.connection();
            let status_before = if operation == "commit" {
                " M README.md"
            } else {
                ""
            };
            let mut responses = vec![
                (
                    vec!["rev-parse".into(), "--show-toplevel".into()],
                    successful_output("."),
                ),
                (
                    vec!["status".into(), "--porcelain".into()],
                    successful_output(status_before),
                ),
            ];
            responses.push((
                expected_write
                    .iter()
                    .map(|argument| (*argument).to_string())
                    .collect(),
                successful_output("mock operation complete"),
            ));
            responses.push((
                vec!["branch".into(), "--show-current".into()],
                successful_output("main"),
            ));
            responses.push((
                vec!["status".into(), "--short".into(), "--branch".into()],
                successful_output("## main"),
            ));
            let runner = MockGit::with_responses(responses);
            execute_git_operation(&connection, &runner, "repo-1", operation, branch, message)
                .unwrap_or_else(|error| panic!("{operation} mock should succeed: {error}"));
            assert_eq!(
                runner.calls()[2],
                expected_write
                    .iter()
                    .map(|argument| (*argument).to_string())
                    .collect::<Vec<_>>()
            );
        }
    }

    #[test]
    fn write_guards_reject_invalid_or_unsafe_states_before_mutation() {
        let repository = TemporaryRepository::new();
        let connection = repository.connection();

        let unknown_operation = MockGit::default();
        assert_eq!(
            git_arguments(&unknown_operation, "reset", None, None).unwrap_err(),
            "Unsupported Git operation."
        );
        assert!(unknown_operation.calls().is_empty());

        let missing_branch = MockGit::with_responses(vec![(
            vec!["rev-parse".into(), "--show-toplevel".into()],
            successful_output("."),
        )]);
        assert!(git_arguments(&missing_branch, "create_branch", None, None).is_err());
        assert!(missing_branch.calls().is_empty());

        let missing_message = MockGit::with_responses(vec![(
            vec!["rev-parse".into(), "--show-toplevel".into()],
            successful_output("."),
        )]);
        assert_eq!(
            git_arguments(&missing_message, "commit", None, Some("  ")).unwrap_err(),
            "Enter a commit message."
        );

        for operation in ["abort_merge", "abort_rebase"] {
            let runner = MockGit::with_responses(vec![
                (
                    vec!["rev-parse".into(), "--show-toplevel".into()],
                    successful_output("."),
                ),
                (
                    vec!["status".into(), "--porcelain".into()],
                    successful_output(""),
                ),
            ]);
            assert!(
                execute_git_operation(&connection, &runner, "repo-1", operation, None, None)
                    .is_err()
            );
            assert_eq!(runner.calls().len(), 2);
        }

        fs::write(repository.0.join("README.md"), "dirty\n")
            .expect("tracked file should become dirty");
        let dirty_pull = MockGit::with_responses(vec![
            (
                vec!["rev-parse".into(), "--show-toplevel".into()],
                successful_output("."),
            ),
            (
                vec!["status".into(), "--porcelain".into()],
                successful_output(" M README.md"),
            ),
        ]);
        assert_eq!(
            execute_git_operation(&connection, &dirty_pull, "repo-1", "pull", None, None)
                .unwrap_err(),
            "Commit or stash local changes before switching, merging, rebasing, or pulling."
        );
        assert_eq!(dirty_pull.calls().len(), 2);
    }

    #[test]
    fn in_progress_merge_blocks_other_operations_but_allows_abort() {
        let repository = TemporaryRepository::new();
        let connection = repository.connection();
        let git_directory = git_metadata_path(&repository.0, "");
        fs::write(git_directory.join("MERGE_HEAD"), "test")
            .expect("merge marker should be created");

        let blocked = MockGit::with_responses(vec![
            (
                vec!["rev-parse".into(), "--show-toplevel".into()],
                successful_output("."),
            ),
            (
                vec!["status".into(), "--porcelain".into()],
                successful_output(""),
            ),
        ]);
        assert!(
            execute_git_operation(&connection, &blocked, "repo-1", "fetch", None, None)
                .unwrap_err()
                .contains("in-progress")
        );
        assert_eq!(blocked.calls().len(), 2);

        let abort = MockGit::with_responses(vec![
            (
                vec!["rev-parse".into(), "--show-toplevel".into()],
                successful_output("."),
            ),
            (
                vec!["status".into(), "--porcelain".into()],
                successful_output(""),
            ),
            (
                vec!["merge".into(), "--abort".into()],
                successful_output(""),
            ),
            (
                vec!["branch".into(), "--show-current".into()],
                successful_output("main"),
            ),
            (
                vec!["status".into(), "--short".into(), "--branch".into()],
                successful_output("## main"),
            ),
        ]);
        execute_git_operation(&connection, &abort, "repo-1", "abort_merge", None, None)
            .expect("abort should be permitted during a merge");
        assert_eq!(abort.calls()[2], ["merge", "--abort"]);
    }

    #[test]
    fn temporary_repository_supports_branch_switch_and_commit() {
        let repository = TemporaryRepository::new();
        repository.git(&["switch", "-c", "feature/test"]);
        assert_eq!(
            git_output(&repository.0, &["branch", "--show-current"]).unwrap(),
            "feature/test"
        );

        fs::write(repository.0.join("README.md"), "updated\n").expect("test file should update");
        repository.git(&["add", "README.md"]);
        repository.git(&["commit", "-m", "update test file"]);
        assert_eq!(
            git_output(&repository.0, &["status", "--porcelain"]).unwrap(),
            ""
        );
        assert!(git_output(&repository.0, &["log", "-1", "--format=%s"])
            .unwrap()
            .contains("update test file"));
    }

    #[test]
    fn git_reports_merge_conflicts_and_supports_abort_recovery() {
        let repository = TemporaryRepository::new();
        repository.git(&["switch", "-c", "feature/conflict"]);
        fs::write(repository.0.join("README.md"), "feature\n").expect("feature file should update");
        repository.git(&["commit", "-am", "feature change"]);
        repository.git(&["switch", "main"]);
        fs::write(repository.0.join("README.md"), "main\n").expect("main file should update");
        repository.git(&["commit", "-am", "main change"]);
        let output = run_git(
            &repository.0,
            &["merge", "--no-edit", "--", "feature/conflict"],
        )
        .expect("Git should run merge");
        assert!(!output.status.success());
        assert!(git_metadata_path(&repository.0, "MERGE_HEAD").exists());
        repository.git(&["merge", "--abort"]);
        assert!(!git_metadata_path(&repository.0, "MERGE_HEAD").exists());
        assert_eq!(
            git_output(&repository.0, &["status", "--porcelain"]).unwrap(),
            ""
        );
    }

    #[test]
    fn auto_register_workspace_discovers_monorepo_only_when_empty() {
        let repository = TemporaryRepository::new();
        fs::write(
            repository.0.join("pnpm-workspace.yaml"),
            "packages:\n  - \"apps/*\"\n",
        )
        .expect("workspace marker should write");

        let mut connection = Connection::open_in_memory().expect("test db should open");
        connection
            .execute_batch(include_str!("../../migrations/001_init.sql"))
            .expect("schema should apply");
        connection
            .execute(
                "INSERT INTO workspaces (id, name) VALUES ('local', 'Local')",
                [],
            )
            .expect("workspace should insert");

        let registered = auto_register_workspace_with_connection(
            &mut connection,
            std::slice::from_ref(&repository.0),
        )
        .expect("auto registration should succeed");
        assert!(registered);

        let second = auto_register_workspace_with_connection(
            &mut connection,
            std::slice::from_ref(&repository.0),
        )
        .expect("second pass should be idempotent");
        assert!(!second);
    }

    #[test]
    fn read_current_branch_fast_reads_git_head_directly() {
        let dir = std::env::temp_dir().join(format!("rocksoul-fast-head-{}", Uuid::new_v4()));
        fs::create_dir_all(dir.join(".git")).expect("git dir should create");
        fs::write(dir.join(".git").join("HEAD"), "ref: refs/heads/dev\n")
            .expect("HEAD should write");
        assert_eq!(read_current_branch_fast(&dir, "main"), "dev");

        // Also test gitdir worktree pointer file
        let wt_dir = std::env::temp_dir().join(format!("rocksoul-fast-wt-{}", Uuid::new_v4()));
        let wt_git = std::env::temp_dir().join(format!("rocksoul-fast-wtgit-{}", Uuid::new_v4()));
        fs::create_dir_all(&wt_dir).expect("wt dir should create");
        fs::create_dir_all(&wt_git).expect("wt git dir should create");
        fs::write(wt_git.join("HEAD"), "ref: refs/heads/feat/tray\n")
            .expect("wt HEAD should write");
        fs::write(
            wt_dir.join(".git"),
            format!("gitdir: {}\n", wt_git.display()),
        )
        .expect("gitfile should write");
        assert_eq!(read_current_branch_fast(&wt_dir, "main"), "feat/tray");

        let _ = fs::remove_dir_all(&dir);
        let _ = fs::remove_dir_all(&wt_dir);
        let _ = fs::remove_dir_all(&wt_git);
    }
}
