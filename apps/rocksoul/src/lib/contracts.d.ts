import type {
  CaptureMemoryArgs,
  ContinuityMemoryRecord,
  ContinuitySyncBundle,
  CreateExperienceArgs,
  CreateMemoryArgs,
  CreateResumePointArgs,
  CreateWorkSessionArgs,
  ExperienceRecord,
  LessonRecord,
  MemoryCategory,
  MemoryStatus,
  ResumePointRecord,
  SoulJournalEntry,
  UpdateMemoryArgs,
  WorkSessionRecord,
} from "@moonwitness/contracts/continuity";

export type {
  CaptureMemoryArgs,
  ContinuityMemoryRecord,
  ContinuityMemoryRecord as MemoryRecord,
  ContinuitySyncBundle,
  CreateExperienceArgs,
  CreateMemoryArgs,
  CreateResumePointArgs,
  CreateWorkSessionArgs,
  ExperienceRecord,
  LessonRecord,
  MemoryCategory,
  MemoryStatus,
  ResumePointRecord,
  SoulJournalEntry,
  UpdateMemoryArgs,
  WorkSessionRecord,
};

export type IssueStatus = "open" | "blocked" | "done" | "closed";
export type IssuePriority = "P0" | "P1" | "P2" | "P3";
export type ProjectStatus = "active" | "paused" | "done" | "archived";
export type MilestoneStatus = "planned" | "in_progress" | "done" | "blocked";
export type GitView = "status" | "log" | "diff" | "patch" | "branches";
export type GitOperation =
  | "create_branch"
  | "switch_branch"
  | "commit"
  | "merge"
  | "rebase"
  | "abort_merge"
  | "abort_rebase"
  | "stash"
  | "stash_pop"
  | "fetch"
  | "pull"
  | "push";

export interface Issue {
  id: string;
  issue_key: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  assignee: string;
  repository_id: string | null;
  repository_name: string | null;
  updated_at: string;
  closed_at?: string | null | undefined;
  project_id: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
}

export interface Repository {
  id: string;
  name: string;
  path: string;
  remote_url: string;
  default_branch: string;
  branch: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  description: string;
  due_at: string | null;
  status: MilestoneStatus;
}

export interface ActivityEvent {
  id: string;
  kind: string;
  message: string;
  created_at: string;
}

export interface Dashboard {
  stats: DashboardStats;
  issues: Issue[];
  repositories: Repository[];
  events: ActivityEvent[];
}

export interface DashboardStats {
  active: number;
  blocked: number;
  completed: number;
}

export interface GitSnapshot {
  name: string;
  branch: string;
  view: GitView | string;
  output: string;
}

export interface CloudBackupStatus {
  available: boolean;
  connected: boolean;
  account: string | null;
  lastBackupAt: string | null;
  error: string | null;
}

export interface S3GatewayStatus {
  running: boolean;
  endpoint: string | null;
  bucket: string;
  access_key: string | null;
  secret_key: string | null;
}

export interface DiskVolumeStatus {
  drive: string;
  mount_path: string;
  available: boolean;
  total_gb: number;
  free_gb: number;
  used_pct: number;
  tier: string;
}

export interface EcosystemServiceStatus {
  id: string;
  name: string;
  url: string;
  status: string;
  http_status: number | null;
  latency_ms: number | null;
}

export interface DevServiceEntry {
  id: string;
  name: string;
  port: number;
  managed: boolean;
  listening: boolean;
  pid: number | null;
  recent_logs: string[];
  last_error: string | null;
}

export interface AgentSessionActivity {
  session_id: string;
  updated_at: string;
  step_count: number;
  last_type: string;
  last_status: string;
  last_tool: string;
}

export interface RepoMonitorEntry {
  id: string;
  name: string;
  path: string;
  branch: string;
  head_hash: string;
  head_subject: string;
  head_age: string;
  dirty_count: number;
  staged_count: number;
  untracked_count: number;
  worktree_count: number;
  changed_files: string[];
  recent_commits: string[];
}

