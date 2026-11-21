import React from "react";
import { ArrowLeft, Settings } from "@moonwitness/ui/icons";
import { AnarchyStarSigil, VectorBarcodeStamp } from "@moonwitness/ui/artwork";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  children: React.ReactNode;
  size?: "sm" | "base" | "lg";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ "aria-label": ariaLabel, children, size = "base", className = "", ...props }, ref) => {
    const classNames = ["rs-btn rs-btn--icon", size !== "base" && `rs-btn--${size}`, className]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={classNames} aria-label={ariaLabel} {...props}>
        <span className="rs-btn__icon" aria-hidden="true">
          {children}
        </span>
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export interface MotionControlProps {
  reducedMotion: boolean;
  systemReducedMotion: boolean;
  onToggle: () => void;
}

export function MotionControl({ reducedMotion, systemReducedMotion, onToggle }: MotionControlProps) {
  return (
    <button
      className="world-motion-control"
      type="button"
      aria-pressed={reducedMotion}
      disabled={systemReducedMotion}
      title={systemReducedMotion ? "Reduced motion is required by the system preference." : undefined}
      onClick={onToggle}
    >
      <span className="world-motion-dot" aria-hidden="true" />
      {systemReducedMotion ? "LOW MOTION / SYSTEM" : `LOW MOTION ${reducedMotion ? "ON" : "OFF"}`}
    </button>
  );
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  "aria-label"?: string | undefined;
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Search...",
  "aria-label": ariaLabel = "Search",
}: SearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSubmit) {
      e.preventDefault();
      onSubmit(value);
    }
    if (e.key === "Escape") {
      onChange("");
    }
  };

  return (
    <label className="world-search" htmlFor="world-search-input">
      <span className="world-search-label" aria-hidden="true">
        FIND
      </span>
      <input
        id="world-search-input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </label>
  );
}

export interface UniverseHeaderProps {
  onSettings?: (() => void) | undefined;
  onToggleMotion?: (() => void) | undefined;
  reducedMotion?: boolean | undefined;
  systemReducedMotion?: boolean | undefined;
  searchValue?: string | undefined;
  onSearchChange?: ((value: string) => void) | undefined;
  onSearchSubmit?: ((value: string) => void) | undefined;
}

export function UniverseHeader({
  onSettings,
  onToggleMotion,
  reducedMotion,
  systemReducedMotion,
  searchValue,
  onSearchChange,
  onSearchSubmit,
}: UniverseHeaderProps) {
  return (
    <header className="universe-header">
      <a href="#universe-destinations" className="universe-brand" aria-label="ROCKSOUL DX, destinations">
        <span className="universe-brand-mark" aria-hidden="true">
          <AnarchyStarSigil />
        </span>
        <span className="universe-brand-copy">
          ROCKSOUL <b>DX</b>
          <small>THE LIVING UNIVERSE</small>
        </span>
      </a>
      <SearchInput
        value={searchValue || ""}
        onChange={onSearchChange || (() => {})}
        onSubmit={onSearchSubmit}
        placeholder="Search destinations"
        aria-label="Search destinations"
      />
      <div className="universe-header-actions">
        <span className="universe-local-state">
          <i aria-hidden="true" /> PRIVATE / LOCAL
        </span>
        {onSettings && (
          <IconButton aria-label="Open settings" onClick={onSettings}>
            <Settings size={16} />
          </IconButton>
        )}
        {onToggleMotion && (
          <MotionControl
            reducedMotion={reducedMotion || false}
            systemReducedMotion={systemReducedMotion || false}
            onToggle={onToggleMotion}
          />
        )}
      </div>
    </header>
  );
}

export interface UniverseFooterProps {
  onNavigate?: ((destination: string) => void) | undefined;
}

export function UniverseFooter({ onNavigate }: UniverseFooterProps) {
  const destinations = [
    { id: "archive", index: "01", title: "ARCHIVE" },
    { id: "studio", index: "02", title: "STUDIO" },
    { id: "riot-deck", index: "03", title: "RIOT DECK" },
    { id: "signal-room", index: "04", title: "SIGNAL ROOM" },
  ];

  return (
    <footer className="universe-footer">
      <span>
        <strong>ROCKSOUL DX</strong> / LOCAL DESKTOP
      </span>
      <nav className="universe-footer-nav" aria-label="Direct destination links">
        {destinations.map((d) => (
          <button key={d.id} type="button" onClick={() => onNavigate?.(d.id)}>
            {d.index} {d.title}
          </button>
        ))}
      </nav>
      <div className="universe-footer-meta">
        <span>NO MAP / FOUR ROOMS</span>
        <VectorBarcodeStamp />
      </div>
    </footer>
  );
}

export interface WorldHeaderProps {
  onReturn?: (() => void) | undefined;
  onToggleMotion?: (() => void) | undefined;
  reducedMotion?: boolean | undefined;
  systemReducedMotion?: boolean | undefined;
  note?: string | undefined;
}

export function WorldHeader({
  onReturn,
  onToggleMotion,
  reducedMotion,
  systemReducedMotion,
  note,
}: WorldHeaderProps) {
  return (
    <header className="world-header">
      {onReturn && (
        <button className="world-wordmark world-wordmark-button" type="button" onClick={onReturn}>
          <span className="wordmark-mark" aria-hidden="true">
            <AnarchyStarSigil />
          </span>
          <span className="world-wordmark-copy">
            ROCKSOUL <b>DX</b>
            <small>THE LIVING UNIVERSE</small>
          </span>
        </button>
      )}
      {note && <span className="world-header-note">{note}</span>}
      {onToggleMotion && (
        <MotionControl
          reducedMotion={reducedMotion || false}
          systemReducedMotion={systemReducedMotion || false}
          onToggle={onToggleMotion}
        />
      )}
    </header>
  );
}

export interface RoomContextBarProps {
  onReturn: () => void;
  title: string;
  onToggleMotion?: (() => void) | undefined;
  reducedMotion?: boolean | undefined;
  systemReducedMotion?: boolean | undefined;
}

export function RoomContextBar({
  onReturn,
  title,
  onToggleMotion,
  reducedMotion,
  systemReducedMotion,
}: RoomContextBarProps) {
  return (
    <div className="room-context-bar">
      <button className="room-home-link" type="button" onClick={onReturn}>
        <ArrowLeft size={15} aria-hidden="true" /> THE THRESHOLD
      </button>
      <span className="room-context-title">{title}</span>
      {onToggleMotion && (
        <MotionControl
          reducedMotion={reducedMotion || false}
          systemReducedMotion={systemReducedMotion || false}
          onToggle={onToggleMotion}
        />
      )}
    </div>
  );
}

export interface RoomReturnButtonProps {
  onReturn: () => void;
  reducedMotion: boolean;
  systemReducedMotion: boolean;
  onToggleMotion: () => void;
}

export function RoomReturnButton({
  onReturn,
  reducedMotion,
  systemReducedMotion,
  onToggleMotion,
}: RoomReturnButtonProps) {
  return (
    <div className="room-context-bar">
      <button className="room-home-link" type="button" onClick={onReturn}>
        <ArrowLeft size={15} aria-hidden="true" /> THE THRESHOLD
      </button>
      <span className="room-context-title">DESTINATION / THE RIOT DECK</span>
      <MotionControl
        reducedMotion={reducedMotion}
        systemReducedMotion={systemReducedMotion}
        onToggle={onToggleMotion}
      />
    </div>
  );
}
