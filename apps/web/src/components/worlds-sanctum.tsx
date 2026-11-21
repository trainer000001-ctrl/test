"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@moonwitness/ui";
import {
  DnaChamber,
  IllustrationFrame,
  MotionReveal,
  SectionHeading,
  StorySection,
  WorldAtlas,
} from "@moonwitness/ui/imperium";
import type { Locale } from "@/configs/i18n";
import {
  WORLD_ART,
  WORLD_DOMAINS,
  type WorldDomainEntry,
  type WorldIdentifier,
} from "@/data/empire-registry";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { triggerSacredViewTransition } from "./motion-primitives";
import { WorldEmblemById } from "./sacred-icons";
import { WorldChamberWatermarkSvg } from "./sacred-illustrations";
import { ArsyCarrierConsole } from "./worlds/arsy-carrier-console";
import { MoonwitnessMeridianConsole } from "./worlds/moonwitness-meridian-console";
import { QalamScriptoriumConsole } from "./worlds/qalam-scriptorium-console";
import { RocksoulMandalaConsole } from "./worlds/rocksoul-mandala-console";
import {
  AwsNormativeConsole,
  CrayonSpectrumConsole,
  MythosCaseConsole,
  SidraKnowledgeConsole,
  SinCanConsole,
} from "./worlds/sidra-and-canon-consoles";

interface LocalizedWorldCopy {
  readonly tagline: string;
  readonly statusLabel: string;
  readonly primaryDirective: string;
  readonly architecturalDescription: string;
}

const WORLD_COPY_OVERRIDES: Readonly<
  Record<Locale, Readonly<Partial<Record<WorldIdentifier, Partial<LocalizedWorldCopy>>>>>
