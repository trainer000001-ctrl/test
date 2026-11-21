"use client";

import { useMemo, useState } from "react";
import { DiamondStarOrnament, DnaButton, SacredCornerBrackets } from "@moonwitness/ui/imperium";
import {
  DOCK_TELEMETRY_NODES,
  WORLD_DOMAINS,
  type DockNodeTelemetry,
  type WorldIdentifier,
} from "@/data/empire-registry";
import { useSanctuaryLocale } from "@/lib/sanctuary-locale";
import { useEcosystemTelemetry } from "@/lib/use-ecosystem-telemetry";
import { DockTopologyBridge } from "./dock-topology-bridge";
import {
  ScrollChapterReveal,
  SpatialTiltCard,
  triggerSacredViewTransition,
} from "./motion-primitives";
import { WorldEmblemById } from "./sacred-icons";
import { AstrolabeOrreryMap, GatewayWaveformSvg } from "./sacred-illustrations";

type DockFilterState = "ALL" | DockNodeTelemetry["state"];

const DOCK_FILTER_OPTIONS: readonly { readonly id: DockFilterState; readonly label: string }[] = [
  { id: "ALL", label: "ALL GATEWAYS" },
  { id: "SYNCHRONIZED", label: "SYNCHRONIZED" },
  { id: "LUMINOUS", label: "LUMINOUS" },
  { id: "BROADCASTING", label: "BROADCASTING" },
  { id: "CANON_EXPLORER", label: "CANON EXPLORER" },
] as const;

