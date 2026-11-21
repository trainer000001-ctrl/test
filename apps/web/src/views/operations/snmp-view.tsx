"use client";

import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";

export function SnmpView({ query = "" }: { query?: string }) {
  return (
    <div className="space-y-4 px-4 py-6 sm:px-8">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">SNMP POLLER · LIVE ORM</Badge>
          <CardTitle className="mt-2 font-brush text-2xl">SNMP TELEMETRY MONITOR</CardTitle>
          <CardDescription>
            Live MIB polling targets managed via <code>snmp.target</code> with search filters, pivot aggregation, and audit chatter.
          </CardDescription>
        </CardHeader>
      </Card>
      <AutoModelConsole model="snmp.target" searchQuery={query} title="SNMP Poll Targets" />
    </div>
  );
}
export default SnmpView;
