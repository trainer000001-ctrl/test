"use client";

import { requestApiResponse } from "@moonwitness/contracts/sdk";
import { useCallback, useEffect, useState } from "react";
import type {
  CodexGovernanceSnapshot,
  EcosystemEdgeStatus,
  EcosystemGitStatus,
  EcosystemRuntimeMode,
  EcosystemServiceStatus,
} from "./ecosystem-probe";

export interface EcosystemTelemetryState {
  readonly status: "checking" | "online" | "offline";
  readonly runtimeMode: EcosystemRuntimeMode | null;
  readonly databaseStatus: string | null;
  readonly timelineTotal: number | null;
  readonly erasCount: number | null;
  readonly services: readonly EcosystemServiceStatus[];
  readonly edges: readonly EcosystemEdgeStatus[];
  readonly git: EcosystemGitStatus | null;
  readonly codexGovernance: CodexGovernanceSnapshot | null;
  readonly generatedAt: string | null;
  readonly refreshing: boolean;
  readonly refresh: () => void;
}

interface EcosystemHealthPayload {
  readonly status?: "online" | "offline";
  readonly runtimeMode?: EcosystemRuntimeMode;
  readonly databaseStatus?: string | null;
  readonly timelineTotal?: number | null;
  readonly erasCount?: number | null;
  readonly services?: readonly EcosystemServiceStatus[];
  readonly edges?: readonly EcosystemEdgeStatus[];
  readonly git?: EcosystemGitStatus;
  readonly codexGovernance?: CodexGovernanceSnapshot | null;
  readonly generatedAt?: string;
}

export function useEcosystemTelemetry(): EcosystemTelemetryState {
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [state, setState] = useState<Omit<EcosystemTelemetryState, "refresh">>({
    status: "checking",
    runtimeMode: null,
    databaseStatus: null,
    timelineTotal: null,
    erasCount: null,
    services: [],
    edges: [],
    git: null,
    codexGovernance: null,
    generatedAt: null,
    refreshing: false,
  });

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, refreshing: true }));
    setRefreshTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);

    async function probe(): Promise<void> {
      try {
        const res = await requestApiResponse("/api/ecosystem-health", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.ok) {
          const payload = (await res.json()) as EcosystemHealthPayload;
          setState({
            status: payload.status === "online" ? "online" : "offline",
            runtimeMode: payload.runtimeMode ?? null,
            databaseStatus: payload.databaseStatus ?? null,
            timelineTotal: typeof payload.timelineTotal === "number" ? payload.timelineTotal : null,
            erasCount: typeof payload.erasCount === "number" ? payload.erasCount : null,
            services: Array.isArray(payload.services) ? payload.services : [],
            edges: Array.isArray(payload.edges) ? payload.edges : [],
            git: payload.git ?? null,
            codexGovernance: payload.codexGovernance ?? null,
            generatedAt: payload.generatedAt ?? null,
            refreshing: false,
          });
          return;
        }
      } catch {
        // Fallback to direct API rewrite probe below.
      }

      try {
        const [healthRes, readyRes, statsRes, erasRes] = await Promise.all([
          requestApiResponse("/api/v1/healthz", { signal: controller.signal }),
          requestApiResponse("/api/v1/readyz", { signal: controller.signal }).catch(() => null),
          requestApiResponse("/api/v1/timeline/stats", { signal: controller.signal }).catch(
            () => null,
          ),
          requestApiResponse("/api/v1/timeline/eras", { signal: controller.signal }).catch(
            () => null,
          ),
        ]);

        if (!healthRes.ok) {
          setState({
            status: "offline",
            runtimeMode: null,
            databaseStatus: null,
            timelineTotal: null,
            erasCount: null,
            services: [],
            edges: [],
            git: null,
            codexGovernance: null,
            generatedAt: new Date().toISOString(),
            refreshing: false,
          });
          return;
        }

        let dbState: string | null = null;
        if (readyRes && readyRes.ok) {
          const readyJson = (await readyRes.json()) as { database?: string };
          dbState = readyJson.database ?? "ready";
        }

        let timelineTotal: number | null = null;
        if (statsRes && statsRes.ok) {
          const statsJson = (await statsRes.json()) as { data?: { total?: number } };
          timelineTotal = typeof statsJson.data?.total === "number" ? statsJson.data.total : null;
        }

        let erasCount: number | null = null;
        if (erasRes && erasRes.ok) {
          const erasJson = (await erasRes.json()) as { data?: unknown[] };
          erasCount = Array.isArray(erasJson.data) ? erasJson.data.length : null;
        }

        setState({
          status: "online",
          runtimeMode: "local-node",
          databaseStatus: dbState,
          timelineTotal,
          erasCount,
          services: [],
          edges: [],
          git: null,
          codexGovernance: null,
          generatedAt: new Date().toISOString(),
          refreshing: false,
        });
      } catch {
        if (!controller.signal.aborted) {
          setState({
            status: "offline",
            runtimeMode: null,
            databaseStatus: null,
            timelineTotal: null,
            erasCount: null,
            services: [],
            edges: [],
            git: null,
            codexGovernance: null,
            generatedAt: null,
            refreshing: false,
          });
        }
      }
    }

    void probe();

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refreshTick]);

  return {
    ...state,
    refresh,
  };
}
