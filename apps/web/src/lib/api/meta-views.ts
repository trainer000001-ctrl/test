"use client";

import {
  MoonwitnessApiError,
  TENANT_STORAGE_KEY,
  moonwitnessSdk,
  requestApiJson,
  requestApiResponse,
} from "@moonwitness/contracts/sdk";
import { useCallback, useEffect, useState } from "react";
import {
  resolveNavIconPath,
  type AutoModelFieldSpec,
  type AutoModelFieldType,
  type AutoModelRow,
  type AutoModelViewDescriptor,
} from "@moonwitness/ui";
import { navHref, type NavItem } from "@/components/shell/nav-items";

export interface RuntimeMetaAddon {
  id: string;
  name: string;
  addon_version: string;
  description: string;
  category: string;
  state: "installed" | "disabled" | "upgrade_pending" | "error";
  auto_install: boolean;
  last_error: string | null;
  enabled: boolean;
}

export interface RuntimeNavMenuItem {
  id: string;
  menu_key: string;
  addon: string;
  parent_key: string | null;
  label: string;
  href: string;
  icon: string;
  plane: "creator" | "operations" | "public";
  sort_order: number;
  min_role: "admin" | "editor" | "viewer" | "public";
}

export interface RuntimeMetaField {
  id: string;
  model_name: string;
  field_name: string;
  field_type: "text" | "integer" | "real" | "boolean" | "date" | "json" | "selection";
  nullable: boolean;
  required: boolean;
  deprecated: boolean;
  is_custom: boolean;
  origin_addon: string;
  ui_widget: string;
  label: string;
  help?: string;
  readonly?: boolean;
  selection: string[] | null;
  default_value: unknown;
  relation?: {
    model: string;
    type?: "many2one" | "many2many";
  };
}

export interface RuntimeCustomActionSpec {
  id: string;
  label: string;
  method: "POST" | "PATCH" | "DELETE";
  urlTemplate: string;
  roles: Array<"admin" | "editor" | "viewer">;
}

export interface RuntimeActionBindings {
  listUrl?: string;
  createUrl?: string;
  updateUrl?: string;
  archiveUrl?: string;
  restoreUrl?: string;
  deleteUrl?: string;
  historyUrl?: string;
  customActions?: RuntimeCustomActionSpec[];
}

export interface RuntimeViewDescriptorResponse {
  model: string;
  table: string;
  extensible: boolean;
  restEnabled: boolean;
  acl: {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  fields: RuntimeMetaField[];
  views: Array<{
    id?: string;
    view_type: "list" | "form" | "detail" | "kanban" | "search";
    addon: string;
    priority: number;
    spec: Record<string, unknown>;
  }>;
  actionBindings: RuntimeActionBindings;
}

export function getActiveTenantId(): string {
  if (typeof window === "undefined") return "default";
  try {
    const val = window.localStorage.getItem(TENANT_STORAGE_KEY)?.trim();
    return val || "default";
  } catch {
    return "default";
  }
}

export function setActiveTenantId(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = slug.trim() || "default";
    window.localStorage.setItem(TENANT_STORAGE_KEY, next);
    window.dispatchEvent(new Event("mw:tenant-changed"));
  } catch {
    // ignore storage failures
  }
}

async function fetchApiJson<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    return await requestApiJson<T>(url, init);
  } catch (err) {
    if (err instanceof MoonwitnessApiError && err.message === `HTTP ${err.status}`) {
      throw new MoonwitnessApiError(`Request failed (${err.status})`, err.status);
    }
    throw err;
  }
}

export function resolveBindingUrl(template: string, id?: string): string {
  return id === undefined ? template : template.replace(/\{id\}/g, encodeURIComponent(id));
}

export function mapFieldType(field: RuntimeMetaField): AutoModelFieldType {
  if (field.selection && field.selection.length > 0) return "select";
  if (field.relation?.model || field.ui_widget === "relation") return "relation";
  switch (field.ui_widget) {
    case "textarea":
      return "textarea";
    case "tags":
      return "tags";
    case "select":
      return "select";
    case "date":
      return "date";
    case "checkbox":
      return "boolean";
    case "number":
      return field.field_type === "integer" ? "integer" : "number";
  }
  switch (field.field_type) {
    case "integer":
      return "integer";
    case "real":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
      return "date";
    case "selection":
      return "select";
    default:
      return "text";
  }
}

