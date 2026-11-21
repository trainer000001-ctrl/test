import { Suspense } from "react";
import { Dock } from "@/components/dock";

export default function CalendarTimelineAppPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <Dock />
    </Suspense>
  );
}
