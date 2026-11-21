"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { COVENANT_PILLARS, type WorldIdentifier } from "@/data/empire-registry";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";
import { FourScripturesSanctum } from "./four-scriptures-sanctum";
import {
  MagneticPortal,
  ScrollChapterReveal,
  SpatialTiltCard,
  triggerSacredViewTransition,
} from "./motion-primitives";
import { RemembranceSanctuary } from "./remembrance-sanctuary";
import {
  DiamondStarOrnament,
  DnaButton,
  DnaPortalArch,
  OctagramMandalaIcon,
} from "@moonwitness/ui/imperium";
import { useSanctuaryLocale } from "@/lib/sanctuary-locale";
import { AstrolabeSealMedallion } from "./sacred-illustrations";

const COVENANT_TRANSLATIONS = {
  id: {
    I: {
      heading: "DUNIA UNTUK BERSAKSI",
      subtitle: "Kebenaran · Kesaksian · Dzikir",
      statement:
        "Bersaksi dengan jernih dan takzim adalah awal kesadaran. Melalui Moonwitness dan Arsy, setiap isyarat kebenaran, keadilan, dan tatanan semesta dijaga tanpa distorsi.",
    },
    II: {
      heading: "DUNIA UNTUK BELAJAR",
      subtitle: "Hikmah · Geometri · Riset",
      statement:
        "Alam semesta adalah kitab tanda-tanda yang terbuka. Melalui Sidra, Crayon, dan Mythos, matematika, sejarah, etika, dan rekayasa dipelajari sebagai ikhtiar ilmu yang beramanah.",
    },
    III: {
      heading: "DUNIA UNTUK BERKARYA",
      subtitle: "Karya · Iḥsān · Keadilan",
      statement:
        "Iḥsān menuntut setiap karya—baik naskah di Human-Pen, refleksi di Sin Can, audit keadilan di Angel With Shotgun, maupun seni ruang di Rocksoul DX—dibangun dengan kejujuran dan keindahan.",
    },
  },
  ar: {
    I: {
      heading: "عالمٌ للشهادة الصادقة",
      subtitle: "الحقّ · الشهادة · التذكّر",
      statement:
        "الشهادة الصافية بخشوعٍ وبصيرة هي بداية الوعي؛ عبر شاهد القمر وعرش البث تُحفظ إشارات العدل والنظام الكوني دون تحريف.",
    },
    II: {
      heading: "عالمٌ للتعلّم والتدبّر",
      subtitle: "الحكمة · الهندسة · البحث",
      statement:
        "الخلق كتابُ آياتٍ مفتوح؛ عبر سدرة وكريون وميثوس تُدرس الرياضيات والتاريخ والأخلاق والهندسة بوصفها بحثاً مسؤولاً.",
    },
    III: {
      heading: "عالمٌ للبناء والإحسان",
      subtitle: "الإتقان · الإحسان · العدل",
      statement:
        "يقتضي الإحسان أن يُبنى كل عمل — مخطوطاً في القلم البشري، أو مراجعةً في سن كان، أو ميزان عدالة، أو إبداعاً في روكسول — بصدقٍ وجمال.",
    },
  },
} as const;