export function DockMatrixSection({
  quietMode = false,
  onLaunchWorld,
}: {
  readonly quietMode?: boolean;
  readonly onLaunchWorld: (worldId: WorldIdentifier) => void;
}) {
  const { locale } = useSanctuaryLocale();
  const telemetry = useEcosystemTelemetry();
  const [filterState, setFilterState] = useState<DockFilterState>("ALL");
  const [selectedNodeCode, setSelectedNodeCode] = useState<string>(
    DOCK_TELEMETRY_NODES[0]?.nodeCode ?? "GATE-01",
  );

  const visibleNodes = useMemo(
    () =>
      filterState === "ALL"
        ? DOCK_TELEMETRY_NODES
        : DOCK_TELEMETRY_NODES.filter((node) => node.state === filterState),
    [filterState],
  );

  const visibleCodeSet = useMemo(
    () => new Set(visibleNodes.map((node) => node.nodeCode)),
    [visibleNodes],
  );

  const activeNode =
    visibleNodes.find((node) => node.nodeCode === selectedNodeCode) ??
    visibleNodes[0] ??
    DOCK_TELEMETRY_NODES[0]!;

  const matchedWorld = WORLD_DOMAINS.find((domain) => domain.id === activeNode.worldId);
  const activeNodeIdx = Math.max(
    0,
    DOCK_TELEMETRY_NODES.findIndex((node) => node.nodeCode === activeNode.nodeCode),
  );

  const activeLiveProbe = useMemo(() => {
    if (!activeNode.runtimeTargetId) return null;
    const svc = telemetry.services.find((s) => s.id === activeNode.runtimeTargetId);
    if (svc) return svc;
    return telemetry.edges.find((e) => e.id === activeNode.runtimeTargetId) ?? null;
  }, [activeNode.runtimeTargetId, telemetry.services, telemetry.edges]);

  const hasVerifiedProbeMeasurement =
    activeLiveProbe !== null &&
    typeof activeLiveProbe.latencyMs === "number" &&
    Boolean(activeLiveProbe.measuredAt ?? telemetry.generatedAt) &&
    activeLiveProbe.source === "live-http-probe";

  const handleSelectFilter = (optionId: DockFilterState) => {
    triggerSacredViewTransition(() => {
      setFilterState(optionId);
      const nextVisible =
        optionId === "ALL"
          ? DOCK_TELEMETRY_NODES
          : DOCK_TELEMETRY_NODES.filter((node) => node.state === optionId);
      if (nextVisible.length > 0 && !nextVisible.some((n) => n.nodeCode === selectedNodeCode)) {
        setSelectedNodeCode(nextVisible[0]!.nodeCode);
      }
    }, quietMode);
  };

  const handleSelectNode = (nodeCode: string) => {
    triggerSacredViewTransition(() => {
      setSelectedNodeCode(nodeCode);
    }, quietMode);
  };

  return (
    <section
      id="the-dock"
      aria-labelledby="dock-heading"
      className="scroll-mt-16 relative overflow-x-clip bg-[var(--dna-canvas)]/95 py-24 px-4 sm:px-8 lg:px-16"
    >
      <div className="wrap mx-auto max-w-7xl">
        <ScrollChapterReveal quietMode={quietMode}>
          <div className="flex flex-col items-center text-center">
            <div className="font-monument flex items-center gap-4 text-xs tracking-[0.35em] text-[var(--dna-accent)] uppercase">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--dna-accent)]" />
              <span>CELESTIAL HORIZON BRIDGE</span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--dna-accent)]" />
            </div>
            <h2
              id="dock-heading"
              className="font-monument mt-4 text-3xl sm:text-5xl tracking-[0.18em] text-gold-gradient uppercase"
            >
              {locale === "id" ? "DERMAGA · MATRIKS BERDAULAT" : "THE DOCK · SOVEREIGN MATRIX"}
            </h2>
            <p className="mt-3 max-w-2xl font-serif text-base sm:text-lg text-[var(--dna-muted)]/90 leading-relaxed">
              {locale === "id"
                ? "Astrolabe heliosentris interaktif yang memetakan lima gerbang ekosistem di sekitar satu inti cahaya monosentris. Pilih titik orbit untuk membaca telemetri."
                : "Interactive heliocentric astrolabe plotting the five Empire gateways around one monocentric light core. Select any orbital node to lock sextant telemetry and launch."}
            </p>

            {/* Filter by Gateway Class */}
            <div
              role="group"
              aria-label="Filter gateways by state"
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
            >
              {DOCK_FILTER_OPTIONS.map((option) => {
                const isActive = filterState === option.id;
                return (
                  <DnaButton
                    key={option.id}
                    tone="secondary"
                    aria-pressed={isActive}
                    onClick={() => handleSelectFilter(option.id)}
                    className={`px-4.5 py-1.5 text-[11px] tracking-[0.18em] uppercase ${
                      isActive
                        ? "text-[var(--dna-text)]"
                        : "text-[var(--dna-muted)] hover:text-[var(--dna-text)]"
                    }`}
                  >
                    {option.label}
                  </DnaButton>
                );
              })}
            </div>
          </div>
        </ScrollChapterReveal>

        {/* Dual-Perspective Orbital Orrery Observatory + Telemetry Aperture */}
        <ScrollChapterReveal quietMode={quietMode}>
          <div className="mt-12 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left: Astronomical Orbital Orrery Stage */}
            <div className="lg:col-span-6 relative border border-[var(--dna-accent)]/30 bg-gradient-to-b from-[var(--dna-canvas)] via-[var(--dna-canvas)] to-[var(--dna-canvas)] p-6 sm:p-8 shadow-[0_24px_65px_rgba(0,0,0,0.85)]">
              <SacredCornerBrackets />
              <div className="mb-3 flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-[var(--dna-accent)] uppercase">
                <span>ASTROLABE ORRERY // SEXTANT LOCK</span>
                <span>
                  {visibleNodes.length} OF {DOCK_TELEMETRY_NODES.length} ACTIVE
                </span>
              </div>

              <AstrolabeOrreryMap
                nodes={DOCK_TELEMETRY_NODES}
                visibleCodes={visibleCodeSet}
                selectedCode={activeNode.nodeCode}
                quietMode={quietMode}
                onSelectNode={handleSelectNode}
              />
            </div>

            {/* Right: Gateway Switcher Rail + Active Aperture Inspector */}
            <div className="lg:col-span-6 flex flex-col gap-5">
              {/* Compact Synchronized Gateway Selector Rail */}
              <div
                role="tablist"
                aria-label="Select a Gateway Satellite"
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
              >
                {visibleNodes.map((node) => {
                  const isSelected = node.nodeCode === activeNode.nodeCode;
                  const worldMeta = WORLD_DOMAINS.find((w) => w.id === node.worldId);
                  return (
                    <DnaButton
                      key={node.nodeCode}
                      type="button"
                      tone="secondary"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => handleSelectNode(node.nodeCode)}
                      className="min-h-[54px] h-auto flex-col items-stretch justify-start gap-0 px-3 py-2 text-left"
                    >
                      <div className="flex items-center justify-between font-mono text-[9.5px] text-[var(--dna-accent)]">
                        <span>{node.nodeCode}</span>
                        <span
                          className={`h-1.5 w-1.5 rounded-full bg-[var(--dna-accent)] ${
                            quietMode ? "" : "animate-pulse"
                          }`}
                        />
                      </div>
                      <div className="font-monument mt-1 truncate text-[11px] tracking-[0.08em] text-[var(--dna-text)]">
                        {worldMeta?.name ?? node.designation}
                      </div>
                    </DnaButton>
                  );
                })}
              </div>

              {/* Active Gateway Beveled Telemetry Aperture */}
              <SpatialTiltCard disabled={quietMode} maxTiltDeg={2.8}>
                <div className="octa-bevel-shell relative p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-4 font-mono text-[11px] text-[var(--dna-accent)]">
                    <span>TELEMETRY LOCK // {activeNode.nodeCode}</span>
                    <span className="inline-flex items-center gap-1.5 text-[var(--dna-accent)]">
                      <span
                        className={`h-1.5 w-1.5 rounded-full bg-[var(--dna-accent)] ${
                          quietMode ? "" : "animate-pulse"
                        }`}
                      />
                      {activeNode.state}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--dna-accent)]/40 bg-[var(--dna-canvas)]">
                      <WorldEmblemById worldId={activeNode.worldId} className="h-11 w-11" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2.5">
                        <h3 className="font-monument text-2xl sm:text-3xl tracking-[0.14em] text-[var(--dna-text)]">
                          {matchedWorld?.name ?? activeNode.designation}
                        </h3>
                        {matchedWorld && (
                          <span dir="rtl" lang="ar" className="text-lg text-[var(--dna-accent)]">
                            {matchedWorld.arabicEpithet}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-serif text-sm text-[var(--dna-muted)]">
                        {activeNode.designation}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-y border-[var(--dna-accent)]/15 py-3">
                    <div className="mb-1.5 flex justify-between font-mono text-[10px] tracking-[0.16em] text-[var(--dna-muted)] uppercase">
                      <span>HARMONIC CARRIER WAVE</span>
                      <span className="text-[var(--dna-accent)]">
                        {matchedWorld?.harmonicFrequency ?? "COVENANT SYNC"}
                      </span>
                    </div>
                    <GatewayWaveformSvg variant={activeNodeIdx + 1} />
                  </div>

                  <dl className="mt-5 grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-3">
                    <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3">
                      <dt className="text-[10px] text-[var(--dna-muted)]">PROTOCOL</dt>
                      <dd className="mt-1 text-[var(--dna-text)] break-words">
                        {activeNode.protocol}
                      </dd>
                    </div>
                    <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3">
                      <dt className="text-[10px] text-[var(--dna-muted)]">ORBITAL BEARING</dt>
                      <dd className="mt-1 text-[var(--dna-text)]">{activeNode.orbitalBearing}</dd>
                    </div>
                    <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3">
                      <dt className="text-[10px] text-[var(--dna-muted)]">TELEMETRY STATUS</dt>
                      <dd className="mt-1 text-[var(--dna-accent)]">
                        {activeNode.state === "CANON_EXPLORER"
                          ? "CANON EXPLORER · STATIC SPEC"
                          : hasVerifiedProbeMeasurement
                            ? `${activeLiveProbe.status.toUpperCase()} · ${activeLiveProbe.latencyMs}ms · ${activeLiveProbe.source.toUpperCase()} · ${(activeLiveProbe.measuredAt ?? telemetry.generatedAt ?? "").slice(11, 19)}Z`
                            : telemetry.status === "checking"
                              ? "PROBING RUNTIME…"
                              : "UNMEASURED · PROBE STANDBY"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <p className="font-serif text-xs text-[var(--dna-muted)] max-w-xs">
                      {matchedWorld?.primaryDirective ??
                        "Enter calibrated sanctum chamber directly via Sovereign Matrix."}
                    </p>
                    <DnaButton
                      type="button"
                      tone="primary"
                      onClick={() => onLaunchWorld(activeNode.worldId)}
                      className="font-monument group inline-flex items-center gap-2.5 px-7 py-2.5 text-xs font-bold tracking-[0.18em] text-[var(--dna-canvas)] uppercase cursor-pointer"
                    >
                      <DiamondStarOrnament className="h-2.5 w-2.5 text-[var(--dna-canvas)] transition-transform duration-500 group-hover:rotate-45" />
                      <span>ENTER {matchedWorld?.name ?? activeNode.designation} &rsaquo;</span>
                    </DnaButton>
                  </div>

                  {/* Live Multi-Node Observatory, Cloudflare Edges & Portal Bridges */}
                  <DockTopologyBridge telemetry={telemetry} />
                </div>
              </SpatialTiltCard>
            </div>
          </div>
        </ScrollChapterReveal>
      </div>
    </section>
  );
}
