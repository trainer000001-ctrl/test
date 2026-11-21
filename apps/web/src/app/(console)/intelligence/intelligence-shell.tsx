"use client";

import { useEffect, useState } from "react";
import { ControlGate } from "@/components/control/gate";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";
import { useCurrentUser } from "@/lib/api/auth";
import {
  useRiotAiConfig,
  useRiotAiModels,
  useRiotAiUsage,
  useRiotAiConfigHistory,
  saveRiotAiConfig,
} from "@/lib/api/riot-ai";
import { IntelligenceDashboard } from "./IntelligenceDashboard";

export function IntelligenceShell() {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const currentUser = useCurrentUser();
  const models = useRiotAiModels();
  const config = useRiotAiConfig();
  const usage = useRiotAiUsage();
  const history = useRiotAiConfigHistory();
  useEffect(() => setMounted(true), []);

  const canEditConfig = config.data?.config.canEditConfig ?? false;
  const userRole = currentUser.data?.user.role;
  const canChat = Boolean(canEditConfig || userRole === "admin" || userRole === "editor");

  return (
    <ControlGate>
      <ConsoleShellAdapter
        plane="creator"
        breadcrumb="RIOT Intelligence"
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search providers or models…",
        }}
      >
        {mounted ? (
          <IntelligenceDashboard
            models={models.data?.models ?? []}
            modelsLoading={models.isLoading}
            modelsError={models.isError ? (models.error as Error).message : null}
            onRefreshModels={() => void models.refetch()}
            query={query}
            config={config.data?.config ?? null}
            configError={config.isError ? (config.error as Error).message : null}
            canEditConfig={canEditConfig}
            canChat={canChat}
            usage={usage.data?.summary ?? null}
            usageError={usage.isError ? (usage.error as Error).message : null}
            usageEntries={usage.data?.entries ?? []}
            usageLoading={usage.isLoading}
            configHistory={history.data?.history ?? []}
            historyLoading={history.isFetching}
            configHistoryError={history.isError ? (history.error as Error).message : null}
            onRefreshHistory={() => void history.refetch()}
            onRefreshConfig={() => void config.refetch()}
            onRefreshUsage={() => {
              void config.refetch();
              void usage.refetch();
            }}
            onSaveConfig={saveRiotAiConfig}
          />
        ) : (
          <h1 className="flex min-h-[60vh] items-center justify-center font-brush text-2xl text-[var(--primary)]">
            INITIALIZING RIOT INTELLIGENCE…
          </h1>
        )}
      </ConsoleShellAdapter>
    </ControlGate>
  );
}
