import React from "react";
import { Activity, GitBranch, ListChecks, RadioTower, Swords } from "@moonwitness/ui/icons";
import { Home } from "@moonwitness/ui/icons";
import { AnarchyStarSigil } from "@moonwitness/ui/artwork";
import type { PageRoute } from "../router/useWorldRouter";

export interface RiotRailProps {
  page: string;
  onNavigate: (page: PageRoute) => void;
  onSwitchboard: () => void;
}

export default function RiotRail({ page, onNavigate, onSwitchboard }: RiotRailProps) {
  const items: Array<{ id: PageRoute; label: string; icon: React.ReactNode }> = [
    { id: "deck", label: "DECK", icon: <Home size={20} strokeWidth={2.4} /> },
    { id: "monitor", label: "OVERSEER", icon: <Activity size={20} strokeWidth={2.4} /> },
    { id: "pit", label: "PIT", icon: <ListChecks size={20} strokeWidth={2.4} /> },
    { id: "git", label: "GIT", icon: <GitBranch size={20} strokeWidth={2.4} /> },
    { id: "war-room", label: "WAR ROOM", icon: <Swords size={20} strokeWidth={2.4} /> },
    { id: "noise", label: "NOISE", icon: <RadioTower size={20} strokeWidth={2.4} /> },
  ];
  return (
    <aside className="riot-rail">
      <div className="rail-mark">
        <AnarchyStarSigil className="rail-emblem-img" />
        <span className="rail-brand">DX</span>
      </div>
      <nav className="rail-nav" aria-label="Main navigation">
        {items.map((item) => (
          <button
            key={item.id}
            className={`rail-item ${page === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
            title={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="rail-bottom">
        <button className="switchboard" onClick={onSwitchboard} title="Open command switchboard">
          <RadioTower size={17} />
          <span>
            RIOT
            <br />
            SWITCH
          </span>
          <b>↘</b>
        </button>
        <div className="rail-sticker">
          ROCK
          <br />
          SOUL
        </div>
        <span className="rail-version">LOCAL BUILD / 0.1</span>
      </div>
    </aside>
  );
}