export interface PlanTrackerEntry {
  name: string;
  path: string;
  total_tasks: number;
  completed_tasks: number;
  partial_tasks: number;
}

export interface MonitorSnapshot {
  generated_at: string;
  disks: DiskVolumeStatus[];
  services: EcosystemServiceStatus[];
  agent_sessions: AgentSessionActivity[];
  repositories: RepoMonitorEntry[];
  plans: PlanTrackerEntry[];
}

export interface MidLoopbackCallback {
  code: string;
  state: string;
  redirect_uri: string;
}

export interface EdgeOrmSyncStatus {
  connected: boolean;
  edge_url: string;
  cursor: string | null;
  projects_synced: number;
  tasks_synced: number;
  outbox_pushed: number;
  last_synced_at: string | null;
  error: string | null;
}

export type DevServiceTarget = "web" | "api" | "all";

export interface CreateIssueArgs {
  title: string;
  description?: string | undefined;
  priority?: IssuePriority | undefined;
  projectId?: string | null | undefined;
  repositoryId?: string | null | undefined;
}

export interface UpdateIssueArgs {
  issueId: string;
  title: string;
  description: string;
  priority: IssuePriority;
  projectId?: string | null | undefined;
  repositoryId?: string | null | undefined;
}

export interface CreateProjectArgs {
  name: string;
  description?: string | undefined;
}

export interface UpdateProjectArgs {
  projectId: string;
  name: string;
  description: string;
  status: ProjectStatus;
}

export interface CreateMilestoneArgs {
  projectId: string;
  title: string;
  description?: string | undefined;
  dueAt?: string | null | undefined;
}

export interface UpdateMilestoneArgs {
  milestoneId: string;
  title: string;
  description: string;
  dueAt?: string | null | undefined;
}

export interface GitExecuteArgs {
  repositoryId: string;
  operation: GitOperation;
  branch?: string | undefined;
  message?: string | undefined;
}

export interface SaveStudioDraftArgs {
  draftId?: string;
  title: string;
  content: string;
  kind: string;
  projectId?: string;
}

export interface RecordResearchClaimArgs {
  question: string;
  claim: string;
  sourceCitation: string;
  confidence: string;
}

export interface CreateOrchestrationPlanArgs {
  objective: string;
  mode: string;
  concurrencyLimit: number;
  budgetSeconds: number;
}

export interface AddOrchestrationTasksArgs {
  planId: string;
  tasksJson: string;
}

export interface UpdateOrchestrationPlanStatusArgs {
  planId: string;
  status: string;
}

export interface StartSupervisedAgentRunArgs {
  agentId: string;
  repositoryId: string;
  worktreePath: string;
  prompt: string;
}

