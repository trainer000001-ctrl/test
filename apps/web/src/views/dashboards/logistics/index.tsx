"use client";

import { useState } from "react";
import { Badge, Card, CardDescription, CardHeader, CardTitle, StatBlock } from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";

export function LogisticsDashboardView() {
  const [search, setSearch] = useState("");
  return (
    <ConsoleShellAdapter
      plane="creator"
      breadcrumb="Logistics"
      activeOverride="logistics"
      search={{ value: search, onChange: setSearch, placeholder: "Filter shipments and nodes…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">DISPATCH LOGISTICS</Badge>
            <CardTitle className="mt-2 font-brush text-2xl">ARCHIVE &amp; RELAY LOGISTICS</CardTitle>
            <CardDescription>Monitor physical print editions, relay kits, and meridian equipment.</CardDescription>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatBlock label="RELAY KITS" value="14" note="Operational" />
          <StatBlock label="FOLIO DISPATCHES" value="37" note="World Patch Prints" />
          <StatBlock label="TRANSIT STATUS" value="NOMINAL" note="Zero drift" />
        </div>
        <AutoModelConsole model="logistics.dispatch" searchQuery={search} title="Dispatch Manifest" />
      </div>
    </ConsoleShellAdapter>
  );
}
export default LogisticsDashboardView;
