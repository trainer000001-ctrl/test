import React, { useState } from "react";
import { NativeSelect } from "@moonwitness/ui";
import { Plus, Workflow } from "@moonwitness/ui/icons";
import { thumbStudioUrl } from "../assets/art";
import type {
  CreateMilestoneArgs,
  CreateProjectArgs,
  Issue,
  Milestone,
  MilestoneStatus,
  Project,
  ProjectStatus,
  UpdateMilestoneArgs,
  UpdateProjectArgs,
} from "../lib/contracts";
import { MilestoneBoardPanel, ProjectGridPanel } from "./WarRoomPanels";
import { PageTitle } from "./WorkspacePageTitle";

export interface WarRoomProps {
  projects: Project[];
  milestones: Milestone[];
  issues: Issue[];
  onCreateProject: (args: CreateProjectArgs) => Promise<Project | void>;
  onUpdateProject: (args: UpdateProjectArgs) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onCreateMilestone: (args: CreateMilestoneArgs) => Promise<Milestone | void>;
  onUpdateMilestone: (args: UpdateMilestoneArgs) => Promise<void>;
  onDeleteMilestone: (milestoneId: string) => Promise<void>;
  onMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void;
  onProjectIssues: (projectId: string) => void;
}

export function WarRoom({
  projects,
  milestones,
  issues,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onCreateMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onMilestoneStatus,
  onProjectIssues,
}: WarRoomProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notice, setNotice] = useState("");
  const [editingProject, setEditingProject] = useState("");
  const [editingMilestone, setEditingMilestone] = useState("");
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [editProjectStatus, setEditProjectStatus] = useState<ProjectStatus>("active");
  const [editMilestoneTitle, setEditMilestoneTitle] = useState("");
  const [editMilestoneDescription, setEditMilestoneDescription] = useState("");
  const [editMilestoneDate, setEditMilestoneDate] = useState("");
  const activeProjectId = projects.some((project) => project.id === projectId)
    ? projectId
    : projects[0]?.id || "";

  async function submitProject(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await onCreateProject({ name: name.trim(), description: description.trim() });
      setName("");
      setDescription("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function submitMilestone(event: React.FormEvent) {
    event.preventDefault();
    if (!activeProjectId || !milestoneTitle.trim()) return;
    try {
      await onCreateMilestone({
        projectId: activeProjectId,
        title: milestoneTitle.trim(),
        description: milestoneDescription.trim(),
        dueAt: dueAt || undefined,
      });
      setMilestoneTitle("");
      setMilestoneDescription("");
      setDueAt("");
      setNotice("MILESTONE ADDED TO THE PLAN.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function removeProject(project: Project) {
    if (
      !window.confirm(
        `Delete "${project.name}"? Its milestones will be removed; linked issues and repositories will be kept without the project.`,
      )
    )
      return;
    try {
      await onDeleteProject(project.id);
      setNotice(`Deleted project ${project.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveProject(event: React.FormEvent) {
    event.preventDefault();
    try {
      await onUpdateProject({
        projectId: editingProject,
        name: editProjectName,
        description: editProjectDescription,
        status: editProjectStatus,
      });
      setEditingProject("");
      setNotice("PROJECT UPDATED.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function removeMilestone(milestone: Milestone) {
    if (!window.confirm(`Delete milestone "${milestone.title}"?`)) return;
    try {
      await onDeleteMilestone(milestone.id);
      setNotice(`Deleted milestone ${milestone.title}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveMilestone(event: React.FormEvent) {
    event.preventDefault();
    try {
      await onUpdateMilestone({
        milestoneId: editingMilestone,
        title: editMilestoneTitle,
        description: editMilestoneDescription,
        dueAt: editMilestoneDate || undefined,
      });
      setEditingMilestone("");
      setNotice("MILESTONE UPDATED.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="page-content workspace-page">
      <PageTitle
        kicker="04 / STRATEGY & MILESTONES"
        title="WAR ROOM"
        subtitle="Turn the big idea into small moves that can actually ship."
        artSrc={thumbStudioUrl}
        artCode="SECTOR 04 // WAR ROOM"
      />
      <form className="riot-panel project-create" onSubmit={submitProject}>
        <div className="panel-heading cream">
          <span>
            <Workflow size={15} /> NEW PROJECT
          </span>
          <span className="micro-label">LOCAL PLAN</span>
        </div>
        <div className="project-fields">
          <input
            aria-label="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="PROJECT CODENAME"
          />
          <input
            aria-label="Project description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does success look like?"
          />
          <button className="riot-button" disabled={!name.trim()}>
            <Plus size={15} /> CREATE PROJECT
          </button>
        </div>
      </form>

      <form className="riot-panel milestone-create" onSubmit={submitMilestone}>
        <div className="panel-heading pink">
          <span>BUILD THE ROADMAP</span>
          <span className="micro-label">MILESTONE PLANNER</span>
        </div>
        <div className="milestone-fields">
          <label className="field-label">
            PROJECT
            <NativeSelect
              value={activeProjectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!projects.length}
            >
              <option value="">SELECT PROJECT</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="field-label">
            MILESTONE TITLE
            <input
              aria-label="Milestone title"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              placeholder="e.g. First playable build"
            />
          </label>
          <label className="field-label">
            TARGET DATE
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </label>
          <label className="field-label milestone-description">
            SUCCESS CRITERIA
            <input
              value={milestoneDescription}
              onChange={(e) => setMilestoneDescription(e.target.value)}
              placeholder="What must be true to complete it?"
            />
          </label>
          <button className="riot-button" disabled={!activeProjectId || !milestoneTitle.trim()}>
            <Plus size={15} /> ADD MILESTONE
          </button>
        </div>
      </form>

      <MilestoneBoardPanel
        milestones={milestones}
        editingMilestone={editingMilestone}
        editMilestoneTitle={editMilestoneTitle}
        editMilestoneDescription={editMilestoneDescription}
        editMilestoneDate={editMilestoneDate}
        onEditMilestoneTitleChange={setEditMilestoneTitle}
        onEditMilestoneDescriptionChange={setEditMilestoneDescription}
        onEditMilestoneDateChange={setEditMilestoneDate}
        onSaveMilestone={saveMilestone}
        onStartEditMilestone={(milestone) => {
          setEditingMilestone(milestone.id);
          setEditMilestoneTitle(milestone.title);
          setEditMilestoneDescription(milestone.description || "");
          setEditMilestoneDate(milestone.due_at || "");
        }}
        onCancelEditMilestone={() => setEditingMilestone("")}
        onDeleteMilestone={removeMilestone}
        onMilestoneStatus={onMilestoneStatus}
      />

      <ProjectGridPanel
        projects={projects}
        milestones={milestones}
        issues={issues}
        editingProject={editingProject}
        editProjectName={editProjectName}
        editProjectDescription={editProjectDescription}
        editProjectStatus={editProjectStatus}
        onEditProjectNameChange={setEditProjectName}
        onEditProjectDescriptionChange={setEditProjectDescription}
        onEditProjectStatusChange={setEditProjectStatus}
        onSaveProject={saveProject}
        onStartEditProject={(project) => {
          setEditingProject(project.id);
          setEditProjectName(project.name);
          setEditProjectDescription(project.description || "");
          setEditProjectStatus(project.status);
        }}
        onCancelEditProject={() => setEditingProject("")}
        onDeleteProject={removeProject}
        onProjectIssues={onProjectIssues}
      />
      {notice && <p className="inline-notice">{notice}</p>}
    </section>
  );
}