export interface NativeCommands {
  await_mid_loopback_callback: { args: { authorizeUrl: string }; result: MidLoopbackCallback };
  get_dashboard: { args: Record<string, never>; result: Dashboard };
  list_events: { args: Record<string, never>; result: ActivityEvent[] };
  get_monitor_snapshot: { args: Record<string, never>; result: MonitorSnapshot };
  open_ecosystem_url: { args: { url: string }; result: void };
  get_dev_services_status: { args: Record<string, never>; result: DevServiceEntry[] };
  start_dev_service: { args: { target: string }; result: DevServiceEntry[] };
  stop_dev_service: { args: { target: string }; result: DevServiceEntry[] };
  list_issues: { args: Record<string, never>; result: Issue[] };
  list_repositories: { args: Record<string, never>; result: Repository[] };
  list_projects: { args: Record<string, never>; result: Project[] };
  list_milestones: { args: Record<string, never>; result: Milestone[] };
  create_issue: { args: CreateIssueArgs; result: Issue };
  update_issue: { args: UpdateIssueArgs; result: void };
  delete_issue: { args: { issueId: string }; result: void };
  set_issue_status: { args: { issueId: string; status: IssueStatus }; result: void };
  create_project: { args: CreateProjectArgs; result: Project };
  update_project: { args: UpdateProjectArgs; result: void };
  delete_project: { args: { projectId: string }; result: void };
  sync_edge_orm: { args: Record<string, never>; result: EdgeOrmSyncStatus };
  create_milestone: { args: CreateMilestoneArgs; result: Milestone };
  update_milestone: { args: UpdateMilestoneArgs; result: void };
  delete_milestone: { args: { milestoneId: string }; result: void };
  set_milestone_status: {
    args: { milestoneId: string; status: MilestoneStatus };
    result: void;
  };
  add_repository: { args: { path: string }; result: Repository };
  git_snapshot: {
    args: { repositoryId: string; view?: GitView };
    result: GitSnapshot;
  };
  git_execute: { args: GitExecuteArgs; result: GitSnapshot };
  cloud_backup_status: { args: Record<string, never>; result: CloudBackupStatus };
  connect_google_drive: { args: Record<string, never>; result: CloudBackupStatus };
  disconnect_google_drive: { args: Record<string, never>; result: CloudBackupStatus };
  backup_to_google_drive: { args: Record<string, never>; result: CloudBackupStatus };
  restore_from_google_drive: { args: Record<string, never>; result: CloudBackupStatus };
  s3_gateway_status: { args: Record<string, never>; result: S3GatewayStatus };
  start_s3_gateway: { args: Record<string, never>; result: S3GatewayStatus };
  stop_s3_gateway: { args: Record<string, never>; result: S3GatewayStatus };
  capture_memory: { args: CaptureMemoryArgs; result: MemoryRecord };
  create_memory: { args: CreateMemoryArgs; result: MemoryRecord };
  search_memories: {
    args: { query?: string; category?: MemoryCategory };
    result: MemoryRecord[];
  };
  update_memory: { args: UpdateMemoryArgs; result: MemoryRecord };
  delete_memory: { args: { memoryId: string }; result: void };
  create_work_session: { args: CreateWorkSessionArgs; result: WorkSessionRecord };
  list_work_sessions: { args: Record<string, never>; result: WorkSessionRecord[] };
  close_work_session: { args: { sessionId: string }; result: void };
  create_resume_point: { args: CreateResumePointArgs; result: ResumePointRecord };
  list_resume_points: { args: Record<string, never>; result: ResumePointRecord[] };
  create_experience: { args: CreateExperienceArgs; result: ExperienceRecord };
  create_lesson: {
    args: { experienceId?: string | null; proposal: string };
    result: LessonRecord;
  };
  resolve_lesson: {
    args: { lessonId: string; status: "accepted" | "rejected" };
    result: LessonRecord;
  };
  list_soul_journal: { args: Record<string, never>; result: SoulJournalEntry[] };
  discover_local_providers: { args: Record<string, never>; result: string[] };
  start_supervised_agent_run: { args: StartSupervisedAgentRunArgs; result: AgentSupervisorStatus };
  cancel_supervised_agent_run: {
    args: { runId: string };
    result: AgentSupervisorStatus;
  };
  get_agent_execution_steps: {
    args: { runId: string };
    result: AgentExecutionStep[];
  };
  evaluate_agent_worktree_evidence: {
    args: { worktreePath: string };
    result: AgentRunExecutionResult;
  };
  create_orchestration_plan: { args: CreateOrchestrationPlanArgs; result: OrchestrationPlanRecord };
  add_orchestration_tasks: { args: AddOrchestrationTasksArgs; result: OrchestrationTaskRecord[] };
  get_orchestration_tasks: { args: { planId: string }; result: OrchestrationTaskRecord[] };
  update_orchestration_plan_status: { args: UpdateOrchestrationPlanStatusArgs; result: OrchestrationPlanRecord };
  step_orchestration_cycle: { args: { planId: string }; result: OrchestrationTaskRecord[] };
  save_studio_draft: { args: SaveStudioDraftArgs; result: StudioDraftRecord };
  list_studio_drafts: { args: { projectId?: string }; result: StudioDraftRecord[] };
  record_research_claim: { args: RecordResearchClaimArgs; result: ResearchClaimRecord };
  list_research_claims: { args: Record<string, never>; result: ResearchClaimRecord[] };
  get_companion_profile: { args: Record<string, never>; result: CompanionProfileRecord };
  update_companion_state: { args: { companionState: string }; result: CompanionProfileRecord };
}

