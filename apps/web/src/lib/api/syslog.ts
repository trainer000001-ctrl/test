"use client";

import { requestApiJson } from "@moonwitness/contracts/sdk";
import { useQuery } from "@tanstack/react-query";

const API_BASE = "/api/v1";

export interface SyslogMessage {
  id: string;
  received_at: number;
  source_ip: string | null;
  transport: string;
  facility: number | null;
  severity: number | null;
  priority: number | null;
  timestamp: string | null;
  hostname: string | null;
  app_name: string | null;
  procid: string | null;
  msgid: string | null;
  message: string;
  raw: string;
}

export interface SyslogStats {
  total_messages: number;
  by_severity: { severity: number | null; count: number }[];
  recent_sources: string[];
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return requestApiJson<T>(url, { signal });
}

export function useSyslogHealth() {
  return useQuery({
    queryKey: ["syslog", "health"],
    queryFn: ({ signal }) =>
      fetchJson<{ status: string; service: string; reachable?: boolean }>(
        `${API_BASE}/syslog/health`,
        signal,
      ),
    staleTime: 15_000,
  });
}

export interface SyslogMessageFilters {
  limit?: number;
  severity?: number;
  hostname?: string;
  app_name?: string;
  q?: string;
}

export function buildSyslogMessagesUrl(filters: SyslogMessageFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.severity !== undefined) params.set("severity", String(filters.severity));
  if (filters.hostname) params.set("hostname", filters.hostname);
  if (filters.app_name) params.set("app_name", filters.app_name);
  if (filters.q) params.set("q", filters.q);
  return `${API_BASE}/syslog/messages?${params}`;
}

export function useSyslogMessages(
  filters: SyslogMessageFilters = {},
  options: { enabled?: boolean } = {},
) {
  const url = buildSyslogMessagesUrl(filters);

  return useQuery({
    queryKey: ["syslog", "messages", url],
    queryFn: ({ signal }) => fetchJson<SyslogMessage[]>(url, signal),
    enabled: options.enabled,
    staleTime: 10_000,
  });
}

export function useSyslogMessage(id: string | null) {
  return useQuery({
    queryKey: ["syslog", "message", id],
    queryFn: ({ signal }) => fetchJson<SyslogMessage>(`${API_BASE}/syslog/messages/${id}`, signal),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useSyslogStats() {
  return useQuery({
    queryKey: ["syslog", "stats"],
    queryFn: ({ signal }) => fetchJson<SyslogStats>(`${API_BASE}/syslog/stats`, signal),
    staleTime: 15_000,
  });
}
