"use client";

import {
  MoonwitnessApiError,
  requestApiJson,
  requestApiResponse,
} from "@moonwitness/contracts/sdk";
import { useMutation, useQuery } from "@tanstack/react-query";

const API_BASE = "/api/v1/riot-ai";

export interface RiotAiModel {
  id: string;
  name: string;
  provider: string;
  capabilities: {
    chat: boolean;
    streaming: boolean;
    tools: boolean;
    structuredOutput: boolean;
    vision: boolean;
    embeddings: boolean;
  };
}

export interface RiotAiHealth {
  provider: string;
  status: "healthy" | "unhealthy" | "misconfigured" | "unconfigured";
  lastCheckAt?: number;
  latencyMs?: number;
  models?: RiotAiModel[];
  error?: string;
}

export interface RiotAiConfig {
  profileKey: string;
  label: string;
  provider: string;
  enabled: boolean;
  preferredModel: string | null;
  canEditConfig: boolean;
}

export interface RiotAiUsageOverview {
  measurement: "measured" | "estimated" | "unavailable";
  truncated: boolean;
  requests: number | null;
  successful: number | null;
  failed: number | null;
  promptTokens: {
    value: number | null;
    measurement: "measured" | "estimated" | "unavailable";
    estimatedValue?: number;
  };
  completionTokens: {
    value: number | null;
    measurement: "measured" | "estimated" | "unavailable";
    estimatedValue?: number;
  };
  totalTokens: {
    value: number | null;
    measurement: "measured" | "estimated" | "unavailable";
    estimatedValue?: number;
  };
}

export interface RiotAiUsageSummary {
  entries: RiotAiUsageEntry[];
  summary: RiotAiUsageOverview;
}

export interface RiotAiUsageEntry {
  actorId: string;
  provider: string;
  model: string;
  outcome: "success" | "failure";
  durationMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  errorCode: string | null;
  occurredAt: string;
}

export interface RiotAiConfigResponse {
  config: RiotAiConfig;
  endpoint: "server-configured" | "not-configured";
}

export interface RiotAiReply {
  id: string;
  model: string;
  provider: string;
  choices: {
    index: number;
    message: { role: "assistant"; content: string };
    finishReason: string;
  }[];
  usage: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  };
  createdAt: number;
}

export interface RiotAiMessage {
  role: "user" | "assistant";
  content: string;
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  try {
    return await requestApiJson<T>(url, { signal });
  } catch (err) {
    if (err instanceof MoonwitnessApiError) {
      if (err.message === `HTTP ${err.status}`) {
        throw new MoonwitnessApiError(`Request failed (${err.status})`, err.status);
      }
      throw err;
    }
    throw err;
  }
}

export function useRiotAiHealth() {
  return useQuery({
    queryKey: ["riot-ai", "health"],
    queryFn: ({ signal }) => requestJson<RiotAiHealth>(`${API_BASE}/health`, signal),
    refetchInterval: 30_000,
    retry: 1,
  });
}

