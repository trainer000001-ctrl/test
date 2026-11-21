import {
  IllustratedStage,
  type IllustratedSceneKind,
  type WorldDestination,
} from "../../components/ui/IllustratedStage";

export type { WorldDestination };

interface WorldCanvasProps {
  destination?: WorldDestination;
  scene?: IllustratedSceneKind;
  reducedMotion: boolean;
}

export default function WorldCanvas({
  destination = "threshold",
  scene = "threshold",
  reducedMotion,
}: WorldCanvasProps) {
  return <IllustratedStage scene={scene} destination={destination} reducedMotion={reducedMotion} />;
}
