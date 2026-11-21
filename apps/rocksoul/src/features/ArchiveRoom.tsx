import React, { useCallback, useEffect, useRef, useState } from "react";
import { toMemorySyncPayloadFromContinuity } from "@moonwitness/contracts/continuity";
import { NativeSelect } from "@moonwitness/ui";
import { call } from "../lib";
import type {
  MemoryCategory,
  MemoryRecord,
  ResumePointRecord,
  SoulJournalEntry,
  WorkSessionRecord,
} from "../lib/contracts";

interface ArchiveRoomProps {
  onReturn: () => void;
  onCapture: () => void;
  reducedMotion: boolean;
}

export default function ArchiveRoom({ onReturn, onCapture, reducedMotion }: ArchiveRoomProps) {
  const [tab, setTab] = useState<"memory" | "sessions" | "journal">("memory");
  const [query, setQuery] = useState("");
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [sessions, setSessions] = useState<WorkSessionRecord[]>([]);
  const [resumePoints, setResumePoints] = useState<ResumePointRecord[]>([]);
  const [journal, setJournal] = useState<SoulJournalEntry[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("working");
  const [sessionName, setSessionName] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [resumeTitle, setResumeTitle] = useState("");
  const [resumeSummary, setResumeSummary] = useState("");
  const [syncNotice, setSyncNotice] = useState("");
  const queryRef = useRef(query);
  queryRef.current = query;

  const refresh = useCallback(async (searchQuery = queryRef.current) => {
    setError("");
    try {
      const [memoryRows, sessionRows, pointRows, journalRows] = await Promise.all([
        call("search_memories", { query: searchQuery }),
        call("list_work_sessions"),
        call("list_resume_points"),
        call("list_soul_journal"),
      ]);
      setMemories(memoryRows);
      setSessions(sessionRows);
      setResumePoints(pointRows);
      setJournal(journalRows);
      setSelectedSessionId((current) => (!current && sessionRows[0] ? sessionRows[0].id : current));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    }
  }, []);

  useEffect(() => {
    void refresh("");
  }, [refresh]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(query), 180);
    return () => window.clearTimeout(timeout);
  }, [query, refresh]);

  const saveMemory = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await call("capture_memory", { title, content, category });
      setTitle("");
      setContent("");
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!window.confirm("Delete this archived memory? Its correction history will remain local.")) return;
    try {
      await call("delete_memory", { memoryId });
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  };

  const correctMemory = async (memory: MemoryRecord) => {
    const corrected = window.prompt("Correct this memory:", memory.content);
    if (corrected === null || corrected.trim() === "" || corrected === memory.content) return;
    try {
      await call("update_memory", {
        memoryId: memory.id,
        title: memory.title,
        content: corrected,
        category: memory.category,
        status: "corrected",
        retention: memory.retention,
        sourceRef: memory.sourceRef,
      });
      await refresh();
    } catch (correctError) {
      setError(correctError instanceof Error ? correctError.message : String(correctError));
    }
  };

  const createSession = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const session = await call("create_work_session", { name: sessionName, contextJson: "{}" });
      setSessionName("");
      setSelectedSessionId(session.id);
      await refresh();
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : String(sessionError));
    }
  };

  const closeSession = async (sessionId: string) => {
    try {
      await call("close_work_session", { sessionId });
      await refresh();
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : String(closeError));
    }
  };

  const saveResumePoint = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSessionId) {
      setError("Create a work session before adding a resume point.");
      return;
    }
    try {
      await call("create_resume_point", {
        workSessionId: selectedSessionId,
        title: resumeTitle,
        summary: resumeSummary,
        contextJson: "{}",
      });
      setResumeTitle("");
      setResumeSummary("");
      await refresh();
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : String(resumeError));
    }
  };

  const exportContinuityBundle = async () => {
    setError("");
    setSyncNotice("");
    try {
      const bundle = toMemorySyncPayloadFromContinuity({
        memories,
        workSessions: sessions,
        resumePoints,
        experiences: [],
        lessons: [],
      });
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
      }
      setSyncNotice(
        `Prepared ${bundle.records.length} rocksoul-desktop record(s) for /api/v1/memory/sync.`,
      );
    } catch (syncErr) {
      setError(syncErr instanceof Error ? syncErr.message : String(syncErr));
    }
  };

  return (
    <main className="continuity-room" data-reduced-motion={reducedMotion}>
      <header className="continuity-head">
        <div>
          <span className="eyebrow">THE ARCHIVE // LOCAL CONTINUITY</span>
          <h1>SOUL <span>JOURNAL</span></h1>
        </div>
        <div className="continuity-actions">
          <button type="button" className="riot-button" onClick={onCapture}>QUICK CAPTURE</button>
          <button
            type="button"
            className="outline-button"
            disabled={memories.length === 0 && sessions.length === 0}
            onClick={() => void exportContinuityBundle()}
          >
            EXPORT SYNC BUNDLE
          </button>
          <button type="button" className="outline-button" onClick={onReturn}>RETURN TO THRESHOLD</button>
        </div>
      </header>

      <nav className="continuity-tabs" aria-label="Archive sections">
        <button type="button" className={tab === "memory" ? "selected" : ""} onClick={() => setTab("memory")}>MEMORY / FTS</button>
        <button type="button" className={tab === "sessions" ? "selected" : ""} onClick={() => setTab("sessions")}>WORK SESSIONS</button>
        <button type="button" className={tab === "journal" ? "selected" : ""} onClick={() => setTab("journal")}>SOUL JOURNAL</button>
      </nav>

      {syncNotice && <p className="global-notice" role="status">{syncNotice}</p>}
      {error && <p className="global-error" role="alert">{error}</p>}

      {tab === "memory" && (
        <section className="continuity-grid">
          <form className="continuity-card" onSubmit={saveMemory}>
            <h2>NEW MEMORY</h2>
            <label>
              <span>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              <span>Category</span>
              <NativeSelect value={category} onChange={(event) => setCategory(event.target.value as MemoryCategory)}>
                <option value="working">Working</option>
                <option value="project">Project</option>
                <option value="episodic">Episodic</option>
                <option value="semantic">Semantic</option>
                <option value="procedural">Procedural</option>
                <option value="preference">Preference</option>
              </NativeSelect>
            </label>
            <label>
              <span>Content</span>
              <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} />
            </label>
            <button className="riot-button" type="submit">SAVE MEMORY</button>
          </form>

          <div className="continuity-results">
            <label className="continuity-search">
              <span>SEARCH LOCAL MEMORY</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, content or source" />
            </label>
            {memories.map((memory) => (
              <article className="continuity-record" key={memory.id}>
                <header>
                  <div>
                    <span>{memory.category.toUpperCase()} // {memory.status.toUpperCase()}</span>
                    <h3>{memory.title}</h3>
                  </div>
                  <time>{memory.createdAt}</time>
                </header>
                <p>{memory.content}</p>
                <footer>
                  <span>Source: {memory.sourceType}{memory.sourceRef ? ` — ${memory.sourceRef}` : ""}</span>
                  <div>
                    <button type="button" className="outline-button" onClick={() => void correctMemory(memory)}>CORRECT</button>
                    <button type="button" className="outline-button" onClick={() => void deleteMemory(memory.id)}>DELETE</button>
                  </div>
                </footer>
              </article>
            ))}
            {memories.length === 0 && <p className="continuity-empty">NO LOCAL MEMORY MATCHES.</p>}
          </div>
        </section>
      )}

      {tab === "sessions" && (
        <section className="continuity-grid">
          <div>
            <form className="continuity-card" onSubmit={createSession}>
              <h2>NEW WORK SESSION</h2>
              <label>
                <span>Name</span>
                <input value={sessionName} onChange={(event) => setSessionName(event.target.value)} />
              </label>
              <button className="riot-button" type="submit">START SESSION</button>
            </form>
            <form className="continuity-card" onSubmit={saveResumePoint}>
              <h2>ADD RESUME POINT</h2>
              <label>
                <span>Session</span>
                <NativeSelect value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)}>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>{session.name}</option>
                  ))}
                </NativeSelect>
              </label>
              <label>
                <span>Title</span>
                <input value={resumeTitle} onChange={(event) => setResumeTitle(event.target.value)} />
              </label>
              <label>
                <span>Where to resume</span>
                <textarea value={resumeSummary} onChange={(event) => setResumeSummary(event.target.value)} rows={4} />
              </label>
              <button className="riot-button" type="submit">SAVE RESUME POINT</button>
            </form>
          </div>
          <div className="continuity-results">
            {sessions.map((session) => (
              <article className="continuity-record" key={session.id}>
                <header>
                  <div>
                    <span>WORK SESSION // {session.status.toUpperCase()}</span>
                    <h3>{session.name}</h3>
                  </div>
                  {session.status === "active" && (
                    <button type="button" className="outline-button" onClick={() => void closeSession(session.id)}>CLOSE</button>
                  )}
                </header>
                {resumePoints.filter((point) => point.workSessionId === session.id).map((point) => (
                  <p key={point.id}><b>{point.title}</b> — {point.summary}</p>
                ))}
                {resumePoints.every((point) => point.workSessionId !== session.id) && (
                  <p>No resume points yet.</p>
                )}
              </article>
            ))}
            {sessions.length === 0 && <p className="continuity-empty">NO WORK SESSIONS.</p>}
          </div>
        </section>
      )}

      {tab === "journal" && (
        <section className="continuity-results">
          {journal.map((entry) => (
            <article className="continuity-record" key={`${entry.kind}:${entry.id}`}>
              <header>
                <div>
                  <span>{entry.kind.toUpperCase()} // {entry.status.toUpperCase()}</span>
                  <h3>{entry.title}</h3>
                </div>
                <time>{entry.createdAt}</time>
              </header>
              <p>{entry.summary}</p>
              {entry.evidenceJson !== "{}" && <pre className="continuity-evidence">{entry.evidenceJson}</pre>}
            </article>
          ))}
          {journal.length === 0 && <p className="continuity-empty">NO VERIFIED EXPERIENCE OR ACCEPTED LESSONS YET.</p>}
        </section>
      )}
    </main>
  );
}
