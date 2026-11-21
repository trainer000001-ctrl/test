"use client";

import { moonwitnessSdk } from "@moonwitness/contracts/sdk";
import type {
  CabStageColumn,
  KanbanBoardKind,
  KanbanStageUpdateResponse,
  PipelineColumn,
} from "@moonwitness/contracts/types";

export type { KanbanBoardKind, KanbanStageUpdateResponse };

export async function fetchKanbanBoard(
  board: "pipeline",
  signal?: AbortSignal,
): Promise<PipelineColumn[]>;
export async function fetchKanbanBoard(
  board: "cab",
  signal?: AbortSignal,
): Promise<CabStageColumn[]>;
export async function fetchKanbanBoard(
  board: KanbanBoardKind,
  signal?: AbortSignal,
): Promise<PipelineColumn[] | CabStageColumn[]> {
  const payload = await moonwitnessSdk.kanban.getBoard<PipelineColumn | CabStageColumn>(
    board,
    signal,
  );
  if (!payload.ok || !Array.isArray(payload.columns)) {
    throw new Error(`Malformed ${board} board payload`);
  }
  return payload.columns as PipelineColumn[] | CabStageColumn[];
}

export async function updateKanbanTaskStage(input: {
  board: "pipeline";
  itemId: string;
  toStage: string;
  expectedVersion?: number;
}): Promise<KanbanStageUpdateResponse<PipelineColumn>>;
export async function updateKanbanTaskStage(input: {
  board: "cab";
  itemId: string;
  toStage: string;
  expectedVersion?: number;
}): Promise<KanbanStageUpdateResponse<CabStageColumn>>;
export async function updateKanbanTaskStage(input: {
  board: KanbanBoardKind;
  itemId: string;
  toStage: string;
  expectedVersion?: number;
}): Promise<KanbanStageUpdateResponse<PipelineColumn | CabStageColumn>> {
  const payload = await moonwitnessSdk.kanban.updateStage<PipelineColumn | CabStageColumn>(input);
  if (!payload.ok) {
    throw new Error("Failed to update kanban stage");
  }
  return payload;
}
