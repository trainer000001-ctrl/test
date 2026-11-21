import { SkinRoot } from "@moonwitness/ui/imperium";
import { imperiumLumenCssVariables } from "@moonwitness/ui/tokens";
import { TranslationWrapper } from "@/hocs/TranslationWrapper";

export default function SanctuaryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SkinRoot
      dnaId="01-imperium-lumen"
      style={imperiumLumenCssVariables()}
      className="mw-sanctuary-scope min-h-screen bg-[var(--dna-canvas)] font-sans text-[var(--dna-text)] antialiased selection:bg-[var(--dna-accent)] selection:text-[var(--dna-canvas)]"
    >
      <TranslationWrapper>{children}</TranslationWrapper>
    </SkinRoot>
  );
}
