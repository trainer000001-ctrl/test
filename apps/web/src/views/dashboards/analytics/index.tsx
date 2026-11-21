"use client";

import { useState } from "react";
import { BarChart, Card, CardContent, CardDescription, CardHeader, CardTitle, StatBlock } from "@moonwitness/ui";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";

export function AnalyticsDashboardView() {
  const [search, setSearch] = useState("");
  return (
    <ConsoleShellAdapter
      plane="creator"
      breadcrumb="Analytics"
      activeOverride="analytics"
      search={{ value: search, onChange: setSearch, placeholder: "Filter metrics…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatBlock label="SCRIPTURE VERSES" value="18,384" note="4 Primary Corpora" />
          <StatBlock label="CANON DOORS" value="4" note="99 Slots + 25 Amanah" />
          <StatBlock label="DNA WORLDS" value="7" note="WCAG 2.1 AA Audited" />
          <StatBlock label="EMPIRE WORLDS" value="9" note="Sanctuary Atlas" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-brush text-2xl">ECOSYSTEM COVERAGE</CardTitle>
            <CardDescription>Distribution across scripture corpora, codex registries, and runtime modules.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              height={140}
              data={[
                { label: "QURAN", value: 94, colorVar: "var(--primary)" },
                { label: "TAURAT", value: 88, colorVar: "var(--accent)" },
                { label: "ZABUR", value: 76, colorVar: "var(--green)" },
                { label: "INJIL", value: 82, colorVar: "var(--pink)" },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </ConsoleShellAdapter>
  );
}
export default AnalyticsDashboardView;
