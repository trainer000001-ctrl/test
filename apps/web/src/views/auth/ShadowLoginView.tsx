"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestApiJson } from "@moonwitness/contracts/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@moonwitness/ui";
import { clearExplicitLogout, markExplicitLogout, useCurrentIdentity } from "@/lib/session";

interface AuthStatusResponse {
  needsBootstrap: boolean;
  envManaged: boolean;
  authenticated: boolean;
  sessionBacked: boolean;
}

export function ShadowPageView() {
  const router = useRouter();
  const currentSession = useCurrentIdentity();
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [mode, setMode] = useState<"login" | "bootstrap">("login");

  // Login fields
  const [identity, setIdentity] = useState("");
  const [passphrase, setPassphrase] = useState("");

  // Initial admin claim fields
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminEmail, setAdminEmail] = useState("admin@moonwitness.local");
  const [adminDisplayName, setAdminDisplayName] = useState("Sovereign Admin");
  const [adminPassword, setAdminPassword] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadAuthStatus() {
    try {
      const res = await requestApiJson<AuthStatusResponse>("/api/v1/auth/status");
      setAuthStatus(res);
      setMode(res.needsBootstrap ? "bootstrap" : "login");
    } catch {
      setAuthStatus(null);
    }
  }

  useEffect(() => {
    void loadAuthStatus();
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      await requestApiJson("/api/v1/auth/login", {
        method: "POST",
        headers: { "x-requested-with": "XMLHttpRequest" },
        body: JSON.stringify({
          identity: identity.trim(),
          password: passphrase,
        }),
      });
      clearExplicitLogout();
      setStatus("Authenticated. Entering Control Plane…");
      router.push("/control");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid operator credentials.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBootstrap(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (adminPassword.length < 8) {
      setError("Admin passphrase must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await requestApiJson("/api/v1/auth/bootstrap", {
        method: "POST",
        headers: { "x-requested-with": "XMLHttpRequest" },
        body: JSON.stringify({
          username: adminUsername.trim(),
          email: adminEmail.trim(),
          displayName: adminDisplayName.trim() || "Sovereign Admin",
          password: adminPassword,
        }),
      });
      clearExplicitLogout();
      setStatus("Initial Sovereign Admin claimed and signed in. Redirecting…");
      await loadAuthStatus();
      router.push("/control");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to claim initial admin account.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      await requestApiJson("/api/v1/auth/logout", {
        method: "POST",
        headers: { "x-requested-with": "XMLHttpRequest" },
      });
      markExplicitLogout();
      setStatus("Signed out cleanly. Session cookie revoked.");
      await loadAuthStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12 text-[var(--foreground)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="w-fit">
              MOONID · SHADOW GATE
            </Badge>
            {authStatus?.sessionBacked ? (
              <Badge variant="default">COOKIE SESSION ACTIVE</Badge>
            ) : authStatus?.needsBootstrap ? (
              <Badge variant="secondary">FIRST-RUN SETUP</Badge>
            ) : null}
          </div>
          <CardTitle className="mt-2 font-brush text-3xl">
            {mode === "bootstrap" ? "CLAIM SOVEREIGN ADMIN" : "OPERATOR SIGN IN"}
          </CardTitle>
          <CardDescription>
            {mode === "bootstrap"
              ? "No admin account has been claimed yet. Establish the initial scrypt-protected Sovereign Admin account."
              : "Authenticate with your MoonWitness operator identity using HttpOnly session cookies."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentSession && authStatus?.sessionBacked ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--primary)]/40 bg-[var(--primary)]/10 p-3 font-mono text-xs">
              <div>
                <div className="font-bold text-[var(--foreground)]">
                  Signed in as {currentSession.identity}
                </div>
                <div className="text-[10px] uppercase text-[var(--muted-foreground)]">
                  Role: {currentSession.role}
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleSignOut()}>
                Sign Out
              </Button>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="border border-[var(--destructive)]/60 bg-[var(--destructive)]/10 p-2.5 font-mono text-xs text-[var(--destructive)]"
            >
              {error}
            </div>
          ) : null}

          {status ? (
            <div
              role="status"
              className="border border-[var(--primary)]/50 bg-[var(--primary)]/10 p-2.5 font-mono text-xs text-[var(--primary)]"
            >
              {status}
            </div>
          ) : null}

          {mode === "bootstrap" ? (
            <form onSubmit={(e) => void handleBootstrap(e)} className="space-y-3">
              <label className="block space-y-1 text-xs">
                <span className="font-mono uppercase text-[var(--muted-foreground)]">Admin Username</span>
                <Input
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span className="font-mono uppercase text-[var(--muted-foreground)]">Admin Email</span>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@moonwitness.local"
                  required
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span className="font-mono uppercase text-[var(--muted-foreground)]">Display Name</span>
                <Input
                  value={adminDisplayName}
                  onChange={(e) => setAdminDisplayName(e.target.value)}
                  placeholder="Sovereign Admin"
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span className="font-mono uppercase text-[var(--muted-foreground)]">
                  Passphrase (min 8 chars)
                </span>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  minLength={8}
                  required
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Claiming…" : "Claim Admin & Enter"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setMode("login")}>
                  Use Existing Account
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
              <label className="block space-y-1 text-xs">
                <span className="font-mono uppercase text-[var(--muted-foreground)]">
                  Username or Email
                </span>
                <Input
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="admin@moonwitness.local"
                  required
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span className="font-mono uppercase text-[var(--muted-foreground)]">Passphrase</span>
                <Input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Button type="submit" disabled={busy}>
                  {busy ? "Verifying…" : "Enter Control Plane"}
                </Button>
                <div className="flex items-center gap-2">
                  {authStatus?.needsBootstrap ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setMode("bootstrap")}>
                      Initial Setup
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <Link href="/">Return to Sanctuary</Link>
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default ShadowPageView;
