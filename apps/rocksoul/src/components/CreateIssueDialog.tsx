import React, { useState } from "react";
import { NativeSelect } from "@moonwitness/ui";
import { X, Zap } from "@moonwitness/ui/icons";
import type { CreateIssueArgs, IssuePriority, Project, Repository } from "../lib/contracts";

export interface CreateIssueDialogProps {
  onClose: () => void;
  onCreate: (payload: CreateIssueArgs) => Promise<void>;
  projects?: Project[];
  repositories?: Repository[];
}

export default function CreateIssueDialog({
  onClose,
  onCreate,
  projects = [],
  repositories = [],
}: CreateIssueDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("P2");
  const [projectId, setProjectId] = useState("");
  const [repositoryId, setRepositoryId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        priority,
        projectId: projectId || undefined,
        repositoryId: repositoryId || undefined,
      });
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <form className="issue-dialog" onSubmit={submit}>
        <div className="dialog-head">
          <div>
            <span className="eyebrow">PIT / INCOMING CHAOS</span>
            <h2>
              CREATE NEW CHAOS<span>+</span>
            </h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <label className="field-label" htmlFor="create-issue-title">
          WHAT NEEDS TO HAPPEN?
          <input
            id="create-issue-title"
            name="title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this chaos a name..."
            maxLength={140}
          />
        </label>
        <label className="field-label" htmlFor="create-issue-notes">
          FIELD NOTES
          <textarea
            id="create-issue-notes"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context, acceptance criteria, links..."
            rows={4}
          />
        </label>
        <label className="field-label" htmlFor="create-issue-priority">
          PRIORITY
          <NativeSelect
            id="create-issue-priority"
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as IssuePriority)}
          >
            <option>P0</option>
            <option>P1</option>
            <option>P2</option>
            <option>P3</option>
          </NativeSelect>
        </label>
        <label className="field-label" htmlFor="create-issue-project">
          PROJECT
          <NativeSelect
            id="create-issue-project"
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
        <label className="field-label" htmlFor="create-issue-repository">
          REPOSITORY
          <NativeSelect
            id="create-issue-repository"
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
          <span>LOCAL FIRST. NO CLOUD REQUIRED.</span>
          <button className="riot-button" disabled={busy || !title.trim()}>
            <Zap size={16} />
            {busy ? "CREATING..." : "CREATE ISSUE"}
          </button>
        </div>
      </form>
    </div>
  );
}
