"use client";

import { useState } from "react";
import {
  CutoutArtwork,
  ZineBadge,
  ZineButton,
  ZineCard,
  ZineCardRough,
  ZineInput,
} from "@moonwitness/ui";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";
import { ControlGate } from "@/components/control/gate";
import { PortForwardPanel } from "./portforward";
import { AddPeerCard, ConfigPanel, RegisteredPeersCard, VpnHowToConnectCard } from "./vpn-panels";
import {
  useCreatePeer,
  useDeletePeer,
  usePeerConfig,
  useSetPeerQuota,
  useVPNDown,
  useVPNStatus,
  useVPNUp,
} from "@/lib/api/vpn";

export function NetworkCenter({ embedded = false }: { embedded?: boolean }) {
  if (embedded) {
    return <NetworkDashboard embedded />;
  }
  return (
    <ControlGate>
      <NetworkDashboard />
    </ControlGate>
  );
}

function NetworkDashboard({ embedded = false }: { embedded?: boolean }) {
  const [query, setQuery] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [localCIDR, setLocalCIDR] = useState("");
  const [peerName, setPeerName] = useState("");
  const [peerMode, setPeerMode] = useState<"split" | "full" | "site">("split");
  const [peerCIDR, setPeerCIDR] = useState("");
  const [peerSubnet, setPeerSubnet] = useState("");
  const [config, setConfig] = useState<{ name: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = useVPNStatus();
  const up = useVPNUp();
  const down = useVPNDown();
  const create = useCreatePeer();
  const remove = useDeletePeer();
  const fetchConfig = usePeerConfig();
  const setQuota = useSetPeerQuota();

  function runEndpointUp() {
    setError(null);
    const cidrs = localCIDR
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    up.mutate(
      { endpoint: endpoint.trim() || undefined, local_cidrs: cidrs },
      { onError: (err: Error) => setError(err.message) },
    );
  }

  function addPeer() {
    setError(null);
    if (!peerName.trim()) {
      setError("Nama peer wajib diisi.");
      return;
    }
    const cidrs = peerCIDR
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (peerMode === "site" && cidrs.length === 0) {
      setError("Mode SITE butuh CIDR LAN, mis. 192.168.10.0/24");
      return;
    }
    create.mutate(
      {
        name: peerName.trim(),
        mode: peerMode,
        extra_cidrs: cidrs,
        subnet: peerSubnet.trim() || undefined,
      },
      {
        onSuccess: (created) => {
          setConfig({ name: created.peer.name, text: created.config });
          setPeerName("");
          setPeerCIDR("");
        },
        onError: (err: Error) => setError(err.message),
      },
    );
  }

  function showConfig(name: string) {
    setError(null);
    fetchConfig.mutate(name, {
      onSuccess: (loaded) => setConfig({ name: loaded.peer.name, text: loaded.config }),
      onError: (err: Error) => setError(err.message),
    });
  }

  function deletePeer(name: string) {
    setError(null);
    remove.mutate(name, { onError: (err: Error) => setError(err.message) });
  }

  function editQuota(name: string) {
    setError(null);
    const raw = window.prompt(
      `Kuota total (rx+tx) untuk ${name} dalam byte. 0 = tanpa batas.`,
      "0",
    );
    if (raw === null) return;
    const quota = Number(raw.trim());
    if (!Number.isFinite(quota) || quota < 0) {
      setError("Kuota harus angka byte >= 0.");
      return;
    }
    setQuota.mutate(
      { name, quota_bytes: Math.floor(quota) },
      { onError: (err: Error) => setError(err.message) },
    );
  }

  const data = status.data;

  const content = (
    <div className={embedded ? "space-y-6" : "space-y-6 px-4 py-6 sm:px-8"}>
      <header className="relative overflow-hidden flex flex-wrap items-end justify-between gap-3">
        <CutoutArtwork
          id="cipher-wheel"
          decorative
          className="pointer-events-none absolute right-24 -top-2 hidden h-20 w-20 text-[var(--primary)]/15 sm:block"
        />
        <div>
          <h1 className="font-brush text-3xl text-[var(--foreground)] sm:text-4xl">
            VPN <span className="text-[var(--primary)]">TUNNEL</span>
          </h1>
          <p className="mt-1 max-w-xl font-hand text-xl text-[var(--muted-foreground)]">
            WireGuard di host ini. Tambah perangkat, unduh config, langsung tersambung.
          </p>
        </div>
        <ZineBadge color={data?.enabled ? "var(--mint)" : "var(--pink)"} dark>
          {status.isLoading ? "MEMERIKSA" : data?.enabled ? "AKTIF" : "MATI"}
        </ZineBadge>
      </header>

      {status.isError && (
        <ZineCardRough className="p-6">
          <h2 className="font-brush text-2xl text-[var(--red)]">ARSY TIDAK TERJANGKAU</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {(status.error as Error).message}
          </p>
        </ZineCardRough>
      )}

      {data && !data.available && (
        <ZineCardRough className="p-5">
          <h2 className="font-brush text-xl text-[var(--primary)]">TOOL BELUM ADA</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Host ini belum punya <code>{data.missing_tools?.join(", ")}</code>. Pasang dengan{" "}
            <code>apt install wireguard-tools iproute2 nftables</code> lalu muat ulang halaman.
          </p>
        </ZineCardRough>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ZineCard className="p-4">
              <p className="text-[10px] tracking-[0.2em] text-[var(--muted-foreground)]">
                INTERFACE
              </p>
              <p className="mt-1 font-brush text-2xl text-[var(--foreground)]">{data.interface}</p>
              <p className="mt-1 font-mono text-[11px] text-[var(--muted-foreground)]">
                {data.address}
              </p>
              <p className="mt-1 font-mono text-[11px] text-[var(--muted-foreground)]">
                udp/{data.listen_port}
              </p>
              {data.subnets && data.subnets.length > 0 && (
                <p className="mt-1 font-mono text-[10px] text-[var(--muted-foreground)]">
                  subnets: {data.subnets.map((s) => `${s.name}(${s.cidr})`).join(", ")}
                </p>
              )}
            </ZineCard>
            <ZineCard className="p-4">
              <p className="text-[10px] tracking-[0.2em] text-[var(--muted-foreground)]">
                ENDPOINT
              </p>
              <p className="mt-1 truncate font-mono text-sm text-[var(--foreground)]">
                {data.endpoint || "—"}
              </p>
              <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                Alamat yang dipakai PC untuk menyambung.
              </p>
            </ZineCard>
            <ZineCard className="p-4">
              <p className="text-[10px] tracking-[0.2em] text-[var(--muted-foreground)]">
                PUBLIC KEY
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-[var(--foreground)]">
                {data.public_key || "belum dibuat"}
              </p>
              <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                {data.peer_count} peer terdaftar
              </p>
            </ZineCard>
          </div>

          {!data.enabled && (
            <ZineCard className="p-5">
              <h2 className="font-brush text-xl text-[var(--foreground)]">
                AKTIFKAN <span className="text-[var(--primary)]">TUNNEL</span>
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Isi domain/IP publik VPS agar config PC bisa dibuat. Port default 51820/udp.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <ZineInput
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="vps.contoh.id:51820"
                  className="rounded-md px-4 py-2.5 text-sm"
                  aria-label="Endpoint publik"
                />
                <ZineInput
                  value={localCIDR}
                  onChange={(e) => setLocalCIDR(e.target.value)}
                  placeholder="LAN server (opsional) 10.20.0.0/24"
                  className="rounded-md px-4 py-2.5 text-sm"
                  aria-label="CIDR LAN server"
                />
                <ZineButton
                  type="button"
                  tone="pink"
                  onClick={runEndpointUp}
                  disabled={up.isPending}
                  className="shrink-0 px-5 py-2.5 text-sm"
                >
                  {up.isPending ? "MENYALAKAN…" : "AKTIFKAN"}
                </ZineButton>
              </div>
              <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                Port <code>udp/{data.listen_port}</code> dibuka otomatis di firewall host
                {data.manage_firewall ? "" : " (manajemen firewall dimatikan)"}.
              </p>
            </ZineCard>
          )}

          {data.enabled && (
            <>
              <AddPeerCard
                subnets={data.subnets}
                peerName={peerName}
                peerSubnet={peerSubnet}
                peerMode={peerMode}
                peerCIDR={peerCIDR}
                pending={create.isPending}
                onPeerNameChange={setPeerName}
                onPeerSubnetChange={setPeerSubnet}
                onPeerModeChange={setPeerMode}
                onPeerCIDRChange={setPeerCIDR}
                onAddPeer={addPeer}
              />
              <RegisteredPeersCard
                peers={data.peers}
                downPending={down.isPending}
                busy={remove.isPending || setQuota.isPending}
                onTunnelDown={() =>
                  down.mutate(undefined, { onError: (e: Error) => setError(e.message) })
                }
                onShowConfig={showConfig}
                onSetQuota={editQuota}
                onDeletePeer={deletePeer}
              />
            </>
          )}

          {error && (
            <p
              role="alert"
              className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-xs text-[var(--red)]"
            >
              {error}
            </p>
          )}

          {config && (
            <ConfigPanel name={config.name} config={config.text} onClose={() => setConfig(null)} />
          )}

          <PortForwardPanel />
          <VpnHowToConnectCard address={data.address} listenPort={data.listen_port} />
        </>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <ConsoleShellAdapter
      plane="operations"
      breadcrumb="Network"
      search={{ value: query, onChange: setQuery, placeholder: "Filter peer…" }}
    >
      {content}
    </ConsoleShellAdapter>
  );
}
