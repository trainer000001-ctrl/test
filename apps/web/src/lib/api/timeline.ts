"use client";

import { requestApiJson } from "@moonwitness/contracts/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateEventBody,
  type TimelineErasResponse,
  type TimelineEventResponse,
  type TimelineListResponse,
  type TimelineStatsResponse,
} from "@moonwitness/contracts";
import type {
  ArtKey,
  EraId,
  EventKind,
  TimelineEvent,
  TimelineFilters,
} from "@moonwitness/contracts/types";

const API_BASE = "/api/v1";
const MAX_TIMELINE_PAGE_SIZE = 100;

export type CreateTimelineEventInput = Omit<
  CreateEventBody,
  "excerpt" | "body" | "location" | "tags" | "sources" | "notes" | "image" | "related"
> & {
  id?: string;
  kind: EventKind;
  date: string;
  era: EraId;
  title: string;
  excerpt?: string;
  body?: string;
  location?: string;
  tags?: string[];
  sources?: number;
  notes?: number;
  image?: ArtKey;
  imagePosition?: string;
  related?: string[];
};

export type UpdateTimelineEventInput = Partial<Omit<TimelineEvent, "id">> & {
  version?: number;
};

export interface TimelineEventAuditEntry {
  id: string;
  model: string;
  entity_id: string;
  action: "CREATE" | "UPDATE" | "ARCHIVE" | "RESTORE" | "DELETE";
  changed_by: string | null;
  changed_at: string;
  diff: string;
  entity_version: number;
  source: "seed" | "api" | "import" | "migration";
  request_id: string | null;
}

async function requestTimelineJson<T>(url: string, init?: RequestInit): Promise<T> {
  return requestApiJson<T>(url, init);
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return requestTimelineJson<T>(url, { signal });
}

export async function fetchTimelineEvents(
  filters: TimelineFilters = {},
  apiBase = API_BASE,
  signal?: AbortSignal,
): Promise<TimelineListResponse> {
  const params = new URLSearchParams();
  if (filters.era) params.set("era", filters.era);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.limit !== undefined)
    params.set("limit", String(Math.min(Math.max(filters.limit, 1), MAX_TIMELINE_PAGE_SIZE)));
  if (filters.offset) params.set("offset", String(filters.offset));

  return fetchJson<TimelineListResponse>(`${apiBase}/timeline/events?${params}`, signal);
}

export function useTimelineEvents(filters: TimelineFilters = {}) {
  const params = new URLSearchParams();
  if (filters.era) params.set("era", filters.era);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.limit !== undefined)
    params.set("limit", String(Math.min(Math.max(filters.limit, 1), MAX_TIMELINE_PAGE_SIZE)));
  if (filters.offset) params.set("offset", String(filters.offset));

  return useQuery({
    queryKey: ["timeline", "events", params.toString()],
    queryFn: ({ signal }) => fetchTimelineEvents(filters, API_BASE, signal),
    staleTime: 30_000,
  });
}

export async function fetchTimelineEvent(
  id: string,
  signal?: AbortSignal,
): Promise<TimelineEventResponse> {
  return fetchJson<TimelineEventResponse>(
    `${API_BASE}/timeline/events/${encodeURIComponent(id)}`,
    signal,
  );
}

export function useTimelineEvent(id: string | null) {
  return useQuery({
    queryKey: ["timeline", "event", id],
    queryFn: ({ signal }) => fetchTimelineEvent(id!, signal),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useTimelineRelatedEvents(ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  return useQuery({
    queryKey: ["timeline", "related", uniqueIds],
    queryFn: ({ signal }) => fetchTimelineRelatedEvents(uniqueIds, signal),
    enabled: uniqueIds.length > 0,
    staleTime: 30_000,
  });
}

export async function fetchTimelineRelatedEvents(
  ids: string[],
  signal?: AbortSignal,
): Promise<TimelineEvent[]> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];
  const responses = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        return await fetchTimelineEvent(id, signal);
      } catch {
        return null;
      }
    }),
  );
  return responses.flatMap((response) => (response ? [response.data] : []));
}

export function useTimelineStats() {
  return useQuery({
    queryKey: ["timeline", "stats"],
    queryFn: ({ signal }) => fetchJson<TimelineStatsResponse>(`${API_BASE}/timeline/stats`, signal),
    staleTime: 60_000,
  });
}

export function useTimelineEras() {
  return useQuery({
    queryKey: ["timeline", "eras"],
    queryFn: ({ signal }) => fetchJson<TimelineErasResponse>(`${API_BASE}/timeline/eras`, signal),
    staleTime: 60_000,
  });
}

export async function createTimelineEvent(
  input: CreateTimelineEventInput,
  apiBase = API_BASE,
): Promise<TimelineEventResponse> {
  return requestTimelineJson<TimelineEventResponse>(`${apiBase}/timeline/events`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTimelineEvent(
  id: string,
  patch: UpdateTimelineEventInput,
  apiBase = API_BASE,
): Promise<{ data: TimelineEvent }> {
  return requestTimelineJson<{ data: TimelineEvent }>(
    `${apiBase}/timeline/events/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
}

export async function archiveTimelineEvent(
  id: string,
  apiBase = API_BASE,
): Promise<{ data: TimelineEvent }> {
  return requestTimelineJson<{ data: TimelineEvent }>(
    `${apiBase}/timeline/events/${encodeURIComponent(id)}/archive`,
    { method: "POST" },
  );
}

export async function restoreTimelineEvent(
  id: string,
  apiBase = API_BASE,
): Promise<{ data: TimelineEvent }> {
  return requestTimelineJson<{ data: TimelineEvent }>(
    `${apiBase}/timeline/events/${encodeURIComponent(id)}/restore`,
    { method: "POST" },
  );
}

export async function deleteTimelineEvent(
  id: string,
  apiBase = API_BASE,
): Promise<{ data: TimelineEvent }> {
  return requestTimelineJson<{ data: TimelineEvent }>(
    `${apiBase}/timeline/events/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function fetchTimelineEventHistory(
  id: string,
  signal?: AbortSignal,
  apiBase = API_BASE,
): Promise<{ data: TimelineEventAuditEntry[] }> {
  return requestTimelineJson<{ data: TimelineEventAuditEntry[] }>(
    `${apiBase}/timeline/events/${encodeURIComponent(id)}/history`,
    { signal },
  );
}

export function useTimelineEventHistory(id: string | null, enabled = false) {
  return useQuery({
    queryKey: ["timeline", "history", id],
    queryFn: ({ signal }) => fetchTimelineEventHistory(id!, signal),
    enabled: Boolean(id && enabled),
    staleTime: 15_000,
  });
}

export function useCreateTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimelineEventInput) => createTimelineEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useUpdateTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTimelineEventInput }) =>
      updateTimelineEvent(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useArchiveTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveTimelineEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useRestoreTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreTimelineEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useDeleteTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTimelineEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
