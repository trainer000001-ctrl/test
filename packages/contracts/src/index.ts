export * from "./types";

export interface CreateEventBody {
  id?: string;
  kind: import("./types").EventKind;
  date: string;
  era: import("./types").EraId;
  title: string;
  excerpt?: string;
  body?: string;
  location?: string;
  tags?: string[];
  sources?: number;
  notes?: number;
  image?: import("./types").ArtKey;
  imagePosition?: string;
  related?: string[];
}

export interface TimelineListResponse {
  data: import("./types").TimelineEvent[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface TimelineEventResponse {
  data: import("./types").TimelineEvent;
}

export interface TimelineStatsResponse {
  total: number;
  byEra: Record<string, number>;
  byKind: Record<string, number>;
  totalSources?: number;
  totalNotes?: number;
  data?: {
    total: number;
    byEra: Record<string, number>;
    byKind: Record<string, number>;
    totalSources?: number;
    totalNotes?: number;
  };
}

export interface TimelineErasResponse {
  data: import("./types").Era[];
}
