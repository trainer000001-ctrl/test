"use client";

import { useState } from "react";
import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";

export function PermissionsView() {
  const [search, setSearch] = useState("");
  return (
    <ConsoleShellAdapter
      plane="creator"
      breadcrumb="Permissions"
      activeOverride="permissions"
      search={{ value: search, onChange: setSearch, placeholder: "Filter RBAC policies…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">RBAC MATRIX · LIVE ORM</Badge>
            <CardTitle className="mt-2 font-brush text-2xl">PERMISSIONS &amp; ACL</CardTitle>
            <CardDescription>
              Capability scopes and model ACL rules stored in <code>res.permission</code> and enforced across Sanctuary, Chronicle, and Operations.
            </CardDescription>
          </CardHeader>
        </Card>
        <AutoModelConsole model="res.permission" searchQuery={search} title="ACL Rules & Scopes" />
      </div>
    </ConsoleShellAdapter>
  );
}
export default PermissionsView;
