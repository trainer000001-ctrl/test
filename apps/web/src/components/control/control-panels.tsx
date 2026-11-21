"use client";

import { useMemo } from "react";
import { Badge, Card, Gauge, Tape, ZineCardRough } from "@moonwitness/ui";
import { Star4 } from "@moonwitness/ui/icons";
import {
  useControlAudit,
  useControlResources,
  type useControlStatus,
  type HostMetrics,
  type Observation,
} from "@/lib/api/control";

export type ControlResourceKind =
  | "systemd"
  | "docker"
  | "network"
  | "ssh"
  | "cert"
  | "mount"
  | "alert"
  | "gitdeploy"
  | "dockercompose"
  | "package"
  | "backup"
  | "kubernetes";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

export function formatUptime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "—";
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

type HostMetricTone = "pink" | "blue" | "yellow" | "green";

/** Host metric tile: product composition around the shared HUD Gauge primitive. */
export function HostMetricCard({
  label,
  pct,
  detail,
  tone,
}: {
  label: string;
  pct: number;
  detail: string;
  tone: HostMetricTone;
}) {
  const clamped = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  return (
    <Card className="relative overflow-hidden p-4">
      <Gauge label={label} value={`${clamped.toFixed(0)}%`} percent={clamped} tone={tone} />
      <div className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">{detail}</div>
    </Card>
  );
}

function CapabilityChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`border px-2 py-0.5 text-[10px] tracking-widest ${
        on
          ? "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]"
          : "border-[var(--border)] text-[var(--muted-foreground)]"
      }`}
    >
      {label}
    </span>
  );
}

function ObservationRow({ name, obs }: { name: string; obs: Observation }) {
  const fields = obs.fields ?? {};
  const state = fields.state ?? fields.status ?? (obs.exists ? "present" : "missing");
  const good = obs.exists && !["stopped", "exited", "dead", "failed"].includes(state.toLowerCase());
  return (
    <tr className="border-b border-[var(--border)]/60 last:border-b-0">
      <td className="px-3 py-2 font-mono text-xs text-[var(--foreground)]">{name}</td>
      <td className="px-3 py-2">
        <span
          className={`inline-block border px-2 py-0.5 text-[10px] tracking-widest ${
            good
              ? "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]"
              : "border-[var(--red)]/50 bg-[var(--red)]/10 text-[var(--red)]"
          }`}
        >
          {state.toUpperCase()}
        </span>
      </td>
      <td className="px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
        {Object.entries(fields)
          .filter(([key]) => !["state", "status"].includes(key))
          .map(([key, value]) => `${key}=${value}`)
          .join(" · ") ||
          (obs.detail ?? "—")}
      </td>
    </tr>
  );
}

