"use client";

import { useState } from "react";
import { Button, Checkbox, IndustrialBatteryArt, Input, NativeSelect } from "@moonwitness/ui";
import type {
  useCreateBucket,
  useDeleteBucket,
  useDeleteObject,
  useUploadObject,
} from "@/lib/api/storage";

const CONTENT_TYPES = [
  "application/octet-stream",
  "text/plain",
  "text/markdown",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "application/pdf",
] as const;

const DEFAULT_CONTENT_TYPE: string = CONTENT_TYPES[0];

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const unit = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(unit)), units.length - 1);
  return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(1))} ${units[index]}`;
}

export function objectHref(bucket: string, key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `/api/v1/storage/buckets/${encodeURIComponent(bucket)}/${encodedKey}`;
}

export function StorageErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="border-2 border-[var(--yellow)]/50 bg-[var(--card)] p-4">
      <p className="text-sm text-[var(--foreground)]">{message}</p>
      <Button
        type="button"
        variant="link"
        onClick={onRetry}
        className="mt-2 min-h-11 h-auto p-0 text-xs"
      >
        Retry
      </Button>
    </div>
  );
}

export function CreateBucketForm({ onCreate }: { onCreate: ReturnType<typeof useCreateBucket> }) {
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !confirmed) return;
    void onCreate.mutateAsync(name.trim());
    setName("");
    setConfirmed(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-xs text-[var(--muted-foreground)]">
        New bucket name
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={63}
          pattern="^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$"
          title="3-63 chars: lowercase letters, numbers, dots, hyphens."
          className="mt-1 min-h-11 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--blue)]"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <Checkbox
          checked={confirmed}
          onCheckedChange={(checked) => setConfirmed(checked === true)}
          disabled={onCreate.isPending}
        />
        Create this bucket
      </label>
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="outline"
          disabled={!name.trim() || !confirmed || onCreate.isPending}
          className="min-h-11 px-4 text-sm text-[var(--accent-foreground)] bg-[var(--accent)] border-2 border-[var(--accent)] hover:bg-[var(--accent)]/90"
        >
          {onCreate.isPending ? "Creating…" : "Create bucket"}
        </Button>
        {onCreate.isError && (
          <span className="text-xs text-[var(--primary)]" role="alert">
            {(onCreate.error as Error).message}
          </span>
        )}
      </div>
    </form>
  );
}

export function BucketList({
  buckets,
  selectedBucket,
  onSelect,
  deleteBucket,
  onCreate,
}: {
  buckets: { name: string; creationDate?: string }[];
  selectedBucket: string | null;
  onSelect: (bucket: string | null) => void;
  deleteBucket: ReturnType<typeof useDeleteBucket>;
  onCreate: ReturnType<typeof useCreateBucket>;
}) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {buckets.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 border-2 border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted-foreground)]"
          role="status"
        >
          <IndustrialBatteryArt className="h-20 w-20 opacity-85" decorative />
          <p>No buckets exist yet. Create the first bucket below.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[40rem] text-left text-xs">
            <thead className="bg-[var(--background)] font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
              <tr>
                <th scope="col" className="p-3">
                  Bucket
                </th>
                <th scope="col" className="p-3">
                  Created
                </th>
                <th scope="col" className="p-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] text-[var(--foreground)]">
              {buckets.map((bucket) => {
                const isSelected = selectedBucket === bucket.name;
                return (
                  <tr key={bucket.name} className={isSelected ? "bg-[var(--blue)]/10" : ""}>
                    <td className="p-3 font-mono">
                      <Button
                        type="button"
                        variant="plain"
                        onClick={() => onSelect(isSelected ? null : bucket.name)}
                        className="text-left justify-start w-full hover:text-[var(--primary)]"
                      >
                        {bucket.name}
                      </Button>
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {bucket.creationDate ? new Date(bucket.creationDate).toLocaleString() : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {pendingDelete === bucket.name ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                void deleteBucket.mutateAsync(bucket.name);
                                setPendingDelete(null);
                              }}
                              disabled={deleteBucket.isPending}
                              className="min-h-9 px-3 text-xs text-[var(--foreground)] bg-[var(--yellow)]/20 border border-[var(--yellow)]"
                            >
                              Confirm delete
                            </Button>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => setPendingDelete(null)}
                              className="min-h-9 h-auto p-0 text-xs text-[var(--muted-foreground)]"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingDelete(bucket.name)}
                            disabled={deleteBucket.isPending}
                            className="min-h-9 text-xs text-[var(--primary)] border border-[var(--yellow)] bg-transparent hover:bg-[var(--yellow)]/10"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {deleteBucket.isError && (
        <p className="text-xs text-[var(--primary)]" role="alert">
          {(deleteBucket.error as Error).message}
        </p>
      )}
      <CreateBucketForm onCreate={onCreate} />
    </div>
  );
}

export function UploadObjectForm({
  uploadObject,
}: {
  uploadObject: ReturnType<typeof useUploadObject>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState("");
  const [contentType, setContentType] = useState<string>(DEFAULT_CONTENT_TYPE);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !key.trim()) return;
    void uploadObject.mutateAsync({
      key: key.trim(),
      body: file,
      contentType,
    });
    setFile(null);
    setKey("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="block flex-1 text-xs text-[var(--muted-foreground)]">
        File
        <Input
          type="file"
          onChange={(event) => {
            const chosen = event.target.files?.[0] ?? null;
            setFile(chosen);
            if (chosen && !key.trim()) setKey(chosen.name);
            if (chosen?.type) setContentType(chosen.type);
          }}
          className="mt-1 min-h-11 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--blue)]"
        />
      </label>
      <label className="block flex-1 text-xs text-[var(--muted-foreground)]">
        Object key
        <Input
          value={key}
          onChange={(event) => setKey(event.target.value)}
          maxLength={1024}
          placeholder="path/to/object.bin"
          className="mt-1 min-h-11 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--blue)]"
        />
      </label>
      <label className="block text-xs text-[var(--muted-foreground)] sm:w-56">
        Content-Type
        <NativeSelect
          value={
            (CONTENT_TYPES as readonly string[]).includes(contentType)
              ? contentType
              : DEFAULT_CONTENT_TYPE
          }
          onChange={(event) => setContentType(event.target.value)}
          className="mt-1 min-h-11 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--blue)]"
        >
          {CONTENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </NativeSelect>
      </label>
      <Button
        type="submit"
        variant="outline"
        disabled={!file || !key.trim() || uploadObject.isPending}
        className="min-h-11 px-4 text-sm text-[var(--accent-foreground)] bg-[var(--accent)] border-2 border-[var(--accent)] hover:bg-[var(--accent)]/90"
      >
        {uploadObject.isPending ? "Uploading…" : "Upload"}
      </Button>
      {uploadObject.isError && (
        <span className="text-xs text-[var(--primary)]" role="alert">
          {(uploadObject.error as Error).message}
        </span>
      )}
    </form>
  );
}

export function ObjectList({
  objects,
  bucket,
  deleteObject,
}: {
  objects: { key: string; etag: string; size: number; lastModified?: string }[];
  bucket: string;
  deleteObject: ReturnType<typeof useDeleteObject>;
}) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {objects.length === 0 ? (
        <p
          className="border-2 border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[var(--muted-foreground)]"
          role="status"
        >
          No objects in this bucket. Upload the first object above.
        </p>
      ) : (
        <div className="overflow-x-auto border-2 border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[48rem] text-left text-xs">
            <thead className="bg-[var(--background)] font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
              <tr>
                <th scope="col" className="p-3">
                  Key
                </th>
                <th scope="col" className="p-3">
                  Size
                </th>
                <th scope="col" className="p-3">
                  ETag
                </th>
                <th scope="col" className="p-3">
                  Last modified
                </th>
                <th scope="col" className="p-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] text-[var(--foreground)]">
              {objects.map((object) => (
                <tr key={object.key}>
                  <td className="max-w-xs truncate p-3 font-mono" title={object.key}>
                    {object.key}
                  </td>
                  <td className="whitespace-nowrap p-3">{formatBytes(object.size)}</td>
                  <td className="p-3 font-mono text-[var(--muted-foreground)]">
                    {object.etag.slice(0, 12)}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {object.lastModified ? new Date(object.lastModified).toLocaleString() : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={objectHref(bucket, object.key)}
                        className="min-h-9 px-3 py-2 text-xs text-[var(--primary)] border border-[var(--blue)] bg-transparent hover:bg-[var(--blue)]/10"
                      >
                        Download
                      </a>
                      {pendingDelete === object.key ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void deleteObject.mutateAsync(object.key);
                              setPendingDelete(null);
                            }}
                            disabled={deleteObject.isPending}
                            className="min-h-9 px-3 py-2 text-xs text-[var(--foreground)] bg-[var(--yellow)]/20 border border-[var(--yellow)]"
                          >
                            Confirm delete
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => setPendingDelete(null)}
                            className="min-h-9 h-auto p-0 text-xs text-[var(--muted-foreground)]"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPendingDelete(object.key)}
                          disabled={deleteObject.isPending}
                          className="min-h-9 text-xs text-[var(--primary)] border border-[var(--yellow)] bg-transparent hover:bg-[var(--yellow)]/10"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {deleteObject.isError && (
        <p className="text-xs text-[var(--primary)]" role="alert">
          {(deleteObject.error as Error).message}
        </p>
      )}
    </div>
  );
}
