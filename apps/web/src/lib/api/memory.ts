"use client";

import {
  MoonwitnessApiError,
  getActiveTenantFromStorage,
  getCsrfTokenFromCookie,
  requestApiJson,
  requestApiResponse,
} from "@moonwitness/contracts/sdk";
import { useQuery } from "@tanstack/react-query";

const API_BASE = "/api/v1/memory";
const MEMORY_SERVICE_BASE = "/api/memory";

export interface MemorySystemInfo {
  mode: string;
  gemini_configured: boolean;
  gemini_model: string;
  embeddings_enabled: boolean;
  embedding_model: string | null;
  drive_configured: boolean;
  moonwitness_sync_configured: boolean;
  max_upload_gb: number;
}

export interface MemoryCounts {
  archives: number;
  messages: number;
  knowledge: number;
  active_jobs: number;
  failed_jobs: number;
}

export interface MemoryBridgeStatus {
  configured: boolean;
  reachable: boolean;
  system: MemorySystemInfo | null;
  counts: MemoryCounts | null;
  error?: string;
}

export interface MemoryKnowledgeRecord {
  id: string;
  archive_id?: string;
  conversation_id?: string;
  kind: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  entities: string[];
  source_message_ids: string[];
  confidence: number;
  created_at?: string;
  updated_at?: string;
}

export interface MemoryKnowledgeResponse {
  configured: boolean;
  query: string;
  records: MemoryKnowledgeRecord[];
}

export interface MemoryArchive {
  id: string;
  file_name: string;
  size_bytes: number;
  sha256?: string;
  status: string;
  drive_status: string;
  drive_key?: string | null;
  drive_error?: string | null;
  created_at: string;
}

export interface MemoryJob {
  id: string;
  archive_id: string;
  mode?: string;
  status: string;
  cursor?: number;
  attempts?: number;
  processed_conversations: number;
  total_conversations: number | null;
  error: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MemorySourceMessage {
  message_id: string;
  conversation_id: string;
  conversation_title: string;
  role: string;
  content: string;
  created_at?: string | null;
}

export interface MemorySourceData {
  knowledge_id: string;
  archive_id: string;
  conversation_id: string;
  messages: MemorySourceMessage[];
}

export interface MemoryServiceUploadResult {
  duplicate?: boolean;
  message?: string;
  detail?: string;
}

export type WitnessEpistemicType =
  "fact" | "testimony" | "hypothesis" | "interpretation" | "dream" | "fiction" | "unknown";

export type WitnessClaimStatus = "active" | "superseded" | "disputed" | "unverified";
export type WitnessRelationType = "supports" | "contradicts" | "derived_from" | "supersedes";

export interface WitnessClaimRecord {
  id: string;
  statement: string;
  epistemic_type: WitnessEpistemicType;
  status: WitnessClaimStatus;
  valid_from?: string | null;
  valid_until?: string | null;
  created_at: string;
  updated_at: string;
  source_count?: number;
  revision_count?: number;
  relation_count?: number;
}

export interface WitnessClaimsResponse {
  claims: WitnessClaimRecord[];
  epistemic_types: WitnessEpistemicType[];
  statuses: WitnessClaimStatus[];
  relation_types: WitnessRelationType[];
}

export interface WitnessClaimSourceRecord {
  id: string;
  claim_id: string;
  archive_id: string;
  message_id: string;
  excerpt: string;
  offset_start?: number | null;
  offset_end?: number | null;
  source_sha256: string;
  attribution: string;
  rationale: string;
  created_at: string;
}

export interface WitnessClaimRevisionRecord {
  id: string;
  claim_id: string;
  revision_no: number;
  previous_statement: string;
  new_statement: string;
  previous_epistemic_type: WitnessEpistemicType;
  new_epistemic_type: WitnessEpistemicType;
  reason: string;
  revised_at: string;
}

export interface WitnessClaimRelationRecord {
  id: string;
  source_claim_id: string;
  target_claim_id: string;
  relation_type: WitnessRelationType;
  note: string;
  direction: "outgoing" | "incoming";
  created_at: string;
  related_claim?: {
    id: string;
    statement: string;
    epistemic_type: WitnessEpistemicType;
    status: WitnessClaimStatus;
  } | null;
}

export interface WitnessClaimLineage {
  claim: WitnessClaimRecord;
  sources: WitnessClaimSourceRecord[];
  revisions: WitnessClaimRevisionRecord[];
  relations: WitnessClaimRelationRecord[];
  resolved_messages: MemorySourceMessage[];
}

async function requestMemoryJson<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    return await requestApiJson<T>(url, init);
  } catch (err) {
    if (err instanceof MoonwitnessApiError && err.message === `HTTP ${err.status}`) {
      throw new MoonwitnessApiError(`Request failed with HTTP ${err.status}`, err.status);
    }
    throw err;
  }
}

