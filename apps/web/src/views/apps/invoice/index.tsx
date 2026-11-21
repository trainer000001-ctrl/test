"use client";

import { useEffect, useState, type FormEvent } from "react";
import { requestApiJson } from "@moonwitness/contracts/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CutoutArtwork,
  Input,
  SkinOrnament,
} from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";
import { useTranslation } from "@/hocs/TranslationWrapper";

interface AccountSummaryPayload {
  accounts?: number;
  journals?: number;
  moves?: number;
  byState?: Array<{ move_state?: string; count?: number }>;
}

export function InvoiceLedgerView() {
  const { dictionary } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeModel, setActiveModel] = useState<
    "account.move" | "account.account" | "account.journal"
  >("account.move");
  const [summary, setSummary] = useState<AccountSummaryPayload | null>(null);
  const [moveRef, setMoveRef] = useState("INV-2026-001");
  const [debitAccount, setDebitAccount] = useState("1010");
  const [creditAccount, setCreditAccount] = useState("4000");
  const [amount, setAmount] = useState("2500");
  const [reverseMoveKey, setReverseMoveKey] = useState("");
  const [ledgerNotice, setLedgerNotice] = useState<string | null>(null);

  async function loadSummary() {
    const res = await requestApiJson<AccountSummaryPayload>("/api/v1/account/summary").catch(
      () => null,
    );
    if (res) setSummary(res);
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  async function handlePostEntry(e: FormEvent) {
    e.preventDefault();
    setLedgerNotice(null);
    const numericAmount = Number(amount) || 0;
    const trimmedKey = moveRef.trim() || `INV-${Date.now()}`;
    try {
      await requestApiJson("/api/v1/account/ledger/post", {
        method: "POST",
        body: JSON.stringify({
          move_key: trimmedKey,
          journal_code: "GEN",
          move_date: new Date().toISOString().slice(0, 10),
          currency_code: "IDR",
          idempotency_key: `web-${trimmedKey}-${Date.now()}`,
          lines: [
            {
              account_code: debitAccount.trim(),
              debit: numericAmount,
              credit: 0,
              description: `Debit ${trimmedKey}`,
            },
            {
              account_code: creditAccount.trim(),
              debit: 0,
              credit: numericAmount,
              description: `Credit ${trimmedKey}`,
            },
          ],
        }),
      });
      setLedgerNotice(`Posted balanced journal move ${trimmedKey} (${numericAmount}).`);
      await loadSummary();
    } catch (err) {
      setLedgerNotice(err instanceof Error ? err.message : "Failed to post journal entry.");
    }
  }

  async function handleReverseEntry(e: FormEvent) {
    e.preventDefault();
    const targetKey = reverseMoveKey.trim();
    if (!targetKey) return;
    setLedgerNotice(null);
    try {
      await requestApiJson("/api/v1/account/ledger/reverse", {
        method: "POST",
        body: JSON.stringify({
          move_key: targetKey,
          reversal_key: `${targetKey}-REV-${Date.now()}`,
        }),
      });
      setLedgerNotice(`Reversed journal move ${targetKey}.`);
      setReverseMoveKey("");
      await loadSummary();
    } catch (err) {
      setLedgerNotice(err instanceof Error ? err.message : "Failed to reverse journal move.");
    }
  }

  const byState = Array.isArray(summary?.byState) ? summary.byState : [];
  const postedMoves = Number(byState.find((s) => s.move_state === "posted")?.count ?? 0);

  return (
    <ConsoleShellAdapter
      breadcrumb={dictionary.navigation.invoice}
      plane="creator"
      activeOverride="invoice"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: dictionary.shell.searchPlaceholder,
      }}
    >
      <div className="space-y-4">
        <Card className="relative overflow-hidden">
          <SkinOrnament slot="corner" className="start-2 top-2" />
          <CutoutArtwork
            id="codex-scroll"
            decorative
            className="pointer-events-none absolute -top-2 hidden h-24 w-24 opacity-20 sm:block ltr:-right-4 rtl:-left-4"
          />
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">DOUBLE-ENTRY LEDGER</Badge>
              <Badge variant="default">EXACTLEDGER SHA-256</Badge>
            </div>
            <h1 className="font-semibold leading-none tracking-tight text-lg uppercase">
              {dictionary.apps.invoiceTitle}
            </h1>
            <CardDescription>{dictionary.apps.invoiceSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="font-mono text-[10px] text-[var(--muted-foreground)]">ACCOUNTS</div>
                <div className="mt-1 font-brush text-2xl">{summary?.accounts ?? 0}</div>
              </div>
              <div className="border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="font-mono text-[10px] text-[var(--muted-foreground)]">JOURNALS</div>
                <div className="mt-1 font-brush text-2xl">{summary?.journals ?? 0}</div>
              </div>
              <div className="border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="font-mono text-[10px] text-[var(--muted-foreground)]">
                  TOTAL MOVES
                </div>
                <div className="mt-1 font-brush text-2xl">{summary?.moves ?? 0}</div>
              </div>
              <div className="border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="font-mono text-[10px] text-[var(--muted-foreground)]">
                  POSTED MOVES
                </div>
                <div className="mt-1 font-brush text-2xl">{postedMoves}</div>
              </div>
            </div>

            <form
              onSubmit={(e) => void handlePostEntry(e)}
              className="grid grid-cols-1 gap-2 border border-[var(--border)] bg-[var(--background)] p-3 sm:grid-cols-5"
            >
              <Input
                value={moveRef}
                onChange={(e) => setMoveRef(e.target.value)}
                placeholder="Move Key"
                aria-label="Journal Reference"
              />
              <Input
                value={debitAccount}
                onChange={(e) => setDebitAccount(e.target.value)}
                placeholder="Debit Account"
                aria-label="Debit Account"
              />
              <Input
                value={creditAccount}
                onChange={(e) => setCreditAccount(e.target.value)}
                placeholder="Credit Account"
                aria-label="Credit Account"
              />
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                aria-label="Journal Amount"
              />
              <Button type="submit" size="sm">
                Post Balanced Entry
              </Button>
            </form>

            <form
              onSubmit={(e) => void handleReverseEntry(e)}
              className="flex flex-wrap items-center gap-2 border border-[var(--border)] bg-[var(--background)] p-3"
            >
              <Input
                value={reverseMoveKey}
                onChange={(e) => setReverseMoveKey(e.target.value)}
                placeholder="Move key to reverse…"
                aria-label="Move key to reverse"
                className="max-w-xs"
              />
              <Button type="submit" size="sm" variant="outline" disabled={!reverseMoveKey.trim()}>
                Reverse Posted Move
              </Button>
            </form>
            {ledgerNotice ? (
              <div className="font-mono text-xs text-[var(--primary)]">{ledgerNotice}</div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "account.move", label: "Journal Entries (account.move)" },
              { id: "account.account", label: "Chart of Accounts (account.account)" },
              { id: "account.journal", label: "Journals (account.journal)" },
            ] as const
          ).map((m) => (
            <Button
              key={m.id}
              type="button"
              size="sm"
              variant={activeModel === m.id ? "default" : "outline"}
              onClick={() => setActiveModel(m.id)}
            >
              {m.label}
            </Button>
          ))}
        </div>

        <AutoModelConsole
          model={activeModel}
          searchQuery={search}
          domainIcon="account"
          cutoutId="codex-scroll"
        />
      </div>
    </ConsoleShellAdapter>
  );
}
export default InvoiceLedgerView;
