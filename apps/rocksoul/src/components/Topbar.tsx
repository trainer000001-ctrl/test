import React from "react";
import { Activity, Command, FolderGit2, LogIn, RefreshCw } from "@moonwitness/ui/icons";
import { DnaBrandLogo, NativeSelect, listPresets, useSkin, type SkinName } from "@moonwitness/ui";
import { ChevronDown, LogOut, Settings, SkinPalette, Sun } from "@moonwitness/ui/icons";
import type { Repository } from "../lib/contracts";

const ROCKSOUL_PRIORITY_SKINS: readonly SkinName[] = ["riot", "technical", "editorial"];
const ROCKSOUL_SKIN_CYCLE: readonly SkinName[] = [
  ...ROCKSOUL_PRIORITY_SKINS,
  ...listPresets().filter((preset) => !ROCKSOUL_PRIORITY_SKINS.includes(preset)),
];

export interface TopbarIdentity {
  username: string;
  displayName?: string | undefined;
  role?: string | undefined;
}

export interface TopbarProps {
  repositories: Repository[];
  selectedRepository: string;
  onRepositoryChange: (repositoryId: string) => void;
  onCommand: () => void;
  onSettings: () => void;
  onOpenMonitor?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  monitorSummary?: string | undefined;
  identity?: TopbarIdentity | null | undefined;
  identityBusy?: boolean | undefined;
  onSignIn?: (() => void) | undefined;
  onSignOut?: (() => void) | undefined;
}

export default function Topbar({
  repositories,
  selectedRepository,
  onRepositoryChange,
  onCommand,
  onSettings,
  onOpenMonitor,
  onRefresh,
  monitorSummary,
  identity,
  identityBusy,
  onSignIn,
  onSignOut,
}: TopbarProps) {
  const { skin, setSkin, resolvedMode, setMode } = useSkin();
  const nextSkin =
    ROCKSOUL_SKIN_CYCLE[(ROCKSOUL_SKIN_CYCLE.indexOf(skin) + 1) % ROCKSOUL_SKIN_CYCLE.length] ?? "riot";
  const nextMode = resolvedMode === "dark" ? "light" : "dark";

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <DnaBrandLogo id="03-rocksoul" variant="mark" size={24} decorative />
        <span>
          ROCKSOUL <b>- DX</b>
        </span>
        <small>MAKE TOOLS. BREAK RULES. SHIP CHAOS.</small>
      </div>
      <div className="topbar-context">
        <div className="context-chip">
          <FolderGit2 size={15} />
          <span>
            WORKSPACE: <b>PRIVATE / LOCAL</b>
          </span>
          <ChevronDown size={13} />
        </div>
        <label className="context-chip repo-picker">
          <GitBranchIcon />
          <NativeSelect
            className="h-auto w-auto border-0 bg-transparent p-0"
            aria-label="Selected repository"
            value={selectedRepository}
            onChange={(e) => onRepositoryChange(e.target.value)}
          >
            <option value="">NO REPOSITORY SELECTED</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name}
              </option>
            ))}
          </NativeSelect>
          <ChevronDown size={13} />
        </label>
        <span className="local-pill">
          <i /> LOCAL MODE
        </span>
      </div>
      <div className="topbar-actions">
        {onOpenMonitor ? (
          <button
            type="button"
            className="shortcut monitor-pill-btn"
            onClick={onOpenMonitor}
            title="Open Overseer Monitor"
          >
            <Activity size={15} className="system-pulse" />
            <span>{monitorSummary || "OVERSEER"}</span>
          </button>
        ) : (
          <Activity size={18} className="system-pulse" />
        )}
        {onRefresh && (
          <button type="button" className="icon-button" aria-label="Refresh workspace" onClick={onRefresh}>
            <RefreshCw size={17} />
          </button>
        )}
        <button className="shortcut" onClick={onCommand}>
          <Command size={14} /> CTRL + K
        </button>
        <button
          type="button"
          className="shortcut"
          aria-label={`Switch skin (${skin})`}
          title={`Skin: ${skin} → click for ${nextSkin}`}
          onClick={() => setSkin(nextSkin)}
        >
          <SkinPalette size={13} /> {skin.toUpperCase()}
        </button>
        <NativeSelect
          aria-label="Select skin preset"
          className="shortcut h-auto w-auto"
          value={skin}
          onChange={(e) => setSkin(e.target.value as SkinName)}
        >
          {ROCKSOUL_SKIN_CYCLE.map((preset) => (
            <option key={preset} value={preset}>
              {preset.toUpperCase()}
            </option>
          ))}
        </NativeSelect>
        <button
          type="button"
          className="icon-button"
          aria-label={`Switch to ${nextMode} theme`}
          title={`Current: ${resolvedMode} — click for ${nextMode}`}
          onClick={() => setMode(nextMode)}
        >
          <Sun size={16} />
        </button>
        <button className="icon-button" aria-label="Settings" onClick={onSettings}>
          <Settings size={19} />
        </button>
        {identity ? (
          <div className="identity-chip">
            <span
              className="identity-handle"
              title={`${identity.displayName || identity.username}${identity.role ? ` (${identity.role})` : ""}`}
            >
              @{identity.username}
            </span>
            {onSignOut && (
              <button
                type="button"
                className="icon-button identity-signout-btn"
                aria-label={`Sign out @${identity.username}`}
                title="Sign out of MoonWitness ID"
                disabled={identityBusy}
                onClick={onSignOut}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        ) : (
          onSignIn && (
            <button
              type="button"
              className="shortcut identity-signin-btn"
              disabled={identityBusy}
              onClick={onSignIn}
              title="Sign in with MoonWitness ID (optional)"
            >
              <LogIn size={13} />
              <span>{identityBusy ? "SIGNING IN…" : "SIGN IN"}</span>
            </button>
          )
        )}
        <div className="avatar">{identity ? identity.username.slice(0, 2).toUpperCase() : "RS"}</div>
      </div>
    </header>
  );
}

function GitBranchIcon() {
  return <FolderGit2 size={15} />;
}
