"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  KanbanBoard,
  type KanbanColumnData,
  type KanbanItemBase,
  type KanbanMoveEvent,
} from "@moonwitness/ui";
import { requestApiJson } from "@moonwitness/contracts/sdk";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";
import { executeModelMutation } from "@/lib/api/meta-views";

type CabStageKey = "draft" | "review" | "approved" | "in_progress" | "done" | "rejected";
type CabRiskKey = "low" | "medium" | "high" | "critical";

interface CabChangeRecord {
  readonly id: string;
  readonly reference: string;
  readonly title: string;
  readonly stage: CabStageKey;
  readonly risk: CabRiskKey;
  readonly owner: string;
  readonly summary?: string;
  readonly updated_at?: string;
}

interface CabKanbanCardItem extends KanbanItemBase {
  readonly reference: string;
  readonly stage: CabStageKey;
  readonly risk: CabRiskKey;
  readonly owner: string;
  readonly summary: string;
  readonly updatedAt: string;
}

const CAB_STAGE_DEFS: readonly { stage: CabStageKey; title: string }[] = [
  { stage: "draft", title: "Draft" },
  { stage: "review", title: "Review" },
  { stage: "approved", title: "Approved" },
  { stage: "in_progress", title: "In Progress" },
  { stage: "done", title: "Done" },
  { stage: "rejected", title: "Rejected" },
];

const RISK_BADGE_TONE: Record<CabRiskKey, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

function buildColumns(records: readonly CabChangeRecord[]): KanbanColumnData<CabKanbanCardItem>[] {
  return CAB_STAGE_DEFS.map((def) => {
    const items: CabKanbanCardItem[] = records
      .filter((r) => (r.stage || "draft") === def.stage)
      .map((r) => ({
        id: String(r.id),
        title: String(r.title ?? r.reference ?? r.id),
        reference: String(r.reference ?? ""),
        stage: def.stage,
        risk: (r.risk ?? "medium") as CabRiskKey,
        owner: String(r.owner ?? "Unassigned"),
        summary: String(r.summary ?? ""),
        updatedAt: r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "Live ORM",
      }));
    return {
      stage: def.stage,
      title: def.title,
      count: items.length,
      items,
    };
  });
}

export function KanbanCabView() {
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<CabChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNonce, setSyncNonce] = useState(0);

  const loadCabChanges = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await requestApiJson<{ data?: CabChangeRecord[] }>(
        "/api/v1/m/cab.change?limit=100",
      );
      setRecords(Array.isArray(payload.data) ? payload.data : []);
      setSyncError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Failed to load CAB change records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCabChanges();
  }, [loadCabChanges]);

  const filteredColumns = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? records.filter(
          (r) =>
            String(r.reference ?? "").toLowerCase().includes(q) ||
            String(r.title ?? "").toLowerCase().includes(q) ||
            String(r.owner ?? "").toLowerCase().includes(q) ||
            String(r.risk ?? "").toLowerCase().includes(q) ||
            String(r.summary ?? "").toLowerCase().includes(q),
        )
      : records;
    return buildColumns(filtered);
  }, [records, search]);

  async function handleMoveItem({ itemId, toStage }: KanbanMoveEvent) {
    const target = records.find((r) => r.id === itemId);
    if (!target || target.stage === toStage) return;

    const previousRecords = records;
    const nextStage = toStage as CabStageKey;
    const targetTitle = CAB_STAGE_DEFS.find((d) => d.stage === nextStage)?.title ?? nextStage;

    setSyncError(null);
    setRecords((prev) =>
      prev.map((r) => (r.id === itemId ? { ...r, stage: nextStage } : r)),
    );
    setPendingIds((prev) => new Set(prev).add(itemId));

    try {
      await executeModelMutation(`/api/v1/m/cab.change/${encodeURIComponent(itemId)}`, "PATCH", {
        stage: nextStage,
      });
      await loadCabChanges();
      setSyncNonce((n) => n + 1);
      setSyncMessage(`Saved: ${target.reference} (${target.title}) → ${targetTitle}`);
    } catch (err) {
      setRecords(previousRecords);
      setSyncError(
        err instanceof Error
          ? err.message
          : "Failed to persist CAB stage update. Restored previous stage.",
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  return (
    <ConsoleShellAdapter
      plane="creator"
      breadcrumb="Kanban CAB"
      activeOverride="kanban"
      search={{ value: search, onChange: setSearch, placeholder: "Filter CAB change requests…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="w-fit">CHANGE ADVISORY BOARD · LIVE ORM</Badge>
              <CardTitle className="mt-2 font-brush text-2xl">KANBAN CAB</CardTitle>
              <CardDescription>
                Unified board backed directly by <code>/api/v1/m/cab.change</code> — drag cards across stages to update records and log chatter diffs automatically.
              </CardDescription>
            </div>
            {syncMessage ? (
              <div
                role="status"
                data-kanban-status="synced"
                className="border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-3 py-1.5 font-mono text-xs text-[var(--primary)]"
              >
                {syncMessage}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {syncError ? (
              <div
                role="alert"
                className="border border-[var(--destructive)] bg-[var(--destructive)]/10 px-3 py-2 font-mono text-xs text-[var(--destructive)]"
              >
                {syncError}
              </div>
            ) : null}
            {loading && records.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-[var(--muted-foreground)]">
                Loading CAB change requests from ORM…
              </div>
            ) : (
              <KanbanBoard<CabKanbanCardItem>
                columns={filteredColumns}
                onMoveItem={handleMoveItem}
                pendingItemIds={pendingIds}
                columnsClassName="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
                emptyLabel="Drop CAB change request here"
                renderCard={(item) => (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-[var(--primary)]">
                        {item.reference}
                      </span>
                      <Badge variant={RISK_BADGE_TONE[item.risk]} className="px-1.5 py-0 text-[9px]">
                        {item.risk}
                      </Badge>
                    </div>
                    <div className="font-medium text-[var(--foreground)]">{item.title}</div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-[var(--muted-foreground)]">
                      <span>{item.owner}</span>
                      <span>{item.updatedAt}</span>
                    </div>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>
        <AutoModelConsole
          model="cab.change"
          searchQuery={search}
          title="CAB Change Requests"
          refreshNonce={syncNonce}
          onMutated={() => void loadCabChanges()}
        />
      </div>
    </ConsoleShellAdapter>
  );
}
export default KanbanCabView;
