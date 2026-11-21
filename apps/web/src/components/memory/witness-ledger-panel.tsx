"use client";

import { useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  NativeSelect,
  Textarea,
} from "@moonwitness/ui";
import { GitBranch, RefreshCw, ShieldCheck } from "@moonwitness/ui/icons";
import type {
  WitnessClaimLineage,
  WitnessClaimRecord,
  WitnessEpistemicType,
} from "@/lib/api/memory";

const EPISTEMIC_TYPE_OPTIONS: WitnessEpistemicType[] = [
  "fact",
  "testimony",
  "hypothesis",
  "interpretation",
  "dream",
  "fiction",
  "unknown",
];

interface WitnessLedgerPanelProps {
  claims: WitnessClaimRecord[];
  epistemicFilter: string;
  onEpistemicFilterChange: (value: string) => void;
  selectedLineage: WitnessClaimLineage | null;
  lineageLoading: boolean;
  busyClaimId: string | null;
  creating: boolean;
  syncing: boolean;
  onCreateClaim: (payload: {
    statement: string;
    epistemic_type: WitnessEpistemicType;
    excerpt?: string;
    archive_id?: string;
    message_id?: string;
  }) => Promise<void>;
  onSelectLineage: (claimId: string) => Promise<void>;
  onVerifyAction: (
    claimId: string,
    action: "verify" | "dispute" | "supersede",
    reason?: string,
  ) => Promise<void>;
  onPushSync: () => Promise<void>;
}

