import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import {
  ConflictError,
  DEFAULT_TENANT_ID,
  PolicyError,
  ValidationError,
  createActorContext,
  defineModel,
  hasDb,
  initDb,
  normalizeTenantId,
  syncModels,
  type ActorContext,
  type OrmRecord,
} from "@moonwitness/orm";
import type {
  ArtKey,
  CabStageColumn,
  CabTaskItem,
  KanbanBoardKind,
  PipelineCard,
  PipelineColumn,
} from "@moonwitness/contracts/types";
import { pipeline as initialPipelineColumns } from "@/lib/data";
import { INITIAL_CAB_COLUMNS } from "@/lib/kanban-dnd";

export const dynamic = "force-dynamic";

const KANBAN_DB_PATH =
  process.env.MOONWITNESS_KANBAN_DB_PATH?.trim() ||
  join(tmpdir(), "moonwitness-kanban-orm.sqlite");

const kanbanTaskModel = defineModel({
  name: "kanban.task",
  table: "mw_kanban_tasks",
  restEnabled: true,
  schema: z.object({
    board: z.enum(["pipeline", "cab"]),
    item_key: z.string().min(1).max(120),
    stage: z.string().min(1).max(80),
    title: z.string().min(1).max(240),
    item_type: z.string().default("TASK"),
    position: z.number().int().default(0),
    meta_json: z.string().default("{}"),
  }),
  indexes: [
    { fields: ["board", "item_key"], unique: true },
    { fields: ["board", "stage"] },
  ],
});

type KanbanTaskRow = OrmRecord<{
  board: KanbanBoardKind;
  item_key: string;
  stage: string;
  title: string;
  item_type: string;
  position: number;
  meta_json: string;
}>;

const PIPELINE_STAGE_META = initialPipelineColumns.map((col) => ({
  stage: col.stage,
  baseCount: col.count,
  baseItemsLen: col.items.length,
  more: col.more,
}));

const CAB_STAGE_META = INITIAL_CAB_COLUMNS.map((col) => ({
  stage: col.stage,
  title: col.title,
}));

const VALID_STAGES: Record<KanbanBoardKind, ReadonlySet<string>> = {
  pipeline: new Set(PIPELINE_STAGE_META.map((m) => m.stage)),
  cab: new Set(CAB_STAGE_META.map((m) => m.stage)),
};

let ormReadyPromise: Promise<void> | null = null;
const seededTenants = new Set<string>();

async function ensureKanbanOrm(actor: ActorContext): Promise<void> {
  if (!ormReadyPromise) {
    ormReadyPromise = (async () => {
      if (!hasDb()) {
        await initDb(KANBAN_DB_PATH);
      }
      await syncModels([kanbanTaskModel]);
    })().catch((err) => {
      ormReadyPromise = null;
      throw err;
    });
  }
  await ormReadyPromise;

  if (seededTenants.has(actor.tenantId)) return;

  const repo = kanbanTaskModel.repository.forActor(actor);
  const existingCount = await repo.count();
  if (existingCount === 0) {
    const seedActor = createActorContext("system:kanban-seed", "migration", undefined, actor.tenantId);
    const seedRepo = kanbanTaskModel.repository.forActor(seedActor);

    for (const col of initialPipelineColumns) {
      let pos = 0;
      for (const item of col.items) {
        await seedRepo.upsert(
          { board: "pipeline", item_key: item.id },
          {
            board: "pipeline",
            item_key: item.id,
            stage: col.stage,
            title: item.title,
            item_type: item.type,
            position: pos++,
            meta_json: JSON.stringify({ thumb: item.thumb }),
          },
        );
      }
    }

    for (const col of INITIAL_CAB_COLUMNS) {
      let pos = 0;
      for (const item of col.items) {
        await seedRepo.upsert(
          { board: "cab", item_key: item.id },
          {
            board: "cab",
            item_key: item.id,
            stage: col.stage,
            title: item.title,
            item_type: item.type,
            position: pos++,
            meta_json: JSON.stringify({
              code: item.code,
              priority: item.priority,
              owner: item.owner,
              updatedAt: item.updatedAt,
            }),
          },
        );
      }
    }
  }

  seededTenants.add(actor.tenantId);
}

