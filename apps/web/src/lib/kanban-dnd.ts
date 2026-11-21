/**
 * Compatibility facade & app-specific CAB seed fixtures.
 * Canonical Kanban DnD pure state transitions live in `@moonwitness/ui/kanban-logic`
 * and shared API/domain types live in `@moonwitness/contracts/types`.
 */
import type { CabStageColumn, PipelineColumn } from "@moonwitness/contracts/types";

export {
  applyOptimisticStageOverrides,
  buildItemStageMap,
  computeStageMove,
  makeItemDragId,
  makeStageDropId,
  parseItemDragId,
  parseStageDropId,
  resolveDropStage,
  toItemDragId,
  toStageDropId,
  type KanbanColumnData as KanbanStageColumn,
  type KanbanItemBase as KanbanTaskBase,
  type KanbanMoveEvent,
  type StageMoveResult,
} from "@moonwitness/ui/kanban-logic";

export type { CabStageColumn, CabTaskItem } from "@moonwitness/contracts/types";

export const INITIAL_CAB_COLUMNS: readonly CabStageColumn[] = [
  {
    stage: "proposed",
    title: "Proposed",
    count: 2,
    items: [
      {
        id: "cab-rfc-042",
        code: "RFC-042",
        title: "M-Time Meridian Sync",
        type: "TEMPORAL",
        priority: "high",
        owner: "Al-Miqat",
        updatedAt: "14m ago",
      },
      {
        id: "cab-118",
        code: "CAB-118",
        title: "Corpus Checksum Audit",
        type: "EPISTEMIC",
        priority: "medium",
        owner: "Al-Shahid",
        updatedAt: "1h ago",
      },
    ],
  },
  {
    stage: "review",
    title: "CAB Review",
    count: 2,
    items: [
      {
        id: "cab-rfc-041",
        code: "RFC-041",
        title: "SRGBL v8 Zero-Guard Enforcement",
        type: "GOVERNANCE",
        priority: "high",
        owner: "Al-Mizan",
        updatedAt: "35m ago",
      },
      {
        id: "cab-115",
        code: "CAB-115",
        title: "P18 Key Rotation 3-Hop Cap",
        type: "CORRELATION",
        priority: "medium",
        owner: "Al-Sidra",
        updatedAt: "3h ago",
      },
    ],
  },
  {
    stage: "approved",
    title: "Approved",
    count: 1,
    items: [
      {
        id: "cab-rfc-039",
        code: "RFC-039",
        title: "Imperium Lumen Contrast Lock",
        type: "DESIGN",
        priority: "medium",
        owner: "Al-Qalam",
        updatedAt: "5h ago",
      },
    ],
  },
  {
    stage: "deployed",
    title: "Deployed",
    count: 1,
    items: [
      {
        id: "cab-rfc-037",
        code: "RFC-037",
        title: "Four-Corpus Provenance Seal",
        type: "ARCHIVE",
        priority: "low",
        owner: "Al-Amanah",
        updatedAt: "yesterday",
      },
    ],
  },
];

export type PipelineBoardColumns = PipelineColumn[];
