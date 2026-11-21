import React from "react";
import { Command, Search, X } from "@moonwitness/ui/icons";

export interface CommandSwitchboardModalProps {
  query: string;
  options: Array<[string, string]>;
  onQueryChange: (value: string) => void;
  onSelect: (target: string) => void;
  onClose: () => void;
}

export default function CommandSwitchboardModal({
  query,
  options,
  onQueryChange,
  onSelect,
  onClose,
}: CommandSwitchboardModalProps) {
  return (
    <div
      className="command-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="command-panel">
        <div className="command-search">
          <Search />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="WHERE TO, TROUBLEMAKER?"
          />
          <kbd>ESC</kbd>
          <button className="icon-button" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        {options.map(([key, title]) => (
          <button className="command-option" key={key} onClick={() => onSelect(key)}>
            <span>{title}</span>
            <kbd>↵</kbd>
          </button>
        ))}
        <button className="command-option create-option" onClick={() => onSelect("create")}>
          <span>+ CREATE NEW CHAOS</span>
          <kbd>
            <Command size={12} /> N
          </kbd>
        </button>
        <div className="command-hint">COMMAND DECK / LOCAL ACTIONS ONLY</div>
      </div>
    </div>
  );
}
