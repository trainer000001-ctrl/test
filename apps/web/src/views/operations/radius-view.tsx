"use client";

import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";

export function RadiusView({ query = "" }: { query?: string }) {
  return (
    <div className="space-y-4 px-4 py-6 sm:px-8">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">AAA GATEWAY · LIVE ORM</Badge>
          <CardTitle className="mt-2 font-brush text-2xl">RADIUS AUTHENTICATION</CardTitle>
          <CardDescription>
            Live NAS client sessions, EAP outcomes, and latency records backed by <code>radius.session</code>.
          </CardDescription>
        </CardHeader>
      </Card>
      <AutoModelConsole model="radius.session" searchQuery={query} title="RADIUS Auth Sessions" />
    </div>
  );
}
export default RadiusView;