export function fetchMemoryStatus(signal?: AbortSignal): Promise<MemoryBridgeStatus> {
  return requestMemoryJson<MemoryBridgeStatus>(`${API_BASE}/status`, { signal });
}

export function fetchMemoryKnowledge(options?: {
  q?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<MemoryKnowledgeResponse> {
  const params = new URLSearchParams();
  const q = options?.q?.trim();
  if (q) params.set("q", q);
  if (options?.limit !== undefined) {
    params.set("limit", String(Math.min(100, Math.max(1, Math.trunc(options.limit)))));
  }
  const suffix = params.toString();
  return requestMemoryJson<MemoryKnowledgeResponse>(
    `${API_BASE}/knowledge${suffix ? `?${suffix}` : ""}`,
    { signal: options?.signal },
  );
}

export function getMemoryExportUrl(): string {
  return `${API_BASE}/export.ndjson`;
}

export function getMemoryServiceExportUrl(): string {
  return `${MEMORY_SERVICE_BASE}/export.ndjson`;
}

export function fetchMemoryServiceSystem(signal?: AbortSignal): Promise<MemorySystemInfo> {
  return requestMemoryJson<MemorySystemInfo>(`${MEMORY_SERVICE_BASE}/system`, { signal });
}

export function fetchMemoryServiceDashboard(signal?: AbortSignal): Promise<MemoryCounts> {
  return requestMemoryJson<MemoryCounts>(`${MEMORY_SERVICE_BASE}/dashboard`, { signal });
}

export function fetchMemoryServiceArchives(
  limit = 500,
  signal?: AbortSignal,
): Promise<MemoryArchive[]> {
  return requestMemoryJson<MemoryArchive[]>(
    `${MEMORY_SERVICE_BASE}/archives?limit=${Math.min(500, Math.max(1, Math.trunc(limit)))}`,
    { signal },
  );
}

export function fetchMemoryServiceJobs(limit = 500, signal?: AbortSignal): Promise<MemoryJob[]> {
  return requestMemoryJson<MemoryJob[]>(
    `${MEMORY_SERVICE_BASE}/jobs?limit=${Math.min(500, Math.max(1, Math.trunc(limit)))}`,
    { signal },
  );
}

export function fetchMemoryServiceKnowledge(options?: {
  q?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<MemoryKnowledgeRecord[]> {
  const q = options?.q?.trim();
  const limit = Math.min(500, Math.max(1, Math.trunc(options?.limit ?? 24)));
  const url = q
    ? `${MEMORY_SERVICE_BASE}/search?q=${encodeURIComponent(q)}&limit=${Math.min(100, limit)}`
    : `${MEMORY_SERVICE_BASE}/knowledge?limit=${limit}`;
  return requestMemoryJson<MemoryKnowledgeRecord[]>(url, { signal: options?.signal });
}

export function fetchMemoryServiceSources(
  knowledgeId: string,
  signal?: AbortSignal,
): Promise<MemorySourceData> {
  return requestMemoryJson<MemorySourceData>(
    `${MEMORY_SERVICE_BASE}/knowledge/${encodeURIComponent(knowledgeId)}/sources`,
    { signal },
  );
}

export async function triggerArchiveBackup(
  archiveId: string,
): Promise<{ status: string; archive_id: string }> {
  return requestMemoryJson<{ status: string; archive_id: string }>(
    `${MEMORY_SERVICE_BASE}/archives/${encodeURIComponent(archiveId)}/backup`,
    { method: "POST" },
  );
}

export async function resumeMemoryJob(jobId: string): Promise<{ status: string; job_id: string }> {
  return requestMemoryJson<{ status: string; job_id: string }>(
    `${MEMORY_SERVICE_BASE}/jobs/${encodeURIComponent(jobId)}/resume`,
    { method: "POST" },
  );
}

export async function uploadMemoryArchive(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<MemoryServiceUploadResult> {
  if (typeof XMLHttpRequest !== "undefined" && onProgress) {
    return new Promise<MemoryServiceUploadResult>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", `${MEMORY_SERVICE_BASE}/archives`);
      request.withCredentials = true;
      request.responseType = "text";
      request.setRequestHeader("Content-Type", "application/octet-stream");
      request.setRequestHeader("X-Archive-Filename", encodeURIComponent(file.name));
      const csrfToken = getCsrfTokenFromCookie();
      if (csrfToken) {
        request.setRequestHeader("x-csrf-token", csrfToken);
      }
      const tenantId = getActiveTenantFromStorage();
      if (tenantId) {
        request.setRequestHeader("x-tenant-id", tenantId);
      }
      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
        }
      });
      request.addEventListener("load", () => {
        let parsed: MemoryServiceUploadResult;
        try {
          parsed = JSON.parse(request.responseText || "{}") as MemoryServiceUploadResult;
        } catch {
          reject(new Error("Upload failed: invalid API response."));
          return;
        }
        if (request.status < 200 || request.status >= 300) {
          reject(
            new MoonwitnessApiError(parsed.detail || "Archive upload failed.", request.status),
          );
          return;
        }
        resolve(parsed);
      });
      request.addEventListener("error", () =>
        reject(new Error("Upload network error: check Memory service availability.")),
      );
      request.addEventListener("abort", () => reject(new Error("Upload cancelled.")));
      request.send(file);
    });
  }

  const response = await requestApiResponse(`${MEMORY_SERVICE_BASE}/archives`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Archive-Filename": encodeURIComponent(file.name),
    },
    body: file,
  });
  const payload = (await response.json().catch(() => ({}))) as MemoryServiceUploadResult;
  if (!response.ok) {
    throw new MoonwitnessApiError(
      payload.detail || `Upload failed with HTTP ${response.status}`,
      response.status,
    );
  }
  return payload;
}

