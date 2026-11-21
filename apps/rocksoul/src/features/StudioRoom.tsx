import { useEffect, useState } from "react";
import { NativeSelect } from "@moonwitness/ui";
import { call } from "../lib/api";
import type { StudioDraftRecord } from "../lib/contracts";

export function StudioRoom({ projectId }: { projectId?: string }) {
  const [drafts, setDrafts] = useState<StudioDraftRecord[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [kind, setKind] = useState("story");
  const [status, setStatus] = useState("");

  useEffect(() => {
    void call("list_studio_drafts", projectId ? { projectId } : {})
      .then((rows) => {
        setDrafts(rows);
      })
      .catch(() => setDrafts([]));
  }, [projectId]);

  async function handleSave() {
    if (!title.trim()) return;
    setStatus("Saving...");
    try {
      const saved = await call("save_studio_draft", {
        ...(activeId ? { draftId: activeId } : {}),
        title: title.trim(),
        content,
        kind,
        ...(projectId ? { projectId } : {}),
      });
      setActiveId(saved.id);
      setDrafts((prev) => [saved, ...prev.filter((d) => d.id !== saved.id)]);
      setStatus(`Saved v${saved.version}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    }
  }

  return (
    <section className="space-y-4 p-4" aria-label="The Studio">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">The Studio — Human Pen</h2>
        {status && <span className="text-xs opacity-75">{status}</span>}
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <aside className="space-y-2">
          <button
            type="button"
            className="w-full rounded border px-3 py-1.5 text-left text-sm"
            onClick={() => {
              setActiveId(undefined);
              setTitle("");
              setContent("");
              setKind("story");
            }}
          >
            + New Draft
          </button>
          <ul className="space-y-1">
            {drafts.map((draft) => (
              <li key={draft.id}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left text-sm hover:bg-white/5"
                  onClick={() => {
                    setActiveId(draft.id);
                    setTitle(draft.title);
                    setContent(draft.content);
                    setKind(draft.kind);
                  }}
                >
                  {draft.title} <span className="text-xs opacity-60">v{draft.version}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="space-y-3 md:col-span-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Draft title..."
              className="flex-1 rounded border bg-transparent px-3 py-1.5 text-sm"
            />
            <NativeSelect
              aria-label="Draft kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="h-auto w-auto rounded border bg-transparent px-2 py-1.5 text-sm"
            >
              <option value="story">Story</option>
              <option value="episode">Episode</option>
              <option value="character">Character</option>
              <option value="research">Research</option>
              <option value="general">General</option>
            </NativeSelect>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="Write local draft..."
            className="w-full rounded border bg-transparent p-3 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            className="rounded border px-4 py-1.5 text-sm font-medium"
          >
            Save Version
          </button>
        </div>
      </div>
    </section>
  );
}
