"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AutoModelView,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  CutoutArtwork,
  Input,
  KanbanBoard,
  NativeSelect,
  SkinOrnament,
  Textarea,
  type AutoModelCustomAction,
  type AutoModelHistoryEntry,
  type CutoutArtworkId,
  type KanbanColumnData,
  type KanbanItemBase,
  type KanbanMoveEvent,
} from "@moonwitness/ui";
import { moonwitnessSdk } from "@moonwitness/contracts/sdk";
import { SkinPalette } from "@moonwitness/ui/icons";
import { applyOptimisticStageOverrides } from "@/lib/kanban-dnd";
import { useCurrentIdentity } from "@/lib/session";
import {
  executeModelMutation,
  fetchModelReadGroup,
  fetchRecordChatter,
  mapRuntimeViewToAutoDescriptor,
  postRecordChatterComment,
  registerCustomFieldRequest,
  resetStudioViewRequest,
  resolveBindingUrl,
  saveStudioViewRequest,
  useMetaView,
  useModelRows,
  type ChatterMessageEntry,
} from "@/lib/api/meta-views";

export interface AutoModelConsoleProps {
  model: string;
  title?: string;
  description?: string;
  domainIcon?: string;
  cutoutId?: CutoutArtworkId;
  searchQuery?: string;
  refreshNonce?: number;
  onMutated?: () => void;
}

