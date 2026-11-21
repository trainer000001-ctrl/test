import { readFile } from "node:fs/promises";

const commandFiles = [
  "src-tauri/src/commands/agent_execution.rs",
  "src-tauri/src/commands/cloud_backup.rs",
  "src-tauri/src/commands/continuity.rs",
  "src-tauri/src/commands/dev_control.rs",
  "src-tauri/src/commands/issues.rs",
  "src-tauri/src/commands/milestones.rs",
  "src-tauri/src/commands/monitor.rs",
  "src-tauri/src/commands/orchestration.rs",
  "src-tauri/src/commands/pen_and_companion.rs",
  "src-tauri/src/commands/projects.rs",
  "src-tauri/src/commands/repositories.rs",
  "src-tauri/src/commands/s3_gateway.rs",
  "src-tauri/src/commands/system.rs",
];
const rustModels = [
  { rustName: "S3GatewayStatus", contractName: "S3GatewayStatus" },
  { rustName: "CloudBackupStatus", contractName: "CloudBackupStatus" },
  { rustName: "Issue", contractName: "Issue", frontendOnlyFields: ["closed_at"] },
  { rustName: "Project", contractName: "Project" },
  { rustName: "Repository", contractName: "Repository" },
  { rustName: "Event", contractName: "ActivityEvent" },
  { rustName: "DashboardStats", contractName: "DashboardStats" },
  { rustName: "Dashboard", contractName: "Dashboard" },
  { rustName: "GitSnapshot", contractName: "GitSnapshot" },
  { rustName: "Milestone", contractName: "Milestone" },
  { rustName: "DiskVolumeStatus", contractName: "DiskVolumeStatus" },
  { rustName: "EcosystemServiceStatus", contractName: "EcosystemServiceStatus" },
  { rustName: "DevServiceEntry", contractName: "DevServiceEntry" },
  { rustName: "AgentSessionActivity", contractName: "AgentSessionActivity" },
  { rustName: "RepoMonitorEntry", contractName: "RepoMonitorEntry" },
  { rustName: "PlanTrackerEntry", contractName: "PlanTrackerEntry" },
  { rustName: "MonitorSnapshot", contractName: "MonitorSnapshot" },
  { rustName: "MidLoopbackCallback", contractName: "MidLoopbackCallback" },
  { rustName: "EdgeOrmSyncStatus", contractName: "EdgeOrmSyncStatus" },
];
const [contracts, continuityContracts, registration, models, ...sources] = await Promise.all([
  readFile("src/lib/contracts.d.ts", "utf8"),
  readFile("../../packages/contracts/src/continuity/index.ts", "utf8").catch(() => ""),
  readFile("src-tauri/src/lib.rs", "utf8"),
  readFile("src-tauri/src/models.rs", "utf8"),
  ...commandFiles.map(file => readFile(file, "utf8")),
]);
const source = sources.join("\n");
const commandContractBlock = contracts.split("export interface NativeCommands {")[1]?.split("\n}")[0] ?? "";
const declaredCommands = new Set(
  [...commandContractBlock.matchAll(/^\s{2}([a-z][a-z0-9_]*): \{/gm)].map((match) => match[1]),
);
const registeredCommands = new Set(
  [...registration.matchAll(/commands::[a-z][a-z0-9_]*::([a-z][a-z0-9_]*)/g)].map((match) => match[1]),
);
const implementedCommands = new Set(
  [...source.matchAll(/#\[tauri::command\](?:[\s\S]*?)pub (?:async )?fn ([a-z][a-z0-9_]*)/g)].map((match) => match[1]),
);
const violations = [];

for (const command of declaredCommands) {
  if (!registeredCommands.has(command)) violations.push(`Contract command is not registered: ${command}`);
  if (!implementedCommands.has(command)) violations.push(`Contract command is not implemented: ${command}`);
}
for (const command of registeredCommands) {
  if (!declaredCommands.has(command)) violations.push(`Registered command lacks a frontend contract: ${command}`);
}
for (const command of implementedCommands) {
  if (!registeredCommands.has(command)) violations.push(`Implemented command is not registered: ${command}`);
}

const nativeCommandSources = [registration, ...sources];
const commandArgs = {
  await_mid_loopback_callback: ["authorize_url"],
  get_dashboard: [],
  list_events: [],
  get_monitor_snapshot: [],
  open_ecosystem_url: ["url"],
  get_dev_services_status: [],
  start_dev_service: ["target"],
  stop_dev_service: ["target"],
  list_issues: [],
  list_repositories: [],
  list_projects: [],
  list_milestones: [],
  create_issue: ["title", "description", "priority", "project_id", "repository_id"],
  update_issue: ["issue_id", "title", "description", "priority", "project_id", "repository_id"],
  delete_issue: ["issue_id"],
  set_issue_status: ["issue_id", "status"],
  create_project: ["name", "description"],
  update_project: ["project_id", "name", "description", "status"],
  delete_project: ["project_id"],
  sync_edge_orm: [],
  create_milestone: ["project_id", "title", "description", "due_at"],
  update_milestone: ["milestone_id", "title", "description", "due_at"],
  delete_milestone: ["milestone_id"],
  set_milestone_status: ["milestone_id", "status"],
  add_repository: ["path"],
  git_snapshot: ["repository_id", "view"],
  git_execute: ["repository_id", "operation", "branch", "message"],
  cloud_backup_status: [],
  connect_google_drive: [],
  disconnect_google_drive: [],
  backup_to_google_drive: [],
  restore_from_google_drive: [],
  s3_gateway_status: [],
  start_s3_gateway: [],
  stop_s3_gateway: [],
  capture_memory: ["title", "content", "category", "source_ref", "project_id"],
  create_memory: ["category", "title", "content", "source_type", "source_ref", "confidence", "retention", "project_id", "repository_id", "issue_id"],
  search_memories: ["query", "category"],
  update_memory: ["memory_id", "title", "content", "category", "status", "retention", "source_ref"],
  delete_memory: ["memory_id"],
  create_work_session: ["name", "project_id", "repository_id", "issue_id", "context_json"],
  list_work_sessions: [],
  close_work_session: ["session_id"],
  create_resume_point: ["work_session_id", "title", "summary", "context_json"],
  list_resume_points: [],
  create_experience: ["title", "summary", "evidence_json", "task_id", "run_id", "artifact_id"],
  create_lesson: ["experience_id", "proposal"],
  resolve_lesson: ["lesson_id", "status"],
  list_soul_journal: [],
  discover_local_providers: [],
  start_supervised_agent_run: ["agent_id", "repository_id", "worktree_path", "prompt"],
  cancel_supervised_agent_run: ["run_id"],
  get_agent_execution_steps: ["run_id"],
  evaluate_agent_worktree_evidence: ["worktree_path"],
  create_orchestration_plan: ["objective", "mode", "concurrency_limit", "budget_seconds"],
  add_orchestration_tasks: ["plan_id", "tasks_json"],
  get_orchestration_tasks: ["plan_id"],
  update_orchestration_plan_status: ["plan_id", "status"],
  step_orchestration_cycle: ["plan_id"],
  save_studio_draft: ["draft_id", "title", "content", "kind", "project_id"],
  list_studio_drafts: ["project_id"],
  record_research_claim: ["question", "claim", "source_citation", "confidence"],
  list_research_claims: [],
  get_companion_profile: [],
  update_companion_state: ["companion_state"],
};
const argumentInterfaces = new Map();
for (const [, name, body] of `${contracts}\n${continuityContracts}`.matchAll(
  /export interface ([A-Za-z][A-Za-z0-9]*) \{([\s\S]*?)\r?\n\}/g,
)) {
  argumentInterfaces.set(name, [...body.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*)\??:/gm)].map(([, field]) => field));
}
for (const command of declaredCommands) {
  const commandContractLine = commandContractBlock.split("\n")
    .find(line => new RegExp(`^  ${command}:`).test(line)) ?? "";
  const commandLines = commandContractBlock.split("\n");
  const commandLineIndex = commandLines.indexOf(commandContractLine);
  const multilineArgumentLine = /^\s{4}args:/.test(commandLines[commandLineIndex + 1] ?? "")
    ? commandLines[commandLineIndex + 1]
    : undefined;
  const commandArgumentLine = multilineArgumentLine ?? commandContractLine;
  const inlineArguments = commandArgumentLine.split("args:")[1]?.split(";")[0]?.trim() ?? "";
  const referencedType = (commandContractLine.split("args:")[1]?.split(";")[0] ?? "").trim();
  const tsArgs = argumentInterfaces.get(referencedType)
    ?? [...inlineArguments.matchAll(/([A-Za-z][A-Za-z0-9]*)\??:/g)].map(([, argument]) => argument);
  if (!argumentInterfaces.has(referencedType) && commandArgumentLine.includes("args: {")) {
    const inlineObjectArguments = commandArgumentLine
      .split("args: {")[1]
      ?.split("};")[0] ?? "";
    tsArgs.splice(0, tsArgs.length, ...[...inlineObjectArguments.matchAll(/([A-Za-z][A-Za-z0-9]*)\??:/g)]
      .map(([, argument]) => argument));
  }
  const rustExpectedTsArgs = commandArgs[command]?.map(argument =>
    argument.replace(/_([a-z])/g, (_, character) => character.toUpperCase()));
  if (!rustExpectedTsArgs || JSON.stringify(tsArgs) !== JSON.stringify(rustExpectedTsArgs)) {
    violations.push(`${command} TypeScript argument contract differs: [${tsArgs.join(", ")}], expected [${rustExpectedTsArgs?.join(", ")}]`);
  }
}
for (const command of declaredCommands) {
  const commandPattern = new RegExp(`#\\[tauri::command\\]\\s*pub (?:async )?fn ${command}\\(`);
  const commandSource = nativeCommandSources.find(candidate => commandPattern.test(candidate));
  const functionDeclaration = commandSource
    ? new RegExp(`pub (?:async )?fn ${command}\\(`).exec(commandSource)
    : undefined;
  const signatureStart = functionDeclaration?.index;
  let signature;
  if (commandSource && signatureStart !== undefined) {
    const openingParen = commandSource.indexOf("(", signatureStart);
    let nestingDepth = 0;
    for (let cursor = openingParen; cursor < commandSource.length; cursor += 1) {
      if (commandSource[cursor] === "(") nestingDepth += 1;
      if (commandSource[cursor] === ")") nestingDepth -= 1;
      if (nestingDepth === 0) {
        signature = commandSource.slice(openingParen + 1, cursor);
        break;
      }
    }
  }
  if (!signature) continue;
  const rustArgs = signature
    .split(",")
    .map(argument => /^\s*([a-z_]+)\s*:/.exec(argument)?.[1])
    .filter(argument => argument && !["app", "state"].includes(argument));
  const expectedArgs = commandArgs[command];
  if (!expectedArgs) {
    violations.push(`Command argument policy is missing: ${command}`);
    continue;
  }
  if (JSON.stringify(rustArgs) !== JSON.stringify(expectedArgs)) {
    violations.push(`${command} argument contract differs: Rust [${rustArgs.join(", ")}], policy [${expectedArgs.join(", ")}]`);
  }
}

for (const { rustName, contractName, frontendOnlyFields = [] } of rustModels) {
  const rustModel = new RegExp(`pub struct ${rustName} \\{([\\s\\S]*?)\\r?\\n\\}`, "m").exec(models)?.[1];
  const frontendModel = new RegExp(`export interface ${contractName} \\{([\\s\\S]*?)\\r?\\n\\}`, "m").exec(contracts)?.[1];
  if (!rustModel || !frontendModel) {
    violations.push(`Missing shared model declaration: ${rustName}`);
    continue;
  }
  const rustFields = [...rustModel.matchAll(/pub ([a-z_]+): ([^,\n]+),/g)]
    .map(([, field, type]) => `${field}:${String(type).trim()}`).sort();
  const frontendFields = [...frontendModel.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9_]*): ([^;\n]+);/gm)]
    .map(([, field, type]) => `${field}:${String(type).trim()}`)
    .sort();
  const sharedFrontendFields = frontendFields
    .filter(field => !frontendOnlyFields.some(extra => field.startsWith(`${extra}:`)));
  const rustClosedAt = /closed_at:\s*Option<String>/.test(
    new RegExp(`pub struct ${rustName} \\{([\\s\\S]*?)\\r?\\n\\}`, "m").exec(models)?.[1] ?? "",
  );
  const frontendClosedAt = frontendFields.some(field => field.startsWith("closed_at:"));
  if (rustClosedAt !== frontendClosedAt) {
    violations.push(`${contractName}.closed_at optionality differs between Rust and TypeScript`);
  }
  if (rustName === "Issue" && sharedFrontendFields.some(field => field.startsWith("closed_at:"))) {
    violations.push("Issue.closed_at is frontend-derived and must not be added to the Rust IPC response");
  }
  for (const field of rustFields) {
    const [fieldName, rustType] = field.split(":");
    const frontendField = sharedFrontendFields.find(candidate =>
      candidate.startsWith(`${fieldName}:`))
      ?? sharedFrontendFields.find(candidate =>
        candidate.startsWith(`${fieldName.replace(/_([a-z])/g, (_, character) => character.toUpperCase())}:`));
    if (!frontendField) {
      violations.push(`${contractName}.${fieldName} is missing from frontend contract`);
      continue;
    }
    const frontendType = frontendField.slice(frontendField.indexOf(":") + 1);
    if (rustType.includes("Option<") !== frontendType.includes("null")) {
      violations.push(`${contractName}.${fieldName} optionality differs between Rust and TypeScript`);
    }
    if (rustType.startsWith("Vec<") !== frontendType.endsWith("[]")) {
      violations.push(`${contractName}.${fieldName} collection shape differs between Rust and TypeScript`);
    }
  }
  for (const field of sharedFrontendFields) {
    const fieldName = field.slice(0, field.indexOf(":"));
    const rustFieldName = fieldName.includes("_")
      ? fieldName
      : fieldName.replace(/[A-Z]/g, character => `_${character.toLowerCase()}`);
    if (!rustFields.some(candidate => candidate.startsWith(`${rustFieldName}:`))) {
      violations.push(`${contractName}.${fieldName} is missing from Rust model`);
    }
  }
}

if (violations.length) {
  throw new Error(`Native command contract parity failed:\n${violations.map(value => `- ${value}`).join("\n")}`);
}

console.log(`Native command contracts passed (${declaredCommands.size} commands).`);
