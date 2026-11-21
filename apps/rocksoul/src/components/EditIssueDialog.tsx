import React, { useState } from "react";
import { NativeSelect } from "@moonwitness/ui";
import { X } from "@moonwitness/ui/icons";
import type { Issue, IssuePriority, Project, Repository, UpdateIssueArgs } from "../lib/contracts";

export interface EditIssueDialogProps {
  issue: Issue;
  projects?: Project[];
  repositories?: Repository[];
  onClose: () => void;
  onSave: (payload: UpdateIssueArgs) => Promise<void>;
}

export default function EditIssueDialog({
  issue,
  projects = [],
  repositories = [],
  onClose,
  onSave,
}: EditIssueDialogProps) {
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description || "");
  const [priority, setPriority] = useState<IssuePriority>(issue.priority);
  const [projectId, setProjectId] = useState(issue.project_id || "");
  const [repositoryId, setRepositoryId] = useState(issue.repository_id || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({
        issueId: issue.id,
        title,
        description,
        priority,
        projectId: projectId || undefined,
        repositoryId: repositoryId || undefined,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <form className="issue-dialog" onSubmit={submit}>
        <div className="dialog-head">
          <div>
            <span className="eyebrow">PIT / {issue.issue_key}</span>
            <h2>EDIT ISSUE</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <label className="field-label" htmlFor="edit-issue-title">
          TITLE
          <input
            id="edit-issue-title"
            name="title"
            autoFocus
            maxLength={140}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="field-label" htmlFor="edit-issue-description">
          DESCRIPTION
          <textarea
            id="edit-issue-description"
            name="description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="field-label" htmlFor="edit-issue-priority">
          PRIORITY
          <NativeSelect
            id="edit-issue-priority"
            name="priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as IssuePriority)}
          >
            {(["P0", "P1", "P2", "P3"] as const).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </NativeSelect>
        </label>
        <label className="field-label" htmlFor="edit-issue-project">
          PROJECT
          <NativeSelect
            id="edit-issue-project"
            name="projectId"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">NO PROJECT</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="field-label" htmlFor="edit-issue-repository">
          REPOSITORY
          <NativeSelect
            id="edit-issue-repository"
            name="repositoryId"
            value={repositoryId}
            onChange={(event) => setRepositoryId(event.target.value)}
          >
            <option value="">NO REPOSITORY</option>
            {repositories.map((repository) => (
              <option key={repository.id} value={repository.id}>
                {repository.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        {error && (
          <p className="inline-notice" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-foot">
          <span>ISSUE KEY REMAINS {issue.issue_key}</span>
          <button className="riot-button" disabled={busy || !title.trim()}>
            {busy ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </div>
      </form>
    </div>
  );
}
