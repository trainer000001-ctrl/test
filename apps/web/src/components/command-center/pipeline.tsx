"use client";

import type { PipelineCard, PipelineColumn } from "@moonwitness/contracts/types";
import { KanbanBoard, type KanbanMoveEvent } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export interface PipelineProps {
  columns: PipelineColumn[];
  onOpenCard: (card: PipelineCard) => void;
  onMoveCard?: (event: KanbanMoveEvent) => void | Promise<void>;
  pendingCardIds?: ReadonlySet<string>;
}

export function Pipeline({
  columns,
  onOpenCard,
  onMoveCard,
  pendingCardIds,
}: PipelineProps) {
  return (
    <section aria-labelledby="cc-pipeline-heading" className="scroll-mt-24">
      <SectionHeading
        id="cc-pipeline-heading"
        title="EDITORIAL"
        accent="PIPELINE"
        note="drag cards across stages · click to inspect"
      />
      <KanbanBoard<PipelineCard>
        columns={columns}
        onMoveItem={onMoveCard}
        onOpenItem={onOpenCard}
        pendingItemIds={pendingCardIds}
        columnsClassName="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        emptyLabel="Drop card into stage"
      />
    </section>
  );
}
