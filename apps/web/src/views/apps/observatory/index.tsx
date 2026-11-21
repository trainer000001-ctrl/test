"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";

export function ObservatoryAppView() {
  const [search, setSearch] = useState("");
  return (
    <ConsoleShellAdapter
      plane="creator"
      breadcrumb="Observatory"
      activeOverride="observatory"
      search={{ value: search, onChange: setSearch, placeholder: "Filter meridian observations…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="outline">M-TIME · LUNAR HORIZON</Badge>
              <CardTitle className="mt-2 font-brush text-2xl">MERIDIAN OBSERVATORY</CardTitle>
              <CardDescription>Sightings, conjunction geometry, and horizon evidence records.</CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href="/mtime">Open Public M-Time Observatory →</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3 font-mono text-xs">
            <div className="border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="text-[10px] text-[var(--muted-foreground)]">CRITERION</div>
              <div className="mt-1 font-bold text-[var(--primary)]">MABIMS_ID_2026</div>
            </div>
            <div className="border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="text-[10px] text-[var(--muted-foreground)]">ELONGATION BASIS</div>
              <div className="mt-1 font-bold">GEOCENTRIC_TRUE</div>
            </div>
            <div className="border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="text-[10px] text-[var(--muted-foreground)]">REFERENCE CORRIDOR</div>
              <div className="mt-1 font-bold">Jakarta · Makkah · Rabat</div>
            </div>
          </CardContent>
        </Card>
        <AutoModelConsole model="observatory.sighting" searchQuery={search} title="Sighting Log" />
      </div>
    </ConsoleShellAdapter>
  );
}
export default ObservatoryAppView;
