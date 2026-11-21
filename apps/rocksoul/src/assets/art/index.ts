import archiveSceneUrl from "./archive-scene.jpg";
import awakeningSceneUrl from "./awakening-scene.jpg";
import barcodeStampUrl from "./barcode-stamp.png";
import brushSlashUrl from "./brush-slash.png";
import emblemAnarchyUrl from "./emblem-anarchy.png";
import emblemCrownUrl from "./emblem-crown.png";
import portraitBuilderUrl from "./portrait-builder.png";
import portraitCommanderUrl from "./portrait-commander.png";
import portraitHunterUrl from "./portrait-hunter.png";
import portraitTesterUrl from "./portrait-tester.png";
import riotdeckSceneUrl from "./riotdeck-scene.jpg";
import signalSceneUrl from "./signal-scene.jpg";
import sprayTagUrl from "./spray-tag.png";
import studioSceneUrl from "./studio-scene.jpg";
import telemetryWaveUrl from "./telemetry-wave.png";
import thresholdSceneUrl from "./threshold-scene.jpg";

/** Card art reuses the full 1376x768 scenes so no 240px thumbnail is ever upscaled. */
const thumbArchiveUrl = archiveSceneUrl;
const thumbRiotUrl = riotdeckSceneUrl;
const thumbSignalUrl = signalSceneUrl;
const thumbStudioUrl = studioSceneUrl;

export {
  archiveSceneUrl,
  awakeningSceneUrl,
  barcodeStampUrl,
  brushSlashUrl,
  emblemAnarchyUrl,
  emblemCrownUrl,
  portraitBuilderUrl,
  portraitCommanderUrl,
  portraitHunterUrl,
  portraitTesterUrl,
  riotdeckSceneUrl,
  signalSceneUrl,
  sprayTagUrl,
  studioSceneUrl,
  telemetryWaveUrl,
  thresholdSceneUrl,
  thumbArchiveUrl,
  thumbRiotUrl,
  thumbSignalUrl,
  thumbStudioUrl,
};

export type ArtworkDistrictId = "archive" | "studio" | "riot-deck" | "signal-room";
export type AgentPortraitVariant = "commander" | "builder" | "hunter" | "tester";

/** Small modular card thumbnails keyed by world district identifier. */
export const DISTRICT_THUMBNAILS: Record<ArtworkDistrictId, string> = {
  archive: thumbArchiveUrl,
  studio: thumbStudioUrl,
  "riot-deck": thumbRiotUrl,
  "signal-room": thumbSignalUrl,
};

/** Full-scene illustrated chamber backdrops keyed by room identifier. */
export const ROOM_SCENE_ART: Record<ArtworkDistrictId, string> = {
  archive: archiveSceneUrl,
  studio: studioSceneUrl,
  "riot-deck": riotdeckSceneUrl,
  "signal-room": signalSceneUrl,
};

/** Illustrated tactical portrait plates keyed by agent variant. */
export const AGENT_PORTRAIT_ART: Record<AgentPortraitVariant, string> = {
  commander: portraitCommanderUrl,
  builder: portraitBuilderUrl,
  hunter: portraitHunterUrl,
  tester: portraitTesterUrl,
};