export function useRiotAiModels() {
  return useQuery({
    queryKey: ["riot-ai", "models"],
    queryFn: ({ signal }) => requestJson<{ models: RiotAiModel[] }>(`${API_BASE}/models`, signal),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useRiotAiConfig() {
  return useQuery({
    queryKey: ["riot-ai", "config"],
    queryFn: ({ signal }) => requestJson<RiotAiConfigResponse>(`${API_BASE}/config`, signal),
    retry: 1,
  });
}

export function useRiotAiUsage() {
  return useQuery({
    queryKey: ["riot-ai", "usage"],
    queryFn: ({ signal }) =>
      requestJson<RiotAiUsageSummary>(`${API_BASE}/usage?days=30&limit=5000`, signal),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useRiotAiConfigHistory() {
  return useQuery({
    queryKey: ["riot-ai", "config-history"],
    queryFn: ({ signal }) =>
      requestJson<{ history: RiotAiConfigHistoryEntry[] }>(`${API_BASE}/config/history`, signal),
    enabled: false,
    staleTime: 30_000,
    retry: 1,
  });
}

export interface RiotAiConfigHistoryEntry {
  action: string;
  changed_by: string | null;
  changed_at: string;
  request_id: string | null;
  entity_version: number;
  diff: string;
}

export async function saveRiotAiConfig(config: {
  label: string;
  enabled: boolean;
  preferredModel: string | null;
}): Promise<void> {
  const response = await requestApiResponse(`${API_BASE}/config`, {
    method: "PUT",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(config),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = getResponseError(body, response.status);
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
}

export async function streamRiotAiChat(input: {
  model: string;
  messages: RiotAiMessage[];
  signal: AbortSignal;
  onContent: (content: string) => void;
}): Promise<RiotAiReply> {
  if (
    input.messages.length > 64 ||
    input.messages.some((message) => message.content.length > 48_000)
  ) {
    throw new Error("Inference request exceeds the supported conversation limits.");
  }
  const response = await requestApiResponse(`${API_BASE}/chat`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    signal: input.signal,
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({
      requestId: crypto.randomUUID(),
      model: input.model,
      messages: input.messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new Error(getResponseError(body, response.status));
  }
  if (!response.body) throw new Error("Streaming is unavailable for this response.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply: RiotAiReply | null = null;
  let streamError: string | null = null;

  const processFrame = (frame: string) => {
    const payload = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!payload || payload === "[DONE]") return;
    let event: unknown;
    try {
      event = JSON.parse(payload);
    } catch {
      throw new Error("The inference runtime returned an invalid stream event.");
    }
    if (typeof event !== "object" || event === null || !("type" in event)) {
      throw new Error("The inference runtime returned an invalid stream event.");
    }
    if (event.type === "content" && "delta" in event) {
      const delta = event.delta;
      if (
        typeof delta === "object" &&
        delta !== null &&
        "content" in delta &&
        typeof delta.content === "string"
      ) {
        input.onContent(delta.content);
      }
    } else if (event.type === "done" && "response" in event) {
      if (!isRiotAiReply(event.response)) {
        throw new Error("The inference runtime returned an invalid final response.");
      }
      reply = event.response;
    } else if (event.type === "error" && "error" in event) {
      const detail = event.error;
      streamError =
        typeof detail === "object" &&
        detail !== null &&
        "message" in detail &&
        typeof detail.message === "string"
          ? detail.message
          : "Inference failed.";
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) processFrame(frame);
    }
    buffer += decoder.decode();
    if (buffer.trim()) processFrame(buffer);
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  if (streamError) throw new Error(streamError);
  if (!reply) throw new Error("The inference stream ended without a completed response.");
  return reply;
}

function getResponseError(body: unknown, status: number): string {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return `Request failed (${status})`;
  }
  const error = body.error;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return `Request failed (${status})`;
}

function isRiotAiReply(value: unknown): value is RiotAiReply {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RiotAiReply>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.model === "string" &&
    typeof candidate.provider === "string" &&
    Array.isArray(candidate.choices) &&
    candidate.choices.length > 0 &&
    typeof candidate.choices[0]?.message?.content === "string" &&
    candidate.choices.every(
      (choice) =>
        typeof choice.index === "number" &&
        choice.message?.role === "assistant" &&
        typeof choice.message.content === "string" &&
        typeof choice.finishReason === "string",
    ) &&
    typeof candidate.usage === "object" &&
    candidate.usage !== null &&
    (candidate.usage.promptTokens === null || typeof candidate.usage.promptTokens === "number") &&
    (candidate.usage.completionTokens === null ||
      typeof candidate.usage.completionTokens === "number") &&
    (candidate.usage.totalTokens === null || typeof candidate.usage.totalTokens === "number") &&
    typeof candidate.createdAt === "number"
  );
}

export function useRiotAiChat() {
  return useMutation({
    mutationFn: streamRiotAiChat,
  });
}
