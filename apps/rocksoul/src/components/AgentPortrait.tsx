import React from "react";
import { AGENT_PORTRAIT_ART, type AgentPortraitVariant } from "../assets/art";

export interface AgentPortraitProps {
  variant?: AgentPortraitVariant;
}

export default function AgentPortrait({ variant = "commander" }: AgentPortraitProps) {
  const portraitSrc = AGENT_PORTRAIT_ART[variant] ?? AGENT_PORTRAIT_ART.commander;
  return (
    <div className={`agent-portrait ${variant}`}>
      <img
        className="agent-portrait-img"
        src={portraitSrc}
        alt=""
        aria-hidden="true"
        loading="lazy"
      />
    </div>
  );
}
