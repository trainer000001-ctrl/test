export const TENANT_STORAGE_KEY = "mw_active_tenant_id";

export class MoonwitnessApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status = 500, code?: string, details?: unknown) {
    super(message);
    this.name = "MoonwitnessApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getActiveTenantFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TENANT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)(?:mw_csrf|csrf_token)=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function buildCsrfLogoutInit(): RequestInit {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const csrf = getCsrfTokenFromCookie();
  if (csrf) headers["x-csrf-token"] = csrf;
  return {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({}),
  };
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const csrf = getCsrfTokenFromCookie();
  if (csrf && !headers.has("x-csrf-token")) {
    headers.set("x-csrf-token", csrf);
  }
  const tenant = getActiveTenantFromStorage();
  if (tenant && !headers.has("x-tenant-id")) {
    headers.set("x-tenant-id", tenant);
  }
  return headers;
}

export async function requestApiResponse(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    credentials: "include",
    ...init,
    headers: buildHeaders(init),
  });
}

export async function requestApiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await requestApiResponse(url, init);
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text };
    }
  }
  if (!res.ok) {
    const obj = parsed as { error?: string; message?: string; code?: string } | null;
    throw new MoonwitnessApiError(
      obj?.message || obj?.error || `Request failed with status ${res.status}`,
      res.status,
      obj?.code,
      parsed,
    );
  }
  return parsed as T;
}

export const moonwitnessSdk = {
  requestJson: requestApiJson,
  requestResponse: requestApiResponse,
  auth: {
    login: (payload: { identity: string; password: string }) =>
      requestApiJson<{ ok: boolean; user?: unknown }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    logout: () => requestApiJson<{ ok: boolean }>("/api/v1/auth/logout", buildCsrfLogoutInit()),
    me: () => requestApiJson<{ user: unknown }>("/api/v1/auth/me"),
  },
  meta: {
    getModels: () => requestApiJson<{ models: string[] }>("/api/v1/_meta/models"),
    getViews: (model: string) =>
      requestApiJson<{ views: unknown[] }>(`/api/v1/_meta/models/${encodeURIComponent(model)}/views`),
  },
  model(modelName: string) {
    const encoded = encodeURIComponent(modelName);
    return {
      list: <T = Record<string, unknown>>(params?: Record<string, string | number | undefined>) => {
        const qs = new URLSearchParams();
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== "") qs.set(k, String(v));
          }
        }
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return requestApiJson<{ data: T[]; total?: number }>(`/api/v1/m/${encoded}${suffix}`);
      },
      history: <T = unknown>(id: string, customUrl?: string) => {
        const url = customUrl
          ? customUrl.replace(":id", encodeURIComponent(id))
          : `/api/v1/m/${encoded}/${encodeURIComponent(id)}/history`;
        return requestApiJson<{ data: T[] }>(url);
      },
    };
  },
  kanban: {
    getBoard: <C>(board: "pipeline" | "cab", signal?: AbortSignal) =>
      requestApiJson<{
        ok: boolean;
        board: "pipeline" | "cab";
        columns: C[];
        updatedAt: string;
        engine?: string;
      }>(`/api/kanban/stages?board=${encodeURIComponent(board)}`, {
        method: "GET",
        cache: "no-store",
        signal,
      }),
    updateStage: <C>(input: {
      board: "pipeline" | "cab";
      itemId: string;
      toStage: string;
      expectedVersion?: number;
    }) =>
      requestApiJson<{
        ok: boolean;
        board: "pipeline" | "cab";
        moved: boolean;
        itemId: string;
        fromStage: string;
        toStage: string;
        version?: number;
        columns: C[];
        updatedAt: string;
        engine?: string;
      }>("/api/kanban/stages", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
  },
};
