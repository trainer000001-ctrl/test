"use client";

import {
  BRAND_LOGO_IDS,
  CUTOUT_ARTWORK_IDS,
  CutoutArtwork,
  DnaBrandLogo,
  SkinMatrixCompare,
  SkinOrnament,
  SkinPlayground,
  TokenInspector,
  WorldArtwork,
  auditDnaContrast,
  type CanonicalDensity,
  type MasterDnaId,
  type getDnaWorld,
  type useSkin,
} from "@moonwitness/ui";
import {
  ArsyRelay,
  MemoryTapeNode,
  MtimeHorizon,
  MyceliumSpore,
  RadiusKey,
  ScriptureFolio,
  SimpulNode,
  SkinPalette,
  SnmpProbe,
  StorageBucket,
  SyslogStream,
  VpnTunnel,
} from "@moonwitness/ui/icons";

const SOVEREIGN_DOMAIN_ICONS = [
  { id: "vpn", label: "VPN Tunnel", Icon: VpnTunnel },
  { id: "syslog", label: "Syslog Stream", Icon: SyslogStream },
  { id: "snmp", label: "SNMP Probe", Icon: SnmpProbe },
  { id: "storage", label: "Storage Bucket", Icon: StorageBucket },
  { id: "radius", label: "RADIUS Key", Icon: RadiusKey },
  { id: "mtime", label: "MTIME Horizon", Icon: MtimeHorizon },
  { id: "scripture", label: "Scripture Folio", Icon: ScriptureFolio },
  { id: "memory", label: "Memory Tape", Icon: MemoryTapeNode },
  { id: "arsy", label: "Arsy Relay", Icon: ArsyRelay },
  { id: "simpul", label: "Simpul Node", Icon: SimpulNode },
  { id: "mycelium", label: "Mycelium Spore", Icon: MyceliumSpore },
  { id: "skin-palette", label: "Skin Palette", Icon: SkinPalette },
] as const;

export function SkinLabCompareView({
  worlds,
}: {
  worlds: readonly ReturnType<typeof getDnaWorld>[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {worlds.map((world) => {
        const audit = auditDnaContrast(world);
        return (
          <div
            key={world.id}
            className={`space-y-3 p-4 ${world.cardClass}`}
            style={{
              backgroundColor: world.palette.canvas,
              color: world.palette.text,
              borderColor: world.palette.border,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold">
                {world.numeral} · {world.name}
              </span>
              <span className={world.badgeClass}>{audit.passed ? "ALL PASS" : "FAIL"}</span>
            </div>
            <WorldArtwork dnaId={world.id} />
            <p className="text-xs" style={{ color: world.palette.mutedText }}>
              {world.metaphor}
            </p>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              {audit.pairs.map((pair) => (
                <div
                  key={pair.pairName}
                  className="border px-2 py-1"
                  style={{
                    borderColor: world.palette.border,
                    backgroundColor: world.palette.surface,
                  }}
                >
                  <div style={{ color: world.palette.mutedText }}>{pair.pairName}</div>
                  <div>
                    {pair.ratio}:1 ({pair.passed ? "PASS" : "FAIL"})
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SkinLabMatrixView({
  selectedDnaId,
  resolvedMode,
  activeDensity,
}: {
  selectedDnaId: MasterDnaId;
  resolvedMode: "light" | "dark";
  activeDensity: CanonicalDensity;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div>
          <h2 className="font-brush text-2xl text-[var(--foreground)]">10-SKIN LIVE MATRIX DIFF</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Simultaneous comparison of Default, Riot, Editorial, Technical, Archive, and
            Transmission for {selectedDnaId} ({resolvedMode} · {activeDensity}).
          </p>
        </div>
        <SkinOrnament slot="tag" label={`${selectedDnaId} · ${resolvedMode.toUpperCase()}`} />
      </div>
      <SkinMatrixCompare dnaId={selectedDnaId} mode={resolvedMode} density={activeDensity} />
    </section>
  );
}

export function SkinLabAssetsView({
  activeSkin,
  globalDnaId,
}: {
  activeSkin: ReturnType<typeof useSkin>["skin"];
  globalDnaId: MasterDnaId;
}) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden border-2 border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-brush text-2xl text-[var(--foreground)]">
            18 CANONICAL BRAND LOGO LOCKUPS
          </h2>
          <SkinOrnament slot="tag" label={`${activeSkin.toUpperCase()} · ${globalDnaId}`} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {BRAND_LOGO_IDS.map((logoId) => (
            <div
              key={logoId}
              className="flex flex-col items-start justify-between gap-3 border border-[var(--border)] bg-[var(--background)] p-3"
            >
              <DnaBrandLogo id={logoId} variant="mark" size={40} />
              <DnaBrandLogo id={logoId} variant="lockup" size={28} className="max-w-full" />
              <span className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">
                {logoId}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-2 border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-4 font-brush text-2xl text-[var(--foreground)]">
          24 ISOLATED VECTOR CUTOUTS
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {CUTOUT_ARTWORK_IDS.map((cutoutId) => (
            <div
              key={cutoutId}
              className="flex flex-col items-center gap-2 border border-[var(--border)] bg-[var(--background)] p-3 text-center"
            >
              <CutoutArtwork id={cutoutId} className="h-24 w-24" />
              <span className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">
                {cutoutId}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-2 border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-4 font-brush text-2xl text-[var(--foreground)]">
          12 SOVEREIGN DOMAIN ICONS
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SOVEREIGN_DOMAIN_ICONS.map(({ id, label, Icon }) => (
            <div
              key={id}
              className="flex items-center gap-3 border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
            >
              <Icon className="h-6 w-6 shrink-0 text-[var(--primary)]" />
              <span className="font-mono text-[11px] text-[var(--foreground)]">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SkinLabDxView() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="border-2 border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-4 font-brush text-2xl text-[var(--foreground)]">SKIN PLAYGROUND</h2>
        <SkinPlayground />
      </div>
      <div className="border-2 border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-4 font-brush text-2xl text-[var(--foreground)]">DNA TOKEN INSPECTOR</h2>
        <TokenInspector />
      </div>
    </div>
  );
}
