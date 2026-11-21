"use client";
import { MoonwitnessApiError, requestApiJson } from "@moonwitness/contracts/sdk";

const API_BASE = "/api/v1";

export interface ProbeNode {
  id: string;
  name: string;
  targetUrl: string;
  category: string;
  enabled: boolean;
  createdAt: string;
}

export interface ProbeEvent {
  id: string;
  nodeId: string;
  statusCode: number;
  ok: boolean;
  latencyMs: number;
  actorSub: string;
  checkedAt: string;
}

export interface ProbeStatusResponse {
  service: string;
  actor: {
    sub: string;
    username: string;
    role: string;
  };
  nodes: ProbeNode[];
  recentEvents: ProbeEvent[];
}

export class ProbesApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProbesApiError";
    this.status = status;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await requestApiJson<T>(`${API_BASE}${path}`, init);
  } catch (err) {
    const status = err instanceof MoonwitnessApiError ? err.status : 500;
    throw new ProbesApiError(err instanceof Error ? err.message : `HTTP ${status}`, status);
  }
}

export function fetchProbeNodes(signal?: AbortSignal): Promise<{ nodes: ProbeNode[] }> {
  return requestJson<{ nodes: ProbeNode[] }>("/probes/nodes", {
    method: "GET",
    signal,
  });
}

export function fetchRecentProbeEvents(
  limit = 25,
  signal?: AbortSignal,
): Promise<{ events: ProbeEvent[] }> {
  return requestJson<{ events: ProbeEvent[] }>(`/probes/events?limit=${limit}`, {
    method: "GET",
    signal,
  });
}

export function fetchIgateStatus(signal?: AbortSignal): Promise<ProbeStatusResponse> {
  return requestJson<ProbeStatusResponse>("/igate/status", {
    method: "GET",
    signal,
  });
}

export function runProbes(nodeId?: string): Promise<{ probed: ProbeEvent[] }> {
  return requestJson<{ probed: ProbeEvent[] }>("/probes/run", {
    method: "POST",
    body: JSON.stringify(nodeId ? { nodeId } : {}),
  });
}
