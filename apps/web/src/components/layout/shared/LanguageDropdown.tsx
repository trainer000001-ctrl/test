"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@moonwitness/ui";
import { type Locale } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";

const LANGUAGE_ITEMS: readonly { locale: Locale; code: string; label: string; dir: string }[] = [
  { locale: "en", code: "EN", label: "English", dir: "LTR" },
  { locale: "id", code: "ID", label: "Bahasa Indonesia", dir: "LTR" },
  { locale: "ar", code: "AR", label: "العربية", dir: "RTL" },
];

export function LanguageDropdown() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { locale, setLocale, dictionary } = useTranslation();
  const [open, setOpen] = useState(false);

  function handleSelectLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    setOpen(false);
    if (getLocaleFromPath(pathname) !== null) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      router.push(getLocalizedUrl(`${pathname}${search}${hash}`, nextLocale));
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="Change language"
          aria-expanded={open}
          className="inline-flex min-h-11 items-center justify-center rounded-md px-2.5 font-mono text-xs text-[var(--foreground)] hover:bg-[var(--muted)]"
        >
          {locale.toUpperCase()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label={dictionary.shell.language}
        className="w-52 p-2"
      >
        <div className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
          {dictionary.shell.language}
        </div>
        <div className="space-y-1">
          {LANGUAGE_ITEMS.map((item) => {
            const active = item.locale === locale;
            return (
              <Button
                key={item.locale}
                type="button"
                variant={active ? "default" : "ghost"}
                onClick={() => handleSelectLocale(item.locale)}
                className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs"
              >
                <span>{item.label}</span>
                <span className="font-mono text-[10px] opacity-75">
                  {item.code} · {item.dir}
                </span>
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
export default LanguageDropdown;