export function mapRuntimeViewToAutoDescriptor(
  view: RuntimeViewDescriptorResponse,
  overrides: Partial<
    Pick<AutoModelViewDescriptor, "title" | "description" | "domainIcon" | "cutoutId">
  > = {},
): AutoModelViewDescriptor {
  const fields: AutoModelFieldSpec[] = (view.fields ?? [])
    .filter((f) => !f.deprecated)
    .map((f) => ({
      name: f.field_name,
      label: f.label || f.field_name,
      type: mapFieldType(f),
      widget: f.ui_widget,
      required: f.required,
      readonly: f.readonly,
      help: f.help,
      isCustom: f.is_custom,
      selection: f.selection ?? undefined,
      relation: f.relation,
    }));

  const listView = (view.views ?? []).find((v) => v.view_type === "list") ?? (view.views ?? [])[0];
  const primarySpec = listView?.spec ?? {};
  return {
    model: view.model,
    title:
      overrides.title ?? (typeof primarySpec.title === "string" ? primarySpec.title : view.model),
    description:
      overrides.description ??
      (typeof primarySpec.description === "string" ? primarySpec.description : undefined),
    domainIcon:
      overrides.domainIcon ??
      (typeof primarySpec.domainIcon === "string" ? primarySpec.domainIcon : undefined),
    cutoutId: overrides.cutoutId,
    columns: Array.isArray(primarySpec.columns)
      ? primarySpec.columns.filter((c): c is string => typeof c === "string")
      : undefined,
    fields,
    acl: view.acl,
  };
}

export function mergeDynamicNavigation(
  staticItems: readonly NavItem[],
  menus: readonly RuntimeNavMenuItem[],
  plane: "creator" | "operations",
): NavItem[] {
  const existingHrefs = new Set(staticItems.map((item) => navHref(item)));
  const planeMenus = menus
    .filter((menu) => menu.plane === plane && !existingHrefs.has(menu.href))
    .sort((a, b) => a.sort_order - b.sort_order);

  const roots = planeMenus.filter((m) => !m.parent_key);
  const byParent = new Map<string, RuntimeNavMenuItem[]>();
  for (const m of planeMenus) {
    if (m.parent_key) {
      const list = byParent.get(m.parent_key) ?? [];
      list.push(m);
      byParent.set(m.parent_key, list);
    }
  }

  const ordered: RuntimeNavMenuItem[] = [];
  for (const root of roots) {
    ordered.push(root);
    const children = byParent.get(root.menu_key) ?? [];
    ordered.push(...children);
    byParent.delete(root.menu_key);
  }
  for (const orphans of byParent.values()) {
    ordered.push(...orphans);
  }

  const additions = ordered.map<NavItem>((menu) => ({
    id: menu.menu_key,
    label: menu.parent_key ? `↳ ${menu.label}` : menu.label,
    icon: resolveNavIconPath(menu.icon),
    target: { kind: "route", href: menu.href },
  }));

  return [...staticItems, ...additions];
}

export async function fetchMetaNavigation(): Promise<RuntimeNavMenuItem[]> {
  try {
    const res = await requestApiResponse("/api/v1/_meta/navigation", { credentials: "include" });
    if (!res.ok) return [];
    const data = (await res.json()) as { menus?: RuntimeNavMenuItem[] };
    return Array.isArray(data.menus) ? data.menus : [];
  } catch {
    return [];
  }
}

