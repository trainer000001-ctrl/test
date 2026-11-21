import React from "react";
import { Archive, ArrowLeft, AudioLines, Layers3 } from "@moonwitness/ui/icons";
import { ROOM_SCENE_ART, type ArtworkDistrictId } from "../../assets/art";
import { IllustratedStage } from "./IllustratedStage";
import { AnarchyStarSigil, TelemetryWaveformSvg } from "@moonwitness/ui/artwork";
import { WorldHeader } from "./WorldNavigation";

export interface PreviewRoomProps {
  roomId: string;
  onReturn: () => void;
  onNavigate: (destination: string) => void;
  reducedMotion: boolean;
  systemReducedMotion: boolean;
  onToggleMotion: () => void;
}

const previewRooms = {
  archive: {
    title: "THE ARCHIVE",
    label: "A PLACE FOR WHAT SHOULD NOT BE LOST.",
    description: "A room for sources, notes, and retrievable fragments.",
    preview: "Archive workflows are not part of this visual foundation.",
    symbol: Archive,
    index: "01",
  },
  studio: {
    title: "THE STUDIO",
    label: "A PLACE TO SHAPE THE UNFINISHED.",
    description: "A room for writing, experiments, and authored work.",
    preview: "Studio workflows are not part of this visual foundation.",
    symbol: Layers3,
    index: "02",
  },
  "signal-room": {
    title: "THE SIGNAL ROOM",
    label: "A PLACE TO FOLLOW A QUESTION.",
    description: "A room for research, discovery, and connected ideas.",
    preview: "Research workflows are not part of this visual foundation.",
    symbol: AudioLines,
    index: "04",
  },
};

export function PreviewRoom({
  roomId,
  onReturn,
  onNavigate,
  reducedMotion,
  systemReducedMotion,
  onToggleMotion,
}: PreviewRoomProps) {
  const room = previewRooms[roomId as keyof typeof previewRooms];
  if (!room) return null;
  const Icon = room.symbol;
  const roomDistrict = roomId as ArtworkDistrictId;
  const sceneArt = ROOM_SCENE_ART[roomDistrict];

  return (
    <main className={`living-universe preview-room preview-room--${roomId}`} data-reduced-motion={reducedMotion}>
      <IllustratedStage scene={roomDistrict} destination={roomDistrict} reducedMotion={reducedMotion} />
      <WorldHeader
        onReturn={onReturn}
        onToggleMotion={onToggleMotion}
        reducedMotion={reducedMotion}
        systemReducedMotion={systemReducedMotion}
        note="ROOM  /  PREVIEW"
      />

      <section className="preview-room-stage" aria-labelledby="preview-room-title">
        <div className="preview-room-copy">
          <p className="world-kicker">
            <span /> DESTINATION / {room.index}
          </p>
          <h1 id="preview-room-title">{room.title}</h1>
          <p className="preview-room-label">{room.label}</p>
          <p className="preview-room-description">{room.description}</p>
          <div className="preview-notice">
            <span>PREVIEW</span>
            <p>{room.preview}</p>
          </div>
          <button className="return-threshold" type="button" onClick={onReturn}>
            <ArrowLeft size={16} aria-hidden="true" /> RETURN TO THE THRESHOLD
          </button>
        </div>

        <div className="preview-room-art" aria-hidden="true">
          <div className="room-viewport-chrome">
            <span className="room-viewport-badge">
              <Icon size={14} strokeWidth={1.8} />
              SECTOR {room.index} / {roomId.toUpperCase()}
            </span>
            <AnarchyStarSigil className="rs-anarchy-sigil room-viewport-sigil" />
          </div>
          <div className="room-viewport-frame">
            <img className="room-scene-artwork" src={sceneArt} alt="" />
            <div className="room-viewport-vignette" />
          </div>
          <div className="room-viewport-telemetry">
            <TelemetryWaveformSvg className="rs-waveform-svg room-telemetry-wave" />
            <span className="room-art-coordinate">WORLD / {roomId.toUpperCase()}</span>
          </div>
        </div>
      </section>

      <nav className="room-destination-nav" aria-label="Choose another destination">
        <button type="button" onClick={onReturn}>
          <ArrowLeft size={14} /> THE THRESHOLD
        </button>
        {[
          { id: "archive", title: "THE ARCHIVE" },
          { id: "studio", title: "THE STUDIO" },
          { id: "riot-deck", title: "THE RIOT DECK" },
          { id: "signal-room", title: "THE SIGNAL ROOM" },
        ].map((destination) => (
          <button
            key={destination.id}
            className={destination.id === roomId ? "is-current" : ""}
            type="button"
            aria-current={destination.id === roomId ? "page" : undefined}
            onClick={() => onNavigate(destination.id)}
          >
            {destination.title}
          </button>
        ))}
      </nav>
      <footer className="world-footer">
        <span>NOISE × SILENCE</span>
        <span>WORKFLOWS NOT INCLUDED IN THIS PREVIEW.</span>
        <span>ROCKSOUL DX / 0.1</span>
      </footer>
    </main>
  );
}
