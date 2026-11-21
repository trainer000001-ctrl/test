import { Suspense } from "react";
import { ControlCenter } from "@/components/control";

export const metadata = {
  title: "ARSY Control Plane — MoonWitness Operations",
  description: "Observe host telemetry, systemd/docker units, certificates, and audit state.",
};

export default function ControlPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--primary)]">
          CONNECTING ARSY CONTROL PLANE…
        </div>
      }
    >
      <ControlCenter />
    </Suspense>
  );
}
