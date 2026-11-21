import type { ReactNode } from "react";
import { i18n, type Locale } from "@/configs/i18n";
import { AuthGuard } from "@/hocs/AuthGuard";
import { isValidLocale } from "@/utils/i18n";

export default async function PrivateDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Locale = isValidLocale(rawLang) ? rawLang : i18n.defaultLocale;

  return (
    <AuthGuard locale={lang} enforceRedirect>
      {children}
    </AuthGuard>
  );
}
