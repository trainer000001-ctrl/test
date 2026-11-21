import React from "react";
import { Activity } from "@moonwitness/ui/icons";
import { thumbSignalUrl } from "../assets/art";
import { TelemetryWaveformSvg } from "@moonwitness/ui/artwork";
import type { ActivityEvent } from "../lib/contracts";
import { PageTitle } from "./WorkspacePageTitle";

export interface NoiseProps {
  events: ActivityEvent[];
}

export function Noise({ events }: NoiseProps) {
  return (
    <section className="page-content workspace-page">
      <PageTitle
        kicker="05 / EVENT INTELLIGENCE"
        title="NOISE TAPE"
        subtitle="The machine remembers. A readable trail of what happened and when."
        artSrc={thumbSignalUrl}
        artCode="SECTOR 05 // NOISE TAPE"
      />
      <div className="riot-panel noise-log">
        <div className="panel-heading purple-head">
          <span>
            <Activity size={15} /> LOCAL EVENT STREAM
          </span>
          <span className="micro-label">APPEND-ONLY JOURNAL</span>
        </div>
        <div className="noise-telemetry-strip" aria-hidden="true">
          <TelemetryWaveformSvg className="rs-waveform-svg noise-waveform" />
          <span>CH-05 // APPEND TRACE</span>
        </div>
        {events.map((event) => (
          <article className="noise-log-row" key={event.id}>
            <span className="noise-led" />
            <span className="noise-kind">{event.kind.toUpperCase()}</span>
            <b>{event.message}</b>
            <time>{new Date(event.created_at).toLocaleString()}</time>
          </article>
        ))}
        {!events.length && (
          <div className="empty-state large-empty">
            <b>NO SIGNAL. NO DRAMA.</b>
            <span>Issue, project, milestone, and repository activity will be recorded here.</span>
          </div>
        )}
      </div>
    </section>
  );
}
