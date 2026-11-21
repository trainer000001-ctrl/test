"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle, Input, ZineButton } from "@moonwitness/ui";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { buildArchiveSearchHref } from "./links";

export interface SearchDialogProps {
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function SearchDialog({ query, onQueryChange, onSubmit, onClose }: SearchDialogProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { dictionary, locale } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [openerEl] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null,
  );

  const searchDict = dictionary.chronicle?.search;
  const dialogTitle = searchDict?.dialogTitle ?? "Search the archive";
  const labelText = searchDict?.label ?? "SEARCH THE SIGNALS";
  const closeText = searchDict?.close ?? "Close search";
  const placeholderText = searchDict?.placeholder ?? "stories, signals, people, places…";
  const submitText = searchDict?.submit ?? "GO";
  const helperText = searchDict?.helper ?? "Searches the Dock timeline chronicle.";
  const actionHref = buildArchiveSearchHref(query, pathname, locale);

  function handleClose() {
    onClose();
    queueMicrotask(() => {
      openerEl?.focus();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    if (onSubmit) {
      onSubmit(e);
      return;
    }
    e.preventDefault();
    onClose();
    router.push(actionHref);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        hideClose
        aria-describedby={undefined}
        aria-label={dialogTitle}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        className="top-28 translate-y-0 max-w-xl p-5"
      >
        <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
        <form action={actionHref} onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-4">
            <label htmlFor="nav-search" className="font-brush text-lg text-[var(--yellow)]">
              {labelText}
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="min-h-11 px-3 text-sm"
            >
              {closeText}
            </Button>
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              ref={inputRef}
              id="nav-search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={placeholderText}
              className="rounded-md bg-[var(--background)] border-[var(--border)] px-4 py-3 text-sm focus:border-[var(--pink)] focus:ring-[var(--pink)]"
            />
            <ZineButton type="submit" tone="pink" className="px-5 py-2 text-sm">
              {submitText}
            </ZineButton>
          </div>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">{helperText}</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
