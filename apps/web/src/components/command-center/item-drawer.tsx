"use client";

import { useState } from "react";
import type { ArtKey } from "@moonwitness/contracts/types";
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, ZineImage } from "@moonwitness/ui";

export interface ItemDrawerDetail {
  title: string;
  subtitle: string;
  art?: ArtKey;
  rows: { label: string; value: string }[];
}

export interface ItemDrawerProps {
  detail: ItemDrawerDetail;
  onClose: () => void;
}

export function ItemDrawer({ detail, onClose }: ItemDrawerProps) {
  const [openerEl] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null,
  );

  function handleClose() {
    onClose();
    queueMicrotask(() => {
      openerEl?.focus();
    });
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <SheetContent
        side="right"
        hideClose
        aria-describedby={undefined}
        className="w-full max-w-md sm:max-w-md overflow-y-auto p-6"
      >
        <SheetHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <p className="text-[10px] tracking-wider text-[var(--muted-foreground)]">
              {detail.subtitle.toUpperCase()}
            </p>
            <SheetTitle className="font-brush mt-1 text-3xl leading-tight text-[var(--card-foreground)]">
              {detail.title}
              <span className="sr-only"> detail</span>
            </SheetTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            aria-label="Close detail"
            className="min-h-11 min-w-11 shrink-0 p-2"
          >
            ✕
          </Button>
        </SheetHeader>
        {detail.art && (
          <div className="relative mt-4 h-40 overflow-hidden rounded-md border-2 border-[var(--border)]">
            <ZineImage art={detail.art} sizes="(max-width: 768px) 100vw, 448px" />
          </div>
        )}
        <dl className="mt-5 divide-y divide-[var(--line)]">
          {detail.rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[10px] tracking-wider text-[var(--muted-foreground)]">
                {row.label.toUpperCase()}
              </dt>
              <dd className="min-w-0 truncate text-right text-xs text-[var(--foreground)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </SheetContent>
    </Sheet>
  );
}
