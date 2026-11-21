export type ArtKey =
  | "city-shadow"
  | "command-eye"
  | "crew-rooftop"
  | "crew-wall"
  | "crowd-moon"
  | "dna-lunar-observatory"
  | "dna-mycelium-spores"
  | "dna-nexus-hud"
  | "dna-nusantara-nodes"
  | "dock-chronicle-hero"
  | "editorial-light-plate"
  | "fog-voices"
  | "hero-witness"
  | "mirror-archive"
  | "night-shift"
  | "shadow-command"
  | "shadow-command-hero"
  | "sidebar-witness"
  | "signal-sky"
  | "signal-tunnel"
  | "wallpaper-atlas-orbit-wide"
  | "wallpaper-lunar-rooftop-wide"
  | "wallpaper-night-transmission-wide"
  | "wallpaper-signal-city-wide"
  | "world-map-atlas";

export type EraId = string;
export type EventKind = "signal" | "story" | "world" | "people" | "research" | "project" | "canon" | string;

export interface Era {
  id: EraId;
  name: string;
  label?: string;
  years?: string;
  range?: string;
  description?: string;
  color?: string;
  count?: number;
}

export interface TimelineEvent {
  id: string;
  version?: number;
  kind: EventKind;
  date: string;
  era: EraId;
  title: string;
  excerpt: string;
  body?: string;
  location?: string;
  tags: string[];
  sources: number;
  notes: number;
  image: ArtKey;
  imagePosition?: string;
  related?: string[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimelineFilters {
  era?: EraId;
  kind?: EventKind;
  from?: string;
  to?: string;
  q?: string;
  sort?: "asc" | "desc" | string;
  limit?: number;
  offset?: number;
}

export interface ModuleStat {
  label: string;
  value: number | string;
  color: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  stats: ModuleStat[];
}

export interface Project {
  id: string;
  title: string;
  status: string;
  progress: number;
  color: string;
  image: ArtKey;
  imagePosition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  detail: string;
  status: "Running" | "Queued" | "Paused" | string;
}

export interface FeedItem {
  id: string;
  text: string;
  ago: string;
  color: string;
}

export interface MissionAlert {
  id: string;
  text: string;
  ago: string;
  level: "high" | "medium" | "low";
}

export interface Witness {
  id: string;
  name: string;
  place: string;
  x: number;
  y: number;
  quote: string;
  signals: number;
}

export interface UniverseStat {
  label: string;
  value: string;
  trend: string;
  tone: "pink" | "blue" | "yellow" | "green" | string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  moduleId: string;
}

export interface WorkspaceItem {
  id: string;
  title: string;
  kind: string;
  updatedAt: string;
  status: string;
}

export interface PipelineCard {
  id: string;
  title: string;
  type: string;
  thumb: ArtKey;
}

export interface PipelineColumn {
  stage: string;
  count: number;
  more: number;
  items: PipelineCard[];
}

export interface Collection {
  id: string;
  name: string;
  episodes: number;
  cover: ArtKey;
}

export interface MapCity {
  id: string;
  city: string;
  x: number;
  y: number;
  signals: number;
}

export type KanbanBoardKind = "pipeline" | "cab";

export interface CabTaskItem {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly type: string;
  readonly priority: "high" | "medium" | "low";
  readonly owner: string;
  readonly updatedAt: string;
  readonly version?: number;
}

export interface CabStageColumn {
  readonly stage: "proposed" | "review" | "approved" | "deployed";
  readonly title: string;
  readonly count?: number;
  readonly items: readonly CabTaskItem[];
}

export interface KanbanStageUpdateRequest {
  readonly board: KanbanBoardKind;
  readonly itemId: string;
  readonly toStage: string;
  readonly expectedVersion?: number;
}

export interface KanbanBoardResponse<C> {
  readonly ok: boolean;
  readonly board: KanbanBoardKind;
  readonly columns: C[];
  readonly updatedAt: string;
  readonly engine?: string;
}

export interface KanbanStageUpdateResponse<C> {
  readonly ok: boolean;
  readonly board: KanbanBoardKind;
  readonly moved: boolean;
  readonly itemId: string;
  readonly fromStage: string;
  readonly toStage: string;
  readonly version?: number;
  readonly columns: C[];
  readonly updatedAt: string;
  readonly engine?: string;
}

