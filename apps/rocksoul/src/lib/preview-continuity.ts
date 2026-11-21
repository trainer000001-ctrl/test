import type {
  ExperienceRecord,
  LessonRecord,
  MemoryCategory,
  MemoryRecord,
  MemoryStatus,
  NativeCommand,
  ResumePointRecord,
  SoulJournalEntry,
  WorkSessionRecord,
} from "./contracts";
import {
  isJsonObject,
  readPreview,
  timestamp,
  writePreview,
  type PreviewCommandOutcome,
} from "./preview-storage";

interface StudioDraftPreview {
  id: string;
  title: string;
  content: string;
  kind: string;
  version: number;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ResearchClaimPreview {
  id: string;
  question: string;
  claim: string;
  sourceCitation: string;
  confidence: string;
  createdAt: string;
}

export function handlePreviewContinuityCommand(
  command: NativeCommand,
  payload: Record<string, unknown>,
): PreviewCommandOutcome {
  const stringArg = (key: string): string | undefined => payload[key] as string | undefined;
  const memories = readPreview<MemoryRecord[]>("memories", []);
  const workSessions = readPreview<WorkSessionRecord[]>("work_sessions", []);
  const resumePoints = readPreview<ResumePointRecord[]>("resume_points", []);
  const experiences = readPreview<ExperienceRecord[]>("experiences", []);
  const lessons = readPreview<LessonRecord[]>("lessons", []);

  if (command === "capture_memory" || command === "create_memory") {
    const category = (stringArg("category") || "working") as MemoryCategory;
    if (!["working", "project", "episodic", "semantic", "procedural", "preference"].includes(category)) {
      throw new Error("Unsupported memory category.");
    }
    const title = (stringArg("title") || "").trim();
    const content = (stringArg("content") || "").trim();
    if (!title || !content) throw new Error("Memory title and content cannot be empty.");
    const memory: MemoryRecord = {
      id: crypto.randomUUID(),
      category,
      title,
      content,
      sourceType: stringArg("sourceType") || "owner",
      sourceRef: stringArg("sourceRef") || "",
      confidence: stringArg("confidence") || "owner",
      status: "active",
      retention: stringArg("retention") || "keep",
      projectId: (payload["projectId"] as string | null) || null,
      repositoryId: (payload["repositoryId"] as string | null) || null,
      issueId: (payload["issueId"] as string | null) || null,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
    writePreview("memories", [memory, ...memories]);
    return { handled: true, value: memory };
  }

  if (command === "search_memories") {
    const query = (stringArg("query") || "").trim().toLowerCase();
    const category = stringArg("category") as MemoryCategory | undefined;
    const filtered = memories.filter(
      (memory) =>
        memory.status !== "deleted" &&
        (!category || memory.category === category) &&
        (!query || `${memory.title} ${memory.content} ${memory.sourceRef}`.toLowerCase().includes(query)),
    );
    return { handled: true, value: filtered };
  }

  if (command === "update_memory") {
    const memoryId = stringArg("memoryId");
    const selected = memories.find((memory) => memory.id === memoryId);
    if (!selected) throw new Error("Memory not found.");
    const category = stringArg("category") as MemoryCategory;
    const status = stringArg("status") as MemoryStatus;
    if (!["working", "project", "episodic", "semantic", "procedural", "preference"].includes(category)) {
      throw new Error("Unsupported memory category.");
    }
    if (!["active", "corrected", "archived", "deleted"].includes(status)) {
      throw new Error("Unsupported memory status.");
    }
    const title = (stringArg("title") || "").trim();
    const content = (stringArg("content") || "").trim();
    if (!title || !content) throw new Error("Memory title and content cannot be empty.");
    const updated: MemoryRecord = {
      ...selected,
      title,
      content,
      category,
      status,
      retention: stringArg("retention") || selected.retention,
      sourceRef: stringArg("sourceRef") || "",
      updatedAt: timestamp(),
    };
    writePreview(
      "memories",
      memories.map((memory) => (memory.id === memoryId ? updated : memory)),
    );
    return { handled: true, value: updated };
  }

  if (command === "delete_memory") {
    const memoryId = stringArg("memoryId");
    if (!memories.some((memory) => memory.id === memoryId)) throw new Error("Memory not found.");
    writePreview(
      "memories",
      memories.map((memory) =>
        memory.id === memoryId ? { ...memory, status: "deleted", updatedAt: timestamp() } : memory,
      ),
    );
    return { handled: true, value: undefined };
  }

  if (command === "create_work_session") {
    const name = (stringArg("name") || "").trim();
    if (!name) throw new Error("Work session name cannot be empty.");
    const context = stringArg("contextJson") || "{}";
    if (!isJsonObject(context)) throw new Error("Context JSON must be an object.");
    const session: WorkSessionRecord = {
      id: crypto.randomUUID(),
      name,
      status: "active",
      projectId: (payload["projectId"] as string | null) || null,
      repositoryId: (payload["repositoryId"] as string | null) || null,
      issueId: (payload["issueId"] as string | null) || null,
      contextJson: context,
      createdAt: timestamp(),
      updatedAt: timestamp(),
      closedAt: null,
    };
    writePreview("work_sessions", [session, ...workSessions]);
    return { handled: true, value: session };
  }

  if (command === "list_work_sessions") {
    return { handled: true, value: workSessions };
  }

  if (command === "close_work_session") {
    const sessionId = stringArg("sessionId");
    if (!workSessions.some((session) => session.id === sessionId)) {
      throw new Error("Work session not found.");
    }
    writePreview(
      "work_sessions",
      workSessions.map((session) =>
        session.id === sessionId
          ? { ...session, status: "closed", closedAt: timestamp(), updatedAt: timestamp() }
          : session,
      ),
    );
    return { handled: true, value: undefined };
  }

  if (command === "create_resume_point") {
    const workSessionId = stringArg("workSessionId");
    if (!workSessions.some((session) => session.id === workSessionId)) {
      throw new Error("Work session not found.");
    }
    const title = (stringArg("title") || "").trim();
    const summary = (stringArg("summary") || "").trim();
    if (!title || !summary) throw new Error("Resume point title and summary cannot be empty.");
    const context = stringArg("contextJson") || "{}";
    if (!isJsonObject(context)) throw new Error("Context JSON must be an object.");
    const point: ResumePointRecord = {
      id: crypto.randomUUID(),
      workSessionId: workSessionId || "",
      title,
      summary,
      contextJson: context,
      createdAt: timestamp(),
    };
    writePreview("resume_points", [point, ...resumePoints]);
    return { handled: true, value: point };
  }

  if (command === "list_resume_points") {
    return { handled: true, value: resumePoints };
  }

  if (command === "create_experience") {
    const title = (stringArg("title") || "").trim();
    const summary = (stringArg("summary") || "").trim();
    if (!title || !summary) throw new Error("Experience title and summary cannot be empty.");
    const evidence = stringArg("evidenceJson") || "{}";
    if (!isJsonObject(evidence)) throw new Error("Evidence JSON must be an object.");
    const experience: ExperienceRecord = {
      id: crypto.randomUUID(),
      title,
      summary,
      evidenceJson: evidence,
      taskId: (payload["taskId"] as string | null) || null,
      runId: (payload["runId"] as string | null) || null,
      artifactId: (payload["artifactId"] as string | null) || null,
      status: "observed",
      createdAt: timestamp(),
    };
    writePreview("experiences", [experience, ...experiences]);
    return { handled: true, value: experience };
  }

  if (command === "create_lesson") {
    const proposal = (stringArg("proposal") || "").trim();
    if (!proposal) throw new Error("Lesson proposal cannot be empty.");
    const experienceId = (payload["experienceId"] as string | null) || null;
    if (experienceId && !experiences.some((experience) => experience.id === experienceId)) {
      throw new Error("Experience not found.");
    }
    const lesson: LessonRecord = {
      id: crypto.randomUUID(),
      experienceId,
      proposal,
      status: "proposed",
      acceptedAt: null,
      createdAt: timestamp(),
    };
    writePreview("lessons", [lesson, ...lessons]);
    return { handled: true, value: lesson };
  }

  if (command === "resolve_lesson") {
    const lessonId = stringArg("lessonId");
    const status = stringArg("status");
    if (status !== "accepted" && status !== "rejected") {
      throw new Error("Lesson status must be accepted or rejected.");
    }
    const selected = lessons.find((lesson) => lesson.id === lessonId);
    if (!selected) throw new Error("Lesson not found.");
    const resolved: LessonRecord = {
      ...selected,
      status,
      acceptedAt: status === "accepted" ? timestamp() : null,
    };
    writePreview(
      "lessons",
      lessons.map((lesson) => (lesson.id === lessonId ? resolved : lesson)),
    );
    return { handled: true, value: resolved };
  }

  if (command === "list_soul_journal") {
    const entries: SoulJournalEntry[] = [
      ...experiences.map((experience) => ({
        id: experience.id,
        kind: "experience" as const,
        title: experience.title,
        summary: experience.summary,
        status: experience.status,
        evidenceJson: experience.evidenceJson,
        createdAt: experience.createdAt,
      })),
      ...lessons.map((lesson) => ({
        id: lesson.id,
        kind: "lesson" as const,
        title: "Lesson proposal",
        summary: lesson.proposal,
        status: lesson.status,
        evidenceJson: "{}",
        createdAt: lesson.createdAt,
      })),
    ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return { handled: true, value: entries };
  }

  if (command === "list_studio_drafts") {
    const projectFilter = stringArg("projectId");
    const drafts = readPreview<StudioDraftPreview[]>("studio_drafts", []);
    return {
      handled: true,
      value: projectFilter ? drafts.filter((draft) => draft.projectId === projectFilter) : drafts,
    };
  }

  if (command === "save_studio_draft") {
    const drafts = readPreview<StudioDraftPreview[]>("studio_drafts", []);
    const draftId = stringArg("draftId");
    const existing = draftId ? drafts.find((draft) => draft.id === draftId) : undefined;
    const now = timestamp();
    const saved = existing
      ? {
          ...existing,
          title: stringArg("title") || existing.title,
          content: stringArg("content") ?? existing.content,
          kind: stringArg("kind") || existing.kind,
          projectId: stringArg("projectId") ?? existing.projectId ?? null,
          version: existing.version + 1,
          updatedAt: now,
        }
      : {
          id: crypto.randomUUID(),
          title: stringArg("title") || "Untitled Draft",
          content: stringArg("content") ?? "",
          kind: stringArg("kind") || "story",
          version: 1,
          projectId: stringArg("projectId") ?? null,
          createdAt: now,
          updatedAt: now,
        };
    writePreview("studio_drafts", [saved, ...drafts.filter((draft) => draft.id !== saved.id)]);
    return { handled: true, value: saved };
  }

  if (command === "list_research_claims") {
    return { handled: true, value: readPreview("research_claims", []) };
  }

  if (command === "record_research_claim") {
    const claims = readPreview<ResearchClaimPreview[]>("research_claims", []);
    const record: ResearchClaimPreview = {
      id: crypto.randomUUID(),
      question: stringArg("question") || "",
      claim: stringArg("claim") || "",
      sourceCitation: stringArg("sourceCitation") || "",
      confidence: stringArg("confidence") || "verified",
      createdAt: timestamp(),
    };
    writePreview("research_claims", [record, ...claims]);
    return { handled: true, value: record };
  }

  if (command === "get_companion_profile" || command === "update_companion_state") {
    const stored = readPreview<{ state?: string } | null>("companion_profile", null);
    const nextState =
      command === "update_companion_state" ? stringArg("companionState") || "active" : undefined;
    const profile = {
      id: "default",
      name: "RockSoul Sentinel",
      personality: "Stoic, analytical, loyal companion",
      state: nextState ?? stored?.state ?? "idle",
      dailyBriefing: "Browser preview active.",
      eveningRecap: "Local desktop required for live telemetry.",
      updatedAt: timestamp(),
    };
    if (nextState) {
      writePreview("companion_profile", profile);
    }
    return { handled: true, value: profile };
  }

  return { handled: false };
}
