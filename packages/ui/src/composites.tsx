"use client";

import {
  cloneElement,
  isValidElement,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type CSSProperties,
  type FormEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  auditDnaContrast,
  cn,
  getDnaWorld,
  listDnaWorlds,
  listPresets,
  skinPresets,
  useSkin,
  type BrandLogoId,
  type CanonicalDensity,
  type CutoutArtworkId,
  type MasterDnaId,
  type SkinName,
} from "./skin";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, NativeSelect } from "./primitives";
import { FieldWidgetCell, FieldWidgetInput } from "./field-widgets";

/* ---------- Shared Console & AutoModel Types ---------- */
export interface HudNavItem {
  id: string;
  label: string;
  iconPath?: string;
  href: string;
  kind?: string;
}

export type AutoModelFieldType =
  | "text"
  | "textarea"
  | "integer"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "tags"
  | "relation";

export interface AutoModelFieldSpec {
  name: string;
  label: string;
  type: AutoModelFieldType;
  widget?: string;
  required?: boolean;
  readonly?: boolean;
  help?: string;
  isCustom?: boolean;
  selection?: string[];
  relation?: {
    model: string;
    type?: "many2one" | "many2many";
  };
}

export interface AutoModelViewDescriptor {
  model: string;
  title?: string;
  description?: string;
  domainIcon?: string;
  cutoutId?: CutoutArtworkId;
  columns?: string[];
  fields: AutoModelFieldSpec[];
  acl?: {
    canRead?: boolean;
    canCreate?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  };
}

export type AutoModelRow = Record<string, unknown> & { id?: string | number };

export interface AutoModelHistoryEntry {
  id: string;
  action: string;
  entity_version?: number;
  changed_by?: string | null;
  changed_at?: string;
  source?: string;
}

export interface AutoModelCustomAction {
  id: string;
  label: string;
  onTrigger: (id: string) => Promise<void> | void;
}

/* ---------- ConsoleShell ---------- */
export function ConsoleShell({
  title,
  brandHref = "/",
  subtitle,
  navLabel = "Navigation",
  items = [],
  active,
  activeSection,
  onNavigate,
  linkAs,
  headerStart,
  headerSearch,
  headerActions,
  railFooter,
  commandLeft,
  commandRight,
  children,
}: {
  title: string;
  brandHref?: string;
  subtitle?: string;
  navLabel?: string;
  items?: HudNavItem[];
  active?: string;
  activeSection?: string | null;
  onNavigate?: () => void;
  linkAs?: ComponentType<{ href: string; className?: string; onClick?: () => void; children: ReactNode }>;
  headerStart?: ReactNode;
  headerSearch?: ReactNode;
  headerActions?: ReactNode;
  railFooter?: ReactNode;
  commandLeft?: ReactNode;
  commandRight?: ReactNode;
  children: ReactNode;
}) {
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const LinkTag = linkAs ?? (({ href, className, onClick, children: c }) => (
    <a href={href} className={className} onClick={onClick}>
      {c}
    </a>
  ));

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] lg:flex">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <LinkTag href={brandHref} className="block space-y-0.5">
            <div className="font-brush text-xl tracking-wider text-[var(--primary)]">MOONWITNESS</div>
            {subtitle ? (
              <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted-foreground)] uppercase">
                {subtitle}
              </div>
            ) : null}
          </LinkTag>
        </div>

        <nav aria-label={navLabel} className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const isActive = item.id === active || item.id === activeSection;
            return (
              <LinkTag
                key={item.id}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 border px-3 py-2 font-mono text-xs transition-colors",
                  isActive
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 font-semibold text-[var(--primary)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]",
                )}
              >
                {item.iconPath ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0">
                    <path d={item.iconPath} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
                <span className="truncate">{item.label}</span>
              </LinkTag>
            );
          })}
        </nav>

        {railFooter ? <div className="border-t border-[var(--border)] p-3">{railFooter}</div> : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)]/95 px-4 py-2.5 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
            <button
              type="button"
              aria-label="Toggle navigation"
              onClick={() => setMobileRailOpen((o) => !o)}
              className="inline-flex h-9 w-9 items-center justify-center border border-[var(--border)] lg:hidden cursor-pointer"
            >
              {mobileRailOpen ? "✕" : "☰"}
            </button>
            {headerStart}
            <span className="truncate font-semibold text-[var(--foreground)]">{title}</span>
          </div>

          {headerSearch ? <div className="order-3 w-full sm:order-2 sm:max-w-xs">{headerSearch}</div> : null}
          {headerActions ? <div className="order-2 sm:order-3">{headerActions}</div> : null}
        </header>

        {mobileRailOpen ? (
          <nav
            aria-label={navLabel}
            className="grid grid-cols-2 gap-1.5 border-b border-[var(--border)] bg-[var(--card)] p-3 lg:hidden"
          >
            {items.map((item) => (
              <LinkTag
                key={item.id}
                href={item.href}
                onClick={() => {
                  setMobileRailOpen(false);
                  onNavigate?.();
                }}
                className={cn(
                  "truncate border px-2.5 py-2 font-mono text-xs",
                  item.id === active
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)]",
                )}
              >
                {item.label}
              </LinkTag>
            ))}
          </nav>
        ) : null}

        <main className="flex-1">{children}</main>

        {commandLeft || commandRight ? (
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--card)] px-4 py-2.5 font-mono text-[10px] tracking-wider text-[var(--muted-foreground)]">
            <div>{commandLeft}</div>
            <div className="flex items-center gap-1.5">{commandRight}</div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- AutoModelView ---------- */
