import { useEffect, useState } from "react";
import { call } from "../lib/api";
import type { CompanionProfileRecord, ResearchClaimRecord } from "../lib/contracts";

export function SignalRoom() {
  const [claims, setClaims] = useState<ResearchClaimRecord[]>([]);
  const [companion, setCompanion] = useState<CompanionProfileRecord | null>(null);
  const [question, setQuestion] = useState("");
  const [claim, setClaim] = useState("");
  const [sourceCitation, setSourceCitation] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void call("list_research_claims", {})
      .then(setClaims)
      .catch(() => setClaims([]));
    void call("get_companion_profile", {})
      .then(setCompanion)
      .catch(() => setCompanion(null));
  }, []);

  async function handleRecordClaim() {
    if (!question.trim() || !claim.trim() || !sourceCitation.trim()) return;
    setError("");
    try {
      const created = await call("record_research_claim", {
        question: question.trim(),
        claim: claim.trim(),
        sourceCitation: sourceCitation.trim(),
        confidence: "verified",
      });
      setClaims((prev) => [created, ...prev]);
      setQuestion("");
      setClaim("");
      setSourceCitation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record claim");
    }
  }

  return (
    <section className="space-y-4 p-4" aria-label="Signal Room">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Signal Room — Research &amp; Companion</h2>
        {companion && (
          <span className="rounded border px-2 py-0.5 text-xs">
            {companion.name}: {companion.state}
          </span>
        )}
      </header>
      {companion && (
        <div className="rounded border p-3 text-xs opacity-80">
          <p>{companion.dailyBriefing}</p>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="space-y-2 rounded border p-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Research question..."
          className="w-full rounded border bg-transparent px-3 py-1.5 text-sm"
        />
        <input
          type="text"
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          placeholder="Verified claim / finding..."
          className="w-full rounded border bg-transparent px-3 py-1.5 text-sm"
        />
        <input
          type="text"
          value={sourceCitation}
          onChange={(e) => setSourceCitation(e.target.value)}
          placeholder="Source citation / path..."
          className="w-full rounded border bg-transparent px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => void handleRecordClaim()}
          className="rounded border px-3 py-1 text-sm"
        >
          Record Claim
        </button>
      </div>
      <ul className="space-y-2">
        {claims.map((entry) => (
          <li key={entry.id} className="rounded border p-3 text-sm">
            <div className="font-medium">{entry.question}</div>
            <div className="mt-1 opacity-90">{entry.claim}</div>
            <div className="mt-1 text-xs opacity-60">Source: {entry.sourceCitation}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
