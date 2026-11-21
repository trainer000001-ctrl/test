"use client";

import { useMemo, useState } from "react";
import { Button, Input, ZineButton } from "@moonwitness/ui";
import {
  EIGHT_STORY_ERAS,
  FIFTEEN_STORY_EPISODES,
  SEVEN_STEP_PROMISE,
  WORLD_PATCHES_REGISTRY,
} from "@moonwitness/canon";
import { SanctuaryGateLink } from "@/components/sanctuary-gate-link";

export const ERA_EPISODE_NUMBERS: Record<string, readonly number[]> = {
  era_00: [1, 2],
  era_01: [3, 4],
  era_02: [5, 6],
  era_03: [7, 8],
  era_04: [9, 10],
  era_05: [11, 12],
  era_06: [13, 14],
  era_07: [15],
};

export function CanonLorePanel() {
  const [patchSearch, setPatchSearch] = useState("");
  const [selectedEraId, setSelectedEraId] = useState<string>("all");

  const activeEra = EIGHT_STORY_ERAS.find((item) => item.id === selectedEraId) ?? null;

  const visibleEpisodes = useMemo(() => {
    if (selectedEraId === "all") return FIFTEEN_STORY_EPISODES;
    const episodeNumbers = ERA_EPISODE_NUMBERS[selectedEraId];
    if (!episodeNumbers) return FIFTEEN_STORY_EPISODES;
    return FIFTEEN_STORY_EPISODES.filter((ep) => episodeNumbers.includes(ep.number));
  }, [selectedEraId]);

  const needle = patchSearch.trim().toLowerCase();
  const visiblePatches = useMemo(() => {
    const selectedOrder = activeEra?.order ?? null;
    const eraEpisodes = selectedEraId !== "all" ? (ERA_EPISODE_NUMBERS[selectedEraId] ?? []) : [];
    return WORLD_PATCHES_REGISTRY.filter((p, index) => {
      if (selectedOrder !== null) {
        const mentionsEpisode = eraEpisodes.some((epNum) =>
          p.notes.toLowerCase().includes(`episode ${epNum}`),
        );
        const bucket = Math.min(
          EIGHT_STORY_ERAS.length - 1,
          Math.floor((index * EIGHT_STORY_ERAS.length) / WORLD_PATCHES_REGISTRY.length),
        );
        if (!mentionsEpisode && bucket !== selectedOrder) {
          return false;
        }
      }
      if (!needle) return true;
      return (
        p.patchNumber.toLowerCase().includes(needle) ||
        p.title.toLowerCase().includes(needle) ||
        p.notes.toLowerCase().includes(needle)
      );
    });
  }, [activeEra, needle, selectedEraId]);

  const conflictPair = WORLD_PATCHES_REGISTRY.filter((p) => p.status === "number_conflict");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--border)] bg-[var(--card)] p-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--primary)]">
            @MOONWITNESS/CANON SSOT · MOONWITNESS II &amp; XII ARCHIVE
          </p>
          <h2 className="mt-1 font-brush text-2xl text-[var(--foreground)]">
            8 STORY ERAS · 15 EPISODES · 33 WORLD PATCHES
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Promise Flow: {SEVEN_STEP_PROMISE.join(" → ")}
          </p>
        </div>
        <ZineButton asChild tone="blue" className="min-h-11 px-4 py-2 text-xs">
          <SanctuaryGateLink suffix="/#the-codex" target="_blank" rel="noopener noreferrer">
            OPEN IN A-L-L-A-H CODEX ↗
          </SanctuaryGateLink>
        </ZineButton>
      </div>

      {/* 8 Canonical Story Eras */}
      <section aria-label="Canonical story eras" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--primary)]">
            8 CANONICAL STORY ERAS (moonwitness-II)
          </h3>
          {selectedEraId !== "all" && (
            <Button
              type="button"
              variant="link"
              onClick={() => setSelectedEraId("all")}
              className="h-auto p-0 font-mono text-xs"
            >
              Show all eras
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {EIGHT_STORY_ERAS.map((eraItem) => {
            const active = selectedEraId === eraItem.id;
            return (
              <Button
                key={eraItem.id}
                type="button"
                variant="plain"
                onClick={() => setSelectedEraId(active ? "all" : eraItem.id)}
                className={`min-h-24 h-auto flex-col items-start justify-start gap-0 border-2 p-3 text-left transition-colors ${
                  active
                    ? "border-[var(--pink)] bg-[var(--pink)]/10"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]"
                }`}
              >
                <div className="font-mono text-[10px] text-[var(--primary)]">
                  {eraItem.id.toUpperCase()} · {eraItem.subtitle}
                </div>
                <div className="mt-1 font-brush text-lg text-[var(--foreground)]">
                  {eraItem.title}
                </div>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{eraItem.theme}</p>
              </Button>
            );
          })}
        </div>
      </section>

      {/* 15 Story Episodes */}
      <section aria-label="Story episodes" className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--primary)]">
          {activeEra
            ? `${visibleEpisodes.length} EPISODES FOR ${activeEra.title}`
            : "15 EDITORIAL SYNOPSIS EPISODES (storyArchive.js)"}
        </h3>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {visibleEpisodes.map((ep) => (
            <div key={ep.code} className="border border-[var(--border)] bg-[var(--card)] p-3">
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--primary)]">
                <span>{ep.code}</span>
                <span>{ep.arcFocus}</span>
              </div>
              <h4 className="mt-1 text-sm font-bold text-[var(--foreground)]">{ep.title}</h4>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{ep.coreQuestion}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 33 World Patches + Explicit #014 Disclosure */}
      <section aria-label="World patches registry" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--primary)]">
            33 WORLD PATCHES REGISTRY (0 DIVINE APPROVALS)
          </h3>
          <Input
            type="search"
            value={patchSearch}
            onChange={(e) => setPatchSearch(e.target.value)}
            placeholder="Filter #001, #014, MAROON, RIBA…"
            aria-label="Filter canonical world patches"
            className="min-h-11 w-full sm:w-64 border-2 border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)] outline-none focus:border-[var(--blue)]"
          />
        </div>

        <div className="border-2 border-[var(--yellow)]/50 bg-[var(--muted)]/55 p-3">
          <p className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
            DISCLOSED #014 NUMBER CONFLICT — PRESERVED SIDE BY SIDE
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {conflictPair.map((c) => (
              <div key={c.id} className="border border-[var(--border)] bg-[var(--card)] p-2.5">
                <div className="font-mono text-[10px] text-[var(--primary)]">{c.category}</div>
                <div className="text-xs font-bold text-[var(--foreground)]">{c.title}</div>
                <p className="text-[11px] text-[var(--muted-foreground)]">{c.notes}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid max-h-96 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePatches.map((patch) => (
            <div key={patch.id} className="border border-[var(--border)] bg-[var(--card)] p-3">
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--primary)]">
                <span>{patch.patchNumber}</span>
                <span>{patch.category}</span>
              </div>
              <div className="mt-1 text-xs font-semibold text-[var(--foreground)]">
                {patch.title}
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{patch.notes}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