export function AutoModelConsole({
  model,
  title,
  description,
  domainIcon,
  cutoutId,
  searchQuery = "",
  refreshNonce = 0,
  onMutated,
}: AutoModelConsoleProps) {
  const session = useCurrentIdentity();
  const isAdmin = session?.role === "admin";
  const { view, loading: viewLoading, error: viewError, reload: reloadView } = useMetaView(model);
  const {
    rows,
    loading: rowsLoading,
    error: rowsError,
    reload: reloadRows,
  } = useModelRows(
    model,
    view?.actionBindings?.listUrl,
    view?.restEnabled,
    !viewLoading && Boolean(view),
  );

  const [studioOpen, setStudioOpen] = useState(false);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
  const [layoutTitle, setLayoutTitle] = useState("");
  const [layoutColumns, setLayoutColumns] = useState<string[]>([]);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [layoutStatus, setLayoutStatus] = useState<string | null>(null);
  const [savingLayout, setSavingLayout] = useState(false);
  const [matrixMode, setMatrixMode] = useState<"table" | "kanban" | "pivot" | "chatter" | "import">(
    "table",
  );
  const [groupField, setGroupField] = useState<string>("");
  const [groups, setGroups] = useState<Array<Record<string, unknown>>>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [chatterId, setChatterId] = useState<string>("");
  const [chatterMessages, setChatterMessages] = useState<ChatterMessageEntry[]>([]);
  const [chatterDraft, setChatterDraft] = useState("");
  const [chatterLoading, setChatterLoading] = useState(false);
  const [importJson, setImportJson] = useState("[]");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<
    "text" | "integer" | "real" | "boolean" | "date" | "selection"
  >("text");
  const [fieldSelection, setFieldSelection] = useState("");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);
  const [optimisticStages, setOptimisticStages] = useState<Record<string, string>>({});
  const [pendingStageIds, setPendingStageIds] = useState<ReadonlySet<string>>(() => new Set());
  const [kanbanError, setKanbanError] = useState<string | null>(null);
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);

  useEffect(() => {
    setGroupField("");
    setGroups([]);
    setChatterId("");
    setChatterMessages([]);
    setChatterDraft("");
    setImportStatus(null);
    setStudioOpen(false);
    setLayoutEditorOpen(false);
    setLayoutError(null);
    setLayoutStatus(null);
    setStudioError(null);
    setOptimisticStages({});
    setKanbanError(null);
    setActiveFilterKey(null);
  }, [model]);

  useEffect(() => {
    if (refreshNonce > 0) {
      void reloadRows();
    }
  }, [refreshNonce, reloadRows]);

  const searchViewFilters = useMemo(() => {
    const searchView = view?.views?.find((v) => v.view_type === "search");
    const raw = searchView?.spec?.filters;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is { key: string; label: string; domain: unknown[] } =>
        Boolean(item && typeof item === "object" && "key" in item && "label" in item && "domain" in item),
    );
  }, [view]);

  const visibleRows = useMemo(() => {
    let filtered = rows;
    if (activeFilterKey) {
      const activeSpec = searchViewFilters.find((f) => f.key === activeFilterKey);
      if (activeSpec && Array.isArray(activeSpec.domain)) {
        filtered = filtered.filter((row) =>
          activeSpec.domain.every((clause) => {
            if (!Array.isArray(clause) || clause.length !== 3) return true;
            const [field, op, val] = clause as [string, string, unknown];
            const cell = row[field];
            if (op === "=" || op === "==") return cell === val;
            if (op === "!=" || op === "<>") return cell !== val;
            if (op === "in" && Array.isArray(val)) return val.includes(cell);
            if (op === "not in" && Array.isArray(val)) return !val.includes(cell);
            if (op === "ilike" || op === "like") {
              return String(cell ?? "").toLowerCase().includes(String(val ?? "").toLowerCase());
            }
            return true;
          }),
        );
      }
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((row) =>
      Object.values(row).some((value) => {
        if (value && typeof value === "object") {
          return JSON.stringify(value).toLowerCase().includes(q);
        }
        return String(value ?? "")
          .toLowerCase()
          .includes(q);
      }),
    );
  }, [rows, searchQuery, activeFilterKey, searchViewFilters]);

  if (viewLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center font-mono text-xs text-[var(--muted-foreground)]">
          Loading runtime metadata for {model}…
        </CardContent>
      </Card>
    );
  }

  if (viewError || !view || !view.actionBindings) {
    return (
      <Card className="relative overflow-hidden">
        <SkinOrnament slot="corner" className="end-2 top-2" />
        <CardHeader className="flex flex-col items-center py-8 text-center">
          <CutoutArtwork
            id={cutoutId ?? "rooftop-antenna"}
            decorative
            className="mb-2 h-20 w-20 opacity-80"
          />
          <CardTitle>{title ?? model}</CardTitle>
          <CardDescription className="max-w-md">
            {viewError ?? `No active view descriptor for '${model}'.`}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const descriptor = mapRuntimeViewToAutoDescriptor(view, {
    title,
    description,
    domainIcon,
    cutoutId,
  });

  const defaultStageFieldSpec =
    view.fields.find((f) => f.selection && f.selection.length > 0) ??
    view.fields.find((f) => /state|status|stage|era|kind|category/i.test(f.field_name)) ??
    view.fields[0];
  const activeGroupField = groupField || defaultStageFieldSpec?.field_name || "status";
  const stageFieldSpec =
    view.fields.find((f) => f.field_name === activeGroupField) ?? defaultStageFieldSpec;

  async function loadPivotGroups(field: string) {
    if (!view?.restEnabled) return;
    setGroupsLoading(true);
    try {
      const next = await fetchModelReadGroup(model, field);
      setGroups(next);
    } catch {
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }

  async function loadChatterForRecord(id: string) {
    if (!id.trim()) return;
    setChatterLoading(true);
    try {
      const msgs = await fetchRecordChatter(model, id.trim());
      setChatterMessages(msgs);
    } catch {
      setChatterMessages([]);
    } finally {
      setChatterLoading(false);
    }
  }

  async function handlePostChatter(e: FormEvent) {
    e.preventDefault();
    if (!chatterId.trim() || !chatterDraft.trim()) return;
    await postRecordChatterComment(model, chatterId.trim(), chatterDraft.trim());
    setChatterDraft("");
    await loadChatterForRecord(chatterId);
  }

  async function handleBulkImport(e: FormEvent) {
    e.preventDefault();
    if (!bindings.createUrl) return;
    setImportStatus(null);
    try {
      const parsed = JSON.parse(importJson) as unknown;
      if (!Array.isArray(parsed)) {
        setImportStatus("JSON payload must be an array of record objects.");
        return;
      }
      let ok = 0;
      for (const item of parsed) {
        if (item && typeof item === "object") {
          await executeModelMutation(bindings.createUrl, "POST", item as Record<string, unknown>);
          ok += 1;
        }
      }
      setImportStatus(`Imported ${ok} records cleanly.`);
      await reloadRows();
      onMutated?.();
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : "Bulk import failed");
    }
  }

  const bindings = view.actionBindings;
  const customActions: AutoModelCustomAction[] = (bindings.customActions ?? [])
    .filter(
      (act) => !session?.role || act.roles.includes(session.role as "admin" | "editor" | "viewer"),
    )
    .map((act) => ({
      id: act.id,
      label: act.label,
      onTrigger: async (id: string) => {
        await executeModelMutation(resolveBindingUrl(act.urlTemplate, id), act.method);
        await reloadRows();
        onMutated?.();
      },
    }));

  function openLayoutEditor() {
    if (layoutEditorOpen) {
      setLayoutEditorOpen(false);
      return;
    }
    const listSpec = view?.views?.find((v) => v.view_type === "list")?.spec;
    const currentCols =
      Array.isArray(listSpec?.columns) && listSpec.columns.length > 0
        ? listSpec.columns.filter((c): c is string => typeof c === "string")
        : descriptor.fields.slice(0, 6).map((f) => f.name);
    setLayoutTitle(typeof listSpec?.title === "string" ? listSpec.title : (title ?? model));
    setLayoutColumns(currentCols);
    setLayoutError(null);
    setLayoutStatus(null);
    setStudioOpen(false);
    setLayoutEditorOpen(true);
  }

  function toggleLayoutColumn(colName: string) {
    setLayoutColumns((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName],
    );
  }

  function moveLayoutColumn(colName: string, direction: -1 | 1) {
    setLayoutColumns((prev) => {
      const idx = prev.indexOf(colName);
      if (idx < 0) return prev;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(nextIdx, 0, moved!);
      return next;
    });
  }

  async function handleSaveStudioLayout(e: FormEvent) {
    e.preventDefault();
    if (layoutColumns.length === 0) {
      setLayoutError("Select at least one visible column.");
      return;
    }
    setLayoutError(null);
    setLayoutStatus(null);
    setSavingLayout(true);
    try {
      await saveStudioViewRequest(model, "list", {
        title: layoutTitle.trim() || undefined,
        columns: layoutColumns,
      });
      await reloadView();
      setLayoutStatus("Saved layout override to _mw_ir_views.");
    } catch (err) {
      setLayoutError(err instanceof Error ? err.message : "Failed to save Studio view layout");
    } finally {
      setSavingLayout(false);
    }
  }

  async function handleResetStudioLayout() {
    setLayoutError(null);
    setLayoutStatus(null);
    setSavingLayout(true);
    try {
      await resetStudioViewRequest(model, "list");
      await reloadView();
      setLayoutEditorOpen(false);
    } catch (err) {
      setLayoutError(err instanceof Error ? err.message : "Failed to reset Studio view layout");
    } finally {
      setSavingLayout(false);
    }
  }

  async function handleAddCustomField(e: FormEvent) {
    e.preventDefault();
    setStudioError(null);
    setSavingField(true);
    try {
      const selection =
        fieldType === "selection"
          ? fieldSelection
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;
      await registerCustomFieldRequest(model, {
        field_name: fieldName.trim().toLowerCase(),
        field_type: fieldType,
        label: fieldLabel.trim() || undefined,
        required: fieldRequired,
        selection,
      });
      setFieldName("");
      setFieldLabel("");
      setFieldSelection("");
      setFieldRequired(false);
      setStudioOpen(false);
      await reloadView();
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Failed to register custom field");
    } finally {
      setSavingField(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] bg-[var(--card)] px-4 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["table", "kanban", "pivot", "chatter", "import"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={matrixMode === mode ? "default" : "outline"}
              onClick={() => {
                setMatrixMode(mode);
                if (mode === "pivot" || mode === "kanban") {
                  void loadPivotGroups(activeGroupField);
                }
                if (mode === "chatter") {
                  const firstId = chatterId || String(visibleRows[0]?.id ?? "");
                  if (firstId) {
                    setChatterId(firstId);
                    void loadChatterForRecord(firstId);
                  }
                }
              }}
            >
              {mode === "table"
                ? "Table"
                : mode === "kanban"
                  ? "Kanban"
                  : mode === "pivot"
                    ? "Pivot / Group"
                    : mode === "chatter"
                      ? "Chatter"
                      : "Import JSON"}
            </Button>
          ))}
        </div>
        <div className="font-mono text-[11px] text-[var(--muted-foreground)]">
          {visibleRows.length} rows · {view.model}
        </div>
      </div>

      {searchViewFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border border-[var(--border)] bg-[var(--card)]/70 px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            Search Filters:
          </span>
          <Button
            type="button"
            size="sm"
            variant={activeFilterKey === null ? "default" : "outline"}
            onClick={() => setActiveFilterKey(null)}
          >
            All
          </Button>
          {searchViewFilters.map((f) => (
            <Button
              key={f.key}
              type="button"
              size="sm"
              variant={activeFilterKey === f.key ? "default" : "outline"}
              onClick={() => setActiveFilterKey((curr) => (curr === f.key ? null : f.key))}
            >
              {f.label}
            </Button>
          ))}
        </div>
      ) : null}

      {isAdmin ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] bg-[var(--card)] px-4 py-2.5">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--muted-foreground)]">
            <SkinPalette className="h-4 w-4 text-[var(--primary)]" />
            <Badge variant="outline">{view.extensible ? "STUDIO · _attrs + VIEWS" : "STUDIO · VIEWS"}</Badge>
            <span>Customize list columns or register live fields without restarts.</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={layoutEditorOpen ? "default" : "outline"}
              onClick={openLayoutEditor}
            >
              {layoutEditorOpen ? "Close Layout" : "Edit Layout"}
            </Button>
            {view.extensible ? (
              <Button
                type="button"
                size="sm"
                variant={studioOpen ? "default" : "outline"}
                onClick={() => {
                  setLayoutEditorOpen(false);
                  setStudioOpen((open) => !open);
                }}
              >
                {studioOpen ? "Close Field Form" : "+ Add Custom Field"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {layoutEditorOpen ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Studio View Editor — {model}</CardTitle>
            <CardDescription>
              Toggle and reorder visible list columns. Persisted to <code>_mw_ir_views</code> via{" "}
              <code>POST /api/v1/_meta/views/{model}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSaveStudioLayout(e)} className="space-y-4">
              {layoutError ? (
                <div
                  role="alert"
                  className="border border-[var(--destructive)] px-3 py-2 font-mono text-xs text-[var(--destructive)]"
                >
                  {layoutError}
                </div>
              ) : null}
              {layoutStatus ? (
                <div
                  role="status"
                  className="border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-3 py-2 font-mono text-xs text-[var(--primary)]"
                >
                  {layoutStatus}
                </div>
              ) : null}

              <label className="block space-y-1 text-xs">
                <span className="font-mono uppercase text-[var(--muted-foreground)]">
                  List View Title
                </span>
                <Input
                  value={layoutTitle}
                  onChange={(e) => setLayoutTitle(e.target.value)}
                  placeholder={model}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">
                    Active Column Order ({layoutColumns.length})
                  </div>
                  <div className="space-y-1">
                    {layoutColumns.map((col, idx) => {
                      const f = descriptor.fields.find((item) => item.name === col);
                      return (
                        <div
                          key={col}
                          className="flex items-center justify-between gap-2 border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 font-mono text-xs"
                        >
                          <span className="truncate">
                            {idx + 1}. {f?.label ?? col}{" "}
                            <span className="text-[10px] text-[var(--muted-foreground)]">({col})</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={idx === 0}
                              aria-label={`Move ${col} up`}
                              onClick={() => moveLayoutColumn(col, -1)}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={idx === layoutColumns.length - 1}
                              aria-label={`Move ${col} down`}
                              onClick={() => moveLayoutColumn(col, 1)}
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`Remove ${col}`}
                              onClick={() => toggleLayoutColumn(col)}
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">
                    Available Fields
                  </div>
                  <div className="max-h-56 space-y-1 overflow-y-auto border border-[var(--border)] bg-[var(--background)] p-2">
                    {descriptor.fields.map((f) => {
                      const active = layoutColumns.includes(f.name);
                      return (
                        <label
                          key={f.name}
                          className="flex items-center justify-between gap-2 px-1.5 py-1 font-mono text-xs cursor-pointer hover:bg-[var(--muted)]/40"
                        >
                          <span className="flex items-center gap-2">
                            <Checkbox
                              checked={active}
                              aria-label={`Column ${f.name}`}
                              onCheckedChange={() => toggleLayoutColumn(f.name)}
                            />
                            <span>{f.label}</span>
                          </span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">{f.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={savingLayout}
                  onClick={() => void handleResetStudioLayout()}
                >
                  Reset Default
                </Button>
                <Button type="submit" size="sm" disabled={savingLayout || layoutColumns.length === 0}>
                  {savingLayout ? "Saving…" : "Save Layout"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {studioOpen ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Register Custom Field on {model}</CardTitle>
            <CardDescription>
              Saved into <code>ir_model_fields</code> and validated inside <code>_attrs</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void handleAddCustomField(e)}
              className="grid gap-3 sm:grid-cols-2"
            >
              {studioError ? (
                <div className="sm:col-span-2 border border-[var(--destructive)] px-3 py-2 text-xs text-[var(--destructive)]">
                  {studioError}
                </div>
              ) : null}
              <label className="space-y-1 text-xs">
                <span className="font-mono uppercase text-[var(--muted-foreground)]">
                  Field Key (snake_case)
                </span>
                <Input
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="cust_rack_unit"
                  required
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="font-mono uppercase text-[var(--muted-foreground)]">
                  Display Label
                </span>
                <Input
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="Rack Unit"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="font-mono uppercase text-[var(--muted-foreground)]">
                  Field Type
                </span>
                <NativeSelect
                  value={fieldType}
                  onChange={(e) =>
                    setFieldType(
                      e.target.value as
                        "text" | "integer" | "real" | "boolean" | "date" | "selection",
                    )
                  }
                >
                  <option value="text">Text</option>
                  <option value="integer">Integer</option>
                  <option value="real">Decimal</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                  <option value="selection">Selection</option>
                </NativeSelect>
              </label>
              {fieldType === "selection" ? (
                <label className="space-y-1 text-xs">
                  <span className="font-mono uppercase text-[var(--muted-foreground)]">
                    Choices (comma-separated)
                  </span>
                  <Input
                    value={fieldSelection}
                    onChange={(e) => setFieldSelection(e.target.value)}
                    placeholder="low, medium, high"
                  />
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-xs sm:col-span-2">
                <Checkbox
                  checked={fieldRequired}
                  aria-label="Required field"
                  onCheckedChange={(checked) => setFieldRequired(checked === true)}
                />
                <span>Required field</span>
              </label>
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" size="sm" disabled={savingField || !fieldName.trim()}>
                  {savingField ? "Saving…" : "Save Custom Field"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {matrixMode === "kanban" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted-foreground)]">Group stage by:</span>
              <NativeSelect
                value={activeGroupField}
                onChange={(e) => {
                  setGroupField(e.target.value);
                  setOptimisticStages({});
                  setKanbanError(null);
                  void loadPivotGroups(e.target.value);
                }}
              >
                {view.fields.map((f) => (
                  <option key={f.field_name} value={f.field_name}>
                    {f.label || f.field_name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <span className="text-[10px] uppercase text-[var(--muted-foreground)]">
              {bindings.updateUrl ? "Drag cards across columns to update stage" : "Read-only board"}
            </span>
          </div>
          {kanbanError ? (
            <div
              role="alert"
              className="border border-[var(--destructive)] bg-[var(--destructive)]/10 px-3 py-2 font-mono text-xs text-[var(--destructive)]"
            >
              {kanbanError}
            </div>
          ) : null}
          {(() => {
            interface ModelKanbanItem extends KanbanItemBase {
              readonly row: Record<string, unknown>;
              readonly nextStage?: string;
            }
            const mergedRows = applyOptimisticStageOverrides(
              visibleRows,
              activeGroupField,
              optimisticStages,
            );
            const buckets = Array.from(
              new Set([
                ...(stageFieldSpec?.selection ?? []),
                ...mergedRows.map((r) => String(r[activeGroupField] ?? "unassigned")),
              ]),
            );
            const selections = stageFieldSpec?.selection ?? [];
            const kanbanColumns: KanbanColumnData<ModelKanbanItem>[] = buckets.map((bucket) => {
              const bucketRows = mergedRows.filter(
                (r) => String(r[activeGroupField] ?? "unassigned") === bucket,
              );
              const nextStage =
                selections.length > 1
                  ? selections[(selections.indexOf(bucket) + 1) % selections.length]
                  : undefined;
              return {
                stage: bucket,
                title: bucket,
                count: bucketRows.length,
                items: bucketRows.slice(0, 12).map((row) => {
                  const rid = String(row.id ?? "");
                  const label = String(row.title ?? row.name ?? row.reference ?? row.code ?? rid);
                  return {
                    id: rid,
                    title: label,
                    row,
                    nextStage,
                  };
                }),
              };
            });

            async function handleKanbanMove({ itemId, toStage }: KanbanMoveEvent) {
              if (!bindings.updateUrl) return;
              setKanbanError(null);
              setOptimisticStages((prev) => ({ ...prev, [itemId]: toStage }));
              setPendingStageIds((prev) => new Set(prev).add(itemId));
              try {
                await executeModelMutation(
                  resolveBindingUrl(bindings.updateUrl, itemId),
                  "PATCH",
                  { [activeGroupField]: toStage },
                );
                await reloadRows();
                onMutated?.();
                setOptimisticStages((prev) => {
                  const next = { ...prev };
                  delete next[itemId];
                  return next;
                });
              } catch (err) {
                setOptimisticStages((prev) => {
                  const next = { ...prev };
                  delete next[itemId];
                  return next;
                });
                setKanbanError(
                  err instanceof Error ? err.message : `Failed to update ${activeGroupField}`,
                );
              } finally {
                setPendingStageIds((prev) => {
                  const next = new Set(prev);
                  next.delete(itemId);
                  return next;
                });
              }
            }

            return (
              <KanbanBoard<ModelKanbanItem>
                columns={kanbanColumns}
                disabled={!bindings.updateUrl}
                pendingItemIds={pendingStageIds}
                onMoveItem={handleKanbanMove}
                columnsClassName="grid gap-3 md:grid-cols-3 lg:grid-cols-4"
                emptyLabel="Drop record here"
                renderCard={(item) => (
                  <div className="space-y-1">
                    <div className="font-medium">{item.title}</div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-[var(--muted-foreground)]">
                      <span>{item.id.slice(0, 8)}</span>
                      {item.nextStage && bindings.updateUrl ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleKanbanMove({
                              itemId: item.id,
                              fromStage: String(item.row[activeGroupField] ?? "unassigned"),
                              toStage: item.nextStage!,
                            });
                          }}
                        >
                          → {item.nextStage}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              />
            );
          })()}
        </div>
      ) : matrixMode === "pivot" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">SQL Group-By & Pivot Aggregation</CardTitle>
              <CardDescription>
                Live server aggregation via <code>/api/v1/m/{model}/read-group</code>
              </CardDescription>
            </div>
            <NativeSelect
              value={activeGroupField}
              onChange={(e) => {
                setGroupField(e.target.value);
                void loadPivotGroups(e.target.value);
              }}
            >
              {view.fields.map((f) => (
                <option key={f.field_name} value={f.field_name}>
                  {f.label || f.field_name}
                </option>
              ))}
            </NativeSelect>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs">
            {groupsLoading ? (
              <div className="text-[var(--muted-foreground)]">Computing read-group…</div>
            ) : groups.length === 0 ? (
              <div className="text-[var(--muted-foreground)]">No grouped buckets returned.</div>
            ) : (
              groups.map((g, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border border-[var(--border)] px-3 py-2"
                >
                  <span>{String(g[activeGroupField] ?? "null")}</span>
                  <Badge variant="outline">{Number(g.count ?? 0)} records</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : matrixMode === "chatter" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Record Chatter & Tracking Log</CardTitle>
            <CardDescription>
              Inspect <code>mail.message</code> comments and <code>mail.tracking.value</code> diffs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect
                value={chatterId}
                onChange={(e) => {
                  setChatterId(e.target.value);
                  void loadChatterForRecord(e.target.value);
                }}
              >
                <option value="">Select record…</option>
                {visibleRows.slice(0, 50).map((row) => {
                  const rid = String(row.id ?? "");
                  const label = String(row.title ?? row.name ?? row.reference ?? rid);
                  return (
                    <option key={rid} value={rid}>
                      {label} ({rid.slice(0, 8)})
                    </option>
                  );
                })}
              </NativeSelect>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void loadChatterForRecord(chatterId)}
              >
                Refresh Chatter
              </Button>
            </div>

            {chatterLoading ? (
              <div className="font-mono text-xs text-[var(--muted-foreground)]">
                Loading chatter messages…
              </div>
            ) : (
              <div className="space-y-2">
                {chatterMessages.length === 0 ? (
                  <div className="font-mono text-xs text-[var(--muted-foreground)]">
                    No chatter messages recorded for this record yet.
                  </div>
                ) : (
                  chatterMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="border border-[var(--border)] p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-[var(--muted-foreground)]">
                        <span>{msg.message_type.toUpperCase()}</span>
                        <span>{msg.author_id ?? "system"}</span>
                      </div>
                      <div>{msg.body}</div>
                      {msg.$tracking_values?.map((tr) => (
                        <div key={tr.id} className="font-mono text-[10px] text-[var(--primary)]">
                          {tr.field_name}: {tr.old_value ?? "∅"} → {tr.new_value ?? "∅"}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}

            {chatterId ? (
              <form onSubmit={(e) => void handlePostChatter(e)} className="flex gap-2">
                <Input
                  value={chatterDraft}
                  onChange={(e) => setChatterDraft(e.target.value)}
                  placeholder="Write an internal note or audit comment…"
                />
                <Button type="submit" size="sm" disabled={!chatterDraft.trim()}>
                  Post
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : matrixMode === "import" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bulk Import JSON Records into {model}</CardTitle>
            <CardDescription>
              Paste a JSON array matching fields on <code>{model}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleBulkImport(e)} className="space-y-3">
              <Textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
              {importStatus ? (
                <div className="font-mono text-xs text-[var(--primary)]">{importStatus}</div>
              ) : null}
              <Button type="submit" size="sm" disabled={!bindings.createUrl}>
                Run Bulk Import
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <AutoModelView
          descriptor={descriptor}
          rows={visibleRows}
          loading={rowsLoading}
          error={rowsError}
          onInspectHistory={async (id) => {
            const res = await moonwitnessSdk
              .model(model)
              .history<AutoModelHistoryEntry>(id, bindings.historyUrl);
            return res.data ?? [];
          }}
          onCreate={
            bindings.createUrl
              ? async (values) => {
                  await executeModelMutation(bindings.createUrl!, "POST", values);
                  await reloadRows();
                  onMutated?.();
                }
              : undefined
          }
          onUpdate={
            bindings.updateUrl
              ? async (id, values) => {
                  await executeModelMutation(
                    resolveBindingUrl(bindings.updateUrl!, id),
                    "PATCH",
                    values,
                  );
                  await reloadRows();
                  onMutated?.();
                }
              : undefined
          }
          onArchive={
            bindings.archiveUrl
              ? async (id) => {
                  await executeModelMutation(resolveBindingUrl(bindings.archiveUrl!, id), "POST");
                  await reloadRows();
                  onMutated?.();
                }
              : undefined
          }
          onRestore={
            bindings.restoreUrl
              ? async (id) => {
                  await executeModelMutation(resolveBindingUrl(bindings.restoreUrl!, id), "POST");
                  await reloadRows();
                  onMutated?.();
                }
              : undefined
          }
          onDelete={
            bindings.deleteUrl
              ? async (id) => {
                  await executeModelMutation(resolveBindingUrl(bindings.deleteUrl!, id), "DELETE");
                  await reloadRows();
                  onMutated?.();
                }
              : undefined
          }
          customActions={customActions}
        />
      )}
    </div>
  );
}