export function CovenantAboutSection({
  quietMode = false,
  onToggleQuietMode,
  onSelectWorld,
  onInspectCorpusDoor,
  onReturnToGate,
}: {
  readonly quietMode?: boolean;
  readonly onToggleQuietMode?: () => void;
  readonly onSelectWorld?: (worldId: WorldIdentifier) => void;
  readonly onInspectCorpusDoor?: () => void;
  readonly onReturnToGate: () => void;
}) {
  const pathname = usePathname() ?? "";
  const pathLocale = getLocaleFromPath(pathname);
  const { locale } = useSanctuaryLocale();
  const [focusedPillar, setFocusedPillar] = useState<string>(COVENANT_PILLARS[0]?.numeral ?? "I");
  const portalHref = (slug: string) => (pathLocale ? getLocalizedUrl(slug, pathLocale) : slug);

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="scroll-mt-16 relative bg-gradient-to-b from-[var(--dna-canvas)]/95 via-[var(--dna-canvas)]/90 to-[var(--dna-canvas)] pt-24 pb-16 px-4 sm:px-8 lg:px-16"
    >
      <div className="wrap mx-auto max-w-7xl">
        <ScrollChapterReveal quietMode={quietMode}>
          <div className="flex flex-col items-center text-center">
            <AstrolabeSealMedallion className="h-20 w-20" spin={!quietMode} />
            <div className="mt-4 flex items-center gap-4 font-monument text-xs tracking-[0.35em] text-[var(--dna-accent)] uppercase">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--dna-accent)]" />
              <span>
                {locale === "id"
                  ? "DENGAN NAMA ALLAH"
                  : locale === "ar"
                    ? "بِسْمِ اللّٰهِ"
                    : "IN THE NAME OF ALLAH"}
              </span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--dna-accent)]" />
            </div>
            <h2
              id="about-heading"
              className="font-monument mt-4 text-3xl sm:text-5xl tracking-[0.18em] text-gold-gradient uppercase"
            >
              {locale === "id"
                ? "ARSITEKTUR CAHAYA"
                : locale === "ar"
                  ? "عِمَارَةُ النُّور"
                  : "ARCHITECTURE OF THE LIGHT"}
            </h2>
            <p className="mt-4 max-w-2xl font-serif text-base sm:text-lg leading-relaxed text-[var(--dna-muted)]">
              {locale === "id"
                ? "Gerbang monosentris netral yang menyatukan kesaksian jujur, kajian komparatif lintas kitab wahyu, dan karya beramanah tanpa kultus maupun paksaan."
                : locale === "ar"
                  ? "بوابةٌ محايدة موحِّدة تجمع بين الشهادة الموثَّقة، والدراسة المقارنة للكتب المنزّلة، والإتقان المسؤول بلا تحزّب أو إكراه."
                  : "A neutral, monocentric gateway uniting documented witness, comparative study across revealed scriptures, and principled craft without cult or coercion."}
            </p>
          </div>
        </ScrollChapterReveal>

        {/* Three Stepped Archway Pillars of the Covenant */}
        <ScrollChapterReveal quietMode={quietMode}>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch">
            {COVENANT_PILLARS.map((pillarEntry, pillarIdx) => {
              const isFocused = focusedPillar === pillarEntry.numeral;
              const isCenterArch = pillarIdx === 1;
              const localizedPillar =
                locale !== "en"
                  ? COVENANT_TRANSLATIONS[locale][pillarEntry.numeral as "I" | "II" | "III"]
                  : undefined;
              return (
                <SpatialTiltCard
                  key={pillarEntry.numeral}
                  disabled={quietMode}
                  maxTiltDeg={3.5}
                  className={isCenterArch ? "md:-translate-y-4" : ""}
                >
                  <DnaPortalArch
                    type="button"
                    aria-pressed={isFocused}
                    onClick={() =>
                      triggerSacredViewTransition(() => {
                        setFocusedPillar(pillarEntry.numeral);
                      }, quietMode)
                    }
                    className={`relative flex h-full w-full flex-col items-center border px-8 pt-10 pb-8 text-center shadow-[0_16px_48px_rgba(0,0,0,0.75)] transition-colors cursor-pointer ${
                      isFocused
                        ? "border-[var(--dna-text)] bg-gradient-to-b from-[var(--dna-accent)]/16 via-[var(--dna-surface)] to-[var(--dna-canvas)]"
                        : "border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)]/90 hover:border-[var(--dna-accent)]/60"
                    }`}
                  >
                    <div
                      className={`font-monument mx-auto flex h-11 w-11 items-center justify-center rounded-full border text-sm tracking-[0.1em] transition-colors ${
                        isFocused
                          ? "border-[var(--dna-text)] bg-[var(--dna-accent)]/25 text-[var(--dna-text)]"
                          : "border-[var(--dna-accent)]/50 bg-[var(--dna-accent)]/10 text-[var(--dna-accent)]"
                      }`}
                    >
                      {pillarEntry.numeral}
                    </div>
                    <h3 className="font-monument mt-5 text-lg tracking-[0.2em] text-[var(--dna-text)]">
                      {localizedPillar?.heading ?? pillarEntry.heading}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
                      {localizedPillar?.subtitle ?? pillarEntry.subtitle}
                    </p>
                    <p className="mt-4 font-serif text-base leading-relaxed text-[var(--dna-muted)]">
                      {localizedPillar?.statement ?? pillarEntry.statement}
                    </p>
                  </DnaPortalArch>
                </SpatialTiltCard>
              );
            })}
          </div>
        </ScrollChapterReveal>

        {/* Four Revealed Scriptural Witnesses (Taurat · Zabur · Injil · Al-Qur'an) */}
        <FourScripturesSanctum quietMode={quietMode} onInspectCorpusDoor={onInspectCorpusDoor} />

        {/* Contemplative Stillness Sanctuary, 9 Universal Attributes, Reflection Ring & Breath Guide */}
        <RemembranceSanctuary quietMode={quietMode} onNavigateToWorld={onSelectWorld} />

        {/* Return to Gate Ornament & Experience Controls */}
        <div className="mt-16 flex flex-col items-center">
          <MagneticPortal disabled={quietMode} maxOffsetPx={6}>
            <DnaButton
              type="button"
              onClick={onReturnToGate}
              tone="primary"
              className="font-monument group inline-flex items-center gap-3 px-9 py-3 text-xs sm:text-sm tracking-[0.25em] text-[var(--dna-text)] uppercase hover:opacity-90 cursor-pointer"
            >
              <DiamondStarOrnament className="h-3 w-3 text-[var(--dna-accent)] transition-transform duration-500 group-hover:rotate-45" />
              <span>
                {locale === "id"
                  ? "KEMBALI KE GERBANG ↑"
                  : locale === "ar"
                    ? "العودة إلى البوابة ↑"
                    : "ASCEND TO THE GATE ↑"}
              </span>
            </DnaButton>
          </MagneticPortal>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {onToggleQuietMode && (
              <DnaButton
                type="button"
                tone="secondary"
                aria-pressed={quietMode}
                onClick={onToggleQuietMode}
                className="px-6 py-2 font-mono text-[11px] tracking-[0.18em] text-[var(--dna-accent)] uppercase hover:text-[var(--dna-text)] cursor-pointer"
              >
                {quietMode
                  ? locale === "id"
                    ? "AKTIFKAN SHADER CAHAYA"
                    : locale === "ar"
                      ? "تفعيل إضاءة الملاذ"
                      : "ENABLE LIVING LIGHT SHADERS"
                  : locale === "id"
                    ? "MODE KONTEMPLATIF TENANG"
                    : locale === "ar"
                      ? "وضع التأمّل الهادئ"
                      : "QUIET CONTEMPLATIVE MODE"}
              </DnaButton>
            )}
          </div>

          <div className="mt-10 flex w-full max-w-xl items-center justify-center gap-3 text-[var(--dna-accent)]/70">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--dna-accent)]/50 to-[var(--dna-accent)]" />
            <DiamondStarOrnament className="h-4 w-4 text-[var(--dna-accent)]" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[var(--dna-accent)]/50 to-[var(--dna-accent)]" />
          </div>

          <footer className="mt-8 flex w-full flex-col items-center justify-between gap-4 border-t border-[var(--dna-accent)]/15 pt-6 text-[11px] tracking-[0.22em] text-[var(--dna-muted)]/80 uppercase sm:flex-row">
            <div className="flex items-center gap-3">
              <OctagramMandalaIcon className="h-6 w-6" />
              <span>
                {locale === "id"
                  ? "A-L-L-A-H.COM · KERAJAAN CAHAYA"
                  : locale === "ar"
                    ? "A-L-L-A-H.COM · مملكة النور"
                    : "A-L-L-A-H.COM · EMPIRE OF THE LIGHT"}
              </span>
            </div>
            <nav
              aria-label="Sanctuary Dedicated Portals"
              dir="ltr"
              className="flex flex-wrap items-center justify-center gap-4 font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)]"
            >
              <Link href={portalHref("/scriptures")} className="hover:text-[var(--dna-text)]">
                /SCRIPTURES
              </Link>
              <Link href={portalHref("/codex")} className="hover:text-[var(--dna-text)]">
                /CODEX
              </Link>
              <Link href={portalHref("/mtime")} className="hover:text-[var(--dna-text)]">
                /MTIME
              </Link>
              <Link href={portalHref("/moonwitness")} className="hover:text-[var(--dna-text)]">
                /MOONWITNESS
              </Link>
            </nav>
          </footer>
        </div>
      </div>
    </section>
  );
}
