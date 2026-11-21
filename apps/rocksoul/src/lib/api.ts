import { invoke, type InvokeArgs } from "@tauri-apps/api/core";
import type { CommandArguments, CommandResult, EdgeOrmSyncStatus, NativeCommand } from "./contracts";
import { handlePreviewContinuityCommand } from "./preview-continuity";
import { handlePreviewWorkCommand } from "./preview-work";

export const DEFAULT_EDGE_PUBSUB_URL = "https://moonwitness-edge-tasks.bjo163.workers.dev";
export type EdgeOrmPubsubHandler = (status: EdgeOrmSyncStatus) => void;

export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function call<Command extends NativeCommand>(
  command: Command,
  args?: CommandArguments<Command>,
): Promise<CommandResult<Command>> {
  const commandArgs = (args ?? {}) as CommandArguments<Command>;
  if (isDesktop()) {
    return invoke(command, commandArgs as unknown as InvokeArgs) as Promise<CommandResult<Command>>;
  }

  const payload = commandArgs as Record<string, unknown>;
  const continuity = handlePreviewContinuityCommand(command, payload);
  if (continuity.handled) {
    return continuity.value as CommandResult<Command>;
  }

  const work = handlePreviewWorkCommand(command, payload);
  if (work.handled) {
    return work.value as CommandResult<Command>;
  }

  throw new Error(`Unsupported native command: ${command}`);
}

export function subscribeEdgeOrmPubsub(
  onEvent: EdgeOrmPubsubHandler,
  edgeUrl: string = DEFAULT_EDGE_PUBSUB_URL,
): () => void {
  let disposed = false;
  let unlistenTauri: (() => void) | null = null;
  let eventSource: EventSource | null = null;
  let lastSeenCursor: string | null = null;
  let syncInFlight = false;

  if (isDesktop()) {
    void import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<EdgeOrmSyncStatus>("orm://pubsub", (event) => {
          if (disposed || !event.payload) return;
          if (event.payload.cursor) {
            lastSeenCursor = event.payload.cursor;
          }
          onEvent(event.payload);
        }),
      )
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }
        unlistenTauri = unlisten;
      })
      .catch(() => {});
  }

  if (typeof EventSource !== "undefined") {
    try {
      const normalizedUrl = edgeUrl.replace(/\/+$/, "");
      eventSource = new EventSource(`${normalizedUrl}/api/pubsub/stream`);
      eventSource.addEventListener("orm.pubsub", (rawEvent) => {
        if (disposed) return;
        const payload = (() => {
          try {
            return JSON.parse((rawEvent as MessageEvent<string>).data) as {
              ok?: boolean;
              cursor?: string | null;
              projects?: unknown[];
              tasks?: unknown[];
            };
          } catch {
            return null;
          }
        })();
        if (!payload?.ok) return;
        const incomingCursor = typeof payload.cursor === "string" ? payload.cursor : null;
        const projectCount = Array.isArray(payload.projects) ? payload.projects.length : 0;
        const taskCount = Array.isArray(payload.tasks) ? payload.tasks.length : 0;
        const changed =
          incomingCursor !== null
            ? incomingCursor !== lastSeenCursor
            : projectCount > 0 || taskCount > 0;
        if (!changed) return;
        lastSeenCursor = incomingCursor;

        if (isDesktop()) {
          if (syncInFlight) return;
          syncInFlight = true;
          void call("sync_edge_orm")
            .then((status) => {
              if (!disposed) {
                if (status.cursor) lastSeenCursor = status.cursor;
                onEvent(status);
              }
            })
            .catch(() => {})
            .finally(() => {
              syncInFlight = false;
            });
          return;
        }

        onEvent({
          connected: true,
          edge_url: normalizedUrl,
          cursor: incomingCursor,
          projects_synced: projectCount,
          tasks_synced: taskCount,
          outbox_pushed: 0,
          last_synced_at: new Date().toISOString(),
          error: null,
        });
      });
    } catch {
      eventSource = null;
    }
  }

  return () => {
    disposed = true;
    unlistenTauri?.();
    eventSource?.close();
  };
}
