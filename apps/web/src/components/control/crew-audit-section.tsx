"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Input, NativeSelect, ZineButton } from "@moonwitness/ui";
import {
  useAuditLogs,
  useCreateUser,
  useCurrentUser as useAppCurrentUser,
  useDeleteUser,
  useUpdateUserRole,
  useUsers,
} from "@/lib/api/auth";
import type { CrewRoleName } from "@/lib/roles";

export function CrewAndPlatformAuditSection() {
  const me = useAppCurrentUser();
  const isAdmin = me.data?.user.role === "admin";
  const usersQuery = useUsers(isAdmin);
  const auditQuery = useAuditLogs({ limit: 25 }, isAdmin);
  const createUserMutation = useCreateUser();
  const updateRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUser();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CrewRoleName>("editor");
  const [crewNotice, setCrewNotice] = useState<string | null>(null);

  if (!isAdmin) return null;

  const users = usersQuery.data?.users ?? [];
  const logs = auditQuery.data?.logs ?? [];

  function submitNewUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCrewNotice(null);
    createUserMutation.mutate(
      {
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        displayName: displayName.trim() || username.trim(),
        password,
        role,
      },
      {
        onSuccess: (res) => {
          setUsername("");
          setEmail("");
          setDisplayName("");
          setPassword("");
          setCrewNotice(`Created crew account @${res.user.username} (${res.user.role}).`);
        },
        onError: (err: Error) => setCrewNotice(err.message),
      },
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
              IDENTITY &amp; RBAC
            </p>
            <h2 className="font-brush text-2xl text-[var(--foreground)]">
              CREW &amp; ACCESS MANAGEMENT
            </h2>
          </div>
          <Badge>{users.length} crew</Badge>
        </div>

        {crewNotice && (
          <p className="mt-3 border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--primary)]">
            {crewNotice}
          </p>
        )}

        <form onSubmit={submitNewUser} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="min-h-10 border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
          />
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@moonwitness.org"
            className="min-h-10 border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
          />
          <Input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display Name"
            className="min-h-10 border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
          />
          <NativeSelect
            value={role}
            onChange={(e) => setRole(e.target.value as CrewRoleName)}
            className="min-h-10 border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)]"
          >
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </NativeSelect>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (12+ chars)"
            className="min-h-10 border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)] sm:col-span-2"
          />
          <ZineButton
            type="submit"
            tone="pink"
            disabled={createUserMutation.isPending}
            className="min-h-10 px-4 py-2 text-xs sm:col-span-2"
          >
            {createUserMutation.isPending ? "PROVISIONING…" : "+ ADD CREW MEMBER"}
          </ZineButton>
        </form>

        <div className="mt-4 divide-y divide-[var(--line)] border border-[var(--border)]">
          {users.map((crew) => {
            const isSelf = me.data?.user.id === crew.id;
            return (
              <div
                key={crew.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--foreground)]">
                    {crew.displayName}{" "}
                    <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                      @{crew.username}
                    </span>
                  </div>
                  <div className="truncate font-mono text-[10px] text-[var(--muted-foreground)]">
                    {crew.email}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <NativeSelect
                    aria-label={`Role for ${crew.username}`}
                    disabled={isSelf || updateRoleMutation.isPending}
                    value={crew.role}
                    onChange={(e) =>
                      updateRoleMutation.mutate(
                        { id: crew.id, role: e.target.value as CrewRoleName },
                        { onError: (err: Error) => setCrewNotice(err.message) },
                      )
                    }
                    className="min-h-9 border border-[var(--border)] bg-[var(--background)] px-2 font-mono text-[11px] text-[var(--foreground)] disabled:opacity-50"
                  >
                    <option value="viewer">viewer</option>
                    <option value="editor">editor</option>
                    <option value="admin">admin</option>
                  </NativeSelect>
                  {!isSelf && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deleteUserMutation.isPending}
                      onClick={() =>
                        deleteUserMutation.mutate(crew.id, {
                          onError: (err: Error) => setCrewNotice(err.message),
                        })
                      }
                      className="min-h-9 border-[var(--red)]/60 px-2 font-mono text-[10px] text-[var(--red)] hover:bg-[var(--red)]/10"
                    >
                      REMOVE
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
              OPS_AUDIT_LOGS
            </p>
            <h2 className="font-brush text-2xl text-[var(--foreground)]">PLATFORM AUDIT LOG</h2>
          </div>
          <Button
            type="button"
            variant="link"
            onClick={() => void auditQuery.refetch()}
            className="h-auto p-0 font-mono text-xs"
          >
            REFRESH
          </Button>
        </div>
        <div className="mt-4 max-h-96 divide-y divide-[var(--line)] overflow-y-auto border border-[var(--border)]">
          {logs.length === 0 ? (
            <p className="p-4 text-xs text-[var(--muted-foreground)]">
              No platform audit entries recorded yet.
            </p>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="space-y-0.5 px-3 py-2 font-mono text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--primary)]">
                    [{entry.domain}] {entry.action} · {entry.entity}
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {new Date(entry.occurredAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                  <span>id: {entry.entityId}</span>
                  <span>
                    actor: {entry.actorId ?? "system"} ({entry.outcome})
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