export function formatMemoryContextPrompt(record: MemoryKnowledgeRecord): string {
  const lines = [`[Archive Knowledge: ${record.title} (${record.kind})]`];
  if (record.summary.trim()) lines.push(`Summary: ${record.summary.trim()}`);
  if (record.content.trim()) lines.push(record.content.trim());
  if (record.tags.length > 0) lines.push(`Tags: ${record.tags.join(", ")}`);
  return lines.join("\n");
}

export function useMemoryStatus(enabled = true) {
  return useQuery({
    queryKey: ["memory", "status"],
    queryFn: ({ signal }) => fetchMemoryStatus(signal),
    enabled,
    staleTime: 30_000,
    retry: 0,
  });
}

export function useMemoryKnowledge(query: string, enabled: boolean, limit = 12) {
  const normalizedQuery = query.trim();
  return useQuery({
    queryKey: ["memory", "knowledge", normalizedQuery, limit],
    queryFn: ({ signal }) => fetchMemoryKnowledge({ q: normalizedQuery, limit, signal }),
    enabled,
    staleTime: 15_000,
    retry: 0,
  });
}

export function fetchWitnessClaims(options?: {
  epistemicType?: string;
  status?: string;
  q?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<WitnessClaimsResponse> {
  const params = new URLSearchParams();
  if (options?.epistemicType && options.epistemicType !== "all") {
    params.set("epistemic_type", options.epistemicType);
  }
  if (options?.status && options.status !== "all") {
    params.set("status", options.status);
  }
  if (options?.q?.trim()) {
    params.set("q", options.q.trim());
  }
  if (options?.limit !== undefined) {
    params.set("limit", String(Math.min(500, Math.max(1, Math.trunc(options.limit)))));
  }
  const suffix = params.toString();
  return requestMemoryJson<WitnessClaimsResponse>(
    `${MEMORY_SERVICE_BASE}/witness/claims${suffix ? `?${suffix}` : ""}`,
    { signal: options?.signal },
  );
}

export function createWitnessClaim(payload: {
  statement: string;
  epistemic_type: WitnessEpistemicType;
  source?: {
    archive_id: string;
    message_id: string;
    excerpt: string;
    attribution?: string;
    rationale?: string;
  };
}): Promise<WitnessClaimRecord> {
  return requestMemoryJson<WitnessClaimRecord>(`${MEMORY_SERVICE_BASE}/witness/claims`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchWitnessClaimLineage(
  claimId: string,
  signal?: AbortSignal,
): Promise<WitnessClaimLineage> {
  return requestMemoryJson<WitnessClaimLineage>(
    `${MEMORY_SERVICE_BASE}/witness/claims/${encodeURIComponent(claimId)}/lineage`,
    { signal },
  );
}

export function verifyWitnessClaim(payload: {
  claim_id?: string;
  action: "verify" | "dispute" | "supersede" | "sync";
  reason?: string;
  source?: {
    archive_id: string;
    message_id: string;
    excerpt: string;
  };
  sync?: boolean;
}): Promise<{
  ok: boolean;
  action: string;
  claim: WitnessClaimRecord | null;
  sync: { triggered: boolean; synced: number };
}> {
  return requestMemoryJson(`${MEMORY_SERVICE_BASE}/witness/verify`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function linkWitnessClaims(payload: {
  source_claim_id: string;
  target_claim_id: string;
  relation_type: WitnessRelationType;
  note?: string;
}): Promise<Record<string, unknown>> {
  return requestMemoryJson(`${MEMORY_SERVICE_BASE}/witness/relations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
