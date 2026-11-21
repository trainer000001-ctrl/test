"use client";

import { useState } from "react";
import { Button } from "@moonwitness/ui";
import {
  CENTER_100_STEWARDSHIP_CLUSTERS,
  OWNER_FOUR_LINE_MANIFESTO,
  PRIME_CODE_AXIOMS,
  SUPREME_IDENTITY,
  SYAFAAT_BASE_STATES,
  SYSTEM_CONCEPTS_14,
  WINGS_TEN_ARRAY,
  type SyafaatStateId,
} from "@/data/empire-canon-codex";
import { Monocentric100CenterSvg } from "../sacred-illustrations";
import { ChamberWingTabs, type ChamberWingOption } from "./chamber-wing-tabs";
import { Amanah25AtlasPanel, God99DirectoryExplorer } from "./organization-directory-modules";

type OrgWingId = "constitution" | "center100" | "god99" | "amanah25";

const ORG_WINGS: readonly ChamberWingOption<OrgWingId>[] = [
  { id: "constitution", code: "WING 01", label: "Identity & WINGS 10" },
  { id: "center100", code: "WING 02", label: "100CENTER & Syafaat" },
  { id: "god99", code: "WING 03", label: "G.O.D. 99 Directory" },
  { id: "amanah25", code: "WING 04", label: "25 Prophetic Amanah" },
];

