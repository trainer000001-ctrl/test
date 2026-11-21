import { Suspense } from "react";
import { ControlCenter } from "@/components/control";

export default function ControlAppPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <ControlCenter />
    </Suspense>
  );
}
