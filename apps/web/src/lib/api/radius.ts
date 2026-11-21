"use client";

import { requestApiJson, requestApiResponse } from "@moonwitness/contracts/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/v1/radius";

export interface RadiusHealth {
  status: string;
  service: string;
  reachable?: boolean;
}

export type RadiusStats = Record<string, number | string | null>;

export interface RadiusUser {
  id: string;
  username: string;
  enabled: boolean;
  framed_ip?: string | null;
  vlan_id?: number | null;
  session_timeout?: number | null;
  mac_address?: string | null;
}

export interface CreateRadiusUserRequest {
  username: string;
  password: string;
  enabled?: boolean;
  framed_ip?: string | null;
  vlan_id?: number | null;
  session_timeout?: number | null;
  mac_address?: string | null;
}

export interface UpdateRadiusUserRequest {
  password?: string;
  enabled?: boolean;
  framed_ip?: string | null;
  vlan_id?: number | null;
  session_timeout?: number | null;
  mac_address?: string | null;
}

export interface RadiusLog {
  [field: string]: string | number | boolean | null | undefined;
}

export function sanitizeRadiusLog(entry: RadiusLog): RadiusLog {
  return Object.fromEntries(
    Object.entries(entry).filter(([key]) => !/password|secret|credential|token|hash/i.test(key)),
  ) as RadiusLog;
}

export function sanitizeRadiusLogs(entries: RadiusLog[]): RadiusLog[] {
  return entries.map(sanitizeRadiusLog);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return requestApiJson<T>(url, { signal });
}

async function mutateJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await requestApiResponse(url, { credentials: "include", ...init });
  const text = await response.text();
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body: unknown = JSON.parse(text);
      if (typeof body === "object" && body !== null && "error" in body) {
        const error = (body as { error: unknown }).error;
        if (typeof error === "string") message = error;
      }
    } catch {
      if (text.trim()) message = text.trim();
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

export function useRadiusHealth() {
  return useQuery({
    queryKey: ["radius", "health"],
    queryFn: ({ signal }) => fetchJson<RadiusHealth>(`${API_BASE}/health`, signal),
    staleTime: 15_000,
  });
}

export function useRadiusStats() {
  return useQuery({
    queryKey: ["radius", "stats"],
    queryFn: async ({ signal }) => {
      const body = await fetchJson<unknown>(`${API_BASE}/stats`, signal);
      return asRecord(body) as RadiusStats;
    },
    staleTime: 30_000,
  });
}

export function useRadiusLogs() {
  return useQuery({
    queryKey: ["radius", "logs"],
    queryFn: async ({ signal }) => {
      const body = await fetchJson<unknown>(`${API_BASE}/logs`, signal);
      if (Array.isArray(body)) {
        return sanitizeRadiusLogs(body.map(asRecord) as RadiusLog[]);
      }
      const entries = asRecord(body);
      const logs = entries.logs;
      return Array.isArray(logs) ? sanitizeRadiusLogs(logs.map(asRecord) as RadiusLog[]) : [];
    },
    staleTime: 10_000,
  });
}

export function useRadiusUsers() {
  return useQuery({
    queryKey: ["radius", "users"],
    queryFn: async ({ signal }) => {
      const body = await fetchJson<unknown>(`${API_BASE}/users`, signal);
      return Array.isArray(body) ? (body as RadiusUser[]) : [];
    },
    staleTime: 20_000,
  });
}

function useRadiusUserInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["radius", "users"] });
    void queryClient.invalidateQueries({ queryKey: ["radius", "stats"] });
  };
}

export function useCreateRadiusUser() {
  const invalidate = useRadiusUserInvalidation();
  return useMutation({
    mutationFn: (input: CreateRadiusUserRequest) =>
      mutateJson<RadiusUser>(`${API_BASE}/users`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateRadiusUser() {
  const invalidate = useRadiusUserInvalidation();
  return useMutation({
    mutationFn: ({ username, ...input }: UpdateRadiusUserRequest & { username: string }) =>
      mutateJson<RadiusUser>(`${API_BASE}/users/${encodeURIComponent(username)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteRadiusUser() {
  const invalidate = useRadiusUserInvalidation();
  return useMutation({
    mutationFn: async (username: string) => {
      const response = await requestApiResponse(
        `${API_BASE}/users/${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok && response.status !== 204) {
        const text = await response.text();
        throw new Error(text.trim() || `HTTP ${response.status}`);
      }
    },
    onSuccess: invalidate,
  });
}
