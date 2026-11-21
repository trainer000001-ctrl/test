import { Suspense, type ReactNode } from "react";
import { i18n, type Locale } from "@/configs/i18n";
import { GuestOnlyRoute } from "@/hocs/GuestOnlyRoute";
import { isValidLocale } from "@/utils/i18n";

export default async function GuestOnlyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Locale = isValidLocale(rawLang) ? rawLang : i18n.defaultLocale;

  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <GuestOnlyRoute lang={lang}>{children}</GuestOnlyRoute>
    </Suspense>
  );
}
