"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "./primitives";
import { cn } from "./skin";
import {
  parseItemDragId,
  parseStageDropId,
  toItemDragId,
  toStageDropId,
  type KanbanColumnData,
  type KanbanItemBase,
  type KanbanMoveEvent,
} from "./kanban-logic";

export type { KanbanColumnData, KanbanItemBase, KanbanMoveEvent };
export { toItemDragId, toStageDropId };

export interface KanbanCardProps<T extends KanbanItemBase = KanbanItemBase> {
  item: T;
  stage: string;
  disabled?: boolean;
  pending?: boolean;
  isOverlay?: boolean;
  onOpen?: (item: T) => void;
  renderContent?: (item: T) => ReactNode;
  className?: string;
}

export function KanbanCard<T extends KanbanItemBase = KanbanItemBase>({
  item,
  stage,
  disabled = false,
  pending = false,
  isOverlay = false,
  onOpen,
  renderContent,
  className,
}: KanbanCardProps<T>) {
  const dragId = toItemDragId(item.id);
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: dragId,
    disabled: disabled || isOverlay,
    data: { itemId: item.id, stage, item },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: dragId,
    disabled: isOverlay,
    data: { itemId: item.id, stage },
  });

  const setRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const style =
    transform && !isOverlay
      ? { transform: CSS.Translate.toString(transform) }
      : undefined;

  return (
    <div
      ref={isOverlay ? undefined : setRef}
      style={style}
      data-kanban-card={item.id}
      data-kanban-stage={stage}
      data-dragging={isDragging ? "true" : "false"}
      data-pending={pending ? "true" : "false"}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      onClick={() => {
        if (!isDragging && !isOverlay) {
          onOpen?.(item);
        }
      }}
      className={cn(
        "group relative w-full select-none border border-[var(--border)] bg-[var(--background)] p-2.5 text-left text-xs transition-colors",
        !disabled && !isOverlay && "cursor-grab touch-none hover:border-[var(--primary)] active:cursor-grabbing",
        isDragging && "opacity-35 border-dashed border-[var(--primary)]",
        isOver && !isDragging && "ring-1 ring-[var(--primary)]",
        isOverlay && "cursor-grabbing border-[var(--primary)] bg-[var(--card)] shadow-[4px_4px_0_var(--primary)]",
        pending && "opacity-75",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {renderContent ? (
            renderContent(item)
          ) : (
            <>
              <div className="font-medium text-[var(--foreground)]">{item.title}</div>
              {item.type ? (
                <div className="mt-0.5 font-mono text-[10px] uppercase text-[var(--muted-foreground)]">
                  {item.type}
                </div>
              ) : null}
            </>
          )}
        </div>
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 font-mono text-[10px] leading-none text-[var(--muted-foreground)] group-hover:text-[var(--primary)]"
          title="Drag to move stage"
        >
          {pending ? "…" : "⋮⋮"}
        </span>
      </div>
    </div>
  );
}

export interface KanbanColumnProps<T extends KanbanItemBase = KanbanItemBase> {
  stage?: string;
  title?: string;
  count?: number;
  column?: KanbanColumnData<T>;
  droppable?: boolean;
  draggableItems?: boolean;
  pendingItemIds?: ReadonlySet<string>;
  onOpenItem?: (card: T) => void;
  renderCard?: (item: T, stage: string) => ReactNode;
  emptyLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function KanbanColumn<T extends KanbanItemBase = KanbanItemBase>({
  stage,
  title,
  count,
  column,
  droppable = true,
  draggableItems = true,
  pendingItemIds,
  onOpenItem,
  renderCard,
  emptyLabel = "Drop a task here",
  children,
  className,
}: KanbanColumnProps<T>) {
  const stageKey = stage ?? column?.stage ?? title ?? "stage";
  const heading = title ?? column?.title ?? column?.stage ?? "STAGE";
  const items = column?.items;
  const badgeCount = count ?? column?.count ?? items?.length;

  const { setNodeRef, isOver } = useDroppable({
    id: toStageDropId(stageKey),
    disabled: !droppable,
    data: { stage: stageKey },
  });

  return (
    <div
      ref={droppable ? setNodeRef : undefined}
      data-kanban-column={stageKey}
      data-drop-over={isOver ? "true" : "false"}
      className={cn(
        "flex min-h-[11rem] flex-col gap-2 border border-[var(--border)] bg-[var(--card)] p-3 transition-colors",
        isOver && "border-[var(--primary)] bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
        <span className="font-mono text-xs font-bold uppercase text-[var(--foreground)]">
          {heading}
        </span>
        {badgeCount !== undefined ? (
          <Badge variant="outline" data-kanban-count={stageKey}>
            {badgeCount}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {children ??
          (items && items.length > 0 ? (
            items.map((card) => (
              <KanbanCard
                key={card.id}
                item={card}
                stage={stageKey}
                disabled={!draggableItems}
                pending={pendingItemIds?.has(card.id) ?? false}
                onOpen={onOpenItem}
                renderContent={renderCard ? (it) => renderCard(it, stageKey) : undefined}
              />
            ))
          ) : (
            <div className="flex flex-1 items-center justify-center border border-dashed border-[var(--border)]/70 p-4 text-center font-mono text-[10px] uppercase text-[var(--muted-foreground)]">
              {emptyLabel}
            </div>
          ))}
      </div>
    </div>
  );
}

export interface KanbanBoardProps<T extends KanbanItemBase = KanbanItemBase> {
  columns: readonly KanbanColumnData<T>[];
  onMoveItem?: (event: KanbanMoveEvent) => void | Promise<void>;
  onOpenItem?: (item: T) => void;
  renderCard?: (item: T, stage: string) => ReactNode;
  pendingItemIds?: ReadonlySet<string>;
  disabled?: boolean;
  columnsClassName?: string;
  emptyLabel?: string;
}

export function KanbanBoard<T extends KanbanItemBase = KanbanItemBase>({
  columns,
  onMoveItem,
  onOpenItem,
  renderCard,
  pendingItemIds,
  disabled = false,
  columnsClassName = "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4",
  emptyLabel,
}: KanbanBoardProps<T>) {
  const [activeDrag, setActiveDrag] = useState<{ item: T; stage: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  const itemLookup = useMemo(() => {
    const map = new Map<string, { item: T; stage: string }>();
    for (const col of columns) {
      for (const item of col.items) {
        map.set(item.id, { item, stage: col.stage });
      }
    }
    return map;
  }, [columns]);

  const validStages = useMemo(() => new Set(columns.map((c) => c.stage)), [columns]);

  function handleDragStart(event: DragStartEvent) {
    const itemId = parseItemDragId(String(event.active.id));
    if (!itemId) return;
    const found = itemLookup.get(itemId);
    if (found) {
      setActiveDrag(found);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    if (disabled || !onMoveItem || !event.over) return;

    const itemId = parseItemDragId(String(event.active.id));
    if (!itemId) return;
    const source = itemLookup.get(itemId);
    if (!source) return;

    const overKey = String(event.over.id);
    let targetStage = parseStageDropId(overKey);
    if (!targetStage) {
      const overItemId = parseItemDragId(overKey);
      if (overItemId) {
        targetStage = itemLookup.get(overItemId)?.stage ?? null;
      }
    }

    if (!targetStage || !validStages.has(targetStage) || targetStage === source.stage) {
      return;
    }

    void onMoveItem({
      itemId,
      fromStage: source.stage,
      toStage: targetStage,
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className={columnsClassName}>
        {columns.map((column) => (
          <KanbanColumn
            key={column.stage}
            column={column}
            draggableItems={!disabled}
            pendingItemIds={pendingItemIds}
            onOpenItem={onOpenItem}
            renderCard={renderCard}
            emptyLabel={emptyLabel}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <KanbanCard
            item={activeDrag.item}
            stage={activeDrag.stage}
            isOverlay
            renderContent={
              renderCard ? (it) => renderCard(it, activeDrag.stage) : undefined
            }
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
