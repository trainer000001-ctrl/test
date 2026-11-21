import React from "react";
import { OWNER_FOUR_LINE_MANIFESTO } from "@moonwitness/canon";
import { ArrowRight, ArrowUpRight, FileText, Plus, Sparkles } from "@moonwitness/ui/icons";
import { DISTRICT_THUMBNAILS, thumbRiotUrl, type ArtworkDistrictId } from "../../assets/art";
import { IllustratedStage } from "./IllustratedStage";
import {
  AnarchyStarSigil,
  CrimsonBrushSlash,
  CrimsonCrownSvg,
  SprayTagGlyph,
  TelemetryWaveformSvg,
  VectorBarcodeStamp,
} from "@moonwitness/ui/artwork";

export interface DestinationCardProps {
  id: string;
  title: string;
  note: string;
  index: string;
  icon: React.ReactNode;
  preview?: boolean;
  isSelected?: boolean;
  onClick: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function DestinationCard({
  id,
  title,
  note,
  index,
  icon,
  preview,
  isSelected,
  onClick,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
}: DestinationCardProps) {
  const thumbUrl = DISTRICT_THUMBNAILS[id as ArtworkDistrictId];
  return (
    <button
      className={`universe-destination${isSelected ? " is-selected" : ""}${!preview ? " is-primary-workspace" : ""}`}
      type="button"
      id={`destination-${id}`}
      aria-label={`Enter ${title}${preview ? " room preview" : ""}`}
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {thumbUrl && (
        <span className="universe-destination-thumb" aria-hidden="true">
          <img src={thumbUrl} alt="" />
          <span className="universe-destination-index">{index}</span>
        </span>
      )}
      <span className="universe-destination-body">
        <span className="universe-destination-head">
          <span className="universe-destination-icon" aria-hidden="true">
            {icon}
          </span>
          <em>{preview ? "ROOM PREVIEW" : "WORKSPACE"}</em>
        </span>
        <strong>{title}</strong>
        <small>{note}</small>
      </span>
    </button>
  );
}

export interface RecentWorkProps {
  issue?: { title: string; issue_key: string } | null | undefined;
  hasLoaded: boolean;
  loading: boolean;
  error?: string | null | undefined;
  onNavigate?: ((destination: string) => void) | undefined;
  onCreateIssue?: (() => void) | undefined;
}

export function RecentWork({
  issue,
  hasLoaded,
  loading,
  error,
  onNavigate,
  onCreateIssue,
}: RecentWorkProps) {
  const ready = hasLoaded && !loading && !error;

  return (
    <section className="universe-recent" aria-label="Recent work">
      <div className="universe-recent-header">
        <h2>RECENT WORK</h2>
        <TelemetryWaveformSvg className="rs-waveform-mini" />
      </div>
      {issue ? (
        <button type="button" onClick={() => onNavigate?.("riot-deck")}>
          <span className="universe-recent-thumb" aria-hidden="true">
            <img src={thumbRiotUrl} alt="" />
          </span>
          <span className="universe-recent-icon">
            <FileText size={15} aria-hidden="true" />
          </span>
          <span className="universe-recent-text">
            <strong>{issue.title}</strong>
            <small>{issue.issue_key}</small>
          </span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      ) : (
        <button type="button" onClick={ready ? onCreateIssue : undefined} disabled={!ready}>
          <span className="universe-recent-thumb" aria-hidden="true">
            <img src={thumbRiotUrl} alt="" />
          </span>
          <span className="universe-recent-icon">
            <FileText size={15} aria-hidden="true" />
          </span>
          <span className="universe-recent-text">
            <strong>{ready ? "NO RECENT WORK" : "LOADING LOCAL WORK"}</strong>
            <small>{ready ? "Create an issue in the Riot Deck" : "Reading this device"}</small>
          </span>
          {ready && <Plus size={15} aria-hidden="true" />}
        </button>
      )}
    </section>
  );
}

export interface CommandBarProps {
  onNavigate?: ((destination: string) => void) | undefined;
  onCreateIssue?: (() => void) | undefined;
}

export function CommandBar({ onNavigate, onCreateIssue }: CommandBarProps) {
  return (
    <>
      <span className="universe-command-mark" aria-hidden="true">
        <Sparkles size={20} />
      </span>
      <button className="universe-action" type="button" onClick={() => onNavigate?.("riot-deck")}>
        <span>
          <strong>WHAT ARE WE MAKING TODAY?</strong>
          <small>ENTER THE UNKNOWN / OPEN THE RIOT DECK</small>
        </span>
        <ArrowUpRight size={21} aria-hidden="true" />
      </button>
      {onCreateIssue && (
        <button
          className="universe-command-tool"
          type="button"
          aria-label="Create an issue"
          title="Create an issue"
          onClick={onCreateIssue}
        >
          <Plus size={17} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

export function UniverseSpray() {
  return (
    <div className="universe-spray" aria-hidden="true">
      <SprayTagGlyph />
      <span>NOISE × SILENCE</span>
      <small>THE LIVING UNIVERSE</small>
      <em className="universe-spray-sub">FIND ME IN EVERYTHING</em>
    </div>
  );
}

export interface UniverseCopyProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  manifesto?: string[];
}

const CANON_MANIFESTO_LINES = OWNER_FOUR_LINE_MANIFESTO.map(
  (entry) => `${entry.index} — ${entry.line}`,
);

export function UniverseCopy({
  kicker = "THE LIVING UNIVERSE / ENTRY 01",
  subtitle = "A PRIVATE DESKTOP WORLD FOR REAL WORK",
  manifesto = CANON_MANIFESTO_LINES,
}: UniverseCopyProps) {
  return (
    <>
      <div className="universe-title-lockup">
        <p className="world-kicker">{kicker}</p>
        <CrimsonCrownSvg className="rs-crown-svg universe-crown" />
        <h1 id="threshold-title">
          ROCKSOUL <em>DX</em>
        </h1>
        <CrimsonBrushSlash className="rs-brush-slash universe-slash" />
      </div>
      <p className="universe-subtitle">{subtitle}</p>
      <div className="universe-manifesto" aria-label="ROCKSOUL manifesto">
        {manifesto.map((line, i) => (
          <p key={i} className={i === manifesto.length - 1 ? "manifesto-climax" : ""}>
            {line}
          </p>
        ))}
      </div>
    </>
  );
}

export interface AwakeningProps {
  onEnter: () => void;
  reducedMotion: boolean;
  onQuickWorkbench?: (() => void) | undefined;
  onQuickMonitor?: (() => void) | undefined;
}

export function Awakening({ onEnter, reducedMotion, onQuickWorkbench, onQuickMonitor }: AwakeningProps) {
  const [opening, setOpening] = React.useState(false);
  const entryTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (entryTimer.current) window.clearTimeout(entryTimer.current);
    },
    [],
  );

  const beginEntry = () => {
    if (opening) return;
    setOpening(true);
    if (reducedMotion) {
      onEnter();
      return;
    }
    entryTimer.current = window.setTimeout(onEnter, 620);
  };

  return (
    <main className="universe-screen awakening-screen" data-reduced-motion={reducedMotion} data-opening={opening}>
      <IllustratedStage scene="awakening" destination="awakening" reducedMotion={reducedMotion} />

      <header className="awakening-header">
        <span className="awakening-mark" aria-hidden="true">
          <AnarchyStarSigil />
        </span>
        <span>
          ROCKSOUL DX <small>— THE LIVING UNIVERSE</small>
        </span>
      </header>

      <section className="awakening-copy" aria-labelledby="awakening-title">
        <div className="awakening-title-lockup">
          <p className="awakening-kicker">A PRIVATE DESKTOP WORLD FOR REAL WORK</p>
          <CrimsonCrownSvg className="rs-crown-svg awakening-crown" />
          <h1 id="awakening-title">
            ROCKSOUL <em>DX</em>
          </h1>
        </div>
        <p className="awakening-subtitle">THE LIVING UNIVERSE</p>
        <div className="awakening-claim-wrap">
          <p className="awakening-claim">NO CLUE WHAT&apos;S COMING.</p>
          <CrimsonBrushSlash className="rs-brush-slash awakening-slash" />
        </div>
        <button className="awakening-enter" type="button" onClick={beginEntry} disabled={opening}>
          <span>{opening ? "THE GATE IS OPENING" : "ENTER THE UNKNOWN"}</span>
          <ArrowRight size={20} aria-hidden="true" />
        </button>
        {(onQuickWorkbench || onQuickMonitor) && (
          <div className="awakening-quick-actions">
            {onQuickWorkbench && (
              <button
                type="button"
                className="awakening-quick-btn"
                onClick={onQuickWorkbench}
                disabled={opening}
              >
                DIRECT WORKBENCH
              </button>
            )}
            {onQuickMonitor && (
              <button
                type="button"
                className="awakening-quick-btn"
                onClick={onQuickMonitor}
                disabled={opening}
              >
                AGENT MONITOR
              </button>
            )}
          </div>
        )}
        <div className="awakening-manifesto" aria-label="ROCKSOUL manifesto">
          <p>01 — NO CLUE WHAT&apos;S COMING.</p>
          <p>02 — NO IDEA HOW THIS ENDS.</p>
          <p>03 — COULD BE RIGHT. COULD BE WRONG.</p>
          <p>
            04 — BUT I KNOW WHO SAID: <em>"I&apos;LL FINISH IT."</em>
          </p>
        </div>
      </section>

      <aside className="awakening-spray" aria-hidden="true">
        <SprayTagGlyph />
        <span>NOISE × SILENCE</span>
        <em>FIND ME IN EVERYTHING</em>
      </aside>

      <footer className="awakening-footer">
        <span>ROCKSOUL DX / LOCAL DESKTOP</span>
        <span>NOISE × SILENCE — FOR THOSE WHO NEVER STOP.</span>
        <VectorBarcodeStamp />
      </footer>
    </main>
  );
}
