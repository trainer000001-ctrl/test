"use client";

import { useEffect, useState } from "react";
import {
  CODEX_SEARCH_INDEX,
  FOUR_CORPUS_POLICY,
  type EntryDoorId,
} from "@/data/empire-canon-codex";
import {
  SIDRA_KNOWLEDGE_AXIOMS,
  WORLD_DOMAINS,
  type WorldIdentifier,
} from "@/data/empire-registry";
import { LUMINOUS_NAMES_OF_ALLAH } from "@/data/remembrance-sanctuary";
import { Button, Dialog, DialogContent, DialogTitle, Input } from "@moonwitness/ui";
import { DnaButton, SearchLensIcon } from "@moonwitness/ui/imperium";
import { WorldEmblemById } from "./sacred-icons";

export function UniversalSearchModal({
  isOpen,
  onClose,
  onNavigateToWorld,
  onNavigateToDoor,
  onJumpToRemembrance,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onNavigateToWorld: (worldId: WorldIdentifier) => void;
  readonly onNavigateToDoor: (doorId: EntryDoorId) => void;
  readonly onJumpToRemembrance?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchingWorlds = WORLD_DOMAINS.filter(
    (domain) =>
      !normalizedQuery ||
      domain.name.toLowerCase().includes(normalizedQuery) ||
      domain.tagline.toLowerCase().includes(normalizedQuery) ||
      domain.architecturalDescription.toLowerCase().includes(normalizedQuery),
  );

  const matchingNames = LUMINOUS_NAMES_OF_ALLAH.filter(
    (entry) =>
      !normalizedQuery ||
      entry.transliteration.toLowerCase().includes(normalizedQuery) ||
      entry.meaning.toLowerCase().includes(normalizedQuery) ||
      entry.contemplation.toLowerCase().includes(normalizedQuery) ||
      entry.arabic.includes(searchQuery.trim()),
  );

  const matchingCodex = CODEX_SEARCH_INDEX.filter(
    (entry) =>
      !normalizedQuery ||
      entry.title.toLowerCase().includes(normalizedQuery) ||
      entry.category.toLowerCase().includes(normalizedQuery) ||
      entry.subtitle.toLowerCase().includes(normalizedQuery) ||
      entry.repoSource.toLowerCase().includes(normalizedQuery),
  );

  const matchingScriptures = FOUR_CORPUS_POLICY.corpora.filter(
    (corpus) =>
      !normalizedQuery ||
      corpus.name.toLowerCase().includes(normalizedQuery) ||
      corpus.prophetAnchor.toLowerCase().includes(normalizedQuery) ||
      corpus.ethicalCore.toLowerCase().includes(normalizedQuery) ||
      corpus.neutralSummary.toLowerCase().includes(normalizedQuery),
  );

  const matchingAxioms = SIDRA_KNOWLEDGE_AXIOMS.filter(
    (axiom) =>
      !normalizedQuery ||
      axiom.title.toLowerCase().includes(normalizedQuery) ||
      axiom.discipline.toLowerCase().includes(normalizedQuery) ||
      axiom.exposition.toLowerCase().includes(normalizedQuery),
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        hideClose
        aria-describedby={undefined}
        aria-label="Search the Empire of the Light"
        className="octa-bevel-shell top-16 sm:top-20 translate-y-0 w-full max-w-2xl p-6 sm:p-7"
      >
        <DialogTitle className="sr-only">Search the Empire of the Light</DialogTitle>
        <div className="flex items-center justify-between gap-2 border-b border-[var(--dna-accent)]/25 pb-3">
          <div className="flex items-center gap-3 flex-1">
            <SearchLensIcon className="h-5 w-5 shrink-0 text-[var(--dna-accent)]" />
            <Input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Worlds, Taurat/Zabur/Injīl/Al-Qur’ān, Attributes, SRGBL v8..."
              aria-label="Search query"
              className="min-h-0 border-0 bg-transparent px-0 py-0 font-sans w-full text-sm sm:text-base text-[var(--dna-text)] placeholder-[var(--dna-muted)] focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <DnaButton
            type="button"
            tone="secondary"
            onClick={onClose}
            aria-label="Close Search"
            className="min-w-[54px] px-3.5 py-1 text-[11px] font-mono text-[var(--dna-accent)] hover:text-[var(--dna-text)] cursor-pointer"
          >
            ESC
          </DnaButton>
        </div>

        <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] tracking-[0.16em] text-[var(--dna-muted)] uppercase">
          <span>CTRL/⌘ + K TOGGLE · ESC CLOSE</span>
          <span>5 WORLD REALMS · 4 SCRIPTURES · CODEX DOORS</span>
        </div>

        <div className="mt-5 max-h-[65vh] overflow-y-auto space-y-5 pr-1">
          <div>
            <div className="text-[11px] font-mono tracking-[0.22em] text-[var(--dna-accent)] uppercase">
              WORLDS ({matchingWorlds.length})
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {matchingWorlds.map((worldEntry) => (
                <Button
                  key={worldEntry.id}
                  type="button"
                  variant="plain"
                  onClick={() => {
                    onNavigateToWorld(worldEntry.id);
                    onClose();
                  }}
                  className="min-h-[44px] h-auto justify-start flex items-center gap-3 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3 text-left hover:border-[var(--dna-accent)] hover:bg-[var(--dna-accent)]/12 transition-colors cursor-pointer"
                >
                  <WorldEmblemById worldId={worldEntry.id} className="h-8 w-8 shrink-0" />
                  <div>
                    <div className="font-monument text-sm tracking-[0.14em] text-[var(--dna-text)]">
                      {worldEntry.name}
                    </div>
                    <div className="font-sans text-[11px] text-[var(--dna-muted)]">
                      {worldEntry.tagline}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {onJumpToRemembrance && (
            <div>
              <div className="text-[11px] font-mono tracking-[0.22em] text-[var(--dna-accent)] uppercase">
                FOUR REVEALED SCRIPTURES ({matchingScriptures.length})
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {matchingScriptures.map((corpus) => (
                  <Button
                    key={corpus.code}
                    type="button"
                    variant="plain"
                    onClick={() => {
                      onNavigateToDoor("epistemic-corpus");
                      onClose();
                    }}
                    className="min-h-[44px] h-auto flex-col items-stretch justify-start gap-0 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3 text-left hover:border-[var(--dna-accent)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                      <span>{corpus.code}</span>
                      <span>{corpus.prophetAnchor}</span>
                    </div>
                    <div className="font-monument mt-0.5 text-xs tracking-[0.1em] text-[var(--dna-text)]">
                      {corpus.name}
                    </div>
                    <div className="font-sans text-[11px] text-[var(--dna-muted)] truncate">
                      {corpus.ethicalCore}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {onJumpToRemembrance && (
            <div>
              <div className="text-[11px] font-mono tracking-[0.22em] text-[var(--dna-accent)] uppercase">
                CONTEMPLATIVE ATTRIBUTES ({matchingNames.length})
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {matchingNames.map((entry) => (
                  <Button
                    key={entry.id}
                    type="button"
                    variant="plain"
                    onClick={() => {
                      onJumpToRemembrance();
                      onClose();
                    }}
                    className="min-h-[44px] h-auto flex-col items-stretch justify-start gap-0 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3 text-left hover:border-[var(--dna-accent)] hover:bg-[var(--dna-accent)]/12 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span dir="rtl" lang="ar" className="text-base text-[var(--dna-text)]">
                        {entry.arabic}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--dna-accent)]">
                        {entry.worldLabel.split("·")[0]?.trim()}
                      </span>
                    </div>
                    <div className="font-monument mt-1 text-xs tracking-[0.1em] text-[var(--dna-text)]">
                      {entry.transliteration}
                    </div>
                    <div className="font-sans text-[11px] text-[var(--dna-muted)] truncate">
                      {entry.meaning}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-mono tracking-[0.22em] text-[var(--dna-accent)] uppercase">
              CANON CODEX DOORS ({matchingCodex.length})
            </div>
            <div className="mt-2 space-y-2">
              {matchingCodex.map((codexItem) => (
                <Button
                  key={codexItem.id}
                  type="button"
                  variant="plain"
                  onClick={() => {
                    onNavigateToDoor(codexItem.doorId);
                    onClose();
                  }}
                  className="min-h-[44px] h-auto flex-col items-stretch justify-start gap-0 w-full border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3 text-left hover:border-[var(--dna-accent)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--dna-accent)]">
                    <span>{codexItem.category}</span>
                    <span>{codexItem.repoSource}</span>
                  </div>
                  <div className="font-monument mt-0.5 text-xs sm:text-sm text-[var(--dna-text)]">
                    {codexItem.title}
                  </div>
                  <p className="font-serif mt-0.5 text-xs text-[var(--dna-muted)]">
                    {codexItem.subtitle}
                  </p>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono tracking-[0.22em] text-[var(--dna-accent)] uppercase">
              SIDRA KNOWLEDGE AXIOMS ({matchingAxioms.length})
            </div>
            <div className="mt-2 space-y-2">
              {matchingAxioms.map((axiomRecord) => (
                <Button
                  key={axiomRecord.id}
                  type="button"
                  variant="plain"
                  onClick={() => {
                    onNavigateToWorld("sidra");
                    onClose();
                  }}
                  className="min-h-[44px] h-auto flex-col items-stretch justify-start gap-0 w-full border border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] p-3 text-left hover:border-[var(--dna-accent)]/45 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--dna-accent)]">
                    <span>{axiomRecord.discipline}</span>
                    <span>{axiomRecord.geometricRatio}</span>
                  </div>
                  <div className="font-monument mt-0.5 text-xs sm:text-sm text-[var(--dna-text)]">
                    {axiomRecord.title}
                  </div>
                  <p className="font-serif mt-0.5 text-xs text-[var(--dna-muted)] line-clamp-2">
                    {axiomRecord.exposition}
                  </p>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
