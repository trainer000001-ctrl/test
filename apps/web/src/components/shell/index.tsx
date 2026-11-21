"use client";

import type { ReactNode } from "react";
import { ConsoleShellAdapter } from "./console-shell-adapter";

export { OperationsShell } from "./operations-shell";

/** Creator-plane shell backed directly by @moonwitness/ui ConsoleShell. */
export function EmpireShell({
  breadcrumb,
  search,
  children,
}: {
  breadcrumb: string;
  search: { value: string; onChange: (v: string) => void; placeholder: string };
  children: ReactNode;
}) {
  return (
    <ConsoleShellAdapter plane="creator" breadcrumb={breadcrumb} search={search}>
      {children}
    </ConsoleShellAdapter>
  );
}