export function useMetaNavigation(
  plane: "creator" | "operations",
  staticItems: readonly NavItem[],
  enabled = true,
): NavItem[] {
  const [dynamicMenus, setDynamicMenus] = useState<RuntimeNavMenuItem[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = () => {
      fetchMetaNavigation()
        .then((menus) => {
          if (active) setDynamicMenus(menus);
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("mw:navigation-changed", load);
    return () => {
      active = false;
      setDynamicMenus([]);
      window.removeEventListener("mw:navigation-changed", load);
    };
  }, [enabled]);

  return mergeDynamicNavigation(staticItems, enabled ? dynamicMenus : [], plane);
}

const DEFAULT_MODEL_CATALOG = [
  "cab.change",
  "timeline.event",
  "canon.codex",
  "witness.claim",
  "project.task",
  "project.project",
  "probe.node",
  "ops.event",
  "snmp.target",
  "syslog.entry",
  "radius.session",
  "storage.object",
  "vpn.tunnel",
  "command.workflow",
  "auth.user",
  "res.role",
  "res.permission",
  "res.company",
  "i18n.locale",
  "mail.message",
  "audit.log",
] as const;

export function useMetaModelsCatalog() {
  const [models, setModels] = useState<string[]>([...DEFAULT_MODEL_CATALOG]);

  useEffect(() => {
    let active = true;
    const load = () => {
      moonwitnessSdk.meta
        .getModels()
        .then((res) => {
          if (!active || !Array.isArray(res.models) || res.models.length === 0) return;
          const merged = Array.from(new Set([...DEFAULT_MODEL_CATALOG, ...res.models]));
          setModels(merged);
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("mw:navigation-changed", load);
    return () => {
      active = false;
      window.removeEventListener("mw:navigation-changed", load);
    };
  }, []);

  return models;
}

export function useMetaView(model: string) {
  const [data, setData] = useState<RuntimeViewDescriptorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const view = await fetchApiJson<RuntimeViewDescriptorResponse>(
        `/api/v1/_meta/views/${encodeURIComponent(model)}`,
      );
      setData(view);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load model view descriptor");
    } finally {
      setLoading(false);
    }
  }, [model]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onTenantChanged = () => {
      void reload();
    };
    window.addEventListener("mw:tenant-changed", onTenantChanged);
    return () => window.removeEventListener("mw:tenant-changed", onTenantChanged);
  }, [reload]);

  return { view: data, loading, error, reload };
}

export function useModelRows(model: string, listUrl?: string, restEnabled = true, ready = true) {
  const [rows, setRows] = useState<AutoModelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetUrl = !ready
    ? undefined
    : (listUrl ?? (restEnabled ? `/api/v1/m/${encodeURIComponent(model)}` : undefined));

  const reload = useCallback(async () => {
    if (!ready) {
      return;
    }
    if (!targetUrl) {
      setRows([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchApiJson<
        | {
            data?: AutoModelRow[];
            users?: AutoModelRow[];
            workflows?: AutoModelRow[];
            alerts?: AutoModelRow[];
            items?: AutoModelRow[];
          }
        | AutoModelRow[]
      >(targetUrl);
      const list = Array.isArray(payload)
        ? payload
        : model === "command.alert"
          ? (payload.alerts ?? payload.data ?? payload.items ?? [])
          : model === "command.workflow"
            ? (payload.workflows ?? payload.data ?? payload.items ?? [])
            : (payload.data ??
              payload.users ??
              payload.workflows ??
              payload.alerts ??
              payload.items ??
              []);
      setRows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rows");
    } finally {
      setLoading(false);
    }
  }, [model, ready, targetUrl]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onTenantChanged = () => {
      void reload();
    };
    window.addEventListener("mw:tenant-changed", onTenantChanged);
    return () => window.removeEventListener("mw:tenant-changed", onTenantChanged);
  }, [reload]);

  return { rows, loading, error, reload };
}

export function useMetaAddons() {
  const [addons, setAddons] = useState<RuntimeMetaAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApiJson<{ addons: RuntimeMetaAddon[] }>("/api/v1/_meta/addons");
      setAddons(res.addons ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load addons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = useCallback(
    async (name: string, nextEnabled: boolean) => {
      const action = nextEnabled ? "enable" : "disable";
      await fetchApiJson(`/api/v1/_meta/addons/${encodeURIComponent(name)}/${action}`, {
        method: "POST",
      });
      await reload();
    },
    [reload],
  );

  return { addons, loading, error, reload, toggle };
}

export async function registerCustomFieldRequest(
  model: string,
  input: {
    field_name: string;
    field_type: "text" | "integer" | "real" | "boolean" | "date" | "json" | "selection";
    required?: boolean;
    label?: string;
    selection?: string[];
  },
) {
  return fetchApiJson<{ field: RuntimeMetaField }>(
    `/api/v1/_meta/models/${encodeURIComponent(model)}/fields`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function saveStudioViewRequest(
  model: string,
  viewType: "list" | "form" | "detail" | "kanban" | "search",
  spec: {
    title?: string;
    description?: string;
    columns?: string[];
    formFields?: string[];
    stageField?: string;
  },
) {
  return fetchApiJson<{ view: { id: string; model_name: string; view_type: string; spec: Record<string, unknown> } }>(
    `/api/v1/_meta/views/${encodeURIComponent(model)}`,
    {
      method: "POST",
      body: JSON.stringify({ view_type: viewType, spec }),
    },
  );
}

export async function resetStudioViewRequest(
  model: string,
  viewType: "list" | "form" | "detail" | "kanban" | "search" = "list",
) {
  return fetchApiJson<{ reset: boolean }>(
    `/api/v1/_meta/views/${encodeURIComponent(model)}?view_type=${encodeURIComponent(viewType)}`,
    {
      method: "DELETE",
    },
  );
}

export async function executeModelMutation(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
) {
  return fetchApiJson<unknown>(url, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export async function fetchModelReadGroup(
  model: string,
  groupBy: string,
): Promise<Array<Record<string, unknown>>> {
  const res = await fetchApiJson<{ groups?: Array<Record<string, unknown>> }>(
    `/api/v1/m/${encodeURIComponent(model)}/read-group?groupBy=${encodeURIComponent(groupBy)}`,
  );
  return res.groups ?? [];
}

export interface ChatterTrackingValue {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
}

export interface ChatterMessageEntry {
  id: string;
  res_model: string;
  res_id: string;
  message_type: "comment" | "notification" | "tracking";
  body: string;
  author_id: string | null;
  create_date?: string;
  $tracking_values?: ChatterTrackingValue[];
}

export async function fetchRecordChatter(
  model: string,
  resId: string,
): Promise<ChatterMessageEntry[]> {
  const res = await fetchApiJson<{ data?: ChatterMessageEntry[] }>(
    `/api/v1/m/mail.message?res_model=${encodeURIComponent(model)}&res_id=${encodeURIComponent(resId)}&with=tracking_values`,
  );
  return res.data ?? [];
}

export async function postRecordChatterComment(
  model: string,
  resId: string,
  body: string,
): Promise<ChatterMessageEntry> {
  const res = await fetchApiJson<{ data: ChatterMessageEntry }>("/api/v1/m/mail.message", {
    method: "POST",
    body: JSON.stringify({
      res_model: model,
      res_id: resId,
      message_type: "comment",
      body,
    }),
  });
  return res.data;
}

export interface CompanyCatalogItem {
  id: string;
  slug: string;
  name: string;
  default_locale: string;
  currency: string;
  is_active: boolean;
}

export function useCompaniesCatalog(enabled = true) {
  const [companies, setCompanies] = useState<CompanyCatalogItem[]>([]);
  const [activeTenant, setActiveTenantState] = useState<string>(() => getActiveTenantId());

  useEffect(() => {
    const sync = () => setActiveTenantState(getActiveTenantId());
    window.addEventListener("mw:tenant-changed", sync);
    return () => window.removeEventListener("mw:tenant-changed", sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchApiJson<{ data?: CompanyCatalogItem[] }>("/api/v1/m/res.company")
      .then((res) => {
        if (active && Array.isArray(res.data)) setCompanies(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
      setCompanies([]);
    };
  }, [enabled]);

  return {
    companies: enabled ? companies : [],
    activeTenant,
    setActiveTenant: (slug: string) => setActiveTenantId(slug),
  };
}

export interface CelestialNowSummary {
  hijri: { year: number; month: number; day: number; monthName: string };
  lunar: { phaseName: string; illumination: number };
  aeq4: { mode: string; formatted: string; hijriBridge: string };
}

export function useCelestialNow(enabled = true) {
  const [data, setData] = useState<CelestialNowSummary | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = () => {
      fetchApiJson<CelestialNowSummary>("/api/v1/celestial/now")
        .then((res) => {
          if (active) setData(res);
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("mw:tenant-changed", load);
    return () => {
      active = false;
      window.removeEventListener("mw:tenant-changed", load);
    };
  }, [enabled]);

  return enabled ? data : null;
}
