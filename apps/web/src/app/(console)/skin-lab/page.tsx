import { Suspense } from "react";
import { SkinLaboratory } from "@/components/skin-lab/SkinLaboratory";

export const metadata = {
  title: "Skin Laboratory — Seven Master DNA Worlds",
};

export default function SkinLabPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--primary)]">
          CALIBRATING SKIN LABORATORY…
        </div>
      }
    >
      <SkinLaboratory />
    </Suspense>
  );
}
