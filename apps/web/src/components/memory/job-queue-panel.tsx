"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  NativeSelect,
} from "@moonwitness/ui";
import { Activity, Play } from "@moonwitness/ui/icons";
import type { MemoryArchive, MemoryJob } from "@/lib/api/memory";

type QueueFilter = "all" | "active" | "attention" | "complete";

interface JobQueuePanelProps {
  jobs: MemoryJob[];
  archiveById: Map<string, MemoryArchive>;
  resumeBusyId: string | null;
  onResume: (jobId: string) => Promise<void>;
}

export function JobQueuePanel({ jobs, archiveById, resumeBusyId, onResume }: JobQueuePanelProps) {
  const [filter, setFilter] = useState<QueueFilter>("all");

  const visibleJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filter === "active") return ["pending", "processing", "retry"].includes(job.status);
      if (filter === "attention") return ["failed", "awaiting_ai"].includes(job.status);
      if (filter === "complete") return job.status === "complete";
      return true;
    });
  }, [filter, jobs]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 font-brush text-xl">
            <Activity className="h-5 w-5 text-[var(--primary)]" />
            EXTRACTION WORKER QUEUE ({visibleJobs.length})
          </CardTitle>
          <CardDescription>
            Checkpointed incremental extraction; resume paused or `awaiting_ai` jobs without
            reprocessing finished conversations.
          </CardDescription>
        </div>
        <NativeSelect
          aria-label="Filter queue jobs"
          value={filter}
          onChange={(e) => setFilter(e.target.value as QueueFilter)}
        >
          <option value="all">All jobs</option>
          <option value="active">Active</option>
          <option value="attention">Needs attention</option>
          <option value="complete">Complete</option>
        </NativeSelect>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleJobs.length === 0 ? (
          <p className="border border-dashed border-[var(--border)] p-4 text-xs text-[var(--muted-foreground)]">
            No worker jobs in the selected state.
          </p>
        ) : (
          visibleJobs.slice(0, 24).map((job) => {
            const archive = archiveById.get(job.archive_id);
            const canResume = ["awaiting_ai", "retry", "failed"].includes(job.status);
            return (
              <div
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-[var(--border)] bg-[var(--background)] p-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-mono text-xs font-semibold text-[var(--card-foreground)]">
                    {archive?.file_name ?? job.archive_id}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--muted-foreground)]">
                    Conversations: {job.processed_conversations} / {job.total_conversations ?? "?"}
                    {job.error ? ` · ${job.error}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{job.status.toUpperCase()}</Badge>
                  {canResume && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resumeBusyId === job.id}
                      onClick={() => void onResume(job.id)}
                    >
                      <Play className="mr-1 h-3.5 w-3.5" />
                      {resumeBusyId === job.id ? "Resuming…" : "Resume"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
