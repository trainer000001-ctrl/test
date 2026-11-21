import type { QuickAction } from "@moonwitness/contracts/types";
import { QuickActionGrid } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export interface QuickActionsProps {
  actions: QuickAction[];
  onAction: (action: QuickAction) => void;
}

export function QuickActions({ actions, onAction }: QuickActionsProps) {
  return (
    <section aria-labelledby="cc-quick-heading" className="flex h-full flex-col scroll-mt-24">
      <SectionHeading id="cc-quick-heading" title="QUICK" accent="ACTIONS" />
      <div className="flex-1">
        <QuickActionGrid actions={actions} onAction={onAction} />
      </div>
    </section>
  );
}