> = {
  en: {
    crayon: {
      tagline: "Making Life More Colorful!",
    },
  },
  id: {
    moonwitness: {
      tagline: "Kisah · Pengetahuan · Arsip",
      statusLabel: "ARSIP AKTIF",
      primaryDirective: "Menjaga kesaksian manusia dan kisah bercahaya lintas batas.",
      architecturalDescription:
        "Observatorium dan arsip hidup tempat kiriman dari setiap meridian bertemu di bawah satu langit. Kisah, kronik saksi mata, dan memori terverifikasi diindeks berdampingan.",
    },
    arsy: {
      tagline: "Radio · Teknologi · Infrastruktur",
      statusLabel: "RADIO & INFRA",
      primaryDirective: "Menopang siaran audio bebas-geser dan jaringan komunikasi transparan.",
      architecturalDescription:
        "Sayap siaran akustik publik dan relai Kekaisaran Cahaya. Radio ARSY (audio harmonik dan tepi siaran) tetap terpisah secara konseptual dari Bidang Kendali Host ARSY internal (`cp/arsy`).",
    },
    "human-pen": {
      tagline: "Pikir · Tulis · Cipta · Bagikan",
      statusLabel: "SKRIPTORIUM BUKA",
      primaryDirective: "Menerbitkan kepenulisan akuntabel, esai editorial, dan folio Qalam.",
      architecturalDescription:
        "Menyelaraskan Skriptorium Qalam klasik dengan transmisi gerbang MANUSIA PULPEN: HUMAN-PEN mempertemukan penulisan reflektif, penyusunan folio lokal, dan narasi visual.",
    },
    sidra: {
      tagline: "Terhubung · Jelajahi · Pelajari",
      statusLabel: "GRAF PENGETAHUAN",
      primaryDirective: "Memetakan pengetahuan terhubung lintas etika, sains, dan geometri.",
      architecturalDescription:
        "Terinspirasi dari Pohon Sidrah di batas terjauh, Sidra menata penelusuran terhubung menjadi graf pengetahuan interaktif tempat setiap disiplin saling menerangi.",
    },
    "rocksoul-dx": {
      tagline: "Bermain · Cipta · Bermimpi",
      statusLabel: "BATAS STUDIO",
      primaryDirective:
        "Menyimulasikan dunia interaktif, instrumen akustik, dan geometri generatif.",
      architecturalDescription:
        "Menjaga batas produk khususnya (`apps/rocksoul` / NOISE × SILENCE), ROCKSOUL DX menjembatani geometri mandala prosedural, sintesis akustik, dan pembangunan dunia interaktif.",
    },
    crayon: {
      tagline: "Biar Hidup Lebih Berwarna!",
      statusLabel: "PENJELAJAH KANON",
      primaryDirective: "Menerangi makna melalui spektrum hermeneutik 5-tahap SRGBL v8.",
      architecturalDescription:
        "Berjangkar pada `ALLAH-CRAYON-RGBL-ENGINE` dan terpisah tegas dari SIN CAN: CRAYON menelaah teks dan pengalaman hidup melalui lima lensa terstruktur—Source & Sense, Reality, Governing Order, Being, dan Light.",
    },
    "sin-can": {
      tagline: "Refleksi · Tanya · Pahami",
      statusLabel: "PENJELAJAH KANON",
      primaryDirective:
        "Mengubah ketidaksempurnaan manusia dan luka jujur menjadi pertumbuhan bertanggung jawab.",
      architecturalDescription:
        "Terpisah tegas dari CRAYON: SIN CAN berpusat pada papan cerita empat panel `SIN CAN BE BETTER HUMAN` dan enam status refleksi Syafaat—menyambut manusia yang tak sempurna menuju kerendahan hati dan karya nyata.",
    },
    mythos: {
      tagline: "Jelajahi · Temukan · Ingat",
      statusLabel: "PENJELAJAH KANON",
      primaryDirective:
        "Membedakan motif folklor dari inti sejarah dan moral yang dapat diverifikasi.",
      architecturalDescription:
        "Berlandaskan `DOM-02 STORY · MFTL` dan `DOM-03 EVENT · LEGEND`, MYTHOS menguji silang tradisi kisah, kronik saksi mata, dan sejarah material—termasuk tolok ukur Kasus Bersama 001 (Yerusalem 70 M).",
    },
    "angel-with-shotgun": {
      tagline: "Hukum · Keadilan · Masyarakat",
      statusLabel: "PENJELAJAH KANON",
      primaryDirective:
        "Memvalidasi yurisdiksi dan cakupan sebelum menyatakan suatu aturan hukum berlaku.",
      architecturalDescription:
        "Berjangkar pada `DOM-05 LAW · AWS` (`bjo163/rocksoul-aws`): menegakkan invarian hukum bahwa TEKS HUKUM ≠ HUKUM YANG BERLAKU tanpa validasi penuh atas Source, Rule, Jurisdiction, Applicability, Argument, dan Review.",
    },
  },
  ar: {
    moonwitness: {
      tagline: "قصص · معرفة · أرشيف",
      statusLabel: "الأرشيف نشط",
      primaryDirective: "حفظ الشهادات الإنسانية والروايات الموثّقة عبر الحدود.",
      architecturalDescription:
        "مرصد وأرشيف حيّ تلتقي فيه الإرسالات من كل خط طول تحت سماء واحدة، حيث تُفهرس القصص وسجلات شهود العيان والذاكرة القابلة للتحقق جنباً إلى جنب.",
    },
    arsy: {
      tagline: "إذاعة · تقنية · بنية تحتية",
      statusLabel: "الإذاعة والبنية",
      primaryDirective: "إدامة البث الصوتي المتزن وشبكات الاتصال الشفافة.",
      architecturalDescription:
        "الجناح الإذاعي العام في مملكة النور. تبقى إذاعة عرشي منفصلة مفاهيمياً عن مستوى التحكم الداخلي للمضيف (`cp/arsy`).",
    },
    "human-pen": {
      tagline: "تفكّر · اكتب · أبدع · شارك",
      statusLabel: "دار القلم مفتوحة",
      primaryDirective: "نشر الكتابة المسؤولة والمقالات التحريرية ودفاتر القلم.",
      architecturalDescription:
        "يجمع بين إرث مخطوطات القلم وإرسال بوابة الإنسان القلم: مساحة تلتقي فيها الكتابة المتأنية ومسودات الفوليو المحلية والسرد البصري.",
    },
    sidra: {
      tagline: "تواصل · استكشف · تعلّم",
      statusLabel: "شبكة المعرفة",
      primaryDirective: "رسم خريطة المعرفة المترابطة عبر الأخلاق والعلوم والهندسة.",
      architecturalDescription:
        "مستلهم من سدرة المنتهى، ينظم سدرة الاستقصاء المترابط في رسم بياني معرفي تفاعلي يضيء فيه كل حقلٍ ما يجاوره.",
    },
    "rocksoul-dx": {
      tagline: "العب · أبدع · احلم",
      statusLabel: "حدود الاستوديو",
      primaryDirective: "محاكاة العوالم التفاعلية والآلات الصوتية والهندسة التوليدية.",
      architecturalDescription:
        "يحافظ على حدود منتجه المستقلة (`apps/rocksoul` / NOISE × SILENCE)، ويصل بين هندسة الماندالا الإجرائية والتركيب الصوتي وبناء العوالم التفاعلي.",
    },
    crayon: {
      tagline: "لتكن الحياة أكثر إشراقاً",
      statusLabel: "مستكشف الكانون",
      primaryDirective: "إضاءة المعنى عبر طيف التأويل خماسي المراحل SRGBL v8.",
      architecturalDescription:
        "مرتكز على `ALLAH-CRAYON-RGBL-ENGINE` ومفصول تماماً عن SIN CAN: يدرس CRAYON النص والتجربة عبر خمس عدسات منظمة—المصدر والواقع والنظام الحاكم والوجود والنور.",
    },
    "sin-can": {
      tagline: "تأمّل · تساءل · افهم",
      statusLabel: "مستكشف الكانون",
      primaryDirective: "تحويل النقص البشري والندوب الصادقة إلى نموٍّ مسؤول.",
      architecturalDescription:
        "مفصول بصرامة عن CRAYON: يتمحور SIN CAN حول لوحة القصص رباعية المشاهد `SIN CAN BE BETTER HUMAN` وحالات الشفاعة الست نحو التواضع والإتقان.",
    },
    mythos: {
      tagline: "استكشف · اكتشف · تذكّر",
      statusLabel: "مستكشف الكانون",
      primaryDirective: "تمييز الزخرف الفولكلوري عن الجوهر التاريخي والأخلاقي القابل للتحقق.",
      architecturalDescription:
        "مبني على `DOM-02 STORY · MFTL` و`DOM-03 EVENT · LEGEND`: يفحص MYTHOS تقاطع التقاليد السردية مع شهادات العيان والتاريخ المادي كما في الحالة المرجعية 001 (القدس 70م).",
    },
    "angel-with-shotgun": {
      tagline: "قانون · عدالة · مجتمع",
      statusLabel: "مستكشف الكانون",
      primaryDirective: "التحقق من الاختصاص والنطاق قبل الادعاء بانطباق أي قاعدة قانونية.",
      architecturalDescription:
        "مستند إلى `DOM-05 LAW · AWS`: يفرض القاعدة القانونية الأساسية بأن النص القانوني لا يساوي القانون واجب التطبيق دون المرور بسلسلة التحقق الست.",
    },
  },
};

