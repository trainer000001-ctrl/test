import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, GitBranch, Plus, RefreshCw } from "@moonwitness/ui/icons";
import { thumbArchiveUrl } from "../assets/art";
import { call } from "../lib";
import type { GitOperation, GitSnapshot, GitView, Repository } from "../lib/contracts";
import { GitConfirmDialog, type PendingGitOperation } from "./GitConfirmDialog";
import { PageTitle } from "./WorkspacePageTitle";

export interface GitProps {
  repositories: Repository[];
  initialSelectedId?: string | undefined;
  initialView?: GitView | undefined;
  onAddRepository: (path: string) => Promise<Repository>;
  onRefresh: () => Promise<void>;
}

export function Git({
  repositories,
  initialSelectedId,
  initialView,
  onAddRepository,
  onRefresh,
}: GitProps) {
  const [path, setPath] = useState("");
  const [selected, setSelected] = useState(initialSelectedId || repositories[0]?.id || "");
  const [snapshot, setSnapshot] = useState<GitSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedView, setSelectedView] = useState<GitView>(initialView || "status");
  const [pendingOperation, setPendingOperation] = useState<PendingGitOperation | null>(null);
  const [operationBranch, setOperationBranch] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [operationPreview, setOperationPreview] = useState("");
  const autoLoadKeyRef = useRef<string>("");

  useEffect(() => {
    if (!initialView) return;
    const targetId =
      initialSelectedId && repositories.some((repo) => repo.id === initialSelectedId)
        ? initialSelectedId
        : repositories[0]?.id || "";
    if (!targetId) return;
    const key = `${targetId}:${initialView}`;
    if (autoLoadKeyRef.current === key) return;
    autoLoadKeyRef.current = key;
    let active = true;

    const loadInitial = async () => {
      setSelected(targetId);
      setSelectedView(initialView);
      setLoading(true);
      setError("");
      try {
        const result = await call("git_snapshot", { repositoryId: targetId, view: initialView });
        if (active) setSnapshot(result);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadInitial();
    return () => {
      active = false;
    };
  }, [initialSelectedId, initialView, repositories]);

  async function inspect(kind: GitView = selectedView) {
    if (!selected) return;
    setSelectedView(kind);
    setLoading(true);
    setError("");
    try {
      setSnapshot(await call("git_snapshot", { repositoryId: selected, view: kind }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!path.trim()) return;
    setError("");
    setNotice("");
    try {
      const repository = await onAddRepository(path.trim());
      setPath("");
      setNotice(`Connected ${repository.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function runOperation() {
    if (!pendingOperation || !selected) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await call("git_execute", {
        repositoryId: selected,
        operation: pendingOperation.operation,
        branch: ["create_branch", "switch_branch", "merge", "rebase"].includes(
          pendingOperation.operation,
        )
          ? operationBranch
          : undefined,
        message: pendingOperation.operation === "commit" ? commitMessage : undefined,
      });
      setSnapshot(result);
      setSelectedView("status");
      setNotice(`${pendingOperation.label} completed.`);
      setPendingOperation(null);
      setOperationBranch("");
      setCommitMessage("");
      await onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function reviewOperation(operation: PendingGitOperation) {
    setPendingOperation(operation);
    setOperationBranch("");
    setCommitMessage("");
    setOperationPreview("");
    if (!selected) return;
    try {
      const [status, diff] = await Promise.all([
        call("git_snapshot", { repositoryId: selected, view: "status" }),
        call("git_snapshot", { repositoryId: selected, view: "diff" }),
      ]);
      setOperationPreview(
        `${status.output || "Clean working tree."}\n\nDIFF SUMMARY\n${diff.output || "No unstaged changes."}`,
      );
    } catch (e) {
      setOperationPreview(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className="page-content workspace-page">
      <PageTitle
        kicker="03 / SOURCE CONTROL"
        title="GIT JUNGLE"
        subtitle="Your checkouts. Your branches. No remote dependency required."
        artSrc={thumbArchiveUrl}
        artCode="SECTOR 03 // GIT JUNGLE"
        action={
          <button className="outline-button" onClick={onRefresh}>
            <RefreshCw size={15} /> REFRESH
          </button>
        }
      />
      <div className="git-layout">
        <div className="riot-panel repo-panel">
          <div className="panel-heading cream">
            <span>REGISTERED REPOSITORIES</span>
            <span>{repositories.length} LOCAL</span>
          </div>
          {repositories.map((repo) => (
            <button
              key={repo.id}
              className={`repo-select ${selected === repo.id ? "selected" : ""}`}
              onClick={() => {
                setSelected(repo.id);
                setSnapshot(null);
              }}
            >
              <GitBranch size={18} />
              <span>
                <b>{repo.name}</b>
                <small>{repo.path}</small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
          <form className="add-repo" onSubmit={add}>
            <label className="field-label">
              ADD LOCAL CHECKOUT
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="C:\\Projects\\my-repo or /home/me/repo"
              />
            </label>
            <button className="riot-button" disabled={!path.trim()}>
              <Plus size={15} /> CONNECT
            </button>
          </form>
        </div>
        <div className="riot-panel git-inspector">
          <div className="panel-heading purple-head">
            <span>WORKTREE INSPECTOR</span>
            <span className="micro-label">LOCAL GIT CONTROLS</span>
          </div>
          <div className="git-actions">
            {(["status", "log", "diff", "patch", "branches"] as const).map((key) => (
              <button
                key={key}
                className={`outline-button ${selectedView === key ? "selected" : ""}`}
                aria-pressed={selectedView === key}
                onClick={() => inspect(key)}
                disabled={!selected || loading}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="git-actions git-write-actions">
            <button
              className="outline-button"
              disabled={!selected || loading}
              onClick={() => reviewOperation({ operation: "create_branch", label: "Create branch" })}
            >
              NEW BRANCH
            </button>
            <button
              className="outline-button"
              disabled={!selected || loading}
              onClick={() => reviewOperation({ operation: "switch_branch", label: "Switch branch" })}
            >
              SWITCH
            </button>
            <button
              className="outline-button"
              disabled={!selected || loading}
              onClick={() => reviewOperation({ operation: "commit", label: "Commit changes" })}
            >
              COMMIT
            </button>
            {(["fetch", "pull", "push"] as const).map((operation) => (
              <button
                key={operation}
                className="outline-button"
                disabled={!selected || loading}
                onClick={() =>
                  reviewOperation({
                    operation: operation as GitOperation,
                    label: operation.toUpperCase(),
                  })
                }
              >
                {operation.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="git-actions git-write-actions">
            <button
              className="outline-button"
              disabled={!selected || loading}
              onClick={() => reviewOperation({ operation: "merge", label: "Merge branch" })}
            >
              MERGE
            </button>
            <button
              className="outline-button"
              disabled={!selected || loading}
              onClick={() => reviewOperation({ operation: "rebase", label: "Rebase onto branch" })}
            >
              REBASE
            </button>
            <button
              className="outline-button"
              disabled={!selected || loading}
              onClick={() => reviewOperation({ operation: "abort_merge", label: "Abort merge" })}
            >
              ABORT MERGE
            </button>
            <button
              className="outline-button"
              disabled={!selected || loading}
              onClick={() => reviewOperation({ operation: "abort_rebase", label: "Abort rebase" })}
            >
              ABORT REBASE
            </button>
          </div>
          {loading ? (
            <div className="empty-state">
              <RefreshCw className="spin" />
              <span>READING THE REPOSITORY...</span>
            </div>
          ) : error ? (
            <pre className="terminal-output error-output">{error}</pre>
          ) : snapshot ? (
            <>
              <div className="git-meta">
                <b>{snapshot.name}</b>
                <span>⑂ {snapshot.branch}</span>
              </div>
              <pre className="terminal-output">
                {snapshot.output || (snapshot.view === "status" ? "Clean working tree." : "No results.")}
              </pre>
            </>
          ) : (
            <div className="empty-state">
              <GitBranch size={30} />
              <b>SELECT A REPOSITORY.</b>
              <span>Inspect local status, recent commits, diffs, and branches.</span>
            </div>
          )}
          {notice && (
            <p className="inline-notice" role="status">
              {notice}
            </p>
          )}
        </div>
      </div>
      {pendingOperation && (
        <GitConfirmDialog
          pendingOperation={pendingOperation}
          repositoryName={repositories.find((repository) => repository.id === selected)?.name || "Unavailable"}
          operationBranch={operationBranch}
          commitMessage={commitMessage}
          operationPreview={operationPreview}
          loading={loading}
          onBranchChange={setOperationBranch}
          onCommitMessageChange={setCommitMessage}
          onCancel={() => setPendingOperation(null)}
          onConfirm={runOperation}
        />
      )}
    </section>
  );
}
