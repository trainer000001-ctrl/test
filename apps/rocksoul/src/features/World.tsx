import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Archive, Layers3, RadioTower, Sparkles } from "@moonwitness/ui/icons";
import {
  Awakening,
  CommandBar,
  DestinationCard,
  MotionControl,
  PreviewRoom,
  RecentWork,
  RoomReturnButton,
  UniverseCopy,
  UniverseFooter,
  UniverseHeader,
  UniverseSpray,
} from "../components/ui";
import type { Issue } from "../lib/contracts";
import type { WorldDestination } from "./world/WorldCanvas";

const WorldCanvas = lazy(() => import("./world/WorldCanvas"));

interface Destination {
  id: string;
  title: string;
  note: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  index: string;
  preview: boolean;
}

const destinations: Destination[] = [
  { id: "archive", title: "THE ARCHIVE", note: "SOURCES / NOTES / MEMORY", icon: Archive, index: "01", preview: true },
  { id: "studio", title: "THE STUDIO", note: "WRITING / DRAFTS / IDEAS", icon: Layers3, index: "02", preview: true },
  { id: "riot-deck", title: "THE RIOT DECK", note: "PLAN / EXECUTE / DELIVER", icon: Sparkles, index: "03", preview: false },
  { id: "signal-room", title: "THE SIGNAL ROOM", note: "RESEARCH / EVIDENCE / SOURCES", icon: RadioTower, index: "04", preview: true },
];

export interface ThresholdProps {
  onNavigate: (destinationId: string) => void;
  reducedMotion: boolean;
  systemReducedMotion?: boolean | undefined;
  onToggleMotion: () => void;
  onSettings?: (() => void) | undefined;
  onCreateIssue?: (() => void) | undefined;
  recentIssue?: Issue | null | undefined;
  recentIssueReady?: boolean | undefined;
}

export function Threshold({
  onNavigate,
  reducedMotion,
  systemReducedMotion,
  onToggleMotion,
  onSettings,
  onCreateIssue,
  recentIssue,
  recentIssueReady,
}: ThresholdProps) {
  const [query, setQuery] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<WorldDestination>("threshold");
  const [pendingNavigation, setPendingNavigation] = useState(false);
  const navigationTimer = useRef<number | null>(null);
  const filteredDestinations = destinations.filter((destination) =>
    `${destination.title} ${destination.note}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => () => {
    if (navigationTimer.current) window.clearTimeout(navigationTimer.current);
  }, []);

  const navigateTo = (destinationId: string) => {
    setSelectedDestination(destinationId as WorldDestination);
    if (navigationTimer.current) window.clearTimeout(navigationTimer.current);
    if (reducedMotion) {
      onNavigate(destinationId);
      return;
    }

    setPendingNavigation(true);
    navigationTimer.current = window.setTimeout(() => onNavigate(destinationId), 420);
  };

  const skipToDestinations = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById("universe-destinations")?.focus();
  };

  return (
    <main className="universe-screen" data-reduced-motion={reducedMotion} aria-busy={pendingNavigation}>
      <a className="world-skip-link" href="#universe-destinations" onClick={skipToDestinations}>
        Skip to destinations
      </a>
      <Suspense fallback={<div className="world-fallback world-canvas-placeholder" aria-hidden="true" />}>
        <WorldCanvas destination={selectedDestination} reducedMotion={reducedMotion} />
      </Suspense>

      <UniverseHeader
        onSettings={onSettings}
        onToggleMotion={onToggleMotion}
        reducedMotion={reducedMotion}
        systemReducedMotion={systemReducedMotion}
        searchValue={query}
        onSearchChange={setQuery}
        onSearchSubmit={(value) => {
          const match = filteredDestinations.find((d) =>
            `${d.title} ${d.note}`.toLowerCase().includes(value.trim().toLowerCase()),
          );
          if (match) navigateTo(match.id);
        }}
      />

      <motion.section
        className="universe-copy"
        aria-labelledby="threshold-title"
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.2, 0.7, 0.25, 1] }}
      >
        <UniverseCopy />
      </motion.section>

      <UniverseSpray />

      <nav className="universe-destinations" id="universe-destinations" tabIndex={-1} aria-label="Four destinations">
        {filteredDestinations.map((destination) => {
          const Icon = destination.icon;
          return (
            <DestinationCard
              key={destination.id}
              id={destination.id}
              title={destination.title}
              note={destination.note}
              index={destination.index}
              icon={<Icon size={24} strokeWidth={1.6} />}
              preview={destination.preview}
              isSelected={selectedDestination === destination.id}
              onClick={() => navigateTo(destination.id)}
              onFocus={() => setSelectedDestination(destination.id as WorldDestination)}
              onBlur={() => setSelectedDestination("threshold")}
              onMouseEnter={() => setSelectedDestination(destination.id as WorldDestination)}
              onMouseLeave={() => setSelectedDestination("threshold")}
            />
          );
        })}
        {filteredDestinations.length === 0 && (
          <p className="world-search-empty" role="status">
            No destination matches that search.
          </p>
        )}
      </nav>

      <RecentWork
        issue={recentIssue}
        hasLoaded={Boolean(recentIssueReady)}
        loading={false}
        error={null}
        onNavigate={navigateTo}
        onCreateIssue={onCreateIssue}
      />

      <motion.div
        className="universe-command"
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: reducedMotion ? 0 : 0.12 }}
      >
        <CommandBar onNavigate={navigateTo} onCreateIssue={onCreateIssue} />
      </motion.div>

      <UniverseFooter onNavigate={navigateTo} />
    </main>
  );
}

export { Awakening, PreviewRoom, RoomReturnButton, MotionControl };
