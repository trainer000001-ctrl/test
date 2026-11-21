import { Providers } from "@/components/providers";
import { TranslationWrapper } from "@/hocs/TranslationWrapper";
import { SettingsProvider } from "@core/contexts/settingsContext";

export default function ConsoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Providers>
      <SettingsProvider>
        <TranslationWrapper>{children}</TranslationWrapper>
      </SettingsProvider>
    </Providers>
  );
}