export type NativeCommand = keyof NativeCommands;
export type CommandArguments<Command extends NativeCommand> =
  NativeCommands[Command]["args"];
export type CommandResult<Command extends NativeCommand> =
  NativeCommands[Command]["result"];

export type RocksoulDomain =
  | "threshold"
  | "archive"
  | "studio"
  | "riot_deck"
  | "signal_room";

export type RocksoulPolicyMode = "assisted" | "supervised" | "autonomous";
export type RocksoulRisk = "read_only" | "local_write" | "external" | "destructive" | "irreversible";

export type RocksoulToolAction =
  | "read_repository"
  | "read_selected_path"
  | "create_worktree"
  | "write_worktree"
  | "run_declared_check"
  | "read_credential"
  | "commit_isolated_branch"
  | "push_owner_branch"
  | "merge_owner_branch"
  | "delete_data"
  | "request_network"
  | "export_artifact";

export type RocksoulApprovalStatus =
  | "pending"
  | "granted"
  | "denied"
  | "expired"
  | "revoked";

export interface RocksoulEventEnvelope {
  eventId: string;
  objectiveId: string | null;
  planId: string | null;
  runId: string | null;
  stepId: string | null;
  artifactId: string | null;
  domain: RocksoulDomain;
  kind: string;
  timestamp: string;
  actor: string;
  reason: string;
  provenance: string;
}

export interface RocksoulProviderSpec {
  providerId: string;
  version: string;
  executable: string;
  argvTemplate: string[];
  cwdScope: string;
  networkAllowed: boolean;
  timeoutMs: number;
  maxOutputBytes: number;
}

export interface RocksoulToolRequest {
  action: RocksoulToolAction;
  target: string;
  arguments: Record<string, unknown>;
  risk: RocksoulRisk;
  runId: string | null;
}

export interface RocksoulApproval {
  approvalId: string;
  action: RocksoulToolAction;
  target: string;
  arguments: Record<string, unknown>;
  risk: RocksoulRisk;
  runId: string;
  status: RocksoulApprovalStatus;
  expiresAt: string;
}

export interface AgentExecutionStep {
  id: string;
  runId: string;
  stepIndex: number;
  kind: string;
  summary: string;
  status: string;
  payloadJson: string;
  outputText: string;
  errorText: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSupervisorStatus {
  runId: string;
  pid?: number | null;
  status: string;
  worktreePath: string;
  timeoutSeconds: number;
  heartbeatAt: string;
  startedAt: string;
  endedAt?: string | null;
}

export interface AgentRunExecutionResult {
  runId: string;
  status: string;
  exitCode?: number | null;
  summary: string;
  changedFiles: string[];
  diffStat: string;
}

export interface OrchestrationPlanRecord {
  id: string;
  objective: string;
  mode: string;
  status: string;
  concurrencyLimit: number;
  budgetSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestrationTaskRecord {
  id: string;
  planId: string;
  taskIndex: number;
  title: string;
  specialistRole: string;
  dependsOnTaskId?: string | null;
  agentRunId?: string | null;
  worktreePath: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudioDraftRecord {
  id: string;
  title: string;
  content: string;
  kind: string;
  version: number;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchClaimRecord {
  id: string;
  question: string;
  claim: string;
  sourceCitation: string;
  confidence: string;
  createdAt: string;
}

export interface CompanionProfileRecord {
  id: string;
  name: string;
  personality: string;
  state: string;
  dailyBriefing: string;
  eveningRecap: string;
  updatedAt: string;
}