export function AutoModelView({
  descriptor,
  rows,
  loading,
  error,
  onCreate,
  onUpdate,
  onArchive,
  onRestore,
  onDelete,
  onInspectHistory,
  customActions = [],
}: {
  descriptor: AutoModelViewDescriptor;
  rows: AutoModelRow[];
  loading?: boolean;
  error?: string | null;
  onCreate?: (values: Record<string, unknown>) => Promise<void> | void;
  onUpdate?: (id: string, values: Record<string, unknown>) => Promise<void> | void;
  onArchive?: (id: string) => Promise<void> | void;
  onRestore?: (id: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onInspectHistory?: (id: string) => Promise<AutoModelHistoryEntry[]>;
  customActions?: AutoModelCustomAction[];
}) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [history, setHistory] = useState<AutoModelHistoryEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  const visibleFields = descriptor.columns?.length
    ? descriptor.columns
        .map((col) => descriptor.fields.find((f) => f.name === col))
        .filter((f): f is AutoModelFieldSpec => Boolean(f))
    : descriptor.fields.slice(0, 6);

  const editableFields = descriptor.fields.filter((f) => !f.readonly).slice(0, 12);

  function openCreateForm() {
    setMutationError(null);
    setEditingId(null);
    setDraft({});
    setCreating((v) => !v);
  }

  function openEditForm(row: AutoModelRow) {
    const rid = String(row.id ?? "");
    if (!rid) return;
    setMutationError(null);
    setCreating(false);
    setEditingId(rid);
    const initial: Record<string, unknown> = {};
    for (const f of editableFields) {
      if (f.name in row) initial[f.name] = row[f.name];
    }
    setDraft(initial);
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setMutationError(null);
    setBusy(true);
    try {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(draft)) {
        if (v !== "") cleaned[k] = v;
      }
      if (editingId && onUpdate) {
        await onUpdate(editingId, cleaned);
        setEditingId(null);
        setDraft({});
      } else if (onCreate) {
        await onCreate(cleaned);
        setDraft({});
        setCreating(false);
      }
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to save record");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">{descriptor.title ?? descriptor.model}</CardTitle>
          {descriptor.description ? <CardDescription>{descriptor.description}</CardDescription> : null}
        </div>
        {onCreate && descriptor.acl?.canCreate !== false ? (
          <Button type="button" size="sm" onClick={openCreateForm}>
            {creating ? "Cancel" : "+ New Record"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {mutationError ? (
          <div
            role="alert"
            className="border border-[var(--destructive)]/50 bg-[var(--destructive)]/10 p-3 font-mono text-xs text-[var(--destructive)]"
          >
            {mutationError}
          </div>
        ) : null}

        {(creating && onCreate) || (editingId && onUpdate) ? (
          <form
            onSubmit={(e) => void handleFormSubmit(e)}
            className="grid gap-3 border border-[var(--border)] bg-[var(--background)] p-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2 flex items-center justify-between font-mono text-xs text-[var(--primary)]">
              <span>{editingId ? `EDIT RECORD · ${editingId.slice(0, 12)}` : `NEW ${descriptor.model.toUpperCase()}`}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCreating(false);
                  setEditingId(null);
                  setDraft({});
                }}
              >
                Cancel
              </Button>
            </div>
            {editableFields.map((field) => (
              <label key={field.name} className="space-y-1 text-xs">
                <span className="flex items-center gap-1.5 font-mono uppercase text-[var(--muted-foreground)]">
                  <span>{field.label}</span>
                  {field.required ? <span className="text-[var(--destructive)]">*</span> : null}
                  {field.isCustom ? <Badge variant="outline">custom</Badge> : null}
                </span>
                <FieldWidgetInput
                  field={field}
                  value={draft[field.name]}
                  onChange={(nextVal) => setDraft((d) => ({ ...d, [field.name]: nextVal }))}
                />
                {field.help ? (
                  <span className="block font-mono text-[10px] text-[var(--muted-foreground)]">
                    {field.help}
                  </span>
                ) : null}
              </label>
            ))}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Saving…" : editingId ? "Save Changes" : "Create Record"}
              </Button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <div className="py-6 text-center font-mono text-xs text-[var(--muted-foreground)]">
            Loading {descriptor.model}…
          </div>
        ) : error ? (
          <div className="border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 p-3 font-mono text-xs text-[var(--destructive)]">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center font-mono text-xs text-[var(--muted-foreground)]">
            No records in {descriptor.model}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase text-[var(--muted-foreground)]">
                  {visibleFields.map((f) => (
                    <th key={f.name} className="px-3 py-2">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const rid = String(row.id ?? idx);
                  return (
                    <tr key={rid} className="border-b border-[var(--border)]/60 hover:bg-[var(--muted)]/35">
                      {visibleFields.map((f) => (
                        <td key={f.name} className="px-3 py-2">
                          <FieldWidgetCell value={row[f.name]} field={f} />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          {customActions.map((act) => (
                            <Button
                              key={act.id}
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                setMutationError(null);
                                try {
                                  await act.onTrigger(rid);
                                } catch (err) {
                                  setMutationError(err instanceof Error ? err.message : "Action failed");
                                }
                              }}
                            >
                              {act.label}
                            </Button>
                          ))}
                          {onUpdate && descriptor.acl?.canUpdate !== false ? (
                            <Button type="button" size="sm" variant="ghost" onClick={() => openEditForm(row)}>
                              Edit
                            </Button>
                          ) : null}
                          {onInspectHistory ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                const entries = await onInspectHistory(rid);
                                setHistory(entries);
                              }}
                            >
                              History
                            </Button>
                          ) : null}
                          {onArchive && descriptor.acl?.canUpdate !== false ? (
                            <Button type="button" size="sm" variant="ghost" onClick={() => void onArchive(rid)}>
                              Archive
                            </Button>
                          ) : null}
                          {onRestore && descriptor.acl?.canUpdate !== false ? (
                            <Button type="button" size="sm" variant="ghost" onClick={() => void onRestore(rid)}>
                              Restore
                            </Button>
                          ) : null}
                          {onDelete && descriptor.acl?.canDelete !== false ? (
                            <Button type="button" size="sm" variant="ghost" onClick={() => void onDelete(rid)}>
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {history ? (
          <div className="border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[var(--primary)]">HISTORY ({history.length})</span>
              <button type="button" onClick={() => setHistory(null)} className="cursor-pointer">
                ✕
              </button>
            </div>
            {history.length === 0 ? (
              <div className="text-[var(--muted-foreground)]">No audit events recorded.</div>
            ) : (
              <ul className="space-y-1">
                {history.slice(0, 8).map((h) => (
                  <li key={h.id}>
                    {h.action} · v{h.entity_version ?? 1} · {h.changed_by ?? h.source ?? "system"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ---------- Zine & Tactile Components ---------- */
export function ZineCard({
  asChild = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) {
  const cls = cn(
    "border-2 border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-[4px_4px_0_rgba(0,0,0,0.45)]",
    className,
  );
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, { ...props, className: cn(cls, child.props.className) } as Record<string, unknown>);
  }
  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}

export function ZineCardRough({
  asChild = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) {
  const cls = cn(
    "border-2 border-[var(--primary)]/70 bg-[var(--card)] text-[var(--card-foreground)] shadow-[5px_5px_0_rgba(0,0,0,0.55)]",
    className,
  );
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, { ...props, className: cn(cls, child.props.className) } as Record<string, unknown>);
  }
  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}

export function ZineButton({
  tone = "yellow",
  asChild = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "yellow" | "pink" | "blue" | "paper" | "ink" | "green";
  asChild?: boolean;
}) {
  const toneClasses: Record<string, string> = {
    yellow: "bg-[var(--yellow)] text-[var(--ink)] border-[var(--ink)] hover:brightness-105",
    pink: "bg-[var(--pink)] text-[var(--ink)] border-[var(--ink)] hover:brightness-105",
    blue: "bg-[var(--blue)] text-white border-[var(--ink)] hover:brightness-105",
    paper: "bg-[var(--paper)] text-[var(--ink)] border-[var(--ink)] hover:brightness-95",
    ink: "bg-[var(--ink)] text-[var(--paper)] border-[var(--primary)] hover:bg-[var(--card)]",
    green: "bg-[var(--green)] text-[var(--ink)] border-[var(--ink)] hover:brightness-105",
  };
  const cls = cn(
    "inline-flex items-center justify-center gap-2 border-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,0.65)] transition-transform active:translate-y-0.5 cursor-pointer",
    toneClasses[tone] ?? toneClasses.yellow,
    className,
  );
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, { ...props, className: cn(cls, child.props.className) } as Record<string, unknown>);
  }
  return (
    <button type={props.type ?? "button"} className={cls} {...props}>
      {children}
    </button>
  );
}

export function ZineBadge({
  tone = "yellow",
  color,
  dark,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: string; color?: string; dark?: boolean }) {
  return (
    <span
      data-tone={tone}
      style={color ? { borderColor: color, color: dark ? "#070910" : color, backgroundColor: dark ? color : undefined } : undefined}
      className={cn(
        "inline-flex items-center border border-[var(--primary)]/50 bg-[var(--primary)]/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function ZineInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <Input className={cn("border-2 font-mono text-xs", className)} {...props} />;
}

export function ZineImage({
  src,
  art,
  alt = "",
  sizes: _sizes,
  className,
}: {
  src?: string;
  art?: string;
  alt?: string;
  sizes?: string;
  className?: string;
}) {
  const resolved = src ?? (art ? `/art/${art}.png` : "/art/hero-witness.png");
  return (
    <div className={cn("overflow-hidden border-2 border-[var(--border)] bg-[var(--background)]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolved} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}

export function Sticker({
  tone = "yellow",
  variant,
  text,
  code,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "yellow" | "pink" | "blue" | "paper" | "green" | string;
  variant?: string;
  text?: string;
  code?: string;
}) {
  const effTone = variant === "barcode" ? "paper" : tone;
  const toneCls =
    effTone === "pink"
      ? "sticker-pink"
      : effTone === "blue"
        ? "sticker-blue"
        : effTone === "paper"
          ? "sticker-paper"
          : "sticker-yellow";
  return (
    <span data-variant={variant} className={cn("sticker px-2.5 py-0.5 text-xs", toneCls, className)} {...props}>
      {children ?? text ?? code ?? variant?.toUpperCase()}
    </span>
  );
}
export const DistressedSticker = Sticker;

export function Tape({
  variant,
  label,
  width,
  className,
}: {
  variant?: string;
  label?: string;
  width?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      data-variant={variant}
      style={width ? { minWidth: width } : undefined}
      className={cn(
        "pointer-events-none inline-flex items-center justify-center bg-[var(--yellow)]/75 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--ink)] -rotate-2 opacity-90",
        className,
      )}
    >
      {label ?? "\u00A0"}
    </span>
  );
}
export const TactileTape = Tape;

export function Staple({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none inline-block h-1 w-6 rounded-full bg-zinc-400/75", className)}
    />
  );
}

export function Grain({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("pointer-events-none fixed inset-0 z-0 opacity-[0.03]", className)} />;
}

export function Halftone({ tone, className }: { tone?: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-tone={tone}
      className={cn("pointer-events-none absolute inset-0 opacity-10", className)}
      style={{
        backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
        backgroundSize: "10px 10px",
      }}
    />
  );
}

export function Grid({
  cols: _cols,
  gap: _gap,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { cols?: Record<string, number>; gap?: number }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CornerBrackets({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  if (children) {
    return (
      <div className={cn("relative", className)}>
        <span aria-hidden="true" className="pointer-events-none absolute top-1 left-1 h-2.5 w-2.5 border-t-2 border-l-2 border-[var(--primary)]/60" />
        <span aria-hidden="true" className="pointer-events-none absolute top-1 right-1 h-2.5 w-2.5 border-t-2 border-r-2 border-[var(--primary)]/60" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1 h-2.5 w-2.5 border-b-2 border-l-2 border-[var(--primary)]/60" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-1 right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-[var(--primary)]/60" />
        {children}
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      <span className="absolute top-1.5 left-1.5 h-2.5 w-2.5 border-t-2 border-l-2 border-[var(--primary)]/60" />
      <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 border-t-2 border-r-2 border-[var(--primary)]/60" />
      <span className="absolute bottom-1.5 left-1.5 h-2.5 w-2.5 border-b-2 border-l-2 border-[var(--primary)]/60" />
      <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 border-b-2 border-r-2 border-[var(--primary)]/60" />
    </div>
  );
}

export function Marquee({
  items,
  children,
  className,
}: {
  items?: readonly string[];
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden border-y border-[var(--border)] bg-[var(--card)] py-2 font-mono text-xs tracking-widest uppercase text-[var(--primary)]",
        className,
      )}
    >
      <div className="flex items-center gap-6 whitespace-nowrap px-4">
        {items ? items.map((item, idx) => <span key={idx}>{item}</span>) : children}
      </div>
    </div>
  );
}

export function SkipLink({ href = "#main", label = "Skip to content" }: { href?: string; label?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:border-2 focus:border-[var(--primary)] focus:bg-[var(--background)] focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:text-[var(--foreground)]"
    >
      {label}
    </a>
  );
}

/* ---------- Data Visualization & Telemetry ---------- */
export function BarChart({
  data,
  height = 96,
  ariaLabel = "Bar chart",
}: {
  data: readonly { label: string; value: number; colorVar?: string }[];
  height?: number;
  ariaLabel?: string;
}) {
  const maxVal = Math.max(100, ...data.map((d) => d.value));
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="flex items-end gap-3 pt-2">
      {data.map((d) => {
        const pct = Math.max(4, Math.min(100, (d.value / maxVal) * 100));
        return (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="font-mono text-[10px] text-[var(--foreground)]">{d.value}%</span>
            <div className="relative flex w-full flex-1 items-end bg-[var(--muted)]/50">
              <div style={{ height: `${pct}%`, backgroundColor: d.colorVar ?? "var(--primary)" }} className="w-full transition-all" />
            </div>
            <span className="font-mono text-[9px] text-[var(--muted-foreground)]">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RadialGauge({
  value,
  percent,
  max = 100,
  size = 84,
  label,
  unit = "%",
  colorVar = "var(--primary)",
  tone,
  ariaLabel,
  className,
}: {
  value: number | string;
  percent?: number;
  max?: number;
  size?: number | string;
  label?: string;
  unit?: string;
  colorVar?: string;
  tone?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const numVal = percent ?? (typeof value === "number" ? value : Number.parseFloat(value) || 0);
  const pxSize = typeof size === "number" ? size : size === "sm" ? 64 : size === "lg" ? 104 : 84;
  const strokeColor =
    tone === "pink"
      ? "var(--pink)"
      : tone === "blue"
        ? "var(--blue)"
        : tone === "yellow"
          ? "var(--yellow)"
          : tone === "green"
            ? "var(--green)"
            : colorVar;
  const pct = Math.max(0, Math.min(1, numVal / Math.max(1, max)));
  const r = 34;
  const circ = 2 * Math.PI * r;
  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `${label ?? "Gauge"} ${typeof value === "string" ? value : `${Math.round(numVal)}${unit}`}`}
      style={{ width: pxSize, height: pxSize }}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
    >
      <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
        <span className="font-mono text-xs font-bold text-[var(--foreground)]">
          {typeof value === "string" ? value : `${Math.round(numVal)}${unit}`}
        </span>
        {label ? <span className="font-mono text-[9px] text-[var(--muted-foreground)]">{label}</span> : null}
      </div>
    </div>
  );
}
export const Gauge = RadialGauge;

export function Sparkline({
  values,
  data,
  height = 32,
  ariaLabel,
  className = "w-full",
}: {
  values?: readonly number[];
  data?: readonly number[];
  height?: number;
  ariaLabel?: string;
  className?: string;
}) {
  const series = data ?? values ?? [20, 42, 35, 68, 52, 74];
  const max = Math.max(1, ...series);
  const min = Math.min(0, ...series);
  const span = Math.max(1, max - min);
  const points = series
    .map((v, i) => {
      const x = (i / Math.max(1, series.length - 1)) * 100;
      const y = 28 - ((v - min) / span) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 30"
      style={{ height }}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn("text-[var(--primary)]", className)}
    >
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}

export function StatBlock({
  label,
  value,
  note,
  trend,
  tone,
  density,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  trend?: string;
  tone?: string;
  density?: string;
  className?: string;
}) {
  return (
    <div
      data-tone={tone}
      data-density={density}
      className={cn("border border-[var(--border)] bg-[var(--card)] p-4", className)}
    >
      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">{label}</div>
      <div className="mt-1 font-brush text-2xl text-[var(--foreground)]">{value}</div>
      {trend || note ? (
        <div className="mt-1 font-mono text-[11px] text-[var(--primary)]">{trend ?? note}</div>
      ) : null}
    </div>
  );
}

/* ---------- Brand Logos, Cutouts & Artworks ---------- */
export function DnaBrandLogo({
  id,
  variant = "mark",
  size = 32,
  className,
  decorative,
}: {
  id: BrandLogoId;
  variant?: "mark" | "lockup" | "stamp";
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  const label = String(id).replace(/^\d+-/, "").replace(/-/g, " ").toUpperCase();
  return (
    <span aria-hidden={decorative ? true : undefined} className={cn("inline-flex items-center gap-2 text-[var(--primary)]", className)}>
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polygon points="18,3 31,10.5 31,25.5 18,33 5,25.5 5,10.5" />
        <circle cx="18" cy="18" r="5" />
      </svg>
      {variant !== "mark" ? (
        <span className="font-mono text-xs font-bold tracking-[0.14em] text-[var(--foreground)]">{label}</span>
      ) : null}
    </span>
  );
}

export function CutoutArtwork({
  id,
  className = "h-20 w-20",
  decorative,
}: {
  id: CutoutArtworkId;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      data-cutout={id}
      aria-hidden={decorative ? true : undefined}
      className={cn("text-[var(--primary)]", className)}
    >
      <rect x="8" y="8" width="48" height="48" rx="4" strokeDasharray="4 2" opacity="0.45" />
      <polygon points="32,14 48,26 42,46 22,46 16,26" />
      <circle cx="32" cy="31" r="6" />
    </svg>
  );
}

function makeArtSvg(path: string, label: string) {
  return function ArtSvg({
    className = "h-24 w-24",
    decorative,
  }: {
    className?: string;
    decorative?: boolean;
  }) {
    return (
      <svg
        viewBox="0 0 80 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-label={decorative ? undefined : label}
        aria-hidden={decorative ? true : undefined}
        className={cn("text-[var(--primary)]", className)}
      >
        <circle cx="40" cy="40" r="34" strokeOpacity="0.25" strokeDasharray="3 3" />
        <path d={path} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };
}

export const CableCoilArt = makeArtSvg("M20 40c0-11 9-20 20-20s20 9 20 20-9 20-20 20-12-5-12-12 5-12 12-12", "Cable coil artwork");
export const CassetteRecorderArt = makeArtSvg("M14 24h52v32H14zM28 40a5 5 0 1 0 0.01 0M52 40a5 5 0 1 0 0.01 0M24 56l6-8h20l6 8", "Cassette recorder artwork");
export const EmptyStateArt = makeArtSvg("M20 50l20-26 20 26H20zM40 34v8", "Empty state artwork");
export const IndustrialBatteryArt = makeArtSvg("M22 22h36v40H22zM30 16h6v6h-6zM44 16h6v6h-6zM40 32l-6 10h6l-2 10 8-12h-6z", "Industrial battery artwork");
export const LoadingConstellation = makeArtSvg("M40 14l7 19 19 7-19 7-7 19-7-19-19-7 19-7 7-19z", "Loading constellation");
export const LunarDiscArt = makeArtSvg("M48 52A18 18 0 0 1 34 20a20 20 0 1 0 24 30 18 18 0 0 1-10 2z", "Lunar disc artwork");

export function SkinOrnament({
  slot = "corner",
  label,
  className,
}: {
  slot?: "corner" | "tag" | string;
  label?: string;
  className?: string;
}) {
  if (slot === "tag") {
    return (
      <span
        className={cn(
          "inline-flex items-center border border-[var(--primary)]/50 bg-[var(--primary)]/12 px-2.5 py-0.5 font-mono text-[10px] tracking-widest text-[var(--primary)] uppercase",
          className,
        )}
      >
        {label ?? "CANON"}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute h-3.5 w-3.5 border-t-2 border-r-2 border-[var(--primary)]/60", className)}
    />
  );
}

export function SkinBackdrop({
  skin,
  dnaId,
  seed: _seed,
  className,
}: {
  skin?: SkinName;
  dnaId?: MasterDnaId;
  seed?: number;
  className?: string;
}) {
  const world = dnaId ? getDnaWorld(dnaId) : undefined;
  return (
    <div
      aria-hidden="true"
      data-skin={skin}
      className={cn("pointer-events-none absolute inset-0 opacity-25", className)}
      style={{
        background: world
          ? `radial-gradient(circle at 85% 15%, ${world.palette.accent}33, transparent 52%), radial-gradient(circle at 15% 85%, ${world.palette.accentSecondary}22, transparent 50%)`
          : "radial-gradient(circle at 80% 20%, rgba(223,192,123,0.18), transparent 55%)",
      }}
    />
  );
}

export function WorldArtwork({ dnaId, className }: { dnaId: MasterDnaId; className?: string }) {
  const world = getDnaWorld(dnaId);
  return (
    <div
      className={cn("relative overflow-hidden border p-3 font-mono text-[10px]", className)}
      style={{ backgroundColor: world.palette.surface, borderColor: world.palette.border, color: world.palette.text }}
    >
      <div
        className="h-16 w-full"
        style={{ background: `linear-gradient(135deg, ${world.palette.canvas} 0%, ${world.palette.surfaceElevated} 55%, ${world.palette.accent}55 100%)` }}
      />
      <div className="mt-2 flex items-center justify-between">
        <span>{world.numeral} · {world.name}</span>
        <span style={{ color: world.palette.accent }}>{world.mappedSkinPreset}</span>
      </div>
    </div>
  );
}

export function SkinArtworkFrame({
  skin,
  dnaId,
  artKey,
  showCutout: _showCutout,
  eager: _eager,
  preferDnaArtwork: _preferDnaArtwork,
  sizes: _sizes,
  className,
  plateClassName,
  scrimClassName,
}: {
  skin?: SkinName;
  dnaId?: MasterDnaId;
  artKey?: string;
  showCutout?: boolean;
  eager?: boolean;
  preferDnaArtwork?: boolean;
  sizes?: string;
  className?: string;
  plateClassName?: string;
  scrimClassName?: string;
}) {
  const world = dnaId ? getDnaWorld(dnaId) : getDnaWorld("01-imperium-lumen");
  return (
    <div
      data-skin={skin}
      className={cn("relative overflow-hidden flex items-center justify-center", className)}
      style={{ background: `linear-gradient(120deg, ${world.palette.canvas}, ${world.palette.surfaceElevated}, ${world.palette.accent}33)` }}
    >
      {artKey ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/art/${artKey}.png`}
          alt=""
          className={cn("h-full w-full object-cover opacity-55", plateClassName)}
        />
      ) : null}
      {scrimClassName ? <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", scrimClassName)} /> : null}
    </div>
  );
}

export function SkinMatrixCompare({
  dnaId,
  mode,
  density,
}: {
  dnaId: MasterDnaId;
  mode: "light" | "dark";
  density: CanonicalDensity;
}) {
  const world = getDnaWorld(dnaId);
  const presets = listPresets();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {presets.map((presetKey) => {
        const meta = skinPresets[presetKey];
        return (
          <div key={presetKey} data-skin={presetKey} data-mode={mode} data-density={density} className="space-y-2 border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="font-bold uppercase text-[var(--primary)]">{meta.label}</span>
              <span className="text-[var(--muted-foreground)]">{mode}</span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">{meta.description}</p>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: world.palette.accent }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: world.palette.accentSecondary }} />
              <span className="font-mono text-[9px] text-[var(--muted-foreground)]">{density}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SkinPlayground() {
  const { skin, setSkin, dnaId, setDna, mode, setMode } = useSkin();
  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap gap-1.5">
        {listPresets().slice(0, 6).map((p) => (
          <Button key={p} size="sm" variant={skin === p ? "default" : "outline"} onClick={() => setSkin(p)}>
            {p}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {listDnaWorlds().map((w) => (
          <Button key={w.id} size="sm" variant={dnaId === w.id ? "default" : "outline"} onClick={() => setDna(w.id)}>
            {w.numeral}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--muted-foreground)]">
        <span>Active: {skin} · {dnaId} · {mode}</span>
        <Button size="sm" variant="ghost" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
          Toggle Mode
        </Button>
      </div>
    </div>
  );
}

export function TokenInspector() {
  const { dnaId } = useSkin();
  const world = getDnaWorld(dnaId);
  const audit = auditDnaContrast(world);
  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(world.palette).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border border-[var(--border)] px-2.5 py-1.5">
            <span className="text-[var(--muted-foreground)]">{k}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 border border-white/20" style={{ backgroundColor: v }} />
              {v}
            </span>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-[var(--primary)]">
        WCAG 2.1 AA Audit: {audit.passed ? "ALL PAIRS PASS" : "CHECK CONTRAST"}
      </div>
    </div>
  );
}

/* ---------- Domain Composites (Dock, Command Center, Timeline) ---------- */
export function WorldMap({
  cities = [],
  selectedId,
  onSelect,
  backdrop,
}: {
  cities: readonly { id: string; city: string; signals?: number; lat?: number; lng?: number; x?: number; y?: number }[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  backdrop?: ReactNode;
}) {
  return (
    <div className="relative h-64 w-full overflow-hidden border-2 border-[var(--border)] bg-[var(--card)] sm:h-80">
      {backdrop ? <div className="pointer-events-none absolute inset-0 opacity-65">{backdrop}</div> : null}
      <div className="relative z-10 h-full w-full">
        {cities.map((c, idx) => {
          const left = c.x ?? (c.lng !== undefined ? ((c.lng + 180) / 360) * 100 : 15 + ((idx * 17) % 70));
          const top = c.y ?? (c.lat !== undefined ? ((90 - c.lat) / 180) * 100 : 25 + ((idx * 23) % 50));
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect?.(c.id)}
              style={{ left: `${left}%`, top: `${top}%` }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 border px-2 py-0.5 font-mono text-[10px] transition-transform cursor-pointer",
                active
                  ? "z-20 scale-110 border-[var(--primary)] bg-[var(--primary)] font-bold text-[var(--primary-foreground)]"
                  : "border-[var(--border)] bg-[var(--card)]/90 text-[var(--foreground)] hover:border-[var(--primary)]",
              )}
            >
              {c.city}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EventCard({
  event,
  selected,
  list: _list,
  onClick,
  onOpen,
  onSelect,
  className,
}: {
  event: { id: string; title: string; date?: string; year?: string | number; summary?: string; excerpt?: string; kind?: string; era?: string };
  selected?: boolean;
  list?: boolean;
  onClick?: () => void;
  onOpen?: () => void;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        onOpen?.();
        onSelect?.(event.id);
      }}
      className={cn(
        "w-full border p-4 text-left transition-colors cursor-pointer",
        selected
          ? "border-[var(--primary)] bg-[var(--primary)]/12"
          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/60",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--muted-foreground)]">
        <span>{event.date ?? event.year ?? event.era ?? "ARCHIVE"}</span>
        {event.kind ? <Badge variant="outline">{event.kind}</Badge> : null}
      </div>
      <div className="mt-1 font-semibold text-sm text-[var(--foreground)]">{event.title}</div>
      {event.summary || event.excerpt ? (
        <p className="mt-1 line-clamp-2 text-xs text-[var(--muted-foreground)]">{event.summary ?? event.excerpt}</p>
      ) : null}
    </button>
  );
}

export function EventDetail({
  event,
  era,
  relatedEvents = [],
  shareUrl,
  onRelated,
  onClose,
}: {
  event: { id: string; title: string; date?: string; year?: string | number; summary?: string; excerpt?: string; body?: string; kind?: string; tags?: string[] };
  era?: { id?: string; name?: string; title?: string; span?: string };
  relatedEvents?: readonly { id: string; title: string }[];
  shareUrl?: string;
  onRelated?: (id: string) => void;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)]">
            {era?.name ?? era?.title ?? "CHRONICLE"} · {event.date ?? event.year ?? ""}
          </div>
          <h2 className="mt-1 font-brush text-2xl text-[var(--foreground)]">{event.title}</h2>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close detail" className="border border-[var(--border)] px-2 py-1 font-mono text-xs cursor-pointer">
            ✕
          </button>
        ) : null}
      </div>
      {event.summary || event.excerpt ? <p className="text-sm text-[var(--foreground)]">{event.summary ?? event.excerpt}</p> : null}
      {event.body ? <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">{event.body}</p> : null}
      {shareUrl ? <div className="font-mono text-[10px] text-[var(--muted-foreground)] break-all">PERMALINK: {shareUrl}</div> : null}
      {relatedEvents.length > 0 ? (
        <div className="space-y-1.5 border-t border-[var(--border)] pt-3">
          <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">Related Events</div>
          <div className="flex flex-wrap gap-1.5">
            {relatedEvents.map((r) => (
              <Button key={r.id} size="sm" variant="outline" onClick={() => onRelated?.(r.id)}>
                {r.title}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EraBand({
  eras,
  active,
  onSelect,
  era,
  title,
  count,
  children,
  className,
}: {
  eras?: readonly { id: string; name?: string; label?: string; count?: number }[];
  active?: string;
  onSelect?: (nextEra: string) => void;
  era?: { name?: string; title?: string; span?: string };
  title?: string;
  count?: number;
  children?: ReactNode;
  className?: string;
}) {
  if (eras && eras.length > 0) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {eras.map((e) => (
          <Button
            key={e.id}
            size="sm"
            variant={active === e.id ? "default" : "outline"}
            onClick={() => onSelect?.(e.id)}
          >
            {e.label ?? e.name ?? e.id}
            {e.count !== undefined ? ` (${e.count})` : ""}
          </Button>
        ))}
      </div>
    );
  }
  return (
    <section className={cn("space-y-3 border-l-2 border-[var(--primary)]/50 pl-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-brush text-xl text-[var(--foreground)]">{title ?? era?.name ?? era?.title ?? "ERA"}</h3>
        {count !== undefined ? <Badge variant="outline">{count}</Badge> : null}
      </div>
      {children}
    </section>
  );
}

export function ChapterBanner({
  kicker,
  chapter,
  meta,
  title,
  subtitle,
  children,
  className,
}: {
  kicker?: string;
  chapter?: string;
  meta?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-2 border-[var(--border)] bg-[var(--card)] p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {kicker || chapter ? (
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)]">{kicker ?? chapter}</div>
        ) : null}
        {meta ? <div className="font-mono text-[10px] text-[var(--muted-foreground)]">{meta}</div> : null}
      </div>
      {title ? <h2 className="mt-1 font-brush text-3xl text-[var(--foreground)]">{title}</h2> : null}
      {subtitle ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</p> : null}
      {children}
    </div>
  );
}

export function CollectionsGrid({
  items,
  collections,
  onOpenCollection,
  children,
  className,
}: {
  items?: readonly { id: string; title?: string; name?: string; count?: number; episodes?: number; description?: string }[];
  collections?: readonly { id: string; title?: string; name?: string; count?: number; episodes?: number; description?: string }[];
  onOpenCollection?: (id: string) => void;
  children?: ReactNode;
  className?: string;
}) {
  const list = collections ?? items ?? [];
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {children ??
        list.map((item) => (
          <Card
            key={item.id}
            onClick={() => onOpenCollection?.(item.id)}
            className={cn("p-4", onOpenCollection ? "cursor-pointer hover:border-[var(--primary)]" : "")}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-sm">{item.title ?? item.name}</div>
              {(item.count ?? item.episodes) !== undefined ? (
                <Badge variant="outline">{item.count ?? item.episodes}</Badge>
              ) : null}
            </div>
            {item.description ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.description}</p> : null}
          </Card>
        ))}
    </div>
  );
}

export function CrewConstellation({
  members,
  witnesses,
  stats,
  stickerText,
  cta,
  backdrop,
  demo: _demo,
  className,
}: {
  members?: readonly { id?: string; name: string; role?: string; handle?: string; place?: string }[];
  witnesses?: readonly { id?: string; name: string; place?: string; quote?: string; signals?: number }[];
  stats?: readonly { label: string; target: number }[];
  demo?: boolean;
  stickerText?: string;
  cta?: ReactNode;
  backdrop?: ReactNode;
  className?: string;
}) {
  const list = witnesses ?? members ?? [];
  return (
    <div className={cn("relative space-y-4 overflow-hidden border border-[var(--border)] bg-[var(--card)] p-4", className)}>
      {backdrop ? <div className="pointer-events-none absolute inset-0 opacity-20">{backdrop}</div> : null}
      <div className="relative z-10 space-y-4">
        {stickerText ? <Sticker tone="yellow">{stickerText}</Sticker> : null}
        {stats && stats.length > 0 ? (
          <div className="flex flex-wrap gap-4 font-mono text-xs">
            {stats.map((s) => (
              <div key={s.label}>
                <span className="text-[var(--muted-foreground)]">{s.label}: </span>
                <strong className="text-[var(--primary)]">{s.target}</strong>
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m, idx) => (
            <div key={m.id ?? idx} className="flex items-center gap-3 border border-[var(--border)] bg-[var(--background)]/85 p-3">
              <WitnessAvatar seed={m.name} size={36} />
              <div className="min-w-0">
                <div className="truncate font-semibold text-xs text-[var(--foreground)]">{m.name}</div>
                <div className="truncate font-mono text-[10px] text-[var(--muted-foreground)]">
                  {"place" in m && m.place ? m.place : "role" in m && m.role ? m.role : "Witness"}
                </div>
              </div>
            </div>
          ))}
        </div>
        {cta ? <div>{cta}</div> : null}
      </div>
    </div>
  );
}

export function WitnessAvatar({
  seed = "witness",
  size = 40,
  alt,
  dnaId: _dnaId,
  options: _options,
  className,
}: {
  seed?: string;
  size?: number;
  alt?: string;
  dnaId?: string;
  options?: Record<string, unknown>;
  className?: string;
}) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const initials = seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "MW";
  return (
    <div
      role="img"
      aria-label={alt ?? seed}
      style={{
        width: size,
        height: size,
        backgroundColor: `hsl(${hue}, 55%, 24%)`,
        borderColor: `hsl(${hue}, 70%, 62%)`,
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-bold text-white",
        className,
      )}
    >
      {initials}
    </div>
  );
}

export function FilmStrip({
  frames = [],
  label,
  children,
  className,
}: {
  frames?: readonly { id: string; title?: string; src?: string }[];
  label?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-label={label}
      className={cn("flex gap-3 overflow-x-auto border-y-2 border-dashed border-[var(--border)] py-3", className)}
    >
      {children ??
        frames.map((f) => (
          <div key={f.id} className="w-44 shrink-0 border border-[var(--border)] bg-[var(--card)] p-2 text-xs">
            {f.title ?? f.id}
          </div>
        ))}
    </div>
  );
}



export function ModuleGlyph({
  name,
  icon,
  className = "h-5 w-5",
}: {
  name?: string;
  icon?: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" data-glyph={name ?? icon} className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

export function ModuleCard<T extends { id?: string; name?: string; title?: string; description?: string } = { id?: string; name?: string; title?: string; description?: string }>({
  title,
  description,
  badge,
  href,
  module,
  art,
  onOpen,
  onClick,
  children,
  className,
}: {
  title?: string;
  description?: string;
  badge?: string;
  href?: string;
  module?: T;
  art?: ReactNode;
  onOpen?: (m: T) => void;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const heading = title ?? module?.name ?? module?.title ?? "Module";
  const desc = description ?? module?.description;
  const inner = (
    <Card
      className={cn("h-full overflow-hidden p-4 transition-colors hover:border-[var(--primary)]", (onOpen || onClick) ? "cursor-pointer" : "", className)}
      onClick={() => {
        onClick?.();
        if (module && onOpen) onOpen(module);
      }}
    >
      {art ? <div className="mb-3">{art}</div> : null}
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-sm text-[var(--foreground)]">{heading}</div>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>
      {desc ? <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">{desc}</p> : null}
      {children}
    </Card>
  );
  return href ? <a href={href} className="block">{inner}</a> : inner;
}

export function QuickActionGrid<T extends { id?: string; label: string; href?: string; onClick?: () => void } = { id?: string; label: string; href?: string; onClick?: () => void }>({
  actions = [],
  onAction,
  children,
  className,
}: {
  actions?: readonly T[];
  onAction?: (action: T) => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {children ??
        actions.map((a, idx) =>
          a.href ? (
            <a
              key={a.id ?? idx}
              href={a.href}
              className="border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 font-mono text-xs text-[var(--foreground)] hover:border-[var(--primary)]"
            >
              {a.label}
            </a>
          ) : (
            <Button
              key={a.id ?? idx}
              variant="outline"
              onClick={() => {
                a.onClick?.();
                onAction?.(a);
              }}
            >
              {a.label}
            </Button>
          ),
        )}
    </div>
  );
}

export function ScenePage({ className, style, children, ...props }: HTMLAttributes<HTMLDivElement> & { style?: CSSProperties }) {
  return (
    <div className={cn("mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8", className)} style={style} {...props}>
      {children}
    </div>
  );
}

export function ScenePanel({
  art,
  effects,
  scrim,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  art?: ReactNode;
  effects?: ReactNode;
  scrim?: string;
}) {
  return (
    <section data-scrim={scrim} className={cn("relative overflow-hidden border border-[var(--border)] bg-[var(--card)] p-5", className)} {...props}>
      {art ? <div className="pointer-events-none absolute inset-0 opacity-35">{art}</div> : null}
      {effects}
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function WorkspaceList({
  items = [],
  onOpenItem,
  children,
  className,
}: {
  items?: readonly { id: string; name?: string; title?: string; status?: string; meta?: string; updatedAt?: string; kind?: string }[];
  onOpenItem?: (id: string) => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-[var(--border)] border border-[var(--border)] bg-[var(--card)]", className)}>
      {children ??
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenItem?.(item.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-xs hover:bg-[var(--muted)]/40 cursor-pointer"
          >
            <span className="font-medium text-[var(--foreground)]">{item.title ?? item.name}</span>
            <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
              {item.status ?? item.meta ?? item.updatedAt ?? "ACTIVE"}
            </span>
          </button>
        ))}
    </div>
  );
}
