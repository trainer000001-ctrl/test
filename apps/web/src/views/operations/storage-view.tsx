"use client";

import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";

export function StorageView({ prefix = "" }: { prefix?: string }) {
  return (
    <div className="space-y-4 px-4 py-6 sm:px-8">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">S3 COMPATIBLE VAULT · LIVE ORM</Badge>
          <CardTitle className="mt-2 font-brush text-2xl">OBJECT STORAGE</CardTitle>
          <CardDescription>
            Immutable corpora snapshots, artwork plates, and archive bundles managed via <code>storage.object</code>.
          </CardDescription>
        </CardHeader>
      </Card>
      <AutoModelConsole model="storage.object" searchQuery={prefix} title="Vault Objects" />
    </div>
  );
}
export default StorageView;
