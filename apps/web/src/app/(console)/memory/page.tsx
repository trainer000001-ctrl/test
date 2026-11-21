import { Suspense } from "react";
import { MemoryWorkspace } from "@/components/memory";

export const metadata = {
  title: "Memory Vault — MoonWitness",
  description: "Search chat archive exports, verify provenance, and monitor extraction jobs.",
};

export default function MemoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--primary)]">
          LOADING MEMORY VAULT…
        </div>
      }
    >
      <MemoryWorkspace />
    </Suspense>
  );
}
