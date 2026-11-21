"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge, Checkbox, Input, NativeSelect, Textarea } from "./primitives";

export type FieldWidgetType =
  | "text"
  | "textarea"
  | "integer"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "tags"
  | "relation"
  | "json";

export interface FieldWidgetContext {
  readonly name: string;
  readonly label: string;
  readonly type: FieldWidgetType | string;
  readonly widget?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly selection?: string[];
  readonly help?: string;
  readonly isCustom?: boolean;
  readonly relation?: {
    readonly model: string;
    readonly type?: "many2one" | "many2many";
  };
}

export interface FieldWidgetPlugin {
  readonly id: string;
  readonly renderCell: (value: unknown, ctx: FieldWidgetContext) => ReactNode;
  readonly renderInput: (params: {
    value: unknown;
    onChange: (nextValue: unknown) => void;
    ctx: FieldWidgetContext;
  }) => ReactNode;
}

const widgetRegistry = new Map<string, FieldWidgetPlugin>();

export function registerFieldWidget(plugin: FieldWidgetPlugin): void {
  widgetRegistry.set(plugin.id, plugin);
}

export function listRegisteredFieldWidgets(): string[] {
  return [...widgetRegistry.keys()];
}

const textWidget: FieldWidgetPlugin = {
  id: "text",
  renderCell: (value) => (value === null || value === undefined || value === "" ? "—" : String(value)),
  renderInput: ({ value, onChange, ctx }) => (
    <Input
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      required={ctx.required}
      disabled={ctx.readonly}
      placeholder={ctx.label}
    />
  ),
};

const textareaWidget: FieldWidgetPlugin = {
  id: "textarea",
  renderCell: (value) => {
    const str = String(value ?? "");
    if (!str) return "—";
    return <span className="line-clamp-2 max-w-xs">{str}</span>;
  },
  renderInput: ({ value, onChange, ctx }) => (
    <Textarea
      rows={3}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      required={ctx.required}
      disabled={ctx.readonly}
      placeholder={ctx.label}
    />
  ),
};

const numberWidget: FieldWidgetPlugin = {
  id: "number",
  renderCell: (value) =>
    value === null || value === undefined || value === "" ? (
      "—"
    ) : (
      <span className="font-mono tabular-nums">{String(value)}</span>
    ),
  renderInput: ({ value, onChange, ctx }) => (
    <Input
      type="number"
      step={ctx.type === "integer" ? "1" : "any"}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onChange("");
          return;
        }
        onChange(ctx.type === "integer" ? Number.parseInt(raw, 10) : Number(raw));
      }}
      required={ctx.required}
      disabled={ctx.readonly}
    />
  ),
};

const booleanWidget: FieldWidgetPlugin = {
  id: "boolean",
  renderCell: (value) => (
    <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
  ),
  renderInput: ({ value, onChange, ctx }) => (
    <div className="flex h-9 items-center gap-2 border border-[var(--border)] bg-[var(--card)] px-3">
      <Checkbox
        checked={Boolean(value)}
        aria-label={ctx.label}
        disabled={ctx.readonly}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
      <span className="font-mono text-xs">{Boolean(value) ? "Enabled" : "Disabled"}</span>
    </div>
  ),
};

