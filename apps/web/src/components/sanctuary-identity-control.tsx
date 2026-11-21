"use client";

import { useEffect, useState } from "react";
import { DnaButton } from "@moonwitness/ui/imperium";
import {
  SANCTUARY_MID_AUTH_EVENT,
  clearSanctuaryMidSession,
  getStoredSanctuaryMidSession,
  startSanctuaryMidLogin,
  type SanctuaryMidSession,
} from "@/lib/mid-oidc";
import { useSanctuaryLocale } from "@/lib/sanctuary-locale";

export function SanctuaryIdentityControl({ compact = false }: { readonly compact?: boolean }) {
  const { locale } = useSanctuaryLocale();
  const [session, setSession] = useState<SanctuaryMidSession | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setSession(getStoredSanctuaryMidSession());
    sync();
    window.addEventListener(SANCTUARY_MID_AUTH_EVENT, sync);
    return () => window.removeEventListener(SANCTUARY_MID_AUTH_EVENT, sync);
  }, []);

  if (session) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <span
          className="inline-flex items-center border border-[var(--dna-accent)]/45 bg-[var(--dna-accent)]/12 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-[var(--dna-accent)] uppercase"
          title={`${session.displayName} (${session.role})`}
        >
          @{session.username}
        </span>
        <DnaButton
          type="button"
          tone="secondary"
          onClick={() => {
            setBusy(true);
            void clearSanctuaryMidSession().finally(() => setBusy(false));
          }}
          disabled={busy}
          className="min-h-0 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.16em] text-[var(--dna-muted)] hover:text-[var(--dna-text)] uppercase"
        >
          {locale === "id" ? "KELUAR" : "SIGN OUT"}
        </DnaButton>
      </div>
    );
  }

  return (
    <DnaButton
      type="button"
      tone="secondary"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        const currentPath =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/";
        void startSanctuaryMidLogin(currentPath).catch(() => setBusy(false));
      }}
      className={`min-h-0 inline-flex items-center font-mono tracking-[0.16em] text-[var(--dna-accent)] uppercase ${
        compact ? "px-3 py-2 text-[11px]" : "px-3 py-1.5 text-[10px]"
      }`}
    >
      {busy
        ? locale === "id"
          ? "MENGHUBUNGKAN…"
          : "CONNECTING…"
        : locale === "id"
          ? "MASUK · ID"
          : "SIGN IN · ID"}
    </DnaButton>
  );
}
