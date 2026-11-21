"use client";

import { useState } from "react";
import { Button } from "@moonwitness/ui";
import {
  CROSS_REPO_TOPOLOGY_ATLAS,
  ECOSYSTEM_RUNTIME_CATALOG,
  OX_DX_SEVEN_ZONES,
  SOVEREIGN_ENGINE_SPECS,
  type RepoOrgCluster,
} from "@/data/empire-canon-codex";
import { ChamberWingTabs, type ChamberWingOption } from "./chamber-wing-tabs";
import { DhgsAndMTimeSimulator, QuarantinedLedgerPanel } from "./sovereign-assurance-modules";

type SovereignWingId =
  "ecosystem-stack" | "oxdx-pyramid" | "engines-assurance" | "quarantine-ledger";

const SOVEREIGN_WINGS: readonly ChamberWingOption<SovereignWingId>[] = [
  { id: "ecosystem-stack", code: "WING 01", label: "Live Edge & Monorepo" },
  { id: "oxdx-pyramid", code: "WING 02", label: "OX-DX 49-Level Pyramid" },
  { id: "engines-assurance", code: "WING 03", label: "M-Time · AQEL · DHGS" },
  { id: "quarantine-ledger", code: "WING 04", label: "Quarantine & Provenance" },
];

export function DoorSovereignPanel() {
  const [activeWing, setActiveWing] = useState<SovereignWingId>("ecosystem-stack");
  const [selectedZoneIdx, setSelectedZoneIdx] = useState<number>(0);
  const [selectedOrg, setSelectedOrg] = useState<RepoOrgCluster["orgName"]>("bjo163");

  const activeZone = OX_DX_SEVEN_ZONES[selectedZoneIdx] ?? OX_DX_SEVEN_ZONES[0]!;
  const activeOrg =
    CROSS_REPO_TOPOLOGY_ATLAS.find((cluster) => cluster.orgName === selectedOrg) ??
    CROSS_REPO_TOPOLOGY_ATLAS[0]!;

  const totalRepos = CROSS_REPO_TOPOLOGY_ATLAS.reduce((acc, org) => acc + org.repoCount, 0);

  return (
    <div className="space-y-6">
      <ChamberWingTabs
        wings={SOVEREIGN_WINGS}
        activeWing={activeWing}
        onSelectWing={setActiveWing}
        ariaLabel="Door IV Sovereign Runtime Wings"
      />

      {activeWing === "ecosystem-stack" && (
        <div className="space-y-6">
          {/* Live Cloudflare Edge + Monorepo Architecture Overview */}
          <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
              <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                LIVE CLOUDFLARE EDGE &amp; {ECOSYSTEM_RUNTIME_CATALOG.monorepoSlug} MONOREPO
              </span>
              <span className="font-mono text-[11px] text-[var(--dna-accent)]">
                {ECOSYSTEM_RUNTIME_CATALOG.liveEdges.length} LIVE EDGES ·{" "}
                {ECOSYSTEM_RUNTIME_CATALOG.workspaceNodes.length} RUNTIME GROUPS
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {ECOSYSTEM_RUNTIME_CATALOG.liveEdges.map((edge) => (
                <a
                  key={edge.id}
                  href={edge.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] p-4 transition-colors hover:border-[var(--dna-text)] hover:bg-[var(--dna-surface)]"
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                    <span>{edge.workerName}</span>
                    <span>HTTPS ↗</span>
                  </div>
                  <div className="font-monument mt-1 text-sm text-[var(--dna-text)]">
                    {edge.hostname}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-[var(--dna-muted)]">
                    {edge.layer}
                  </div>
                  <p className="mt-2 text-xs text-[var(--dna-muted)] leading-relaxed">
                    {edge.role}
                  </p>
                </a>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {ECOSYSTEM_RUNTIME_CATALOG.workspaceNodes.map((node) => (
                <div
                  key={node.workspacePath}
                  className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3.5"
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                    <span>{node.workspacePath}</span>
                    <span>{node.dnaWorld}</span>
                  </div>
                  <div className="font-monument mt-1 text-xs sm:text-sm text-[var(--dna-text)]">
                    {node.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-[var(--dna-muted)]">
                    {node.stack}
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--dna-muted)] leading-relaxed">
                    {node.responsibility}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 368-Repo Cross-Organization Topology Atlas */}
          <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
              <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                CROSS-REPOSITORY TOPOLOGY ATLAS ({totalRepos} VERIFIED GITHUB REPOS · 7 OWNERS)
              </span>
              <span className="font-mono text-[11px] text-[var(--dna-accent)]">
                CONSOLIDATED INTO {ECOSYSTEM_RUNTIME_CATALOG.monorepoSlug}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {CROSS_REPO_TOPOLOGY_ATLAS.map((org) => {
                const isSelected = org.orgName === activeOrg.orgName;
                return (
                  <Button
                    key={org.orgName}
                    type="button"
                    variant="plain"
                    onClick={() => setSelectedOrg(org.orgName)}
                    className={`min-h-[44px] h-auto flex-col items-start justify-start gap-0 border p-3.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20"
                        : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] hover:border-[var(--dna-accent)]/45"
                    }`}
                  >
                    <div className="font-mono text-[11px] text-[var(--dna-accent)]">
                      {org.repoCount} REPOS
                    </div>
                    <div className="font-monument mt-0.5 text-xs sm:text-sm text-[var(--dna-text)]">
                      {org.orgName}/*
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="mt-4 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-monument text-base text-[var(--dna-text)]">
                  {activeOrg.orgName}/* ({activeOrg.repoCount} Repositories)
                </span>
                <span className="font-mono text-[11px] text-[var(--dna-accent)]">
                  {activeOrg.roleInEmpire}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                    FLAGSHIP REPOSITORIES
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {activeOrg.flagshipRepos.map((repo) => (
                      <span
                        key={repo}
                        className="border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] px-2.5 py-1 font-mono text-[11px] text-[var(--dna-accent)]"
                      >
                        {repo}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                    CONSOLIDATED LINEAGES
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {activeOrg.localClones.map((clonePath) => (
                      <div
                        key={clonePath}
                        className="border border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] px-2.5 py-1 font-mono text-[11px] text-[var(--dna-muted)]"
                      >
                        {clonePath}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OX-DX 7 Zones x 7 Levels = 49 Canonical Levels */}
      {activeWing === "oxdx-pyramid" && (
        <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
            <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
              OX-DX UNIVERSAL ONTOLOGY PYRAMID (7 ZONES × 7 LEVELS = 49 LEVELS)
            </span>
            <span className="font-mono text-[11px] text-[var(--dna-accent)]">
              SOURCE: bjo163/universal-ontology-engine · 01 UNIVERSE → 49 BIT
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {OX_DX_SEVEN_ZONES.map((zone, idx) => {
              const isSelected = idx === selectedZoneIdx;
              return (
                <Button
                  key={zone.zoneName}
                  type="button"
                  variant="plain"
                  onClick={() => setSelectedZoneIdx(idx)}
                  className={`min-h-[44px] h-auto flex-col items-start justify-start gap-0 border p-2.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20"
                      : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] hover:border-[var(--dna-accent)]/45"
                  }`}
                >
                  <div className="font-mono text-[10px] text-[var(--dna-accent)]">
                    LVL {zone.levelRange}
                  </div>
                  <div className="font-monument mt-0.5 text-[11px] text-[var(--dna-text)]">
                    {zone.zoneName.replace(/^ZONE 0\d · /, "")}
                  </div>
                </Button>
              );
            })}
          </div>

          <div className="mt-4 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4">
            <div className="font-monument text-xs sm:text-sm text-[var(--dna-text)]">
              {activeZone.zoneName}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {activeZone.levels.map((levelLabel) => (
                <div
                  key={levelLabel}
                  className="border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] p-2.5 text-center font-mono text-[11px] text-[var(--dna-accent)]"
                >
                  {levelLabel}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sovereign Runtimes: M-Time, AQEL, DHGS, AGE CODE */}
      {activeWing === "engines-assurance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5">
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                <span>{SOVEREIGN_ENGINE_SPECS.mTime.repo}</span>
                <span>{SOVEREIGN_ENGINE_SPECS.mTime.version}</span>
              </div>
              <h4 className="font-monument mt-1 text-sm sm:text-base text-[var(--dna-text)]">
                {SOVEREIGN_ENGINE_SPECS.mTime.name}
              </h4>
              <p className="mt-1 text-xs text-[var(--dna-muted)]">
                {SOVEREIGN_ENGINE_SPECS.mTime.purpose}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SOVEREIGN_ENGINE_SPECS.mTime.standards.map((std) => (
                  <span
                    key={std}
                    className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] px-2 py-0.5 font-mono text-[10px] text-[var(--dna-accent)]"
                  >
                    {std}
                  </span>
                ))}
                {SOVEREIGN_ENGINE_SPECS.mTime.hijriCriteria.map((crit) => (
                  <span
                    key={crit}
                    className="border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--dna-muted)]"
                  >
                    {crit}
                  </span>
                ))}
              </div>
            </div>

            <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5">
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                <span>{SOVEREIGN_ENGINE_SPECS.aqel.repo}</span>
                <span>ARABIC-FIRST AST ENGINE</span>
              </div>
              <h4 className="font-monument mt-1 text-sm sm:text-base text-[var(--dna-text)]">
                {SOVEREIGN_ENGINE_SPECS.aqel.name}
              </h4>
              <p className="mt-1 text-xs text-[var(--dna-muted)]">
                {SOVEREIGN_ENGINE_SPECS.aqel.purpose}
              </p>
              <pre
                dir="rtl"
                className="mt-3 overflow-x-auto border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3 text-right font-mono text-xs text-[var(--dna-accent)]"
              >
                {SOVEREIGN_ENGINE_SPECS.aqel.sampleSnippet}
              </pre>
            </div>

            <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5">
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                <span>{SOVEREIGN_ENGINE_SPECS.dhgs.repo}</span>
                <span>{SOVEREIGN_ENGINE_SPECS.dhgs.version}</span>
              </div>
              <h4 className="font-monument mt-1 text-sm sm:text-base text-[var(--dna-text)]">
                {SOVEREIGN_ENGINE_SPECS.dhgs.name}
              </h4>
              <p className="mt-1 text-xs text-[var(--dna-muted)]">
                {SOVEREIGN_ENGINE_SPECS.dhgs.purpose}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SOVEREIGN_ENGINE_SPECS.dhgs.primitives.map((prim) => (
                  <span
                    key={prim}
                    className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--dna-accent)]"
                  >
                    {prim}
                  </span>
                ))}
              </div>
            </div>

            <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5">
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                <span>{SOVEREIGN_ENGINE_SPECS.ageCode.repo}</span>
                <span>CROSS-CIVILIZATION CORPUS</span>
              </div>
              <h4 className="font-monument mt-1 text-sm sm:text-base text-[var(--dna-text)]">
                {SOVEREIGN_ENGINE_SPECS.ageCode.name}
              </h4>
              <p className="mt-1 text-xs text-[var(--dna-muted)]">
                {SOVEREIGN_ENGINE_SPECS.ageCode.purpose}
              </p>
              <div className="mt-3 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] px-3 py-2 font-mono text-xs text-[var(--dna-accent)]">
                MATRIX // {SOVEREIGN_ENGINE_SPECS.ageCode.matrix}
              </div>
            </div>
          </div>

          {/* DHGS 13-Step Assurance Loop & MCLOCK-1 Inspector */}
          <DhgsAndMTimeSimulator />
        </div>
      )}

      {/* Quarantined Ambiguity & Provenance Ledger (Section VII) */}
      {activeWing === "quarantine-ledger" && <QuarantinedLedgerPanel />}
    </div>
  );
}
