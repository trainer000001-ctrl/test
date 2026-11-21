import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { i18n } from "@/configs/i18n";
import { TranslationWrapper } from "@/hocs/TranslationWrapper";
import { getDictionarySync } from "@/utils/getDictionary";
import { resolveRequestLocale } from "@/utils/i18n";
import { SettingsProvider } from "@core/contexts/settingsContext";

export async function generateStaticParams() {
  return i18n.locales.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const { lang, dir: direction } = resolveRequestLocale({ pathname: `/${rawLang}` });
  const dictionary = getDictionarySync(lang);

  return (
    <div lang={lang} dir={direction} data-locale={lang} className="min-h-screen">
      <Providers>
        <SettingsProvider>
          <TranslationWrapper lang={lang} dictionary={dictionary}>
            {children}
          </TranslationWrapper>
        </SettingsProvider>
      </Providers>
    </div>
  );
}
