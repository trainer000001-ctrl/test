"use client";

import type { ReactNode } from "react";
import { ConsoleShellAdapter } from "./console-shell-adapter";

/** Operations-plane shell backed directly by @moonwitness/ui ConsoleShell. */
export function OperationsShell({
  breadcrumb,
  search,
  children,
}: {
  breadcrumb: string;
  search: { value: string; onChange: (v: string) => void; placeholder: string };
  children: ReactNode;
}) {
  return (
    <ConsoleShellAdapter plane="operations" breadcrumb={breadcrumb} search={search}>
      {children}
    </ConsoleShellAdapter>
  );
}
