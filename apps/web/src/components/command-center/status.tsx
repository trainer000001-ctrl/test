import Image from "next/image";
import { StatBlock, Badge, ZineCardRough } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import { SectionHeading } from "./section-heading";
import type { CommandCenterStats } from "@/lib/api/command-center";

export type CommandCenterSyncStatus = "loading" | "live" | "offline";

function statBlocks(stats: CommandCenterStats | null) {
  return [
    {
      label: "WORKFLOWS",
      value: stats ? String(stats.workflows) : "—",
      tone: "blue" as const,
      trend: "",
    },
    {
      label: "RUNNING",
      value: stats ? String(stats.running) : "—",
      tone: "green" as const,
      trend: "",
    },
    {
      label: "QUEUED",
      value: stats ? String(stats.queued) : "—",
      tone: "yellow" as const,
      trend: "",
    },
    {
      label: "ALERTS",
      value: stats ? String(stats.alerts) : "—",
      tone: "pink" as const,
      trend: "",
    },
  ];
}

const STATUS_UI: Record<CommandCenterSyncStatus, { label: string; className: string }> = {
  live: {
    label: "LIVE",
    className: "border-[var(--green)] bg-[var(--green)]/15 text-[var(--green)]",
  },
  loading: {
    label: "SYNCING",
    className: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  },
  offline: {
    label: "OFFLINE",
    className: "bg-[var(--destructive)] text-[var(--destructive-foreground)]",
  },
};

export function UniverseStatus({
  stats,
  status = stats ? "live" : "loading",
}: {
  stats: CommandCenterStats | null;
  status?: CommandCenterSyncStatus;
}) {
  const blocks = statBlocks(stats);
  const badge = STATUS_UI[status];
  return (
    <section aria-labelledby="cc-status-heading" className="flex h-full flex-col scroll-mt-24">
      <SectionHeading
        id="cc-status-heading"
        title="UNIVERSE"
        accent="STATUS"
        note={status === "live" ? "live snapshot" : status === "loading" ? "syncing" : "offline"}
      />
      <ZineCardRough className="@container relative flex flex-1 flex-col overflow-hidden p-4">
        <Image
          src={artSrc("command-eye")}
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 45vw"
          className="object-cover object-[78%_35%] opacity-60"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--ink)_96%,transparent)] via-[color-mix(in_srgb,var(--ink)_72%,transparent)] to-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
        />
        <div className="relative z-10 flex h-full min-h-[220px] flex-col gap-4 [--card-foreground:var(--paper)] [--foreground:var(--paper)] [--muted-foreground:var(--paper)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-[var(--primary)]">
              EMPIRE TELEMETRY
            </p>
            <Badge variant="default" className={badge.className}>
              {badge.label}
            </Badge>
          </div>
          <div className="grid flex-1 grid-cols-2 content-end gap-x-5 gap-y-4 @[30rem]:grid-cols-4">
            {blocks.map((stat) => (
              <StatBlock
                key={stat.label}
                value={stat.value}
                label={stat.label}
                tone={stat.tone}
                trend={stat.trend}
                density="compact"
              />
            ))}
          </div>
        </div>
      </ZineCardRough>
    </section>
  );
}
