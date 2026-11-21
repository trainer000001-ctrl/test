import type { FeedItem, MissionAlert, Workflow } from "@moonwitness/contracts/types";
import { Card, Button } from "@moonwitness/ui";
import { Bolt, Crown } from "@moonwitness/ui/icons";
import { SectionHeading } from "./section-heading";

export interface MissionLogProps {
  feed: FeedItem[];
  alerts: MissionAlert[];
  workflows: Workflow[];
  onDismissAlert: (id: string) => void;
  onToggleWorkflow: (id: string) => void;
}

const STATUS_TEXT: Record<Workflow["status"], string> = {
  Running: "text-[var(--green)]",
  Queued: "text-[var(--primary)]",
  Paused: "text-[var(--primary)]",
  Succeeded: "text-[var(--green)]",
  Failed: "text-[var(--red)]",
  Cancelled: "text-[var(--primary)]",
};

export function MissionLog({
  feed,
  alerts,
  workflows,
  onDismissAlert,
  onToggleWorkflow,
}: MissionLogProps) {
  const running = workflows.filter((w) => w.status === "Running").length;
  return (
    <section aria-labelledby="cc-log" className="@container scroll-mt-24">
      <SectionHeading id="cc-log" title="MISSION" accent="LOG" note={`${running} running`} />
      <div className="grid grid-cols-1 gap-4 @[36rem]:grid-cols-2 @[62rem]:grid-cols-3">
        <Card className="min-w-0 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-brush text-lg text-[var(--card-foreground)]">
            ACTIVE WORKFLOWS <Crown className="h-4 w-6 text-[var(--primary)]" />
          </h3>
          <div className="divide-y divide-[var(--line)]">
            {workflows.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <Bolt className={`h-4 w-3 shrink-0 ${STATUS_TEXT[w.status]}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[var(--foreground)]">{w.name}</p>
                  <p className="truncate text-[11px] text-[var(--muted-foreground)]">
                    {w.status === "Paused"
                      ? "Paused by operator"
                      : w.status === "Succeeded"
                        ? "Completed successfully"
                        : w.status === "Failed"
                          ? "Failed; review the mission log"
                          : w.status === "Cancelled"
                            ? "Cancelled by operator"
                            : w.detail}
                  </p>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] ${STATUS_TEXT[w.status]}`}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full bg-current ${w.status === "Running" || w.status === "Queued" ? "pulse-dot" : ""}`}
                  />
                  {w.status}
                </span>
                {(w.status === "Queued" || w.status === "Running" || w.status === "Paused") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleWorkflow(w.id)}
                    aria-label={w.status === "Paused" ? `Resume ${w.name}` : `Pause ${w.name}`}
                    className="min-h-11 rounded px-3 text-[10px]"
                  >
                    {w.status === "Paused" ? "Run" : "Pause"}
                  </Button>
                )}
              </div>
            ))}
            {workflows.length === 0 && (
              <p className="py-4 text-sm text-[var(--muted-foreground)]">No workflows match.</p>
            )}
          </div>
        </Card>

        <Card className="min-w-0 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-brush text-lg text-[var(--card-foreground)]">
            COMMAND FEED <Crown className="h-4 w-6 text-[var(--primary)]" />
          </h3>
          <div className="divide-y divide-[var(--line)]">
            {feed.map((f) => (
              <div key={f.id} className="flex items-start gap-2 py-2">
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: f.color }}
                />
                <p className="min-w-0 flex-1 text-xs leading-snug text-[var(--foreground)]">
                  {f.text}
                </p>
                <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">{f.ago}</span>
              </div>
            ))}
            {feed.length === 0 && (
              <p className="py-4 text-sm text-[var(--muted-foreground)]">No feed items match.</p>
            )}
          </div>
        </Card>

        <Card className="min-w-0 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-brush text-lg text-[var(--card-foreground)]">
            MISSION ALERTS <Crown className="h-4 w-6 text-[var(--primary)]" />
          </h3>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 border border-[var(--border)] bg-[var(--muted)] px-3 py-2"
              >
                <span
                  className={`font-brush text-sm ${a.level === "high" ? "text-[var(--red)]" : a.level === "medium" ? "text-[var(--primary)]" : "text-[var(--primary)]"}`}
                >
                  !
                </span>
                <p className="min-w-0 flex-1 text-xs text-[var(--foreground)]">{a.text}</p>
                <span className="text-[11px] text-[var(--muted-foreground)]">{a.ago}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismissAlert(a.id)}
                  aria-label={`Dismiss alert: ${a.text}`}
                  className="min-h-11 min-w-11 text-[var(--muted-foreground)]"
                >
                  ✕
                </Button>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="py-2 text-xs text-[var(--muted-foreground)]">
                All clear. The sky is quiet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
