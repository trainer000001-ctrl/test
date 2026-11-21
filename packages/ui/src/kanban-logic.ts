export interface KanbanItemBase {
  readonly id: string;
  readonly title: string;
  readonly type?: string;
}

export interface KanbanColumnData<T extends KanbanItemBase = KanbanItemBase> {
  readonly stage: string;
  readonly title?: string;
  readonly count?: number;
  readonly more?: number;
  readonly items: readonly T[];
}

export interface KanbanMoveEvent {
  readonly itemId: string;
  readonly fromStage: string;
  readonly toStage: string;
}

export interface StageMoveResult<C> {
  readonly moved: boolean;
  readonly fromStage: string | null;
  readonly toStage: string | null;
  readonly itemId: string;
  readonly nextColumns: C[];
}

const STAGE_PREFIX = "stage:";
const ITEM_PREFIX = "item:";

export function toStageDropId(stage: string): string {
  return `${STAGE_PREFIX}${stage}`;
}

export function toItemDragId(itemId: string): string {
  return `${ITEM_PREFIX}${itemId}`;
}

export const makeStageDropId = toStageDropId;
export const makeItemDragId = toItemDragId;

export function parseStageDropId(id: string | null | undefined): string | null {
  if (!id || !id.startsWith(STAGE_PREFIX)) return null;
  const parsed = id.slice(STAGE_PREFIX.length);
  return parsed.length > 0 ? parsed : null;
}

export function parseItemDragId(id: string | null | undefined): string | null {
  if (!id || !id.startsWith(ITEM_PREFIX)) return null;
  const parsed = id.slice(ITEM_PREFIX.length);
  return parsed.length > 0 ? parsed : null;
}

export function buildItemStageMap<T extends KanbanItemBase>(
  columns: readonly KanbanColumnData<T>[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const col of columns) {
    for (const item of col.items) {
      map.set(item.id, col.stage);
    }
  }
  return map;
}

/**
 * Resolves the target stage from a `@dnd-kit/core` `over.id`, whether dropped
 * directly onto a column container (`stage:<id>`) or onto a sibling card (`item:<id>`).
 */
export function resolveDropStage(
  overId: string | null | undefined,
  itemToStage: ReadonlyMap<string, string>,
  validStages: readonly string[],
): string | null {
  if (!overId) return null;
  const stageSet = new Set(validStages);

  const directStage = parseStageDropId(overId);
  if (directStage && stageSet.has(directStage)) {
    return directStage;
  }

  const overItemId = parseItemDragId(overId);
  if (overItemId) {
    const ownerStage = itemToStage.get(overItemId);
    if (ownerStage && stageSet.has(ownerStage)) {
      return ownerStage;
    }
  }

  if (stageSet.has(overId)) {
    return overId;
  }

  return null;
}

/**
 * Pure immutable transition moving a task card from its current column to
 * `targetStage`, updating column counts consistently and returning `moved: false`
 * for no-op or invalid drops.
 */
export function computeStageMove<
  T extends KanbanItemBase,
  C extends KanbanColumnData<T>,
>(
  columns: readonly C[],
  itemId: string,
  targetStage: string,
): StageMoveResult<C> {
  const sourceColIndex = columns.findIndex((col) =>
    col.items.some((item) => item.id === itemId),
  );
  const targetColIndex = columns.findIndex((col) => col.stage === targetStage);

  if (sourceColIndex === -1 || targetColIndex === -1) {
    return {
      moved: false,
      fromStage: null,
      toStage: null,
      itemId,
      nextColumns: [...columns],
    };
  }

  const sourceCol = columns[sourceColIndex]!;
  const targetCol = columns[targetColIndex]!;

  if (sourceCol.stage === targetCol.stage) {
    return {
      moved: false,
      fromStage: sourceCol.stage,
      toStage: targetCol.stage,
      itemId,
      nextColumns: [...columns],
    };
  }

  const movingItem = sourceCol.items.find((item) => item.id === itemId);
  if (!movingItem) {
    return {
      moved: false,
      fromStage: null,
      toStage: null,
      itemId,
      nextColumns: [...columns],
    };
  }

  const nextColumns = columns.map((col, idx) => {
    if (idx === sourceColIndex) {
      const remaining = col.items.filter((item) => item.id !== itemId);
      const nextCount =
        typeof col.count === "number" ? Math.max(0, col.count - 1) : remaining.length;
      return {
        ...col,
        count: nextCount,
        items: remaining,
      } as C;
    }
    if (idx === targetColIndex) {
      const appended = [movingItem, ...col.items];
      const nextCount =
        typeof col.count === "number" ? col.count + 1 : appended.length;
      return {
        ...col,
        count: nextCount,
        items: appended,
      } as C;
    }
    return col;
  });

  return {
    moved: true,
    fromStage: sourceCol.stage,
    toStage: targetCol.stage,
    itemId,
    nextColumns,
  };
}

/**
 * Pure helper applying optimistic stage overrides to row records while a
 * backend PATCH mutation is in flight.
 */
export function applyOptimisticStageOverrides<R extends Record<string, unknown>>(
  rows: readonly R[],
  stageField: string,
  overrides: Readonly<Record<string, string>>,
): R[] {
  const keys = Object.keys(overrides);
  if (keys.length === 0) return [...rows];
  return rows.map((row) => {
    const rid = String(row.id ?? "");
    const nextStage = overrides[rid];
    if (nextStage === undefined) return row;
    return {
      ...row,
      [stageField]: nextStage,
    };
  });
}
