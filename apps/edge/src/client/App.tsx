import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  ArrowUpRight,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CutoutArtwork,
  Input,
  Label,
  MoonwitnessCrestIcon,
  NativeSelect,
  Separator,
  SkinOrnament,
  StatBlock,
  StatusBadge,
  cn,
  kanbanColumnVariants,
  useSkin,
  useThemeMode,
  type SkinName,
} from "@moonwitness/ui";

type ProjectTaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
type ProjectTaskPriority = "low" | "normal" | "high" | "urgent" | "critical";

interface ProjectRecord {
  id: string;
  code: string;
  name: string;
  summary: string;
  project_status: string;
  github_repo: string | null;
}

interface TaskRecord {
  id: string;
  version: number;
  project_code: string;
  title: string;
  description: string;
  task_status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assignee: string | null;
  labels: string[];
  github_issue_number: number | null;
  github_repo: string | null;
  github_url: string | null;
  github_state: "open" | "closed" | null;
  is_github_synced?: boolean;
}

interface HealthResponse {
  ok: boolean;
  service: string;
  orm: string;
  addonRuntime: string;
  addons: string[];
  dialect: string;
}

const STAGES: ReadonlyArray<{ id: ProjectTaskStatus; label: string; colorVar: string }> = [
  { id: "backlog", label: "BACKLOG", colorVar: "var(--muted-foreground)" },
  { id: "todo", label: "TO DO", colorVar: "var(--blue)" },
  { id: "in_progress", label: "IN PROGRESS", colorVar: "var(--primary)" },
  { id: "review", label: "IN REVIEW", colorVar: "var(--accent)" },
  { id: "done", label: "DONE", colorVar: "var(--green)" },
];

const PRIORITIES: ReadonlyArray<ProjectTaskPriority> = [
  "low",
  "normal",
  "high",
  "urgent",
  "critical",
];

const SKINS: ReadonlyArray<{ id: SkinName; label: string }> = [
  { id: "riot", label: "Riot" },
  { id: "technical", label: "Technical" },
  { id: "editorial", label: "Editorial" },
  { id: "archive", label: "Archive" },
  { id: "transmission", label: "Transmission" },
];

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const payload = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(payload.error ?? `Request failed (${res.status})`);
  }
  return payload;
}

function priorityBadgeVariant(
  priority: ProjectTaskPriority,
): "destructive" | "default" | "secondary" | "outline" {
  if (priority === "critical" || priority === "urgent") return "destructive";
  if (priority === "high") return "default";
  if (priority === "normal") return "secondary";
  return "outline";
}

