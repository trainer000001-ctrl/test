"use client";

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  NativeSelect,
} from "@moonwitness/ui";
import { Archive, Upload } from "@moonwitness/ui/icons";
import type { MemoryArchive } from "@/lib/api/memory";

export type ArchiveSort = "newest" | "largest" | "name";

interface ArchiveUploadPanelProps {
  archives: MemoryArchive[];
  uploading: boolean;
  uploadName: string | null;
  uploadProgress: number | null;
  backupBusyId: string | null;
  driveConfigured: boolean;
  onUpload: (file: File) => Promise<void>;
  onBackup: (archiveId: string) => Promise<void>;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, exponent)).toFixed(exponent > 1 ? 1 : 0)} ${units[exponent]}`;
}

export function ArchiveUploadPanel({
  archives,
  uploading,
  uploadName,
  uploadProgress,
  backupBusyId,
  driveConfigured,
  onUpload,
  onBackup,
}: ArchiveUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<ArchiveSort>("newest");

  const visibleArchives = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    return archives
      .filter((item) => {
        const matchesQuery =
          !needle ||
          item.file_name.toLowerCase().includes(needle) ||
          item.id.toLowerCase().includes(needle) ||
          Boolean(item.sha256?.toLowerCase().includes(needle));
        const matchesStatus = statusFilter === "all" || item.status.toLowerCase() === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "largest") return b.size_bytes - a.size_bytes;
        if (sortBy === "name") return a.file_name.localeCompare(b.file_name);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [archives, filterText, statusFilter, sortBy]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void onUpload(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void onUpload(file);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-brush text-xl">
            <Upload className="h-5 w-5 text-[var(--primary)]" />
            ARCHIVE INGESTION VAULT
          </CardTitle>
          <CardDescription>
            Drop a ChatGPT `.zip` export or standalone `conversations.json` file to hash, preserve,
            and index.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop ChatGPT export archive or press to select file"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`cursor-pointer border-2 border-dashed p-6 text-center transition-colors ${
              dragging
                ? "border-[var(--primary)] bg-[var(--primary)]/10"
                : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]"
            }`}
          >
            <Input
              ref={inputRef}
              type="file"
              accept=".zip,.json"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Select archive file"
            />
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--card-foreground)]">
              {uploading
                ? `STREAMING ${uploadName ?? "ARCHIVE"} (${uploadProgress ?? 0}%)`
                : "DROP .ZIP OR .JSON EXPORT HERE, OR CLICK TO BROWSE"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Original archive stays immutable on disk and deduplicates via SHA-256.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-brush text-xl">
              <Archive className="h-5 w-5 text-[var(--primary)]" />
              STORED ARCHIVES ({visibleArchives.length})
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter filename or SHA-256…"
              aria-label="Filter archives"
              className="w-52"
            />
            <NativeSelect
              aria-label="Filter archive status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="complete">Complete</option>
              <option value="processing">Processing</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
            </NativeSelect>
            <NativeSelect
              aria-label="Sort archives"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ArchiveSort)}
            >
              <option value="newest">Newest first</option>
              <option value="largest">Largest first</option>
              <option value="name">Name A–Z</option>
            </NativeSelect>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleArchives.length === 0 ? (
            <p className="border border-dashed border-[var(--border)] p-4 text-xs text-[var(--muted-foreground)]">
              No archived exports match the active filters.
            </p>
          ) : (
            visibleArchives.slice(0, 24).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-[var(--border)] bg-[var(--background)] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-semibold text-[var(--card-foreground)]">
                    {item.file_name}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--muted-foreground)]">
                    {formatBytes(item.size_bytes)} ·{" "}
                    {item.sha256 ? `sha256:${item.sha256.slice(0, 12)}` : item.id}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.status.toUpperCase()}</Badge>
                  <Badge variant="outline">DRIVE: {item.drive_status.toUpperCase()}</Badge>
                  {driveConfigured && item.drive_status !== "uploaded" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={backupBusyId === item.id}
                      onClick={() => void onBackup(item.id)}
                    >
                      {backupBusyId === item.id ? "Queuing…" : "Backup"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
