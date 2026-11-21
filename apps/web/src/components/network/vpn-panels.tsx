"use client";

import { useState } from "react";
import {
  Button,
  CableCoilArt,
  Tape,
  ZineButton,
  ZineCard,
  ZineCardRough,
  ZineInput,
} from "@moonwitness/ui";
import { Crown, VpnTunnel } from "@moonwitness/ui/icons";
import type { VPNPeer, VPNStatus } from "@/lib/api/vpn";

export function formatTraffic(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

export function handshakeLabel(epoch?: string): { text: string; live: boolean } {
  if (!epoch) return { text: "belum pernah", live: false };
  const seconds = Number(epoch);
  if (!Number.isFinite(seconds) || seconds <= 0) return { text: "belum pernah", live: false };
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (diff < 180) return { text: `${diff}s lalu`, live: true };
  if (diff < 7200) return { text: `${Math.floor(diff / 60)}m lalu`, live: true };
  if (diff < 172800) return { text: `${Math.floor(diff / 3600)}j lalu`, live: false };
  return { text: `${Math.floor(diff / 86400)}h lalu`, live: false };
}

export function ConfigPanel({
  name,
  config,
  onClose,
}: {
  name: string;
  config: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const blob = new Blob([config], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.conf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ZineCardRough className="relative p-5">
      <Tape className="-top-3 left-8 -rotate-3" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 font-brush text-xl text-[var(--foreground)]">
          <VpnTunnel className="h-5 w-5 text-[var(--primary)]" />
          <span>
            CONFIG <span className="text-[var(--green)]">{name.toUpperCase()}</span>
          </span>
        </h3>
        <div className="flex gap-2">
          <ZineButton type="button" tone="blue" onClick={copy} className="px-3 py-2 text-[11px]">
            {copied ? "TERSALIN" : "SALIN"}
          </ZineButton>
          <ZineButton
            type="button"
            tone="yellow"
            onClick={download}
            className="px-3 py-2 text-[11px]"
          >
            UNDUH .CONF
          </ZineButton>
          <ZineButton
            type="button"
            tone="paper"
            onClick={onClose}
            className="px-3 py-2 text-[11px]"
          >
            TUTUP
          </ZineButton>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[var(--primary)]">
        Private key hanya ditampilkan sekarang. Salin sebelum menutup panel ini.
      </p>
      <pre className="mt-3 max-h-80 overflow-auto border border-[var(--border)] bg-[var(--muted)] p-3 font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
        {config}
      </pre>
    </ZineCardRough>
  );
}

export function PeerRow({
  peer,
  onShowConfig,
  onDelete,
  onSetQuota,
  busy,
}: {
  peer: VPNPeer;
  onShowConfig: () => void;
  onDelete: () => void;
  onSetQuota: () => void;
  busy: boolean;
}) {
  const hs = handshakeLabel(peer.handshake);
  const total = (peer.rx_bytes || 0) + (peer.tx_bytes || 0);
  const quota = peer.quota_bytes ?? 0;
  const pct = quota > 0 ? Math.min(100, Math.round((total / quota) * 100)) : 0;
  return (
    <tr className="border-b border-[var(--border)]/60 last:border-b-0">
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-[var(--foreground)]">{peer.name}</span>
        <span className="ml-2 text-[10px] tracking-widest text-[var(--muted-foreground)]">
          {peer.mode.toUpperCase()}
        </span>
        {peer.subnet && (
          <span className="ml-2 text-[10px] tracking-widest text-[var(--cyan,var(--blue))]">
            {peer.subnet}
          </span>
        )}
        {peer.quota_blocked && (
          <span className="ml-2 border border-[var(--red)]/50 bg-[var(--red)]/10 px-1.5 py-0.5 text-[9px] tracking-widest text-[var(--red)]">
            KUOTA HABIS
          </span>
        )}
        {peer.extra_cidrs && peer.extra_cidrs.length > 0 && (
          <p className="mt-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
            {peer.extra_cidrs.join(", ")}
          </p>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-[var(--muted-foreground)]">
        {peer.address}
      </td>
      <td className="px-3 py-2">
        <span
          className={`inline-block border px-2 py-0.5 text-[10px] tracking-widest ${
            hs.live
              ? "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]"
              : "border-[var(--border)] text-[var(--muted-foreground)]"
          }`}
        >
          {hs.text.toUpperCase()}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-[10px] text-[var(--muted-foreground)]">
        <div>
          ↓{formatTraffic(peer.rx_bytes)} ↑{formatTraffic(peer.tx_bytes)}
        </div>
        {quota > 0 && (
          <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
            {formatTraffic(total)} / {formatTraffic(quota)} ({pct}%)
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <ZineButton
          type="button"
          tone="paper"
          onClick={onSetQuota}
          disabled={busy}
          className="mr-2 px-2.5 py-1.5 text-[10px]"
        >
          KUOTA
        </ZineButton>
        <ZineButton
          type="button"
          tone="paper"
          onClick={onShowConfig}
          className="mr-2 px-2.5 py-1.5 text-[10px]"
        >
          CONFIG
        </ZineButton>
        <ZineButton
          type="button"
          tone="pink"
          onClick={onDelete}
          disabled={busy}
          className="px-2.5 py-1.5 text-[10px]"
        >
          HAPUS
        </ZineButton>
      </td>
    </tr>
  );
}

export function AddPeerCard({
  subnets,
  peerName,
  peerSubnet,
  peerMode,
  peerCIDR,
  pending,
  onPeerNameChange,
  onPeerSubnetChange,
  onPeerModeChange,
  onPeerCIDRChange,
  onAddPeer,
}: {
  subnets: VPNStatus["subnets"];
  peerName: string;
  peerSubnet: string;
  peerMode: "split" | "full" | "site";
  peerCIDR: string;
  pending: boolean;
  onPeerNameChange: (value: string) => void;
  onPeerSubnetChange: (value: string) => void;
  onPeerModeChange: (value: "split" | "full" | "site") => void;
  onPeerCIDRChange: (value: string) => void;
  onAddPeer: () => void;
}) {
  return (
    <ZineCard className="p-5">
      <h2 className="font-brush text-xl text-[var(--foreground)]">
        TAMBAH <span className="text-[var(--primary)]">PERANGKAT</span>
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <ZineInput
          value={peerName}
          onChange={(e) => onPeerNameChange(e.target.value)}
          placeholder="pc-rumah"
          className="rounded-md px-4 py-2.5 text-sm"
          aria-label="Nama perangkat"
        />
        <ZineInput
          value={peerSubnet}
          onChange={(e) => onPeerSubnetChange(e.target.value)}
          placeholder="subnet (default)"
          list="vpn-subnets"
          className="rounded-md px-4 py-2.5 text-sm"
          aria-label="Subnet peer"
        />
        <datalist id="vpn-subnets">
          {(subnets ?? []).map((s) => (
            <option key={s.name} value={s.name}>
              {s.cidr}
            </option>
          ))}
        </datalist>
        <div className="flex gap-1">
          {(["split", "full", "site"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant="plain"
              onClick={() => onPeerModeChange(mode)}
              aria-pressed={peerMode === mode}
              className={`border px-3 py-2 text-[10px] tracking-widest ${
                peerMode === mode
                  ? "border-[var(--pink)] bg-[var(--pink)]/15 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {mode.toUpperCase()}
            </Button>
          ))}
        </div>
        <ZineButton
          type="button"
          tone="pink"
          onClick={onAddPeer}
          disabled={pending}
          className="px-5 py-2.5 text-sm"
        >
          {pending ? "MEMBUAT…" : "TAMBAH"}
        </ZineButton>
      </div>
      {peerMode === "site" && (
        <div className="mt-2">
          <ZineInput
            value={peerCIDR}
            onChange={(e) => onPeerCIDRChange(e.target.value)}
            placeholder="LAN di balik router, mis. 192.168.10.0/24"
            className="rounded-md px-4 py-2.5 text-sm"
            aria-label="CIDR LAN peer site"
          />
        </div>
      )}
      <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
        <strong className="text-[var(--foreground)]">SPLIT</strong> hanya subnet VPN — internet
        tetap lewat ISP. <strong className="text-[var(--foreground)]">FULL</strong> semua trafik
        lewat VPS. <strong className="text-[var(--foreground)]">SITE</strong> untuk router kantor:
        LAN di balik router ikut terhubung.
      </p>
    </ZineCard>
  );
}

export function RegisteredPeersCard({
  peers,
  downPending,
  busy,
  onTunnelDown,
  onShowConfig,
  onSetQuota,
  onDeletePeer,
}: {
  peers: VPNPeer[];
  downPending: boolean;
  busy: boolean;
  onTunnelDown: () => void;
  onShowConfig: (name: string) => void;
  onSetQuota: (name: string) => void;
  onDeletePeer: (name: string) => void;
}) {
  return (
    <ZineCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-3">
        <h2 className="inline-flex items-center gap-2 font-brush text-lg text-[var(--foreground)]">
          <VpnTunnel className="h-4 w-4 text-[var(--primary)]" />
          <span>
            PERANGKAT <span className="text-[var(--primary)]">TERDAFTAR</span>
          </span>
        </h2>
        <ZineButton
          type="button"
          tone="paper"
          onClick={onTunnelDown}
          disabled={downPending}
          className="px-3 py-2 text-[10px]"
        >
          MATIKAN TUNNEL
        </ZineButton>
      </div>
      {peers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
          <CableCoilArt className="h-16 w-16 opacity-85" decorative />
          <p>Belum ada perangkat. Tambahkan PC Anda di atas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[9px] tracking-[0.2em] text-[var(--muted-foreground)]">
                <th className="px-3 py-2 font-normal">NAMA</th>
                <th className="px-3 py-2 font-normal">ALAMAT</th>
                <th className="px-3 py-2 font-normal">HANDSHAKE</th>
                <th className="px-3 py-2 font-normal">TRAFIK / KUOTA</th>
                <th className="px-3 py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {peers.map((peer) => (
                <PeerRow
                  key={peer.id}
                  peer={peer}
                  busy={busy}
                  onShowConfig={() => onShowConfig(peer.name)}
                  onSetQuota={() => onSetQuota(peer.name)}
                  onDelete={() => onDeletePeer(peer.name)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ZineCard>
  );
}

export function VpnHowToConnectCard({
  address,
  listenPort,
}: {
  address: string;
  listenPort: number;
}) {
  return (
    <ZineCardRough className="p-5">
      <h2 className="font-brush text-lg text-[var(--foreground)]">
        CARA <span className="text-[var(--primary)]">SAMBUNG</span>
      </h2>
      <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
        <li>
          1. Unduh file <code>.conf</code> di atas.
        </li>
        <li>2. Pasang aplikasi WireGuard resmi di PC (Windows/macOS/Linux/Android/iOS).</li>
        <li>3. Impor file tersebut, lalu aktifkan tunnel.</li>
        <li>
          4. Cek dari PC: <code>ping {address.split("/")[0]}</code> — balasan berarti tunnel hidup.
        </li>
        <li>
          5. Pastikan port <code>udp/{listenPort}</code> terbuka di firewall VPS.
        </li>
      </ol>
      <p className="mt-3 flex items-center gap-1.5 text-[10px] tracking-wider text-[var(--muted-foreground)]">
        <Crown className="h-3 w-5 text-[var(--primary)]" />
        PRIVATE KEY TIDAK PERNAH DISIMPAN DI BROWSER
      </p>
    </ZineCardRough>
  );
}
