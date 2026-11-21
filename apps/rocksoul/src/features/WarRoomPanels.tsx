import React from "react";
import { NativeSelect } from "@moonwitness/ui";
import { Pencil, Trash2 } from "@moonwitness/ui/icons";
import type { Issue, Milestone, MilestoneStatus, Project, ProjectStatus } from "../lib/contracts";

interface MilestoneBoardPanelProps {
  milestones: Milestone[];
  editingMilestone: string;
  editMilestoneTitle: string;
  editMilestoneDescription: string;
  editMilestoneDate: string;
  onEditMilestoneTitleChange: (value: string) => void;
  onEditMilestoneDescriptionChange: (value: string) => void;
  onEditMilestoneDateChange: (value: string) => void;
  onSaveMilestone: (event: React.FormEvent) => void;
  onStartEditMilestone: (milestone: Milestone) => void;
  onCancelEditMilestone: () => void;
  onDeleteMilestone: (milestone: Milestone) => void;
  onMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void;
}

export function MilestoneBoardPanel({
  milestones,
  editingMilestone,
  editMilestoneTitle,
  editMilestoneDescription,
  editMilestoneDate,
  onEditMilestoneTitleChange,
  onEditMilestoneDescriptionChange,
  onEditMilestoneDateChange,
  onSaveMilestone,
  onStartEditMilestone,
  onCancelEditMilestone,
  onDeleteMilestone,
  onMilestoneStatus,
}: MilestoneBoardPanelProps) {
  return (
    <div className="milestone-board">
      <div className="milestone-board-head">
        <span>MISSION BOARD</span>
        <span>
          {milestones.length} MILESTONES / {milestones.filter((item) => item.status === "done").length} COMPLETE
        </span>
      </div>
      {milestones.map((milestone, index) => (
        <article className="milestone-row" key={milestone.id}>
          <span className="milestone-index">{String(index + 1).padStart(2, "0")}</span>
          {editingMilestone === milestone.id ? (
            <form className="milestone-edit-form" onSubmit={onSaveMilestone}>
              <input
                aria-label="Edit milestone title"
                value={editMilestoneTitle}
                onChange={(event) => onEditMilestoneTitleChange(event.target.value)}
                required
              />
              <input
                aria-label="Edit milestone description"
                value={editMilestoneDescription}
                onChange={(event) => onEditMilestoneDescriptionChange(event.target.value)}
              />
              <input
                aria-label="Edit milestone target date"
                type="date"
                value={editMilestoneDate}
                onChange={(event) => onEditMilestoneDateChange(event.target.value)}
              />
              <button className="outline-button">SAVE</button>
              <button type="button" className="outline-button" onClick={onCancelEditMilestone}>
                CANCEL
              </button>
            </form>
          ) : (
            <div className="milestone-main">
              <b>{milestone.title}</b>
              <small>
                {milestone.project_name} · {milestone.description || "No success criteria recorded"}
              </small>
            </div>
          )}
          {editingMilestone !== milestone.id && (
            <span className="milestone-date">{milestone.due_at || "NO TARGET"}</span>
          )}
          <NativeSelect
            className={"h-auto w-auto milestone-status " + milestone.status}
            aria-label={"Status for " + milestone.title}
            value={milestone.status}
            onChange={(e) => onMilestoneStatus(milestone.id, e.target.value as MilestoneStatus)}
          >
            <option value="planned">PLANNED</option>
            <option value="in_progress">IN PROGRESS</option>
            <option value="blocked">BLOCKED</option>
            <option value="done">DONE</option>
          </NativeSelect>
          <div className="issue-actions">
            <button
              type="button"
              className="row-action"
              aria-label={`Edit ${milestone.title}`}
              onClick={() => onStartEditMilestone(milestone)}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="row-action"
              aria-label={`Delete ${milestone.title}`}
              onClick={() => onDeleteMilestone(milestone)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </article>
      ))}
      {!milestones.length && (
        <div className="empty-state large-empty">
          <b>NO MILESTONES ON THE BOARD.</b>
          <span>Create a project, then add its first checkpoint above.</span>
        </div>
      )}
    </div>
  );
}

interface ProjectGridPanelProps {
  projects: Project[];
  milestones: Milestone[];
  issues: Issue[];
  editingProject: string;
  editProjectName: string;
  editProjectDescription: string;
  editProjectStatus: ProjectStatus;
  onEditProjectNameChange: (value: string) => void;
  onEditProjectDescriptionChange: (value: string) => void;
  onEditProjectStatusChange: (value: ProjectStatus) => void;
  onSaveProject: (event: React.FormEvent) => void;
  onStartEditProject: (project: Project) => void;
  onCancelEditProject: () => void;
  onDeleteProject: (project: Project) => void;
  onProjectIssues: (projectId: string) => void;
}

export function ProjectGridPanel({
  projects,
  milestones,
  issues,
  editingProject,
  editProjectName,
  editProjectDescription,
  editProjectStatus,
  onEditProjectNameChange,
  onEditProjectDescriptionChange,
  onEditProjectStatusChange,
  onSaveProject,
  onStartEditProject,
  onCancelEditProject,
  onDeleteProject,
  onProjectIssues,
}: ProjectGridPanelProps) {
  return (
    <div className="project-grid">
      {projects.map((project, index) => {
        const projectMilestones = milestones.filter((item) => item.project_id === project.id);
        const completedCount = projectMilestones.filter((item) => item.status === "done").length;
        const pct = (completedCount / Math.max(1, projectMilestones.length)) * 100;
        const projectIssuesCount = issues.filter((issue) => issue.project_id === project.id).length;

        return (
          <article className="project-card" key={project.id}>
            <span className="project-number">0{index + 1}</span>
            <span className="eyebrow">ACTIVE OPERATION</span>
            {editingProject === project.id ? (
              <form className="project-edit-form" onSubmit={onSaveProject}>
                <input
                  aria-label="Edit project name"
                  value={editProjectName}
                  onChange={(event) => onEditProjectNameChange(event.target.value)}
                  required
                />
                <input
                  aria-label="Edit project description"
                  value={editProjectDescription}
                  onChange={(event) => onEditProjectDescriptionChange(event.target.value)}
                />
                <NativeSelect
                  className="h-auto"
                  aria-label="Project status"
                  value={editProjectStatus}
                  onChange={(event) => onEditProjectStatusChange(event.target.value as ProjectStatus)}
                >
                  <option value="active">ACTIVE</option>
                  <option value="paused">PAUSED</option>
                  <option value="done">DONE</option>
                  <option value="archived">ARCHIVED</option>
                </NativeSelect>
                <button className="outline-button">SAVE</button>
                <button type="button" className="outline-button" onClick={onCancelEditProject}>
                  CANCEL
                </button>
              </form>
            ) : (
              <>
                <h3>{project.name}</h3>
                <p>{project.description || "No mission statement recorded yet."}</p>
              </>
            )}
            <div className="project-progress">
              <span style={{ width: `${pct}%` }} />
            </div>
            <footer>
              <span>{project.status.toUpperCase()}</span>
              <span>
                {completedCount}/{projectMilestones.length} MILESTONES DONE
              </span>
            </footer>
            <div className="issue-actions project-actions">
              <button
                type="button"
                className="row-action"
                aria-label={`Edit ${project.name}`}
                onClick={() => onStartEditProject(project)}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="row-action"
                aria-label={`Delete ${project.name}`}
                onClick={() => onDeleteProject(project)}
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                className="outline-button"
                onClick={() => onProjectIssues(project.id)}
              >
                {projectIssuesCount} ISSUES
              </button>
            </div>
          </article>
        );
      })}
      {!projects.length && (
        <div className="empty-state large-empty">
          <b>NO ACTIVE OPERATIONS.</b>
          <span>Create a project to start organizing milestones and work.</span>
        </div>
      )}
    </div>
  );
}
