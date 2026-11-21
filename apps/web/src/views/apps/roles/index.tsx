"use client";

import { useState } from "react";
import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";

export function RolesView() {
  const [search, setSearch] = useState("");
  return (
    <ConsoleShellAdapter
      plane="creator"
      breadcrumb="Roles"
      activeOverride="roles"
      search={{ value: search, onChange: setSearch, placeholder: "Filter roles…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">IDENTITY ROLES · LIVE ORM</Badge>
            <CardTitle className="mt-2 font-brush text-2xl">ROLE DIRECTORY</CardTitle>
            <CardDescription>
              Live principal roles stored in <code>res.role</code> and bound to MoonWitness RBAC policies.
            </CardDescription>
          </CardHeader>
        </Card>
        <AutoModelConsole model="res.role" searchQuery={search} title="Role Definitions" />
      </div>
    </ConsoleShellAdapter>
  );
}
export default RolesView;