function getLocalizedWorldCopy(locale: Locale, world: WorldDomainEntry): LocalizedWorldCopy {
  const override = WORLD_COPY_OVERRIDES[locale][world.id];
  return {
    tagline: override?.tagline ?? world.tagline,
    statusLabel: override?.statusLabel ?? world.statusLabel,
    primaryDirective: override?.primaryDirective ?? world.primaryDirective,
    architecturalDescription: override?.architecturalDescription ?? world.architecturalDescription,
  };
}

export function WorldsSanctum({
  activeWorldId,
  quietMode = false,
  onSelectWorld,
}: {
  readonly activeWorldId: WorldIdentifier;
  readonly quietMode?: boolean;
  readonly onSelectWorld: (worldId: WorldIdentifier) => void;
}) {
  const { locale, dictionary } = useTranslation();
  const worldsDict = dictionary.sanctuary.worlds;
  const activeWorld: WorldDomainEntry =
    WORLD_DOMAINS.find((domain) => domain.id === activeWorldId) ?? WORLD_DOMAINS[0]!;
  const activeWorldCopy = getLocalizedWorldCopy(locale, activeWorld);

  const [selectedArtifactCode, setSelectedArtifactCode] = useState<string>(
    activeWorld.artifacts[0]?.code ?? "MW-0114",
  );
  const selectedArtifact =
    activeWorld.artifacts.find((artifact) => artifact.code === selectedArtifactCode) ??
    activeWorld.artifacts[0] ??
    null;

  const atlasAriaLabel =
    locale === "id"
      ? "Pilih salah satu dari Sembilan Dunia"
      : locale === "ar"
        ? "اختر أحد العوالم التسعة"
        : "Select one of the Nine Worlds";

  const codicesSectionLabel =
    locale === "id"
      ? "KODEKS & KIRIMAN SANCTUARY"
      : locale === "ar"
        ? "مدونات المحراب وإرسالاته"
        : "SANCTUARY CODICES & DISPATCHES";

  const selectedRecordPrefix =
    locale === "id" ? "REKAMAN AKTIF" : locale === "ar" ? "السجل المختار" : "SELECTED RECORD";

  return (
    <StorySection
      id="the-worlds"
      labelledBy="worlds-heading"
      tone="surface"
      className="scroll-mt-16"
    >
      <MotionReveal disabled={quietMode}>
        <SectionHeading
          id="worlds-heading"
          kicker={worldsDict.domainsCount.replace("{count}", String(WORLD_DOMAINS.length))}
          title={worldsDict.heading}
          description={worldsDict.subheading}
          align="center"
        />
      </MotionReveal>

      <div className="mt-10">
        <WorldAtlas
          ariaLabel={atlasAriaLabel}
          activeId={activeWorld.id}
          onSelect={(id) => onSelectWorld(id as WorldIdentifier)}
          className="lg:grid-cols-3"
          items={WORLD_DOMAINS.map((worldDomain) => {
            const worldCopy = getLocalizedWorldCopy(locale, worldDomain);
            return {
              id: worldDomain.id,
              title: worldDomain.name,
              subtitle: worldCopy.tagline,
              statusLabel: worldCopy.statusLabel,
              emblem: <WorldEmblemById worldId={worldDomain.id} className="h-7 w-7" />,
            };
          })}
        />
      </div>

      <MotionReveal disabled={quietMode}>
        <DnaChamber className="mt-10 p-6 sm:p-10">
          <WorldChamberWatermarkSvg worldId={activeWorld.id} />

          <div className="mb-8 grid grid-cols-1 gap-2 border-b border-[var(--dna-accent)]/25 pb-4 font-mono text-xs uppercase tracking-[0.08em] text-[var(--dna-accent)] md:grid-cols-3 md:items-center">
            <span>
              {worldsDict.activeWorldLabel} // {activeWorld.citadelSector}
            </span>
            <span className="text-[var(--dna-text)] md:text-center">
              {activeWorldCopy.primaryDirective}
            </span>
            <span className="md:text-end">
              {activeWorld.canonicalAlias ?? activeWorld.harmonicFrequency}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-between border-b border-[var(--dna-accent)]/20 pb-8 lg:col-span-5 lg:border-b-0 lg:border-e lg:pb-0 lg:pe-8">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--dna-accent)]">
                    {activeWorld.citadelSector}
                  </span>
                  <span className="rounded-full border border-[var(--dna-accent)]/40 bg-[var(--dna-accent)]/10 px-3 py-0.5 font-mono text-[11px] tracking-[0.15em] text-[var(--dna-accent)]">
                    {activeWorldCopy.statusLabel}
                  </span>
                </div>

                <div className="mt-4">
                  <IllustrationFrame
                    aspectRatio="worldTile"
                    scrim
                    className="border-2 border-[var(--brand-paper)] shadow-[4px_4px_0_var(--brand-pink)]"
                  >
                    <Image
                      src={WORLD_ART[activeWorld.id].src}
                      alt={WORLD_ART[activeWorld.id].subject}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover"
                    />
                  </IllustrationFrame>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <WorldEmblemById worldId={activeWorld.id} className="h-14 w-14 shrink-0" />
                  <div>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <h3 className="font-monument text-2xl tracking-[0.16em] text-[var(--dna-text)] sm:text-3xl">
                        {activeWorld.name}
                      </h3>
                      <span dir="rtl" lang="ar" className="text-xl text-[var(--dna-accent)]/95">
                        {activeWorld.arabicEpithet}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-[var(--dna-muted)]">
                      {activeWorld.transliteration} · {activeWorld.harmonicFrequency}
                    </p>
                  </div>
                </div>

                <p className="mt-5 font-serif text-base leading-relaxed text-[var(--dna-text)]">
                  {activeWorldCopy.architecturalDescription}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {activeWorld.pillars.map((pillarLabel) => (
                    <span
                      key={pillarLabel}
                      className="border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--dna-accent)]"
                    >
                      {pillarLabel}
                    </span>
                  ))}
                  <span className="border border-[var(--dna-accent)]/30 bg-[var(--dna-accent)]/10 px-3 py-1 font-mono text-xs text-[var(--dna-accent)]">
                    {activeWorld.summaryLabel}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[var(--dna-accent)]">
                  {codicesSectionLabel}
                </p>
                {activeWorld.artifacts.length === 0 ? (
                  <p className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3.5 font-mono text-xs text-[var(--dna-muted)]">
                    {dictionary.common.noRecords}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {activeWorld.artifacts.map((artifactRecord) => {
                      const isCurrentArtifact =
                        selectedArtifact !== null && artifactRecord.code === selectedArtifact.code;
                      return (
                        <Button
                          key={artifactRecord.code}
                          type="button"
                          variant="plain"
                          aria-pressed={isCurrentArtifact}
                          onClick={() =>
                            triggerSacredViewTransition(() => {
                              setSelectedArtifactCode(artifactRecord.code);
                            }, quietMode)
                          }
                          className={`h-auto min-h-[44px] w-full cursor-pointer flex-col items-stretch justify-start gap-0 border p-3.5 text-start transition-colors ${
                            isCurrentArtifact
                              ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/14"
                              : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] hover:border-[var(--dna-accent)]/45"
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-[11px] text-[var(--dna-accent)]">
                            <span>{artifactRecord.code}</span>
                            <span>{artifactRecord.timestampLabel}</span>
                          </div>
                          <div className="font-monument mt-1 text-sm font-medium tracking-[0.06em] text-[var(--dna-text)]">
                            {artifactRecord.title}
                          </div>
                          <div className="mt-0.5 font-sans text-xs text-[var(--dna-muted)]">
                            {artifactRecord.classification}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between lg:col-span-7">
              {selectedArtifact ? (
                <div className="border border-[var(--dna-accent)]/30 bg-gradient-to-r from-[var(--dna-surface)] via-[var(--dna-surface-elevated)] to-[var(--dna-surface)] p-5">
                  <div className="flex items-center justify-between font-mono text-xs text-[var(--dna-accent)]">
                    <span>
                      {selectedRecordPrefix} // {selectedArtifact.code}
                    </span>
                    <span>{selectedArtifact.classification}</span>
                  </div>
                  <h4 className="font-monument mt-2 text-lg tracking-[0.08em] text-[var(--dna-text)] sm:text-xl">
                    {selectedArtifact.title}
                  </h4>
                  <p className="mt-2 font-serif text-sm leading-relaxed text-[var(--dna-muted)] sm:text-base">
                    {selectedArtifact.summary}
                  </p>
                </div>
              ) : (
                <div className="border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)] p-5 font-mono text-xs text-[var(--dna-muted)]">
                  {dictionary.common.noRecords}
                </div>
              )}

              <div className="mt-6 flex-1 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-6">
                {activeWorld.id === "moonwitness" && <MoonwitnessMeridianConsole />}
                {activeWorld.id === "arsy" && <ArsyCarrierConsole quietMode={quietMode} />}
                {activeWorld.id === "human-pen" && (
                  <QalamScriptoriumConsole quietMode={quietMode} />
                )}
                {activeWorld.id === "sidra" && <SidraKnowledgeConsole />}
                {activeWorld.id === "rocksoul-dx" && (
                  <RocksoulMandalaConsole quietMode={quietMode} />
                )}
                {activeWorld.id === "crayon" && <CrayonSpectrumConsole />}
                {activeWorld.id === "sin-can" && <SinCanConsole />}
                {activeWorld.id === "mythos" && <MythosCaseConsole />}
                {activeWorld.id === "angel-with-shotgun" && <AwsNormativeConsole />}
              </div>
            </div>
          </div>
        </DnaChamber>
      </MotionReveal>
    </StorySection>
  );
}
