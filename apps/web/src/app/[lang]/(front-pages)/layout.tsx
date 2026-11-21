import type { ReactNode } from "react";
import { SkinRoot } from "@moonwitness/ui/imperium";
import { imperiumLumenCssVariables } from "@moonwitness/ui/tokens";
import { type Locale } from "@/configs/i18n";
import { SanctuaryLocaleProvider } from "@/lib/sanctuary-locale";
import { resolveRequestLocale } from "@/utils/i18n";

export default async function FrontPagesLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const { lang }: { lang: Locale } = resolveRequestLocale({ pathname: `/${rawLang}` });

  return (
    <SkinRoot
      dnaId="01-imperium-lumen"
      style={imperiumLumenCssVariables()}
      className="mw-sanctuary-scope min-h-screen bg-[var(--dna-canvas)] font-sans text-[var(--dna-text)] antialiased selection:bg-[var(--dna-accent)] selection:text-[var(--dna-canvas)]"
    >
      <SanctuaryLocaleProvider initialLocale={lang}>{children}</SanctuaryLocaleProvider>
    </SkinRoot>
  );
}