export function WitnessLedgerPanel({
  claims,
  epistemicFilter,
  onEpistemicFilterChange,
  selectedLineage,
  lineageLoading,
  busyClaimId,
  creating,
  syncing,
  onCreateClaim,
  onSelectLineage,
  onVerifyAction,
  onPushSync,
}: WitnessLedgerPanelProps) {
  const [statement, setStatement] = useState("");
  const [epistemicType, setEpistemicType] = useState<WitnessEpistemicType>("testimony");
  const [archiveId, setArchiveId] = useState("");
  const [messageId, setMessageId] = useState("");
  const [excerpt, setExcerpt] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanStatement = statement.trim();
    if (!cleanStatement) return;
    await onCreateClaim({
      statement: cleanStatement,
      epistemic_type: epistemicType,
      archive_id: archiveId.trim() || undefined,
      message_id: messageId.trim() || undefined,
      excerpt: excerpt.trim() || undefined,
    });
    setStatement("");
    setExcerpt("");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-brush text-xl">
              <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />
              WITNESS LEDGER CLAIMS ({claims.length})
            </CardTitle>
            <CardDescription>
              Claim-level temporal provenance across fact, testimony, hypothesis, interpretation,
              dream, fiction, and unknown registers with immutable source excerpts.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              aria-label="Filter claim epistemic type"
              value={epistemicFilter}
              onChange={(e) => onEpistemicFilterChange(e.target.value)}
            >
              <option value="all">All epistemic types</option>
              {EPISTEMIC_TYPE_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind.toUpperCase()}
                </option>
              ))}
            </NativeSelect>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={syncing}
              onClick={() => void onPushSync()}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {syncing ? "Syncing…" : "Push Claims Sync"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleSubmit}
            className="space-y-3 border border-[var(--border)] bg-[var(--background)] p-4"
          >
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
              Record New Epistemic Claim
            </p>
            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="State the claim cleanly while preserving original source ambiguity…"
              aria-label="Claim statement"
              rows={2}
            />
            <div className="grid gap-2 sm:grid-cols-4">
              <NativeSelect
                aria-label="Claim epistemic type"
                value={epistemicType}
                onChange={(e) => setEpistemicType(e.target.value as WitnessEpistemicType)}
              >
                {EPISTEMIC_TYPE_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind.toUpperCase()}
                  </option>
                ))}
              </NativeSelect>
              <Input
                value={archiveId}
                onChange={(e) => setArchiveId(e.target.value)}
                placeholder="Source archive ID (optional)"
                aria-label="Source archive ID"
              />
              <Input
                value={messageId}
                onChange={(e) => setMessageId(e.target.value)}
                placeholder="Source message ID (optional)"
                aria-label="Source message ID"
              />
              <Input
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Verbatim source excerpt"
                aria-label="Verbatim source excerpt"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={creating || !statement.trim()}>
                {creating ? "Recording…" : "Record Claim"}
              </Button>
            </div>
          </form>

          {claims.length === 0 ? (
            <p className="border border-dashed border-[var(--border)] p-4 text-xs text-[var(--muted-foreground)]">
              No Witness Ledger claims recorded for the selected epistemic filter.
            </p>
          ) : (
            <div className="space-y-2">
              {claims.map((claim) => {
                const isBusy = busyClaimId === claim.id;
                const isSelected = selectedLineage?.claim.id === claim.id;
                return (
                  <article
                    key={claim.id}
                    className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--background)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{claim.epistemic_type.toUpperCase()}</Badge>
                        <Badge variant="outline">{claim.status.toUpperCase()}</Badge>
                      </div>
                      <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                        {claim.source_count ?? 0} SRC · {claim.revision_count ?? 0} REV ·{" "}
                        {claim.relation_count ?? 0} REL
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--card-foreground)]">
                      {claim.statement}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => void onSelectLineage(claim.id)}
                      >
                        <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                        Inspect Lineage
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy || (claim.source_count ?? 0) === 0}
                        onClick={() => void onVerifyAction(claim.id, "verify")}
                      >
                        Verify
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => void onVerifyAction(claim.id, "dispute")}
                      >
                        Dispute
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {(lineageLoading || selectedLineage) && (
        <Card>
          <CardHeader>
            <CardTitle className="font-brush text-lg">CLAIM PROVENANCE LINEAGE</CardTitle>
            <CardDescription>
              {selectedLineage?.claim.statement ?? "Loading claim lineage…"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {lineageLoading && (
              <p className="font-mono text-[var(--muted-foreground)]">
                Tracing sources, immutable revisions, and claim relations…
              </p>
            )}
            {!lineageLoading && selectedLineage && (
              <>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    Sources ({selectedLineage.sources.length})
                  </p>
                  {selectedLineage.sources.length === 0 ? (
                    <p className="mt-1 text-[var(--muted-foreground)]">No source excerpts bound.</p>
                  ) : (
                    selectedLineage.sources.map((src) => (
                      <div
                        key={src.id}
                        className="mt-1 border border-[var(--border)] bg-[var(--background)] p-2 font-mono"
                      >
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          {src.archive_id} / {src.message_id} · sha256:
                          {src.source_sha256.slice(0, 12)}
                        </p>
                        <p className="mt-1 text-[var(--card-foreground)]">{src.excerpt}</p>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    Revisions ({selectedLineage.revisions.length})
                  </p>
                  {selectedLineage.revisions.length === 0 ? (
                    <p className="mt-1 text-[var(--muted-foreground)]">Original revision only.</p>
                  ) : (
                    selectedLineage.revisions.map((rev) => (
                      <div
                        key={rev.id}
                        className="mt-1 border border-[var(--border)] bg-[var(--background)] p-2 font-mono"
                      >
                        REV #{rev.revision_no} · {rev.reason}
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    Relations ({selectedLineage.relations.length})
                  </p>
                  {selectedLineage.relations.length === 0 ? (
                    <p className="mt-1 text-[var(--muted-foreground)]">No inter-claim links.</p>
                  ) : (
                    selectedLineage.relations.map((rel) => (
                      <div
                        key={rel.id}
                        className="mt-1 border border-[var(--border)] bg-[var(--background)] p-2 font-mono"
                      >
                        {rel.direction.toUpperCase()} {rel.relation_type.toUpperCase()} →{" "}
                        {rel.related_claim?.statement ?? rel.target_claim_id}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