export function DoorOrganizationPanel() {
  const [activeWing, setActiveWing] = useState<OrgWingId>("constitution");
  const [activeSyafaatState, setActiveSyafaatState] = useState<SyafaatStateId>("PRACTICING");
  const [selectedClusterIdx, setSelectedClusterIdx] = useState<number>(0);

  const selectedCluster =
    CENTER_100_STEWARDSHIP_CLUSTERS[selectedClusterIdx] ?? CENTER_100_STEWARDSHIP_CLUSTERS[0]!;

  return (
    <div className="space-y-6">
      <ChamberWingTabs
        wings={ORG_WINGS}
        activeWing={activeWing}
        onSelectWing={setActiveWing}
        ariaLabel="Door III Stewardship Gallery Wings"
      />

      {/* Low-Profile Tawhid & Exact 4-Line Owner Manifesto */}
      {activeWing === "constitution" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] p-5 sm:p-6">
              <div className="font-mono text-[11px] tracking-[0.2em] text-[var(--dna-accent)] uppercase">
                SUPREME IDENTITY &amp; LOW-PROFILE TAWHID
              </div>
              <h4 className="font-monument mt-2 text-lg sm:text-xl tracking-[0.1em] text-[var(--dna-text)]">
                A-L-L-A-H: {SUPREME_IDENTITY.fullExpansion}
              </h4>
              <p className="mt-2 font-mono text-xs text-[var(--dna-accent)]">
                {SUPREME_IDENTITY.tawhidPrinciple}
              </p>
              <p className="mt-2 font-serif text-sm italic text-[var(--dna-muted)]">
                “{SUPREME_IDENTITY.tawhidMotto}”
              </p>
              <div className="mt-4 border-t border-[var(--dna-accent)]/20 pt-3 font-mono text-[11px] text-[var(--dna-muted)]">
                {SUPREME_IDENTITY.monocentricFormula}
              </div>
            </div>

            <div className="lg:col-span-7 border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-2">
                <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                  4-LINE STEWARDSHIP MANIFESTO (VISUAL CONSTITUTION)
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {OWNER_FOUR_LINE_MANIFESTO.map((item) => (
                  <div
                    key={item.index}
                    className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3.5"
                  >
                    <div className="font-mono text-[10px] text-[var(--dna-accent)]">
                      LINE {item.index}
                    </div>
                    <div className="font-monument mt-1 text-xs sm:text-sm tracking-[0.06em] text-[var(--dna-text)]">
                      {item.line}
                    </div>
                    <p className="mt-1 text-xs text-[var(--dna-muted)]">{item.interpretation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* WINGS 10 Operational Array & THE PRIME CODE PC01-PC09 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5">
              <div className="font-monument text-xs sm:text-sm tracking-[0.16em] text-[var(--dna-accent)] uppercase border-b border-[var(--dna-accent)]/20 pb-2">
                WINGS 10 OPERATIONAL ARRAY (W01 SKYLINK – W10 HAVEN · PROPOSED_NOT_ASSIGNED)
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {WINGS_TEN_ARRAY.map((wing) => (
                  <div
                    key={wing.code}
                    className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                      <span>{wing.code}</span>
                      <span>{wing.domainRole}</span>
                    </div>
                    <div className="font-monument mt-0.5 text-xs sm:text-sm text-[var(--dna-text)]">
                      {wing.callsign}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--dna-muted)]">
                      {wing.architecturalDuty}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5">
              <div className="font-monument text-xs sm:text-sm tracking-[0.16em] text-[var(--dna-accent)] uppercase border-b border-[var(--dna-accent)]/20 pb-2">
                THE PRIME CODE (PC01–PC09) &amp; 14 SYSTEM CONCEPTS
              </div>
              <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {PRIME_CODE_AXIOMS.map((axiom) => (
                  <div
                    key={axiom.code}
                    className="border border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] p-2.5"
                  >
                    <div className="font-mono text-[10px] text-[var(--dna-accent)]">
                      {axiom.code} · {axiom.title}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--dna-muted)]">{axiom.statement}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-[var(--dna-accent)]/20 pt-3">
                <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                  14 CANONICAL SYSTEM CONCEPTS (MWX-SYS-001..014)
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {SYSTEM_CONCEPTS_14.map((concept) => (
                    <span
                      key={concept}
                      className="border border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] px-2 py-0.5 font-mono text-[10px] text-[var(--dna-muted)]"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 100CENTER (99 G.O.D. Stewardship Nodes + 1 Tawhid Center) & Syafaat 6 States */}
      {activeWing === "center100" && (
        <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
            <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
              100CENTER STEWARDSHIP TOPOLOGY &amp; SYAFAAT 6-STATE ENGINE
            </span>
            <span className="font-mono text-[11px] text-[var(--dna-accent)]">
              99 HUMAN ETHICAL REFLECTIONS + 1 TAWHID CENTER (NO DEIFICATION OF HUMANS)
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SYAFAAT_BASE_STATES.map((stateObj) => {
              const isSelected = stateObj.state === activeSyafaatState;
              return (
                <Button
                  key={stateObj.state}
                  type="button"
                  variant="plain"
                  onClick={() => setActiveSyafaatState(stateObj.state)}
                  className={`min-h-[44px] border px-3 py-1.5 font-mono text-[11px] tracking-[0.14em] cursor-pointer transition-colors ${
                    isSelected
                      ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/25 text-[var(--dna-text)]"
                      : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/50"
                  }`}
                >
                  {stateObj.state}
                </Button>
              );
            })}
          </div>
          <p className="mt-2 font-mono text-xs text-[var(--dna-accent)]">
            ACTIVE REFLECTION STATE [{activeSyafaatState}]:{" "}
            {SYAFAAT_BASE_STATES.find((s) => s.state === activeSyafaatState)?.description}
          </p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex justify-center">
              <Monocentric100CenterSvg selectedClusterIndex={selectedClusterIdx} />
            </div>
            <div className="flex-1 grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-3">
              {CENTER_100_STEWARDSHIP_CLUSTERS.map((cluster, idx) => {
                const selected = idx === selectedClusterIdx;
                return (
                  <Button
                    key={cluster.clusterCode}
                    type="button"
                    variant="plain"
                    onClick={() => setSelectedClusterIdx(idx)}
                    className={`min-h-[44px] h-auto flex-col items-stretch justify-start gap-0 border p-3.5 text-left transition-colors cursor-pointer ${
                      selected
                        ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/15"
                        : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] hover:border-[var(--dna-accent)]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                      <span>{cluster.clusterCode}</span>
                      <span>{cluster.rangeLabel}</span>
                    </div>
                    <div className="font-monument mt-1 text-xs text-[var(--dna-text)] uppercase">
                      {cluster.title}
                    </div>
                    <div className="mt-1 font-sans text-xs text-[var(--dna-muted)]">
                      {cluster.humanEthicalFocus}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3.5 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs text-[var(--dna-text)]">
              SELECTED CLUSTER // {selectedCluster.title} [{activeSyafaatState}]
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedCluster.representativeReflections.map((refl) => (
                <span
                  key={refl}
                  className="border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--dna-accent)]"
                >
                  {refl}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Interactive G.O.D. 99 Directory (D01-D09) */}
      {activeWing === "god99" && <God99DirectoryExplorer />}

      {/* 25 Bidang Amanah Pedagogical Atlas */}
      {activeWing === "amanah25" && <Amanah25AtlasPanel />}
    </div>
  );
}
