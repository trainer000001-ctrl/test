"use client";

import { buildCsrfLogoutInit, requestApiJson } from "@moonwitness/contracts/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeRole, type CrewRoleName } from "@/lib/roles";
import { notifySessionChange } from "@/lib/session";

export { buildCsrfLogoutInit };

const APP_AUTH_BASE = "/api/v1/auth";
const AUDIT_BASE = "/api/v1/audit";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  displayName: string;
  email: string;
  role: CrewRoleName;
  active: boolean;
}

interface RawAuthUser {
  id: string | number;
  username?: string;
  name?: string;
  displayName?: string;
  display_name?: string;
  email: string;
  role: string;
  active?: boolean;
}

export function normalizeAuthUser(raw: RawAuthUser): AuthUser {
  const displayName = raw.displayName ?? raw.display_name ?? raw.name ?? raw.username ?? raw.email;
  return {
    id: String(raw.id),
    username: raw.username ?? raw.name ?? raw.email,
    name: displayName,
    displayName,
    email: raw.email,
    role: normalizeRole(raw.role) ?? "viewer",
    active: raw.active ?? true,
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  return requestApiJson<T>(url, init);
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["app", "auth", "me"],
    queryFn: async () => {
      const res = await requestJson<{ user: RawAuthUser }>(`${APP_AUTH_BASE}/me`);
      return { user: normalizeAuthUser(res.user) };
    },
    retry: false,
    staleTime: 30_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { identifier?: string; email?: string; password: string }) => {
      const identifier = (input.identifier ?? input.email ?? "").trim();
      const res = await requestJson<{ user: RawAuthUser }>(`${APP_AUTH_BASE}/login`, {
        method: "POST",
        body: JSON.stringify({ identifier, password: input.password }),
      });
      return { user: normalizeAuthUser(res.user) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app"] });
      notifySessionChange();
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      requestJson<{ ok: boolean }>(`${APP_AUTH_BASE}/logout`, buildCsrfLogoutInit()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app"] });
      notifySessionChange();
    },
  });
}

export interface AuditLogEntry {
  id: string;
  domain: string;
  entity: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorRole: string | null;
  correlationId: string | null;
  requestPath: string | null;
  outcome: string;
  occurredAt: string;
}

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ["app", "auth", "users"],
    queryFn: async () => {
      const res = await requestJson<{ users: RawAuthUser[] }>(`${APP_AUTH_BASE}/users`);
      return { users: res.users.map(normalizeAuthUser) };
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      username: string;
      email: string;
      password: string;
      role: CrewRoleName;
      displayName: string;
    }) => {
      const res = await requestJson<{ user: RawAuthUser }>(`${APP_AUTH_BASE}/users`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return { user: normalizeAuthUser(res.user) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app", "auth", "users"] });
      queryClient.invalidateQueries({ queryKey: ["app", "audit", "logs"] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; role: CrewRoleName }) => {
      const res = await requestJson<{ user: RawAuthUser }>(
        `${APP_AUTH_BASE}/users/${encodeURIComponent(input.id)}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({ role: input.role }),
        },
      );
      return { user: normalizeAuthUser(res.user) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app", "auth", "users"] });
      queryClient.invalidateQueries({ queryKey: ["app", "audit", "logs"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      requestJson<{ ok: boolean }>(`${APP_AUTH_BASE}/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app", "auth", "users"] });
      queryClient.invalidateQueries({ queryKey: ["app", "audit", "logs"] });
    },
  });
}

export function useAuditLogs(filters: { domain?: string; limit?: number } = {}, enabled = true) {
  const params = new URLSearchParams();
  if (filters.domain?.trim()) params.set("domain", filters.domain.trim());
  if (filters.limit) params.set("limit", String(filters.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return useQuery({
    queryKey: ["app", "audit", "logs", params.toString()],
    queryFn: () => requestJson<{ logs: AuditLogEntry[] }>(`${AUDIT_BASE}/logs${suffix}`),
    enabled,
    staleTime: 15_000,
  });
}
