import React, { useState } from "react";
import { NativeSelect } from "@moonwitness/ui";
import { Plus } from "@moonwitness/ui/icons";
import { thumbRiotUrl } from "../assets/art";
import { IssueRow } from "../components";
import type { Issue, IssueStatus, Project } from "../lib/contracts";
import { PageTitle } from "./WorkspacePageTitle";

export interface PitProps {
  issues: Issue[];
  projects: Project[];
  projectFilter: string;
  onProjectFilter: (projectId: string) => void;
  onCreate: () => void;
  onStatusChange: (issueId: string, status: IssueStatus) => void;
  onEdit: (issue: Issue) => void;
  onDelete: (issue: Issue) => void;
}

export function Pit({
  issues,
  projects,
  projectFilter,
  onProjectFilter,
  onCreate,
  onStatusChange,
  onEdit,
  onDelete,
}: PitProps) {
  const [filter, setFilter] = useState<string>("all");
  const visible = issues.filter(
    (issue) =>
      (filter === "all" || issue.status === filter) &&
      (!projectFilter || issue.project_id === projectFilter),
  );

  return (
    <section className="page-content workspace-page">
      <PageTitle
        kicker="01 / WORK QUEUE"
        title="THE PIT"
        subtitle="Every loose end. Every sharp edge. One place to throw down."
        artSrc={thumbRiotUrl}
        artCode="SECTOR 01 // THE PIT"
        action={
          <button className="riot-button" onClick={onCreate}>
            <Plus size={16} /> NEW ISSUE
          </button>
        }
      />
      <div className="filter-strip">
        {(["all", "open", "blocked", "done", "closed"] as const).map((key) => (
          <button
            key={key}
            className={filter === key ? "selected" : ""}
            onClick={() => setFilter(key)}
          >
            {key.toUpperCase()}{" "}
            <b>{key === "all" ? issues.length : issues.filter((issue) => issue.status === key).length}</b>
          </button>
        ))}
        <NativeSelect
          className="h-auto w-auto"
          aria-label="Filter by project"
          value={projectFilter}
          onChange={(event) => onProjectFilter(event.target.value)}
        >
          <option value="">ALL PROJECTS</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="large-issue-list">
        {visible.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {!visible.length && (
          <div className="empty-state large-empty">
            <b>NOTHING IN THIS CORNER.</b>
            <span>Create an issue or change the current filter.</span>
          </div>
        )}
      </div>
    </section>
  );
}