function resolveRequestActor(request: Request): ActorContext {
  const rawTenant = request.headers.get("x-tenant-id")?.trim();
  const tenantId = rawTenant ? normalizeTenantId(rawTenant) : DEFAULT_TENANT_ID;
  const actorId = request.headers.get("x-actor-id")?.trim() || "web-operator";
  const requestId = request.headers.get("x-request-id")?.trim() || undefined;
  return createActorContext(actorId, "api", requestId, tenantId);
}

function parseMeta(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function loadPipelineColumns(actor: ActorContext): Promise<{
  columns: PipelineColumn[];
  updatedAt: string;
}> {
  const repo = kanbanTaskModel.repository.forActor(actor);
  const rows = (await repo.find(
    { board: "pipeline" },
    { orderBy: "position ASC, write_date DESC" },
  )) as KanbanTaskRow[];

  const byStage = new Map<string, PipelineCard[]>();
  for (const meta of PIPELINE_STAGE_META) byStage.set(meta.stage, []);

  let latestUpdate = "";
  for (const row of rows) {
    if (row.write_date > latestUpdate) latestUpdate = row.write_date;
    const meta = parseMeta(row.meta_json);
    const bucket = byStage.get(row.stage);
    if (!bucket) continue;
    bucket.push({
      id: row.item_key,
      title: row.title,
      type: row.item_type,
      thumb: (typeof meta.thumb === "string" ? meta.thumb : "editorial-light-plate") as ArtKey,
    });
  }

  const columns: PipelineColumn[] = PIPELINE_STAGE_META.map((meta) => {
    const items = byStage.get(meta.stage) ?? [];
    const delta = items.length - meta.baseItemsLen;
    return {
      stage: meta.stage,
      count: Math.max(items.length, meta.baseCount + delta),
      more: meta.more,
      items,
    };
  });

  return { columns, updatedAt: latestUpdate || new Date().toISOString() };
}

async function loadCabColumns(actor: ActorContext): Promise<{
  columns: CabStageColumn[];
  updatedAt: string;
}> {
  const repo = kanbanTaskModel.repository.forActor(actor);
  const rows = (await repo.find(
    { board: "cab" },
    { orderBy: "position ASC, write_date DESC" },
  )) as KanbanTaskRow[];

  const byStage = new Map<string, CabTaskItem[]>();
  for (const meta of CAB_STAGE_META) byStage.set(meta.stage, []);

  let latestUpdate = "";
  for (const row of rows) {
    if (row.write_date > latestUpdate) latestUpdate = row.write_date;
    const meta = parseMeta(row.meta_json);
    const bucket = byStage.get(row.stage);
    if (!bucket) continue;
    bucket.push({
      id: row.item_key,
      code: typeof meta.code === "string" ? meta.code : row.item_key.toUpperCase(),
      title: row.title,
      type: row.item_type,
      priority:
        meta.priority === "high" || meta.priority === "low" ? meta.priority : "medium",
      owner: typeof meta.owner === "string" ? meta.owner : "Al-Shahid",
      updatedAt: typeof meta.updatedAt === "string" ? meta.updatedAt : "just now",
      version: row.version,
    });
  }

  const columns: CabStageColumn[] = CAB_STAGE_META.map((meta) => {
    const items = byStage.get(meta.stage) ?? [];
    return {
      stage: meta.stage,
      title: meta.title,
      count: items.length,
      items,
    };
  });

  return { columns, updatedAt: latestUpdate || new Date().toISOString() };
}

const StageUpdateSchema = z.object({
  board: z.enum(["pipeline", "cab"]),
  itemId: z.string().trim().min(1).max(120),
  toStage: z.string().trim().min(1).max(80),
  expectedVersion: z.number().int().positive().optional(),
});

function toErrorResponse(error: unknown): Response {
  if (error instanceof ConflictError) {
    return Response.json(
      { ok: false, code: error.code, error: error.message },
      { status: 409 },
    );
  }
  if (error instanceof PolicyError) {
    return Response.json(
      { ok: false, code: error.code, error: error.message },
      { status: error.statusCode },
    );
  }
  if (error instanceof ValidationError) {
    return Response.json(
      { ok: false, code: error.code, error: error.message, details: error.issues },
      { status: 400 },
    );
  }
  return Response.json(
    { ok: false, error: error instanceof Error ? error.message : "Internal ORM error" },
    { status: 500 },
  );
}

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = resolveRequestActor(request);
    await ensureKanbanOrm(actor);
    const url = new URL(request.url);
    const board = url.searchParams.get("board");
    const itemHistory = url.searchParams.get("historyFor")?.trim();

    if (itemHistory && (board === "pipeline" || board === "cab")) {
      const repo = kanbanTaskModel.repository.forActor(actor);
      const found = (await repo.find({ board, item_key: itemHistory }, { limit: 1 }))[0];
      if (!found) {
        return Response.json({ ok: false, error: "Task not found" }, { status: 404 });
      }
      const history = await repo.history(found.id);
      return Response.json({
        ok: true,
        engine: "@moonwitness/orm",
        itemId: itemHistory,
        version: found.version,
        history,
      });
    }

    if (board === "pipeline") {
      const { columns, updatedAt } = await loadPipelineColumns(actor);
      return Response.json({
        ok: true,
        engine: "@moonwitness/orm",
        board: "pipeline",
        columns,
        updatedAt,
      });
    }

    if (board === "cab") {
      const { columns, updatedAt } = await loadCabColumns(actor);
      return Response.json({
        ok: true,
        engine: "@moonwitness/orm",
        board: "cab",
        columns,
        updatedAt,
      });
    }

    const [pipelineRes, cabRes] = await Promise.all([
      loadPipelineColumns(actor),
      loadCabColumns(actor),
    ]);
    return Response.json({
      ok: true,
      engine: "@moonwitness/orm",
      pipeline: pipelineRes.columns,
      cab: cabRes.columns,
      updatedAt:
        pipelineRes.updatedAt > cabRes.updatedAt ? pipelineRes.updatedAt : cabRes.updatedAt,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = StageUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid stage update payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const actor = resolveRequestActor(request);
    await ensureKanbanOrm(actor);

    const { board, itemId, toStage, expectedVersion } = parsed.data;
    if (!VALID_STAGES[board].has(toStage)) {
      return Response.json(
        { ok: false, error: `Stage '${toStage}' is not valid on ${board} board.` },
        { status: 404 },
      );
    }

    const repo = kanbanTaskModel.repository.forActor(actor);
    const existing = (await repo.find({ board, item_key: itemId }, { limit: 1 }))[0] as
      | KanbanTaskRow
      | undefined;
    if (!existing) {
      return Response.json(
        { ok: false, error: `Task '${itemId}' not found on ${board} board.` },
        { status: 404 },
      );
    }

    const fromStage = existing.stage;
    let moved = false;
    let nextVersion = existing.version;

    if (fromStage !== toStage) {
      const targetRows = (await repo.find({ board, stage: toStage }, { orderBy: "position ASC" })) as KanbanTaskRow[];
      const minPos = targetRows.reduce((acc, row) => Math.min(acc, Number(row.position)), 0);
      const patch: Record<string, unknown> = {
        stage: toStage,
        position: minPos - 1,
      };
      if (expectedVersion !== undefined) {
        patch.version = expectedVersion;
      }
      const updated = await repo.update(existing.id, patch);
      if (updated) {
        moved = true;
        nextVersion = updated.version;
      }
    }

    if (board === "pipeline") {
      const { columns, updatedAt } = await loadPipelineColumns(actor);
      return Response.json({
        ok: true,
        engine: "@moonwitness/orm",
        board: "pipeline",
        moved,
        itemId,
        fromStage,
        toStage,
        version: nextVersion,
        columns,
        updatedAt,
      });
    }

    const { columns, updatedAt } = await loadCabColumns(actor);
    return Response.json({
      ok: true,
      engine: "@moonwitness/orm",
      board: "cab",
      moved,
      itemId,
      fromStage,
      toStage,
      version: nextVersion,
      columns,
      updatedAt,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
