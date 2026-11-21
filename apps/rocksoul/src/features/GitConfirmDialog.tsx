import React from "react";
import { X } from "@moonwitness/ui/icons";
import type { GitOperation } from "../lib/contracts";

export interface PendingGitOperation {
  operation: GitOperation;
  label: string;
}

interface GitConfirmDialogProps {
  pendingOperation: PendingGitOperation;
  repositoryName: string;
  operationBranch: string;
  commitMessage: string;
  operationPreview: string;
  loading: boolean;
  onBranchChange: (value: string) => void;
  onCommitMessageChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const BRANCH_OPERATIONS = new Set<GitOperation>([
  "create_branch",
  "switch_branch",
  "merge",
  "rebase",
]);

export function GitConfirmDialog({
  pendingOperation,
  repositoryName,
  operationBranch,
  commitMessage,
  operationPreview,
  loading,
  onBranchChange,
  onCommitMessageChange,
  onCancel,
  onConfirm,
}: GitConfirmDialogProps) {
  const needsBranch = BRANCH_OPERATIONS.has(pendingOperation.operation);
  const needsMessage = pendingOperation.operation === "commit";
  const disabled =
    loading || (needsBranch && !operationBranch.trim()) || (needsMessage && !commitMessage.trim());

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <section
        className="issue-dialog git-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="git-confirm-title"
      >
        <header className="dialog-head">
          <div>
            <span className="eyebrow">GIT / WRITE OPERATION</span>
            <h2 id="git-confirm-title">
              REVIEW ACTION<span>!</span>
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onCancel}
            aria-label="Cancel Git operation"
          >
            <X />
          </button>
        </header>
        <p className="git-confirm-warning">
          This action changes the selected local repository. Review the target and current worktree before
          confirming.
        </p>
        <div className="git-confirm-target">
          <span>REPOSITORY</span>
          <b>{repositoryName}</b>
          <span>OPERATION</span>
          <b>{pendingOperation.label}</b>
        </div>
        {needsBranch && (
          <label className="field-label">
            BRANCH NAME
            <input
              autoFocus
              value={operationBranch}
              onChange={(event) => onBranchChange(event.target.value)}
              placeholder="feature/your-change"
            />
          </label>
        )}
        {needsMessage && (
          <label className="field-label">
            COMMIT MESSAGE
            <input
              autoFocus
              value={commitMessage}
              onChange={(event) => onCommitMessageChange(event.target.value)}
              placeholder="Describe this change"
            />
          </label>
        )}
        <div className="git-confirm-preview">
          <span>REPOSITORY PREVIEW</span>
          <pre>{operationPreview || "Loading repository status and diff summary..."}</pre>
        </div>
        <footer className="dialog-foot">
          <button className="outline-button" onClick={onCancel}>
            CANCEL
          </button>
          <button className="riot-button" disabled={disabled} onClick={onConfirm}>
            CONFIRM {pendingOperation.label.toUpperCase()}
          </button>
        </footer>
      </section>
    </div>
  );
}
