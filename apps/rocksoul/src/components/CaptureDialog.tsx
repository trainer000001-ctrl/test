import React, { useState } from "react";
import { NativeSelect } from "@moonwitness/ui";
import { call } from "../lib";
import type { MemoryCategory } from "../lib/contracts";

interface CaptureDialogProps {
  onClose: () => void;
  onCaptured?: (() => void) | undefined;
}

export default function CaptureDialog({ onClose, onCaptured }: CaptureDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("working");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const capture = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await call("capture_memory", { title, content, category });
      onCaptured?.();
      onClose();
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : String(captureError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="issue-dialog" onSubmit={capture}>
        <header className="dialog-head">
          <div>
            <span className="eyebrow">THE ARCHIVE // QUICK CAPTURE</span>
            <h2>CAPTURE <span>NOW</span></h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close capture">×</button>
        </header>
        <label className="field-label">
          <span>TITLE</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
        </label>
        <label className="field-label">
          <span>CATEGORY</span>
          <NativeSelect value={category} onChange={(event) => setCategory(event.target.value as MemoryCategory)}>
            <option value="working">Working</option>
            <option value="project">Project</option>
            <option value="episodic">Episodic</option>
            <option value="semantic">Semantic</option>
            <option value="procedural">Procedural</option>
            <option value="preference">Preference</option>
          </NativeSelect>
        </label>
        <label className="field-label">
          <span>CONTENT</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} />
        </label>
        {error && <p className="global-error" role="alert">{error}</p>}
        <footer className="dialog-foot">
          <span>LOCAL ONLY · ATTRIBUTED TO OWNER</span>
          <button className="riot-button" type="submit" disabled={saving}>
            {saving ? "SAVING…" : "SAVE TO ARCHIVE"}
          </button>
        </footer>
      </form>
    </div>
  );
}
