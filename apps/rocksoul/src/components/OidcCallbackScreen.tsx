import React, { useEffect, useRef, useState } from "react";
import { completeBrowserOidcCallback, type RocksoulOidcSession } from "../lib/mid-oidc";

export interface OidcCallbackScreenProps {
  search: string;
  onComplete: (session: RocksoulOidcSession, returnHash: string) => void;
  onReturnWorkbench: () => void;
}

export default function OidcCallbackScreen({
  search,
  onComplete,
  onReturnWorkbench,
}: OidcCallbackScreenProps) {
  const [callbackError, setCallbackError] = useState("");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let active = true;
    completeBrowserOidcCallback(new URLSearchParams(search))
      .then(({ session, returnHash }) => {
        if (active) onCompleteRef.current(session, returnHash);
      })
      .catch((authError: unknown) => {
        if (active) {
          setCallbackError(authError instanceof Error ? authError.message : String(authError));
        }
      });
    return () => {
      active = false;
    };
  }, [search]);

  return (
    <main className="app-shell riot-room-shell" style={{ display: "grid", placeItems: "center", padding: "24px" }}>
      <section className="issue-dialog" aria-live="polite">
        <header className="dialog-head">
          <div>
            <span className="eyebrow">MOONWITNESS ID // PKCE CALLBACK</span>
            <h2>{callbackError ? "SIGN-IN FAILED" : "VERIFYING IDENTITY"}</h2>
          </div>
        </header>
        {callbackError ? (
          <>
            <p className="global-error" role="alert" style={{ margin: "0 0 18px" }}>
              {callbackError}
            </p>
            <button type="button" className="riot-button" onClick={onReturnWorkbench}>
              RETURN TO WORKBENCH
            </button>
          </>
        ) : (
          <p style={{ font: "11px var(--mono)", color: "var(--color-paper-soft)", margin: 0 }}>
            Exchanging PKCE authorization code with MoonWitness ID…
          </p>
        )}
      </section>
    </main>
  );
}
