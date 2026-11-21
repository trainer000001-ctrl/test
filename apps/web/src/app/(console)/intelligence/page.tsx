import { Suspense } from "react";
import { IntelligenceShell } from "./intelligence-shell";

export const metadata = { title: "RIOT Intelligence — Local Inference" };

export default function IntelligencePage() {
  return (
    <Suspense
      fallback={
        <h1 className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--primary)]">
          INITIALIZING RIOT INTELLIGENCE…
        </h1>
      }
    >
      <IntelligenceShell />
    </Suspense>
  );
}
