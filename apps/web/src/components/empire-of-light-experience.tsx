"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@moonwitness/ui";
import {
  CrownEmblemIcon,
  IllustratedHero,
  PrimaryAction,
  WorldExplorer,
  WorldTile,
} from "@moonwitness/ui/imperium";
import gateCrowdMoonArt from "../../public/art/gate-crowd-moon.webp";
import { i18n } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import type { EntryDoorId } from "@/data/empire-canon-codex";
import {
  WORLD_ART,
  WORLD_DOMAINS,
  type NavigationSectionId,
  type WorldIdentifier,
} from "@/data/empire-registry";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";
import { CanonCodexSanctum } from "./canon-codex-sanctum";
import { CelestialCanvas } from "./celestial-canvas";
import { CelestialHudCapsule } from "./celestial-hud-capsule";
import { CovenantAboutSection } from "./covenant-about-section";
import { DockMatrixSection } from "./dock-matrix-section";
import { EmpireNavigation } from "./empire-navigation";
import { triggerSacredViewTransition } from "./motion-primitives";
import { UniversalSearchModal } from "./universal-search-modal";
import { WorldsSanctum } from "./worlds-sanctum";

const WORLD_TAGLINES_EN: Readonly<Partial<Record<WorldIdentifier, string>>> = {
  crayon: "Making Life More Colorful!",
};

const WORLD_TAGLINES_ID: Readonly<Record<WorldIdentifier, string>> = {
  moonwitness: "Kisah · Pengetahuan · Arsip",
  arsy: "Radio · Teknologi · Infrastruktur",
  "human-pen": "Pikir · Tulis · Cipta · Bagikan",
  sidra: "Terhubung · Jelajahi · Pelajari",
  "rocksoul-dx": "Bermain · Cipta · Bermimpi",
  crayon: "Biar Hidup Lebih Berwarna!",
  "sin-can": "Refleksi · Tanya · Pahami",
  mythos: "Jelajahi · Temukan · Ingat",
  "angel-with-shotgun": "Hukum · Keadilan · Masyarakat",
};

const WORLD_TAGLINES_AR: Readonly<Record<WorldIdentifier, string>> = {
  moonwitness: "قصص · معرفة · أرشيف",
  arsy: "إذاعة · تقنية · بنية تحتية",
  "human-pen": "تفكّر · اكتب · أبدع · شارك",
  sidra: "تواصل · استكشف · تعلّم",
  "rocksoul-dx": "العب · أبدع · احلم",
  crayon: "لتكن الحياة أكثر إشراقاً",
  "sin-can": "تأمّل · تساءل · افهم",
  mythos: "استكشف · اكتشف · تذكّر",
  "angel-with-shotgun": "قانون · عدالة · مجتمع",
};

