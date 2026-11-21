"use client";

import type { ReactNode } from "react";
import { AuthRedirect } from "@/components/AuthRedirect";
import type { Locale } from "@/configs/i18n";
import { hasRequiredRole, type RoleName } from "@/configs/routePolicy";
import { useCurrentSessionState } from "@/lib/session";
import { NotAuthorizedView } from "@/views/NotAuthorized";

export function AuthGuard({
  children,
  locale,
  enforceRedirect = true,
  minRole,
}: {
  children: ReactNode;
  locale?: Locale;
  enforceRedirect?: boolean;
  minRole?: RoleName;
}) {
  const { session, loading } = useCurrentSessionState();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-xs text-[var(--muted-foreground)]">
        VERIFYING SOVEREIGN SESSION…
      </div>
    );
  }

  if (!session) {
    if (!enforceRedirect) {
      return <>{children}</>;
    }
    return <AuthRedirect lang={locale} />;
  }

  if (minRole && !hasRequiredRole(session.role, minRole)) {
    return <NotAuthorizedView requiredRole={minRole} />;
  }

  return <>{children}</>;
}
export default AuthGuard;