export function ResourcePanel({ kind }: { kind: ControlResourceKind }) {
  const { data, isLoading, error } = useControlResources(kind);
  const payload: unknown = data?.[kind];
  // arsy mengirim { "<kind>": { error: "..." } } bila backend-nya tidak tersedia.
  const kindError =
    payload && typeof (payload as { error?: unknown }).error === "string"
      ? (payload as { error: string }).error
      : null;
  const rows = useMemo<[string, Observation][]>(
    () =>
      !payload || kindError
        ? []
        : Object.entries(payload as Record<string, Observation>).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
    [payload, kindError],
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-3">
        <h2 className="font-brush text-lg text-[var(--foreground)]">
          {kind.toUpperCase()}{" "}
          <span className="text-[var(--primary)]">
            {kind === "systemd" || kind === "docker" ? "UNITS" : "RESOURCES"}
          </span>
        </h2>
        <Badge variant="blue">
          {isLoading ? "SYNCING" : error || kindError ? "UNAVAILABLE" : `${rows.length} SEEN`}
        </Badge>
      </div>
      {error || kindError ? (
        <p className="px-4 py-6 text-sm text-[var(--primary)]">
          {kindError ?? (error as Error).message}
        </p>
      ) : rows.length === 0 && !isLoading ? (
        <p className="px-4 py-6 text-sm text-[var(--muted-foreground)]">
          Tidak ada resource yang cocok allowlist.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[9px] tracking-[0.2em] text-[var(--muted-foreground)]">
                <th className="px-3 py-2 font-normal">NAME</th>
                <th className="px-3 py-2 font-normal">STATE</th>
                <th className="px-3 py-2 font-normal">FIELDS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, obs]) => (
                <ObservationRow key={name} name={name} obs={obs} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function HostCard({
  host,
  metrics,
}: {
  host: NonNullable<ReturnType<typeof useControlStatus>["data"]>["host"];
  metrics: HostMetrics;
}) {
  return (
    <ZineCardRough className="relative overflow-hidden p-5 skin-riot">
      <Star4 className="absolute right-4 top-4 h-6 w-6 text-[var(--primary)] opacity-70" />
      <p className="text-[10px] tracking-[0.25em] text-[var(--muted-foreground)]">HOST AGENT</p>
      <h2 className="mt-1 font-brush text-2xl text-[var(--foreground)]">
        {host.hostname || "unknown-host"}
      </h2>
      <p className="mt-1 font-hand text-lg text-[var(--primary)]">
        {host.distro || host.os}
        {host.wsl_distro ? ` · WSL ${host.wsl_distro}` : ""} · {host.arch}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <div>
          <dt className="text-[var(--muted-foreground)]">OS</dt>
          <dd className="text-[var(--foreground)]">{host.os}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted-foreground)]">KERNEL</dt>
          <dd className="truncate text-[var(--foreground)]">{host.kernel || "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted-foreground)]">ROOT</dt>
          <dd className={host.is_root ? "text-[var(--green)]" : "text-[var(--muted-foreground)]"}>
            {host.is_root ? "yes" : "no"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted-foreground)]">UPTIME</dt>
          <dd className="text-[var(--foreground)]">{formatUptime(metrics.uptime_sec)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <CapabilityChip label="SYSTEMD" on={host.capabilities.systemd} />
        <CapabilityChip label="DOCKER" on={host.capabilities.docker} />
        <CapabilityChip label="FILES" on={host.capabilities.files} />
        <CapabilityChip label="CRON" on={host.capabilities.cron} />
        <CapabilityChip label="USERS" on={host.capabilities.users} />
        <CapabilityChip label="FIREWALL" on={host.capabilities.firewall} />
        <CapabilityChip label="METRICS" on={host.capabilities.host_metrics} />
        <CapabilityChip label="NETWORK" on={host.capabilities.network} />
        <CapabilityChip label="SSH" on={host.capabilities.ssh} />
        <CapabilityChip label="CERT" on={host.capabilities.cert} />
        <CapabilityChip label="MOUNT" on={host.capabilities.mount} />
        <CapabilityChip label="ALERT" on={host.capabilities.alert} />
        <CapabilityChip label="K8S" on={host.capabilities.kubernetes} />
      </div>
      {metrics.degraded && (
        <p className="mt-3 border border-[var(--yellow)]/40 bg-[var(--yellow)]/10 px-3 py-2 text-[11px] text-[var(--primary)]">
          Metrik host terdegradasi{metrics.notes?.length ? `: ${metrics.notes.join(", ")}` : ""}
        </p>
      )}
    </ZineCardRough>
  );
}

export function AuditPanel() {
  const { data, isLoading } = useControlAudit(20);
  const entries = data ?? [];
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-3">
        <h2 className="font-brush text-lg text-[var(--foreground)]">
          AUDIT <span className="text-[var(--primary)]">TRAIL</span>
        </h2>
        <span className="text-[10px] tracking-widest text-[var(--muted-foreground)]">
          {isLoading ? "READING…" : `${entries.length} ENTRIES`}
        </span>
      </div>
      {entries.length === 0 && !isLoading ? (
        <p className="px-4 py-6 text-sm text-[var(--muted-foreground)]">
          Belum ada aktivitas tercatat.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)]/60">
          {entries.map((entry, i) => (
            <li
              key={`${entry.time}-${i}`}
              className="flex flex-wrap items-baseline gap-x-3 px-4 py-2"
            >
              <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                {new Date(entry.time).toLocaleString()}
              </span>
              <span className="font-mono text-[11px] text-[var(--foreground)]">
                {entry.method} {entry.path}
              </span>
              <span
                className={`text-[10px] tracking-widest ${
                  entry.result === "denied" || entry.result === "error"
                    ? "text-[var(--red)]"
                    : "text-[var(--green)]"
                }`}
              >
                {entry.result.toUpperCase()}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)]">{entry.role}</span>
              {entry.error && (
                <span className="text-[10px] text-[var(--muted-foreground)]">{entry.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function OnboardingPanel({ reachable }: { reachable: boolean }) {
  if (reachable) return null;
  const steps = [
    {
      n: "1",
      title: "Pasang arsy di VPS",
      body: "sudo ./install.sh --domain <host> --email <email> --with-app --with-caddy (atau --dry-run dulu)",
    },
    {
      n: "2",
      title: "Set env di apps/api",
      body: "ARSY_URL=http://127.0.0.1:8787 ARSY_TOKEN_READONLY=<token>",
    },
    {
      n: "3",
      title: "Jalankan arsy serve",
      body: "systemctl status arsy.service; journalctl -u arsy -n 50",
    },
    {
      n: "4",
      title: "Verifikasi",
      body: 'curl -H "Authorization: Bearer <token>" http://127.0.0.1:8787/v1/host',
    },
  ];
  return (
    <ZineCardRough className="relative overflow-hidden p-5">
      <Tape className="-top-3 left-10 -rotate-3" />
      <p className="text-[10px] tracking-[0.25em] text-[var(--muted-foreground)]">ONBOARDING</p>
      <h2 className="mt-1 font-brush text-2xl text-[var(--foreground)]">
        ARSY <span className="text-[var(--primary)]">BELUM TERHUBUNG</span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
        Ikuti langkah berikut untuk menghubungkan dashboard ke control plane. Semua aksi tetap lewat
        CLI; dashboard hanya membaca.
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.n} className="flex gap-3">
            <span className="font-brush text-xl text-[var(--primary)]">{step.n}</span>
            <div>
              <p className="text-xs font-bold tracking-wider text-[var(--foreground)]">
                {step.title}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[var(--muted-foreground)]">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </ZineCardRough>
  );
}