export function EmpireOfLightExperience() {
  const { locale, dictionary, setLocale } = useTranslation();
  const pathname = usePathname() ?? "";
  const handleLocaleSwitch = useCallback(() => {
    const order = i18n.locales;
    const next = order[(order.indexOf(locale) + 1) % order.length] ?? i18n.defaultLocale;
    setLocale(next);

    if (typeof window !== "undefined") {
      const currentPath = pathname || window.location.pathname;
      const currentPathLocale = getLocaleFromPath(currentPath);
      if (currentPathLocale) {
        const search = window.location.search ?? "";
        const hash = window.location.hash ?? "";
        window.location.assign(getLocalizedUrl(`${currentPath}${search}${hash}`, next));
      }
    }
  }, [locale, pathname, setLocale]);
  const [activeNavTab, setActiveNavTab] = useState<NavigationSectionId>("the-gate");
  const [activeWorldId, setActiveWorldId] = useState<WorldIdentifier>("human-pen");
  const [activeDoorId, setActiveDoorId] = useState<EntryDoorId>("story-universe");
  const [sanctuaryRadianceActive, setSanctuaryRadianceActive] = useState<boolean>(false);
  const [quietMode, setQuietMode] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Keyboard shortcut Ctrl+K / Cmd+K to open search from anywhere
  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Keep the fixed navigation in sync with the section currently in view
  useEffect(() => {
    let rafId = 0;
    const sectionIds: readonly NavigationSectionId[] = [
      "the-gate",
      "the-worlds",
      "the-codex",
      "the-dock",
      "about",
    ];

    const updateScroll = () => {
      rafId = 0;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScrollProgress(Math.max(0, Math.min(1, window.scrollY / maxScroll)));

      const nearBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40;
      if (nearBottom) {
        setActiveNavTab("about");
        return;
      }

      let currentSection: NavigationSectionId = "the-gate";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 180) {
          currentSection = id;
        }
      }
      setActiveNavTab(currentSection);
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateScroll);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const navigateToSection = useCallback(
    (sectionId: NavigationSectionId) => {
      setMobileMenuOpen(false);
      setActiveNavTab(sectionId);
      const targetElement = document.getElementById(sectionId);
      if (targetElement) {
        const reduced = quietMode || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        targetElement.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }
    },
    [quietMode],
  );

  const selectAndInspectWorld = useCallback(
    (worldId: WorldIdentifier) => {
      setMobileMenuOpen(false);
      triggerSacredViewTransition(() => {
        setActiveWorldId(worldId);
        setActiveNavTab("the-worlds");
      }, quietMode);
      const worldsElement = document.getElementById("the-worlds");
      if (worldsElement) {
        const reduced = quietMode || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        worldsElement.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }
    },
    [quietMode],
  );

  const handleWorldSelectOnly = useCallback(
    (worldId: WorldIdentifier) => {
      triggerSacredViewTransition(() => {
        setActiveWorldId(worldId);
      }, quietMode);
    },
    [quietMode],
  );

  const selectAndInspectDoor = useCallback(
    (doorId: EntryDoorId) => {
      setMobileMenuOpen(false);
      triggerSacredViewTransition(() => {
        setActiveDoorId(doorId);
        setActiveNavTab("the-codex");
      }, quietMode);
      const codexElement = document.getElementById("the-codex");
      if (codexElement) {
        const reduced = quietMode || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        codexElement.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }
    },
    [quietMode],
  );

  const handleDoorSelectOnly = useCallback(
    (doorId: EntryDoorId) => {
      triggerSacredViewTransition(() => {
        setActiveDoorId(doorId);
      }, quietMode);
    },
    [quietMode],
  );

  const jumpToRemembranceSanctuary = useCallback(() => {
    setMobileMenuOpen(false);
    setActiveNavTab("about");
    const sanctuaryEl = document.getElementById("remembrance-sanctuary");
    if (sanctuaryEl) {
      const reduced = quietMode || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      sanctuaryEl.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    } else {
      navigateToSection("about");
    }
  }, [quietMode, navigateToSection]);

  return (
    <div className="home-page relative min-h-screen bg-[var(--dna-canvas)] text-[var(--dna-text)] selection:bg-[var(--dna-accent)] selection:text-[var(--dna-canvas)]">
      {sanctuaryRadianceActive && !quietMode ? (
        <CelestialCanvas
          sanctuaryRadianceActive={sanctuaryRadianceActive}
          quietMode={quietMode}
          scrollProgress={scrollProgress}
        />
      ) : null}

      <EmpireNavigation
        locale={locale}
        activeNavTab={activeNavTab}
        sanctuaryRadianceActive={sanctuaryRadianceActive}
        quietMode={quietMode}
        mobileMenuOpen={mobileMenuOpen}
        onNavigateToSection={navigateToSection}
        onOpenSearch={() => {
          setMobileMenuOpen(false);
          setSearchModalOpen(true);
        }}
        onToggleRadiance={() => setSanctuaryRadianceActive((prev) => !prev)}
        onToggleLocale={handleLocaleSwitch}
        onToggleQuietMode={() => setQuietMode((prev) => !prev)}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      <main id="main" className="bg-girih-filigree">
        <IllustratedHero
          id="the-gate"
          labelledBy="gate-heading"
          data-enter
          backdrop={
            <Image
              src={gateCrowdMoonArt}
              alt="Original illustration of back-facing travelers facing a luminous moonlit city across nine worlds"
              fill
              priority
              sizes="(orientation: portrait) min(170vh, 1900px), max(100vw, 170vh)"
              data-source="illustration"
              data-subject="Back-facing travelers overlooking a bright moonlit universe"
              className={`home-gate-art-image object-cover ${
                sanctuaryRadianceActive ? "is-radiant" : ""
              }`}
            />
          }
          kicker={
            locale === "id"
              ? "HUB KEHIDUPAN · PEMBELAJARAN · AKSI"
              : locale === "ar"
                ? "مركز الحياة · التعلّم · العمل المسؤول"
                : "ACCOUNTABLE LIFE · LEARNING · ACTION HUB"
          }
          title={
            <h1 id="gate-heading" className="home-gate-heading">
              <span className="sr-only">
                {locale === "id"
                  ? "A-L-L-A-H.COM — Empire of the Light. Jelajahi sembilan dunia pembelajaran."
                  : locale === "ar"
                    ? "A-L-L-A-H.COM — مملكة النور. استكشف العوالم المعرفية التسعة."
                    : "A-L-L-A-H.COM — Empire of the Light. Explore the nine learning worlds."}
              </span>
              <span className="home-gate-heading-visible" aria-hidden="true">
                A-L-L-A-H.COM
              </span>
            </h1>
          }
          subtitle={
            locale === "id"
              ? "KERAJAAN CAHAYA"
              : locale === "ar"
                ? "مَمْلَكَةُ النُّور"
                : "EMPIRE OF THE LIGHT"
          }
          callouts={
            locale === "id"
              ? ["CAHAYA MILIK SEMUA", "TEMUKAN TERANG DALAM GELAP", "PENGINGAT JALAN PULANG"]
              : locale === "ar"
                ? ["النور للجميع", "اعثر على النور في العتمة", "تذكير بطريق العودة"]
                : ["SUNSHINE BELONG", "FIND LIGHT IN DARKNESS", "HOW U REMIND ME"]
          }
          description={
            locale === "id"
              ? "Satu semesta berilustrasi dengan kemungkinan tanpa batas. Setiap orang punya ruang untuk belajar, mencipta, dan bertumbuh di sini."
              : locale === "ar"
                ? "كونٌ واحد بإمكاناتٍ لا محدودة؛ لكل إنسان هنا مساحةٌ للتعلّم والإبداع والشهادة الصادقة."
                : "One universe. Infinite possibilities. Everyone has a welcoming world to explore, learn, and build here."
          }
          actions={
            <PrimaryAction onClick={() => navigateToSection("the-worlds")}>
              <span>
                {locale === "id"
                  ? "JELAJAHI SEMBILAN DUNIA"
                  : locale === "ar"
                    ? "استكشف العوالم التسعة"
                    : "EXPLORE THE NINE WORLDS"}
              </span>
              <span aria-hidden="true">&rarr;</span>
            </PrimaryAction>
          }
          asideContent={
            <div className="mw-editorial-aside-panel text-center">
              <div className="flex flex-col items-center gap-1.5 text-[var(--dna-accent)]">
                <CrownEmblemIcon className="h-7 w-7" />
                <span className="text-[11px] tracking-[0.14em]">
                  {locale === "id"
                    ? "MISI BERSAMA"
                    : locale === "ar"
                      ? "البوصلة المشتركة"
                      : "SHARED COMPASS"}
                </span>
              </div>
              <ul className="mt-2.5 flex flex-col items-center gap-0.5 text-lg font-black leading-tight tracking-[0.06em] text-[var(--dna-text)]">
                {locale === "ar" ? (
                  <>
                    <li>احلم</li>
                    <li>استكشف</li>
                    <li>تعلّم</li>
                    <li>أبدع</li>
                    <li>تواصل</li>
                  </>
                ) : (
                  <>
                    <li>DREAM</li>
                    <li>EXPLORE</li>
                    <li>LEARN</li>
                    <li>CREATE</li>
                    <li>CONNECT</li>
                  </>
                )}
              </ul>
              <Button
                type="button"
                variant="plain"
                onClick={() => navigateToSection("the-worlds")}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-none border-2 border-[var(--dna-canvas)] bg-[var(--dna-accent)] px-3.5 py-1.5 text-xs font-black text-[var(--dna-canvas)] shadow-[3px_3px_0_var(--dna-accent-secondary)] hover:bg-[var(--dna-text)] transition-colors cursor-pointer"
              >
                <span>
                  {locale === "id"
                    ? "MENUJU DUNIA"
                    : locale === "ar"
                      ? "إلى العوالم"
                      : "TO THE WORLDS"}
                </span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </div>
          }
          shelf={
            <WorldExplorer
              heading={<h2>{dictionary.sanctuary.worlds.heading}</h2>}
              trailing={
                <span className="text-[var(--dna-accent-secondary)] text-xl" aria-hidden="true">
                  ✦
                </span>
              }
            >
              {WORLD_DOMAINS.map((worldItem, index) => {
                const art = WORLD_ART[worldItem.id];
                const localizedTagline =
                  locale === "id"
                    ? WORLD_TAGLINES_ID[worldItem.id]
                    : locale === "ar"
                      ? WORLD_TAGLINES_AR[worldItem.id]
                      : (WORLD_TAGLINES_EN[worldItem.id] ?? worldItem.tagline);
                const ctaLabel =
                  locale === "id" ? "JELAJAHI" : locale === "ar" ? "استكشف" : "EXPLORE";
                return (
                  <WorldTile
                    key={worldItem.id}
                    indexLabel={`0${index + 1}`}
                    title={worldItem.name}
                    tagline={localizedTagline}
                    ctaLabel={ctaLabel}
                    active={activeWorldId === worldItem.id}
                    onClick={() => selectAndInspectWorld(worldItem.id)}
                    media={
                      <Image
                        src={art.src}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 90vw, (max-width: 1279px) 30vw, 11vw"
                        data-source="illustration"
                        data-subject={art.subject}
                        className="object-cover"
                      />
                    }
                  />
                );
              })}
            </WorldExplorer>
          }
        />

        <section
          data-moment="letters-assemble"
          aria-labelledby="home-moment-heading"
          className="home-moment relative flex min-h-screen items-center px-4 py-24 sm:px-8 lg:px-16"
        >
          <div className="wrap mx-auto w-full max-w-7xl">
            <h2 id="home-moment-heading" className="mo-la__type">
              9 WORLDS 1 LIGHT
            </h2>
            <p className="mo-la__sub">
              {locale === "id"
                ? "Moonwitness · Arsy · Human-Pen · Sidra · RockSoul DX · Crayon · Sin Can · Mythos · Angel With Shotgun."
                : "Moonwitness · Arsy · Human-Pen · Sidra · RockSoul DX · Crayon · Sin Can · Mythos · Angel With Shotgun."}
            </p>
          </div>
        </section>

        <WorldsSanctum
          activeWorldId={activeWorldId}
          quietMode={quietMode}
          onSelectWorld={handleWorldSelectOnly}
        />

        <CanonCodexSanctum
          activeDoorId={activeDoorId}
          quietMode={quietMode}
          onSelectDoor={handleDoorSelectOnly}
        />

        <DockMatrixSection
          quietMode={quietMode}
          onLaunchWorld={(worldId) => selectAndInspectWorld(worldId)}
        />

        <CovenantAboutSection
          quietMode={quietMode}
          onToggleQuietMode={() => setQuietMode((prev) => !prev)}
          onSelectWorld={(worldId) => selectAndInspectWorld(worldId)}
          onInspectCorpusDoor={() => selectAndInspectDoor("epistemic-corpus")}
          onReturnToGate={() => navigateToSection("the-gate")}
        />
      </main>

      <CelestialHudCapsule
        activeNavTab={activeNavTab}
        activeWorldId={activeWorldId}
        pageScrollFraction={scrollProgress}
        onNavigateSection={navigateToSection}
        onJumpToRemembrance={jumpToRemembranceSanctuary}
        onOpenSearch={() => setSearchModalOpen(true)}
      />

      <UniversalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onNavigateToWorld={(worldId) => selectAndInspectWorld(worldId)}
        onNavigateToDoor={(doorId) => selectAndInspectDoor(doorId)}
        onJumpToRemembrance={jumpToRemembranceSanctuary}
      />
    </div>
  );
}