export function EdgeTasksApp() {
  const { skin, setSkin, density } = useSkin();
  const { mode, setMode } = useThemeMode();

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [githubRepo, setGithubRepo] = useState("A-L-L-A-H/moonwitness");

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectRepo, setNewProjectRepo] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<ProjectTaskPriority>("normal");
  const [newTaskStage, setNewTaskStage] = useState<ProjectTaskStatus>("todo");

  const [busy, setBusy] = useState(false);
  const [pubsubState, setPubsubState] = useState<"connecting" | "live" | "polling">("connecting");
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (projectFilter) params.set("project_code", projectFilter);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    const taskQuery = params.toString();

    const [healthRes, projRes, taskRes] = await Promise.all([
      requestJson<HealthResponse>("/healthz"),
      requestJson<{ data: ProjectRecord[] }>("/api/projects"),
      requestJson<{ data: TaskRecord[] }>(`/api/tasks${taskQuery ? `?${taskQuery}` : ""}`),
    ]);

    setHealth(healthRes);
    setProjects(projRes.data ?? []);
    setTasks(taskRes.data ?? []);
    setNewTaskProject((prev) => {
      if (prev && projRes.data.some((p) => p.code === prev)) return prev;
      return projRes.data[0]?.code ?? "";
    });
  }, [projectFilter, searchQuery]);

  useEffect(() => {
    refresh().catch((err: unknown) => {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load workspace");
    });
  }, [refresh]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      setPubsubState("polling");
      return;
    }
    const source = new EventSource("/api/pubsub/stream");
    source.addEventListener("open", () => {
      setPubsubState("live");
    });
    source.addEventListener("orm.pubsub", () => {
      setPubsubState("live");
      void refresh();
    });
    source.addEventListener("error", () => {
      setPubsubState("polling");
    });
    return () => {
      source.close();
    };
  }, [refresh]);

  const projectByCode = useMemo(
    () => new Map(projects.map((project) => [project.code, project])),
    [projects],
  );

  const stats = useMemo(() => {
    const openCount = tasks.filter((task) => task.task_status !== "done").length;
    const doneCount = tasks.filter((task) => task.task_status === "done").length;
    const githubCount = tasks.filter((task) => task.github_issue_number !== null).length;
    return { openCount, doneCount, githubCount };
  }, [tasks]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newProjectName.trim()) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await requestJson("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newProjectName.trim(),
          github_repo: newProjectRepo.trim() || null,
        }),
      });
      setNewProjectName("");
      setNewProjectRepo("");
      setNotice("Project created in centralized project.project model.");
      await refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTaskProject || !newTaskTitle.trim()) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await requestJson("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          project_code: newTaskProject,
          title: newTaskTitle.trim(),
          priority: newTaskPriority,
          task_status: newTaskStage,
        }),
      });
      setNewTaskTitle("");
      setNotice("Task created in centralized project.task model.");
      await refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncGitHub() {
    const repo = githubRepo.trim();
    if (!repo) return;
    setBusy(true);
    setErrorMessage(null);
    setNotice(`Syncing GitHub issues from ${repo}...`);
    try {
      const result = await requestJson<{
        synced: number;
        created: number;
        updated: number;
        projectCode: string;
      }>("/api/sync/github", {
        method: "POST",
        body: JSON.stringify({ repo, state: "all" }),
      });
      setNotice(
        `Synced ${result.synced} issues into ${result.projectCode} (${result.created} created, ${result.updated} updated).`,
      );
      await refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "GitHub sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleMoveStage(task: TaskRecord, nextStatus: ProjectTaskStatus) {
    setErrorMessage(null);
    try {
      await requestJson(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ task_status: nextStatus, version: task.version }),
      });
      await refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update task stage");
    }
  }

  async function handleDeleteTask(taskId: string) {
    setErrorMessage(null);
    try {
      await requestJson(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <Card className="relative overflow-hidden">
        <SkinOrnament slot="corner" className="start-2 top-2" />
        <CutoutArtwork
          id="radar-sweep"
          decorative
          className="pointer-events-none absolute -top-2 hidden h-28 w-28 opacity-20 sm:block ltr:-right-4 rtl:-left-4"
        />
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <MoonwitnessCrestIcon className="h-7 w-7 text-[var(--primary)]" />
              <div>
                <CardTitle className="text-lg uppercase tracking-wide">
                  MoonWitness Edge · Project &amp; Task Management
                </CardTitle>
                <CardDescription>
                  Centralized @moonwitness/addons/project + @moonwitness/orm + @moonwitness/ui
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">ORM: {health?.dialect ?? "..."}</Badge>
              <Badge variant={pubsubState === "live" ? "default" : "secondary"}>
                PUB/SUB: {pubsubState.toUpperCase()}
              </Badge>
              <Badge variant="secondary">ADDONS: {health?.addons?.join(" → ") ?? "loading"}</Badge>
              <NativeSelect
                aria-label="Skin preset"
                value={skin}
                onChange={(event) => setSkin(event.target.value as SkinName)}
                className="h-9 w-36"
              >
                {SKINS.map((item) => (
                  <option key={item.id} value={item.id}>
                    Skin: {item.label}
                  </option>
                ))}
              </NativeSelect>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode(mode === "dark" ? "light" : "dark")}
              >
                {mode === "dark" ? "Light Mode" : "Dark Mode"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatBlock value={projects.length} label="Projects" tone="blue" density="compact" />
            <StatBlock value={stats.openCount} label="Active Tasks" tone="pink" density="compact" />
            <StatBlock value={stats.doneCount} label="Completed" tone="green" density="compact" />
            <StatBlock
              value={stats.githubCount}
              label="GitHub Synced"
              tone="yellow"
              density="compact"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <Label htmlFor="projectFilter" className="mb-1 block text-xs uppercase">
                Project Filter
              </Label>
              <NativeSelect
                id="projectFilter"
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.code}>
                    {project.name} ({project.code})
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="md:col-span-4">
              <Label htmlFor="searchTasks" className="mb-1 block text-xs uppercase">
                Search Tasks
              </Label>
              <Input
                id="searchTasks"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Filter by title, description, assignee..."
              />
            </div>

            <div className="md:col-span-3">
              <Label htmlFor="githubRepo" className="mb-1 block text-xs uppercase">
                GitHub Repository
              </Label>
              <Input
                id="githubRepo"
                value={githubRepo}
                onChange={(event) => setGithubRepo(event.target.value)}
                placeholder="owner/repo"
              />
            </div>

            <div className="flex items-end md:col-span-2">
              <Button
                type="button"
                className="w-full"
                disabled={busy}
                onClick={() => void handleSyncGitHub()}
              >
                {busy ? "Syncing..." : "Sync GitHub"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Operation Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {notice && !errorMessage && (
        <Alert>
          <AlertTitle>Status</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider">
              New Project (project.project)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => void handleCreateProject(event)}
              className="flex flex-wrap gap-2"
            >
              <Input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="Project name"
                className="min-w-44 flex-1"
                required
              />
              <Input
                value={newProjectRepo}
                onChange={(event) => setNewProjectRepo(event.target.value)}
                placeholder="owner/repo (optional)"
                className="min-w-44 flex-1"
              />
              <Button type="submit" disabled={busy}>
                Create Project
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider">
              New Task (project.task)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => void handleCreateTask(event)}
              className="flex flex-wrap gap-2"
            >
              <NativeSelect
                aria-label="Task project"
                value={newTaskProject}
                onChange={(event) => setNewTaskProject(event.target.value)}
                className="w-44"
                required
              >
                {projects.length === 0 ? (
                  <option value="">Create project first</option>
                ) : (
                  projects.map((project) => (
                    <option key={project.id} value={project.code}>
                      {project.name}
                    </option>
                  ))
                )}
              </NativeSelect>
              <Input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Task title"
                className="min-w-44 flex-1"
                required
              />
              <NativeSelect
                aria-label="Task priority"
                value={newTaskPriority}
                onChange={(event) => setNewTaskPriority(event.target.value as ProjectTaskPriority)}
                className="w-28"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                aria-label="Task stage"
                value={newTaskStage}
                onChange={(event) => setNewTaskStage(event.target.value as ProjectTaskStatus)}
                className="w-32"
              >
                {STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" disabled={busy || projects.length === 0}>
                Add Task
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <section
        aria-label="Kanban Board"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
      >
        {STAGES.map((stage) => {
          const columnTasks = tasks.filter((task) => task.task_status === stage.id);
          return (
            <section
              key={stage.id}
              data-skin={skin}
              className={cn(
                kanbanColumnVariants({ skin, compact: density === "compact" }),
                "flex min-h-96 min-w-0 flex-col gap-3 border-t-4 p-3",
              )}
              style={{ borderTopColor: stage.colorVar }}
            >
              <header className="flex items-center justify-between gap-2">
                <h2
                  className="font-mono text-xs font-bold tracking-widest uppercase"
                  style={{ color: stage.colorVar }}
                >
                  {stage.label}
                </h2>
                <StatusBadge status={String(columnTasks.length)} />
              </header>

              <div className="flex flex-1 flex-col gap-2.5">
                {columnTasks.map((task) => {
                  const project = projectByCode.get(task.project_code);
                  return (
                    <Card key={task.id} className="shadow-sm">
                      <CardContent className="flex flex-col gap-2.5 p-3">
                        <div className="text-sm font-semibold leading-snug">{task.title}</div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={priorityBadgeVariant(task.priority)}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline">{project?.name ?? task.project_code}</Badge>
                          {task.assignee && <Badge variant="secondary">@{task.assignee}</Badge>}
                          {task.github_url && (
                            <a
                              href={task.github_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--primary)] underline-offset-2 hover:underline"
                            >
                              GH #{task.github_issue_number}
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <NativeSelect
                            aria-label={`Move ${task.title}`}
                            value={task.task_status}
                            onChange={(event) =>
                              void handleMoveStage(task, event.target.value as ProjectTaskStatus)
                            }
                            className="h-8 flex-1 text-xs"
                          >
                            {STAGES.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </NativeSelect>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDeleteTask(task.id)}
                          >
                            Del
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {columnTasks.length === 0 && (
                  <p className="py-6 text-center text-xs text-[var(--muted-foreground)]">
                    No tasks in {stage.label.toLowerCase()}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </section>
    </div>
  );
}
