"use client";

import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";

export function SyslogView({ externalQuery = "" }: { externalQuery?: string }) {
  return (
    <div className="space-y-4 px-4 py-6 sm:px-8">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">SYSLOG STREAM · LIVE ORM</Badge>
          <CardTitle className="mt-2 font-brush text-2xl">SYSLOG EXPLORER</CardTitle>
          <CardDescription>
            Structured operational logs backed by <code>syslog.entry</code> with severity filtering and Studio layout customization.
          </CardDescription>
        </CardHeader>
      </Card>
      <AutoModelConsole
        model="syslog.entry"
        searchQuery={externalQuery}
        title="Structured Syslog Entries"
      />
    </div>
  );
}
export default SyslogView;