const selectWidget: FieldWidgetPlugin = {
  id: "select",
  renderCell: (value) =>
    value ? <Badge variant="outline">{String(value)}</Badge> : "—",
  renderInput: ({ value, onChange, ctx }) => (
    <NativeSelect
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      disabled={ctx.readonly}
      required={ctx.required}
      className="w-full"
    >
      <option value="">Select…</option>
      {(ctx.selection ?? []).map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </NativeSelect>
  ),
};

const dateWidget: FieldWidgetPlugin = {
  id: "date",
  renderCell: (value) =>
    value ? <span className="font-mono text-[11px]">{String(value)}</span> : "—",
  renderInput: ({ value, onChange, ctx }) => (
    <Input
      type="date"
      value={String(value ?? "").slice(0, 10)}
      onChange={(e) => onChange(e.target.value)}
      required={ctx.required}
      disabled={ctx.readonly}
    />
  ),
};

const tagsWidget: FieldWidgetPlugin = {
  id: "tags",
  renderCell: (value) => {
    const arr = Array.isArray(value)
      ? value
      : typeof value === "string" && value.trim()
        ? value.split(",").map((s) => s.trim())
        : [];
    if (arr.length === 0) return "—";
    return (
      <div className="flex flex-wrap gap-1">
        {arr.slice(0, 4).map((tag, idx) => (
          <Badge key={idx} variant="secondary">
            {String(tag)}
          </Badge>
        ))}
      </div>
    );
  },
  renderInput: ({ value, onChange, ctx }) => {
    const textVal = Array.isArray(value) ? value.join(", ") : String(value ?? "");
    return (
      <Input
        value={textVal}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        disabled={ctx.readonly}
        placeholder="comma, separated, tags"
      />
    );
  },
};

function RelationPicker({
  value,
  onChange,
  ctx,
}: {
  value: unknown;
  onChange: (nextValue: unknown) => void;
  ctx: FieldWidgetContext;
}) {
  const targetModel = ctx.relation?.model;
  const currentId = value === null || value === undefined ? "" : String(value);
  const [query, setQuery] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [options, setOptions] = useState<Array<[string, string]>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetModel || !currentId) {
      setSelectedLabel(null);
      return;
    }
    const existing = options.find(([id]) => id === currentId);
    if (existing) {
      setSelectedLabel(existing[1]);
      return;
    }
    let active = true;
    fetch("/api/v1/rpc", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
      },
      body: JSON.stringify({
        model: targetModel,
        method: "name_get",
        ids: [currentId],
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { result?: Array<[string, string]> } | null) => {
        if (!active) return;
        const first = Array.isArray(payload?.result) ? payload.result[0] : null;
        if (Array.isArray(first) && typeof first[1] === "string") {
          setSelectedLabel(first[1]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentId, targetModel, options]);

  useEffect(() => {
    if (!open || !targetModel) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      fetch("/api/v1/rpc", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({
          model: targetModel,
          method: "name_search",
          kwargs: { q: query.trim(), limit: 12 },
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload: { result?: Array<[string, string]> } | null) => {
          if (!active) return;
          if (Array.isArray(payload?.result)) {
            setOptions(
              payload.result.filter(
                (entry): entry is [string, string] =>
                  Array.isArray(entry) && typeof entry[0] === "string",
              ),
            );
          } else {
            setOptions([]);
          }
        })
        .catch(() => {
          if (active) setOptions([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, targetModel]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  if (!targetModel) {
    return (
      <Input
        value={currentId}
        onChange={(e) => onChange(e.target.value)}
        required={ctx.required}
        disabled={ctx.readonly}
        placeholder={ctx.label}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative" data-relation-model={targetModel}>
      <div className="flex items-center gap-1.5">
        <Input
          aria-label={ctx.label}
          value={open ? query : selectedLabel ? `${selectedLabel} (${currentId.slice(0, 8)})` : currentId}
          onFocus={() => {
            if (ctx.readonly) return;
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          required={ctx.required && !currentId}
          disabled={ctx.readonly}
          placeholder={`Search ${targetModel}…`}
          className="font-mono text-xs"
        />
        {currentId && !ctx.readonly ? (
          <button
            type="button"
            aria-label={`Clear ${ctx.label}`}
            onClick={() => {
              onChange("");
              setSelectedLabel(null);
              setQuery("");
            }}
            className="h-9 shrink-0 border border-[var(--border)] px-2 font-mono text-xs text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)] cursor-pointer"
          >
            ✕
          </button>
        ) : null}
      </div>

      {open && !ctx.readonly ? (
        <div
          role="listbox"
          aria-label={`${targetModel} suggestions`}
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-52 overflow-y-auto border border-[var(--primary)]/60 bg-[var(--card)] shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-2.5 py-1 font-mono text-[10px] uppercase text-[var(--muted-foreground)]">
            <span>{targetModel}</span>
            <span>{loading ? "Searching…" : `${options.length} found`}</span>
          </div>
          {options.length === 0 && !loading ? (
            <div className="px-3 py-2 font-mono text-xs text-[var(--muted-foreground)]">
              No matching {targetModel} records.
            </div>
          ) : (
            options.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={id === currentId}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(id);
                  setSelectedLabel(label);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 border-b border-[var(--border)]/40 px-3 py-2 text-left text-xs hover:bg-[var(--primary)]/15 cursor-pointer"
              >
                <span className="truncate font-medium text-[var(--foreground)]">{label}</span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--muted-foreground)]">
                  {id.slice(0, 8)}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

const relationWidget: FieldWidgetPlugin = {
  id: "relation",
  renderCell: (value) =>
    value ? (
      <Badge variant="outline" className="font-mono">
        {String(value).slice(0, 14)}
      </Badge>
    ) : (
      "—"
    ),
  renderInput: ({ value, onChange, ctx }) => (
    <RelationPicker value={value} onChange={onChange} ctx={ctx} />
  ),
};

// Register built-in canonical field widgets once
for (const plugin of [
  textWidget,
  textareaWidget,
  numberWidget,
  { ...numberWidget, id: "integer" },
  booleanWidget,
  { ...booleanWidget, id: "checkbox" },
  selectWidget,
  { ...selectWidget, id: "selection" },
  dateWidget,
  tagsWidget,
  relationWidget,
]) {
  registerFieldWidget(plugin);
}

export function resolveFieldWidget(ctx: FieldWidgetContext): FieldWidgetPlugin {
  if (ctx.selection && ctx.selection.length > 0) {
    return widgetRegistry.get("select") ?? selectWidget;
  }
  if (ctx.relation?.model) {
    return widgetRegistry.get("relation") ?? relationWidget;
  }
  if (ctx.widget && widgetRegistry.has(ctx.widget)) {
    return widgetRegistry.get(ctx.widget)!;
  }
  if (widgetRegistry.has(ctx.type)) {
    return widgetRegistry.get(ctx.type)!;
  }
  return textWidget;
}

export function FieldWidgetCell({
  value,
  field,
}: {
  value: unknown;
  field: FieldWidgetContext;
}) {
  const widget = resolveFieldWidget(field);
  return <>{widget.renderCell(value, field)}</>;
}

export function FieldWidgetInput({
  value,
  onChange,
  field,
}: {
  value: unknown;
  onChange: (nextValue: unknown) => void;
  field: FieldWidgetContext;
}) {
  const widget = resolveFieldWidget(field);
  return <>{widget.renderInput({ value, onChange, ctx: field })}</>;
}
