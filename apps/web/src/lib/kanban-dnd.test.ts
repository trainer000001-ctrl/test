import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_CAB_COLUMNS,
  applyOptimisticStageOverrides,
  buildItemStageMap,
  computeStageMove,
  makeItemDragId,
  makeStageDropId,
  parseItemDragId,
  parseStageDropId,
  resolveDropStage,
} from "./kanban-dnd";

test("DnD ID helpers round-trip stage and item identifiers cleanly", () => {
  assert.equal(parseStageDropId(makeStageDropId("IN REVIEW")), "IN REVIEW");
  assert.equal(parseItemDragId(makeItemDragId("pl-1")), "pl-1");
  assert.equal(parseStageDropId("item:pl-1"), null);
  assert.equal(parseItemDragId("stage:DRAFT"), null);
  assert.equal(parseStageDropId(null), null);
});

test("resolveDropStage handles dropping on a column or on a sibling card inside a column", () => {
  const itemMap = buildItemStageMap(INITIAL_CAB_COLUMNS);
  const validStages = INITIAL_CAB_COLUMNS.map((c) => c.stage);

  // Drop directly onto destination column
  assert.equal(resolveDropStage(makeStageDropId("approved"), itemMap, validStages), "approved");

  // Drop onto a task card inside the "review" column
  assert.equal(resolveDropStage(makeItemDragId("cab-rfc-041"), itemMap, validStages), "review");

  // Unknown stage or null overId resolves to null
  assert.equal(resolveDropStage(makeStageDropId("nonexistent"), itemMap, validStages), null);
  assert.equal(resolveDropStage(null, itemMap, validStages), null);
});

test("computeStageMove immutably moves a task across columns and updates counts", () => {
  const result = computeStageMove(INITIAL_CAB_COLUMNS, "cab-rfc-042", "approved");

  assert.equal(result.moved, true);
  assert.equal(result.fromStage, "proposed");
  assert.equal(result.toStage, "approved");

  const proposed = result.nextColumns.find((c) => c.stage === "proposed")!;
  const approved = result.nextColumns.find((c) => c.stage === "approved")!;

  assert.equal(proposed.count, 1);
  assert.equal(proposed.items.some((i) => i.id === "cab-rfc-042"), false);
  assert.equal(approved.count, 2);
  assert.equal(approved.items[0]?.id, "cab-rfc-042");

  // Original array remains untouched (immutable)
  assert.equal(INITIAL_CAB_COLUMNS[0]!.items.length, 2);
});

test("computeStageMove returns moved=false on same-column drop or invalid target", () => {
  const sameStage = computeStageMove(INITIAL_CAB_COLUMNS, "cab-rfc-042", "proposed");
  assert.equal(sameStage.moved, false);
  assert.equal(sameStage.fromStage, "proposed");
  assert.equal(sameStage.toStage, "proposed");

  const missingItem = computeStageMove(INITIAL_CAB_COLUMNS, "does-not-exist", "approved");
  assert.equal(missingItem.moved, false);

  const missingStage = computeStageMove(INITIAL_CAB_COLUMNS, "cab-rfc-042", "invalid");
  assert.equal(missingStage.moved, false);
});

test("applyOptimisticStageOverrides overlays stage fields for AutoModelConsole without mutating rows", () => {
  const rows = [
    { id: "r1", title: "Task Alpha", status: "draft" },
    { id: "r2", title: "Task Beta", status: "review" },
  ];
  const updated = applyOptimisticStageOverrides(rows, "status", { r1: "approved" });

  assert.equal(updated[0]?.status, "approved");
  assert.equal(updated[1]?.status, "review");
  assert.equal(rows[0]?.status, "draft");
});
