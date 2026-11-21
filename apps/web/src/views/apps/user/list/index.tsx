"use client";

import { useState, type FormEvent } from "react";
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
  NativeSelect,
} from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";
import { useCurrentIdentity } from "@/lib/session";

export function UserListView() {
  const session = useCurrentIdentity();
  const isAdmin = session?.role === "admin";
  const [search, setSearch] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleProvision(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await requestApiJson("/api/v1/auth/register", {
        method: "POST",
        headers: { "x-requested-with": "XMLHttpRequest" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          displayName: displayName.trim() || username.trim(),
          role,
          password,
        }),
      });
      setNotice(`Provisioned operator '${username.trim()}' (${role}) with scrypt password hash.`);
      setUsername("");
      setEmail("");
      setDisplayName("");
      setPassword("");
      setProvisionOpen(false);
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to provision operator.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConsoleShellAdapter
      plane="creator"
      breadcrumb="Users"
      activeOverride="users"
      search={{ value: search, onChange: setSearch, placeholder: "Filter witnesses and crew…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="w-fit">CREW &amp; PRINCIPALS · LIVE ORM</Badge>
              <CardTitle className="mt-2 font-brush text-2xl">WITNESS DIRECTORY</CardTitle>
              <CardDescription>
                Manage authenticated operators in <code>auth.user</code> with scrypt password hashing and RBAC roles.
              </CardDescription>
            </div>
            {isAdmin ? (
              <Button
                type="button"
                size="sm"
                variant={provisionOpen ? "outline" : "default"}
                onClick={() => {
                  setProvisionOpen((v) => !v);
                  setError(null);
                }}
              >
                {provisionOpen ? "Close Form" : "+ Provision Operator"}
              </Button>
            ) : null}
          </CardHeader>
          {notice ? (
            <CardContent className="pt-0">
              <div
                role="status"
                className="border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-3 py-2 font-mono text-xs text-[var(--primary)]"
              >
                {notice}
              </div>
            </CardContent>
          ) : null}
        </Card>

        {provisionOpen && isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Provision New Operator Account</CardTitle>
              <CardDescription>
                Submits to <code>POST /api/v1/auth/register</code> — password is salted and hashed server-side via scrypt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void handleProvision(e)} className="grid gap-3 sm:grid-cols-2">
                {error ? (
                  <div
                    role="alert"
                    className="sm:col-span-2 border border-[var(--destructive)] bg-[var(--destructive)]/10 px-3 py-2 font-mono text-xs text-[var(--destructive)]"
                  >
                    {error}
                  </div>
                ) : null}
                <label className="space-y-1 text-xs">
                  <span className="font-mono uppercase text-[var(--muted-foreground)]">Username</span>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="chronicle-lead"
                    required
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-mono uppercase text-[var(--muted-foreground)]">Email</span>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="lead@moonwitness.local"
                    required
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-mono uppercase text-[var(--muted-foreground)]">Display Name</span>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Chronicle Lead"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-mono uppercase text-[var(--muted-foreground)]">Role</span>
                  <NativeSelect
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "editor" | "viewer")}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </NativeSelect>
                </label>
                <label className="space-y-1 text-xs sm:col-span-2">
                  <span className="font-mono uppercase text-[var(--muted-foreground)]">
                    Initial Password (min 8 chars)
                  </span>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    minLength={8}
                    required
                  />
                </label>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Provisioning…" : "Create Operator"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <AutoModelConsole
          model="auth.user"
          searchQuery={search}
          title="Registered Operators"
          refreshNonce={refreshNonce}
        />
      </div>
    </ConsoleShellAdapter>
  );
}
export default UserListView;
