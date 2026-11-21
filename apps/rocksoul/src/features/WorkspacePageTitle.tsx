import React from "react";
import { AnarchyStarSigil } from "@moonwitness/ui/artwork";

export interface PageTitleProps {
  kicker: string;
  title: string;
  subtitle: string;
  artSrc?: string;
  artCode?: string;
  action?: React.ReactNode;
}

export function PageTitle({ kicker, title, subtitle, artSrc, artCode, action }: PageTitleProps) {
  return (
    <header className="workspace-title">
      <div className="workspace-title-copy">
        <span className="eyebrow">{kicker}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="workspace-title-aside">
        {artSrc && (
          <div className="workspace-art-plate" aria-hidden="true">
            <img src={artSrc} alt="" loading="lazy" />
            <div className="workspace-art-scrim" />
            <div className="workspace-art-meta">
              <AnarchyStarSigil className="rs-anarchy-sigil workspace-art-sigil" />
              <span>{artCode || "LOCAL // DX"}</span>
            </div>
          </div>
        )}
        {action}
      </div>
    </header>
  );
}
