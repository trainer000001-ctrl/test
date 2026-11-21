"use client";

import { useState } from "react";
import { Badge, Card, CardDescription, CardHeader, CardTitle, StatBlock } from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";

export function CrmDashboardView() {
  const [search, setSearch] = useState("");
  return (
    <ConsoleShellAdapter
      plane="creator"
      breadcrumb="CRM"
      activeOverride="crm"
      search={{ value: search, onChange: setSearch, placeholder: "Filter stewards and partners…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">STEWARDSHIP CRM</Badge>
            <CardTitle className="mt-2 font-brush text-2xl">PARTNER &amp; COMMUNITY RELATIONS</CardTitle>
            <CardDescription>Coordinate research circles, translators, and sanctuary contributors.</CardDescription>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatBlock label="ACTIVE CIRCLES" value="9" note="Across 9 Worlds" />
          <StatBlock label="MERIDIAN NODES" value="5" note="Global Observatories" />
          <StatBlock label="OPEN INVITATIONS" value="12" note="Verified Amanah" />
        </div>
        <AutoModelConsole model="crm.lead" searchQuery={search} title="Stewardship Pipeline" />
      </div>
    </ConsoleShellAdapter>
  );
}
export default CrmDashboardView;
