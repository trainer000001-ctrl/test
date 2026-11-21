"use client";

import { useState } from "react";
import { Badge, Button, Card, Input, ZineButton } from "@moonwitness/ui";
import { useCreatePortForward, useDeletePortForward, usePortForwards } from "@/lib/api/portforward";

export function PortForwardPanel() {
  return <PortForwardPanelInner />;
}

function PortForwardPanelInner() {
  const { data, isLoading } = usePortForwards();
  const create = useCreatePortForward();
  const remove = useDeletePortForward();

  const [port, setPort] = useState("");
  const [proto, setProto] = useState<"tcp" | "udp">("tcp");
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const forwards = data?.forwards ?? [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!port.trim() || !to.trim()) {
      setError("Port dan tujuan (ip:port) wajib diisi.");
      return;
    }
    create.mutate(
      {
        port: port.trim(),
        proto,
        to: to.trim(),
        from: from.trim() || undefined,
      },
      {
        onSuccess: () => {
          setPort("");
          setTo("");
          setFrom("");
        },
        onError: (err: Error) => setError(err.message),
      },
    );
  }

  function deleteRule(key: string) {
    setError(null);
    remove.mutate(key, { onError: (err: Error) => setError(err.message) });
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="font-brush text-lg text-[var(--foreground)]">
            PORT <span className="text-[var(--primary)]">FORWARDING</span>
          </h2>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Teruskan port publik host ke layanan di balik VPN (DNAT via nftables).
          </p>
        </div>
        <Badge variant="default" className="bg-[var(--blue)] text-[var(--primary-foreground)]">
          {isLoading ? "SYNCING" : `${forwards.length} ATURAN`}
        </Badge>
      </div>

      <form onSubmit={submit} className="border-b border-[var(--border)] bg-[var(--muted)] p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_80px_1fr_1fr_auto]">
          <Input
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="Port: 8080"
            className="rounded-md px-3 py-2 text-xs"
            aria-label="Port publik"
          />
          <div className="flex gap-1">
            {(["tcp", "udp"] as const).map((p) => (
              <Button
                key={p}
                type="button"
                variant="plain"
                onClick={() => setProto(p)}
                aria-pressed={proto === p}
                className={`flex-1 border text-[10px] tracking-widest ${
                  proto === p
                    ? "border-[var(--pink)] bg-[var(--pink)]/15 text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)]"
                }`}
              >
                {p.toUpperCase()}
              </Button>
            ))}
          </div>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Tujuan: 10.66.0.2:80"
            className="rounded-md px-3 py-2 text-xs"
            aria-label="Tujuan IP dan port"
          />
          <Input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Sumber (opsional CIDR)"
            className="rounded-md px-3 py-2 text-xs"
            aria-label="Sumber CIDR opsional"
          />
          <ZineButton
            type="submit"
            tone="pink"
            disabled={create.isPending}
            className="border border-[var(--border)] px-4 py-2 text-xs"
          >
            {create.isPending ? "MEMASANG…" : "TERUSKAN"}
          </ZineButton>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-[var(--red)]">
            {error}
          </p>
        )}
      </form>

      {forwards.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[var(--muted-foreground)]">
          Belum ada port forwarding. Tambahkan aturan di atas untuk membuka akses ke layanan
          internal.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[9px] tracking-[0.2em] text-[var(--muted-foreground)]">
                <th className="px-3 py-2 font-normal">PORT PUBLIK</th>
                <th className="px-3 py-2 font-normal">TUJUAN</th>
                <th className="px-3 py-2 font-normal">SUMBER</th>
                <th className="px-3 py-2 font-normal">STATUS</th>
                <th className="px-3 py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {forwards.map((f) => (
                <tr key={f.key} className="border-b border-[var(--border)]/60 last:border-b-0">
                  <td className="px-3 py-2 font-mono text-xs text-[var(--foreground)]">
                    {f.proto.toUpperCase()}/{f.port}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-[var(--primary)]">{f.to}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--muted-foreground)]">
                    {f.from || "any"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block border px-2 py-0.5 text-[10px] tracking-widest ${
                        f.active
                          ? "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {f.active ? "AKTIF" : "TERCATAT"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <ZineButton
                      type="button"
                      tone="pink"
                      onClick={() => deleteRule(f.key)}
                      disabled={remove.isPending}
                      className="border border-[var(--border)] px-2.5 py-1.5 text-[10px]"
                    >
                      HAPUS
                    </ZineButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
