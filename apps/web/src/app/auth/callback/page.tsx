"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ZineButton } from "@moonwitness/ui";
import { OctagramMandalaIcon } from "@/components/sacred-icons";
import { completeMidCallback, completeSanctuaryMidCallback } from "@/lib/mid-oidc";
import { notifySessionChange } from "@/lib/session";

const SANCTUARY_PKCE_KEY = "allah_sanctuary_mid_pkce_v1";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSanctuaryFlow, setIsSanctuaryFlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(searchParams.toString());
    const hasSanctuaryPkce = (() => {
      try {
        return Boolean(window.sessionStorage.getItem(SANCTUARY_PKCE_KEY));
      } catch {
        return false;
      }
    })();

    setIsSanctuaryFlow(hasSanctuaryPkce);

    if (hasSanctuaryPkce) {
      completeSanctuaryMidCallback(params)
        .then(({ nextPath }) => {
          if (cancelled) return;
          router.replace(nextPath);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setErrorMessage(
            err instanceof Error ? err.message : "MoonWitness ID verification failed.",
          );
        });
    } else {
      completeMidCallback(params)
        .then((nextPath) => {
          if (cancelled) return;
          notifySessionChange();
          router.replace(nextPath);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setErrorMessage(err instanceof Error ? err.message : "Authentication callback failed.");
        });
    }

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
      <div className="w-full max-w-md border-2 border-[var(--border)] bg-[var(--card)] p-8 text-[var(--card-foreground)] shadow-[6px_6px_0_var(--ring)]">
        <div className="flex items-center gap-3">
          {isSanctuaryFlow ? <OctagramMandalaIcon className="h-8 w-8 shrink-0" /> : null}
          <p className="font-mono text-xs tracking-[0.22em] text-[var(--primary)] uppercase">
            {isSanctuaryFlow ? "MOONWITNESS ID // SANCTUARY PKCE" : "MOONWITNESS ID // PKCE"}
          </p>
        </div>
        <h1 className="mt-3 font-brush text-3xl text-[var(--foreground)]">
          {errorMessage ? "SSO AUTHENTICATION FAILED" : "VERIFYING IDENTITY…"}
        </h1>
        {errorMessage ? (
          <>
            <p role="alert" className="mt-3 text-sm text-[var(--destructive)]">
              {errorMessage}
            </p>
            <ZineButton asChild className="mt-6 inline-flex items-center px-4 py-2 text-sm">
              <Link href={isSanctuaryFlow ? "/" : "/shadow"}>
                {isSanctuaryFlow ? "RETURN TO GATE" : "RETURN TO SIGN IN"}
              </Link>
            </ZineButton>
          </>
        ) : (
          <p className="mt-3 font-mono text-xs text-[var(--muted-foreground)]">
            Exchanging authorization code with id.moonwitness.biz.id…
          </p>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--background)] font-mono text-xs text-[var(--muted-foreground)]">
          VERIFYING IDENTITY…
        </main>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
