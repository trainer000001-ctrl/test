"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MTIME_HISTORICAL_BENCHMARKS,
  MTIME_OBSERVER_SITES,
  computeMTimeSolarLunarEstimate,
  evaluateMTimeCriterion,
  type MTimeElongationBasis,
  type MTimeProfileId,
} from "@moonwitness/canon";
import {
  CutoutArtwork,
  DnaBrandLogo,
  Input,
  LunarDiscArt,
  RadialGauge,
  SkinOrnament,
} from "@moonwitness/ui";
import { MtimeHorizon } from "@moonwitness/ui/icons";
import { DnaBadge, DnaButton, SacredCornerBrackets } from "@moonwitness/ui/imperium";
import type { Locale } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { MTimeLiveTelemetryPanel } from "./mtime-live-telemetry";
import { SiteSubpageHeader } from "./site-subpage-header";

const HISTORICAL_DATE_PRESETS: readonly {
  readonly id: string;
  readonly iso: string;
  readonly dateLabel: string;
  readonly labels: Record<Locale, string>;
}[] = [
  {
    id: "ramadan-1447",
    iso: "2026-02-17T11:00:00Z",
    dateLabel: "2026-02-17",
    labels: {
      en: "Ramadan 1447 Eve",
      id: "Malam Ramadan 1447",
      ar: "ليلة رمضان 1447 هـ",
    },
  },
  {
    id: "shawwal-1447",
    iso: "2026-03-19T11:00:00Z",
    dateLabel: "2026-03-19",
    labels: {
      en: "Shawwal 1447 Eve",
      id: "Malam Syawal 1447",
      ar: "ليلة شوال 1447 هـ",
    },
  },
  {
    id: "dhulhijjah-1447",
    iso: "2026-05-16T11:00:00Z",
    dateLabel: "2026-05-16",
    labels: {
      en: "Dhulhijjah 1447 Eve",
      id: "Malam Zulhijah 1447",
      ar: "ليلة ذي الحجة 1447 هـ",
    },
  },
  {
    id: "ramadan-1446",
    iso: "2025-02-28T11:00:00Z",
    dateLabel: "2025-02-28",
    labels: {
      en: "Ramadan 1446 Eve",
      id: "Malam Ramadan 1446",
      ar: "ليلة رمضان 1446 هـ",
    },
  },
];

const BENCHMARK_EVE_MAP: Readonly<Record<string, string>> = {
  "ID-RAMADAN-1447": "2026-02-17T11:00:00Z",
  "ID-SHAWWAL-1447": "2026-03-19T11:00:00Z",
  "ID-DHULHIJJAH-1447": "2026-05-16T11:00:00Z",
  "ID-RAMADAN-1446": "2025-02-28T11:00:00Z",
};

const MTIME_COPY: Record<
  Locale,
  {
    readonly eyebrow: string;
    readonly explanation: string;
    readonly doorLink: string;
    readonly layer1Title: string;
    readonly timestampAria: string;
    readonly presetsAria: string;
    readonly observerSiteLabel: string;
    readonly observerSitesAria: string;
    readonly layer2Title: string;
    readonly ornamentTag: string;
    readonly gaugeLabel: string;
    readonly moonAgeLabel: string;
    readonly illuminationLabel: string;
    readonly elongationLabel: string;
    readonly sunsetAltitudeLabel: string;
    readonly layer3Suffix: string;
    readonly profilesAria: string;
    readonly profileTooltips: Record<MTimeProfileId, string>;
    readonly basisPrefix: string;
    readonly basisCenterToCenter: string;
    readonly basisApparent: string;
    readonly basisTooltip: string;
    readonly clausePass: string;
    readonly clauseFail: string;
    readonly clauseUnknown: string;
    readonly verdictLabel: string;
    readonly actionLabel: string;
    readonly shareScenario: string;
    readonly scenarioCopied: string;
    readonly shareScenarioAria: string;
    readonly separationGuard: string;
    readonly benchmarkHeading: string;
    readonly benchmarkSourcePrefix: string;
    readonly loadIntoEvaluator: string;
  }
> = {
  en: {
    eyebrow: "ANTIKYTHERA M-TIME · MĪQĀT TEMPORAL PROTOCOL",
    explanation:
      "Strictly separating physical UTC time, solar-lunar geometry, calendar visibility criteria (MABIMS_ID_2026 / DIYANET_1978), field observation, and official decree.",
    doorLink: "DOOR IV SOVEREIGN RUNTIMES ›",
    layer1Title: "LAYER 1 · PHYSICAL UTC TIME & MERIDIAN",
    timestampAria: "UTC ISO Timestamp",
    presetsAria: "Historical hilal observation date presets",
    observerSiteLabel: "OBSERVER SITE",
    observerSitesAria: "Select observer meridian coordinates",
    layer2Title: "LAYER 2 · SOLAR-LUNAR GEOMETRY ESTIMATE",
    ornamentTag: "MABIMS / DIYANET",
    gaugeLabel: "ILLUM",
    moonAgeLabel: "MOON AGE",
    illuminationLabel: "ILLUMINATION",
    elongationLabel: "ELONGATION",
    sunsetAltitudeLabel: "SUNSET ALTITUDE",
    layer3Suffix: "SEMANTIC GUARD",
    profilesAria: "Visibility criterion profiles and elongation basis",
    profileTooltips: {
      MABIMS_ID_2026:
        "MABIMS Indonesia PMA No. 1/2026 (altitude >= 3.0°, center-to-center elongation >= 6.4°)",
      DIYANET_1978:
        "Diyanet 1978 global lunar visibility standard (altitude >= 5.0°, elongation >= 8.0°)",
    },
    basisPrefix: "BASIS:",
    basisCenterToCenter: "CENTER-TO-CENTER",
    basisApparent: "APPARENT",
    basisTooltip: "Toggle geocentric center-to-center vs apparent elongation semantic basis",
    clausePass: "PASS",
    clauseFail: "FAIL",
    clauseUnknown: "UNKNOWN",
    verdictLabel: "VERDICT:",
    actionLabel: "ACTION:",
    shareScenario: "SHARE SCENARIO",
    scenarioCopied: "COPIED",
    shareScenarioAria: "Copy deep link for active date, observer site, and criterion",
    separationGuard: "OBSERVATION & AUTHORITY REMAIN SEPARATE",
    benchmarkHeading: "KEMENAG RI 1446–1447 H VERIFIED HISTORICAL FALSIFICATION CORPUS",
    benchmarkSourcePrefix: "SOURCE:",
    loadIntoEvaluator: "LOAD INTO EVALUATOR",
  },
  id: {
    eyebrow: "ANTIKYTHERA M-TIME · PROTOKOL TEMPORAL MĪQĀT",
    explanation:
      "Memisahkan waktu fisik UTC, estimasi geometri bulan-matahari, kriteria imkanur rukyat (MABIMS / Diyanet), hasil rukyat lapangan, dan keputusan otoritas tanpa mencampuradukkan peran.",
    doorLink: "PINTU IV RUNTIME BERDAULAT ›",
    layer1Title: "LAPIS 1 · WAKTU FISIK UTC & MERIDIAN",
    timestampAria: "Stempel Waktu ISO UTC",
    presetsAria: "Prasetel tanggal rukyat hilal historis",
    observerSiteLabel: "LOKASI PENGAMAT",
    observerSitesAria: "Pilih koordinat meridian lokasi pengamat",
    layer2Title: "LAPIS 2 · GEOMETRI BULAN-MATAHARI",
    ornamentTag: "MABIMS / DIYANET",
    gaugeLabel: "CAHAYA",
    moonAgeLabel: "UMUR BULAN",
    illuminationLabel: "ILUMINASI",
    elongationLabel: "ELONGASI",
    sunsetAltitudeLabel: "TINGGI HILAL",
    layer3Suffix: "PENJAGA SEMANTIK",
    profilesAria: "Profil kriteria visibilitas dan basis elongasi",
    profileTooltips: {
      MABIMS_ID_2026:
        "MABIMS Indonesia PMA No. 1/2026 (tinggi >= 3.0°, elongasi pusat-ke-pusat >= 6.4°)",
      DIYANET_1978:
        "Standar visibilitas hilal global Diyanet 1978 (tinggi >= 5.0°, elongasi >= 8.0°)",
    },
    basisPrefix: "BASIS:",
    basisCenterToCenter: "PUSAT-KE-PUSAT",
    basisApparent: "TAMPAK",
    basisTooltip: "Ubah basis semantik elongasi geosentris pusat-ke-pusat vs tampak",
    clausePass: "MEMENUHI",
    clauseFail: "BELUM MEMENUHI",
    clauseUnknown: "TIDAK DIKETAHUI",
    verdictLabel: "PUTUSAN:",
    actionLabel: "TINDAKAN:",
    shareScenario: "SALIN TAUTAN",
    scenarioCopied: "DISALIN",
    shareScenarioAria: "Salin tautan langsung untuk tanggal, lokasi pengamat, dan kriteria aktif",
    separationGuard: "OBSERVASI & OTORITAS TETAP TERPISAH",
    benchmarkHeading: "KORPUS VERIFIKASI HISTORIS KEMENAG RI 1446–1447 H",
    benchmarkSourcePrefix: "SUMBER:",
    loadIntoEvaluator: "MUAT KE EVALUATOR",
  },
  ar: {
    eyebrow: "أنتيكيثيرا M-TIME · بروتوكول الميقات الزمني",
    explanation:
      "فصل صارم بين التوقيت الفيزيائي UTC، وتقدير الهندسة الشمسية القمرية، ومعايير رؤية الهلال (MABIMS / Diyanet)، والرصد الميداني، والقرار الرسمي دون خلط بين الأدوار.",
    doorLink: "الباب الرابع: بيئات التشغيل السيادية ›",
    layer1Title: "الطبقة 1 · التوقيت الفيزيائي UTC وخط الزوال",
    timestampAria: "الطابع الزمني القياسي UTC ISO",
    presetsAria: "تواريخ مرجعية تاريخية لتحري الهلال",
    observerSiteLabel: "موقع الرصد",
    observerSitesAria: "اختر إحداثيات خط الزوال لموقع الرصد",
    layer2Title: "الطبقة 2 · تقدير الهندسة الشمسية القمرية",
    ornamentTag: "MABIMS / DIYANET",
    gaugeLabel: "الإضاءة",
    moonAgeLabel: "عمر القمر",
    illuminationLabel: "نسبة الإضاءة",
    elongationLabel: "الاستطالة",
    sunsetAltitudeLabel: "ارتفاع الغروب",
    layer3Suffix: "الحارس الدلالي",
    profilesAria: "ملفات معايير الرؤية وأساس حساب الاستطالة",
    profileTooltips: {
      MABIMS_ID_2026:
        "معيار مابيمس إندونيسيا 2026 (الارتفاع >= 3.0°، الاستطالة مركز إلى مركز >= 6.4°)",
      DIYANET_1978: "معيار ديانت 1978 العالمي لرؤية الهلال (الارتفاع >= 5.0°، الاستطالة >= 8.0°)",
    },
    basisPrefix: "الأساس:",
    basisCenterToCenter: "مركز-إلى-مركز",
    basisApparent: "ظاهري",
    basisTooltip: "التبديل بين أساس الاستطالة الجيومركزي (مركز-إلى-مركز) والظاهري",
    clausePass: "مستوفٍ",
    clauseFail: "غير مستوفٍ",
    clauseUnknown: "غير معروف",
    verdictLabel: "الحكم:",
    actionLabel: "الإجراء:",
    shareScenario: "مشاركة السيناريو",
    scenarioCopied: "تم النسخ",
    shareScenarioAria: "نسخ الرابط المباشر للتاريخ والموقع والمعيار النشط",
    separationGuard: "الرصد الميداني والقرار الرسمي منفصلان تماماً",
    benchmarkHeading: "سجل التحقق التاريخي المعتمد لوزارة الشؤون الدينية الإندونيسية 1446–1447 هـ",
    benchmarkSourcePrefix: "المصدر:",
    loadIntoEvaluator: "تحميل في أداة التقييم",
  },
};

export function MTimeInteractiveEngine({ compact = false }: { readonly compact?: boolean }) {
  const { locale, direction, dictionary } = useTranslation();
  const copy = MTIME_COPY[locale];
  const [dateIso, setDateIso] = useState<string>("2026-03-19T11:00:00Z");
  const [siteId, setSiteId] = useState<string>(MTIME_OBSERVER_SITES[0]!.id);
  const [profileId, setProfileId] = useState<MTimeProfileId>("MABIMS_ID_2026");
  const [elongationBasis, setElongationBasis] = useState<MTimeElongationBasis>(
    "GEOCENTRIC_CENTER_TO_CENTER",
  );
  const [copiedScenario, setCopiedScenario] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const presetParam = params.get("preset");
    const criterionParam = params.get("criterion");
    const siteParam = params.get("site");
    const matchedPreset = HISTORICAL_DATE_PRESETS.find((p) => p.id === presetParam);
    if (matchedPreset) {
      setDateIso(matchedPreset.iso);
    }
    if (criterionParam === "MABIMS_ID_2026" || criterionParam === "DIYANET_1978") {
      setProfileId(criterionParam);
    }
    if (siteParam && MTIME_OBSERVER_SITES.some((s) => s.id === siteParam)) {
      setSiteId(siteParam);
    }
  }, []);

  const copyScenarioDeepLink = async () => {
    const url = new URL(window.location.href);
    const matched = HISTORICAL_DATE_PRESETS.find((p) => p.iso === dateIso);
    if (matched) {
      url.searchParams.set("preset", matched.id);
    } else {
      url.searchParams.delete("preset");
    }
    url.searchParams.set("criterion", profileId);
    url.searchParams.set("site", siteId);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedScenario(true);
      window.setTimeout(() => setCopiedScenario(false), 2000);
    } catch {
      // Ignore clipboard denials
    }
  };

  const activeSite = MTIME_OBSERVER_SITES.find((s) => s.id === siteId) ?? MTIME_OBSERVER_SITES[0]!;
  const geometry = computeMTimeSolarLunarEstimate(dateIso, activeSite);
  const criterion = evaluateMTimeCriterion(profileId, {
    moonAltitudeDeg: geometry.estimatedSunsetAltitudeDeg,
    elongationDeg: geometry.elongationGeocentricDeg,
    semantics: {
      altitudeBasis: "TOPOCENTRIC",
      elongationBasis,
    },
  });

  return (
    <div dir={direction} className="space-y-6">
      {/* Date + Meridian + Profile Controls */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-4 space-y-3">
          <div className="font-mono text-[10.5px] text-[var(--dna-accent)] uppercase">
            {copy.layer1Title}
          </div>
          <Input
            type="text"
            dir="ltr"
            data-ltr="true"
            value={dateIso}
            onChange={(e) => setDateIso(e.target.value)}
            aria-label={copy.timestampAria}
            className="min-h-0 w-full border border-[var(--dna-accent)]/35 bg-[var(--dna-canvas)] px-3 py-2 font-mono text-xs text-[var(--dna-text)] focus:outline-none"
          />
          <div role="group" aria-label={copy.presetsAria} className="flex flex-wrap gap-1.5">
            {HISTORICAL_DATE_PRESETS.map((preset) => (
              <DnaButton
                key={preset.id}
                tone="secondary"
                aria-pressed={dateIso === preset.iso}
                onClick={() => setDateIso(preset.iso)}
                className="px-3 py-1 text-[10px] text-[var(--dna-muted)]"
              >
                <span>{preset.labels[locale]}</span>{" "}
                <span dir="ltr" data-ltr="true">
                  ({preset.dateLabel})
                </span>
              </DnaButton>
            ))}
          </div>

          <div className="pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[var(--dna-muted)] uppercase mb-1.5">
              <span>{copy.observerSiteLabel}</span>
              <span dir="ltr" data-ltr="true" className="text-[var(--dna-accent)]">
                {activeSite.latDeg.toFixed(4)}°, {activeSite.lonDeg.toFixed(4)}°
              </span>
            </div>
            <div
              role="group"
              aria-label={copy.observerSitesAria}
              className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
            >
              {MTIME_OBSERVER_SITES.map((s) => (
                <DnaButton
                  key={s.id}
                  tone="secondary"
                  aria-pressed={s.id === activeSite.id}
                  onClick={() => setSiteId(s.id)}
                  className="px-3 py-1.5 justify-start text-start text-[10px] text-[var(--dna-text)]"
                >
                  <span dir="ltr" data-ltr="true">
                    {s.label}
                  </span>
                </DnaButton>
              ))}
            </div>
          </div>
        </div>

        {/* Computed Geometry Layer */}
        <div className="lg:col-span-7 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/15 pb-2.5">
            <span className="inline-flex items-center gap-2 font-mono text-[10.5px] text-[var(--dna-accent)] uppercase">
              <MtimeHorizon className="h-4 w-4" />
              <span>{copy.layer2Title}</span>
            </span>
            <div className="flex items-center gap-2">
              <SkinOrnament slot="tag" label={copy.ornamentTag} />
              <span
                dir="ltr"
                data-ltr="true"
                className="font-mono text-[10px] text-[var(--dna-muted)]"
              >
                JD {geometry.julianDayUtc}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border border-[var(--dna-accent)]/20 bg-[var(--dna-surface)] p-3">
            <RadialGauge
              value={geometry.illuminatedPercent}
              max={100}
              size={68}
              label={copy.gaugeLabel}
              colorVar="var(--dna-accent)"
            />
            <LunarDiscArt className="h-14 w-14 shrink-0" decorative />
            <div className="min-w-0 flex-1 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono">
              <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-2.5">
                <div className="text-[9.5px] text-[var(--dna-muted)]">{copy.moonAgeLabel}</div>
                <div
                  dir="ltr"
                  data-ltr="true"
                  data-testid="mtime-moon-age"
                  className="mt-1 text-base text-[var(--dna-text)]"
                >
                  {geometry.moonAgeDays} d
                </div>
              </div>
              <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-2.5">
                <div className="text-[9.5px] text-[var(--dna-muted)]">{copy.illuminationLabel}</div>
                <div
                  dir="ltr"
                  data-ltr="true"
                  data-testid="mtime-illumination"
                  className="mt-1 text-base text-[var(--dna-text)]"
                >
                  {geometry.illuminatedPercent}%
                </div>
              </div>
              <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-2.5">
                <div className="text-[9.5px] text-[var(--dna-muted)]">{copy.elongationLabel}</div>
                <div
                  dir="ltr"
                  data-ltr="true"
                  data-testid="mtime-elongation"
                  className="mt-1 text-base text-[var(--dna-accent)]"
                >
                  {geometry.elongationGeocentricDeg}°
                </div>
              </div>
              <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-2.5">
                <div className="text-[9.5px] text-[var(--dna-muted)]">
                  {copy.sunsetAltitudeLabel}
                </div>
                <div
                  dir="ltr"
                  data-ltr="true"
                  data-testid="mtime-sunset-altitude"
                  className="mt-1 text-base text-[var(--dna-accent)]"
                >
                  {geometry.estimatedSunsetAltitudeDeg}°
                </div>
              </div>
            </div>
          </div>

          {/* Criterion Evaluation & Semantic Basis Separation */}
          <div className="border-t border-[var(--dna-accent)]/15 pt-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10.5px] text-[var(--dna-accent)] uppercase">
                {dictionary.sanctuary.mtime.criteriaLabel} · {copy.layer3Suffix}{" "}
                <span dir="ltr" data-ltr="true">
                  ({criterion.profileId})
                </span>
              </span>
              <div role="group" aria-label={copy.profilesAria} className="flex flex-wrap gap-1.5">
                {(["MABIMS_ID_2026", "DIYANET_1978"] as const).map((id) => (
                  <DnaButton
                    key={id}
                    tone="secondary"
                    aria-pressed={profileId === id}
                    title={copy.profileTooltips[id]}
                    onClick={() => setProfileId(id)}
                    className="px-3 py-1 text-[10px] text-[var(--dna-text)]"
                  >
                    <span dir="ltr" data-ltr="true">
                      {id}
                    </span>
                  </DnaButton>
                ))}
                <DnaButton
                  tone="secondary"
                  aria-pressed={elongationBasis === "GEOCENTRIC_APPARENT"}
                  title={copy.basisTooltip}
                  onClick={() =>
                    setElongationBasis((prev) =>
                      prev === "GEOCENTRIC_CENTER_TO_CENTER"
                        ? "GEOCENTRIC_APPARENT"
                        : "GEOCENTRIC_CENTER_TO_CENTER",
                    )
                  }
                  className="px-3 py-1 text-[10px] text-[var(--dna-muted)]"
                >
                  {copy.basisPrefix}{" "}
                  {elongationBasis === "GEOCENTRIC_CENTER_TO_CENTER"
                    ? copy.basisCenterToCenter
                    : copy.basisApparent}
                </DnaButton>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {criterion.clauses.map((c) => (
                <div
                  key={c.id}
                  className="border border-[var(--dna-accent)]/20 bg-[var(--dna-surface)] p-3 font-mono text-[10.5px]"
                >
                  <div className="flex items-center justify-between">
                    <span dir="ltr" data-ltr="true" className="text-[var(--dna-accent)]">
                      {c.id}
                    </span>
                    <span
                      className={
                        c.passed === true
                          ? "text-[var(--dna-text)]"
                          : c.passed === false
                            ? "text-[var(--dna-accent)]"
                            : "text-[var(--dna-warning)]"
                      }
                    >
                      {c.passed === true
                        ? copy.clausePass
                        : c.passed === false
                          ? copy.clauseFail
                          : copy.clauseUnknown}
                    </span>
                  </div>
                  <div dir="ltr" data-ltr="true" className="mt-1 text-xs text-[var(--dna-muted)]">
                    {c.reason}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)] px-3.5 py-2.5 font-mono text-[11px]">
              <span>
                {copy.verdictLabel}{" "}
                <strong dir="ltr" data-ltr="true" className="text-[var(--dna-text)]">
                  {criterion.verdict}
                </strong>{" "}
                · {copy.actionLabel}{" "}
                <strong dir="ltr" data-ltr="true" className="text-[var(--dna-accent)]">
                  {criterion.computedAction}
                </strong>
              </span>
              <div className="flex items-center gap-2">
                <DnaButton
                  tone="secondary"
                  aria-label={copy.shareScenarioAria}
                  title={copy.shareScenarioAria}
                  onClick={() => void copyScenarioDeepLink()}
                  className="px-3 py-1 text-[10px] text-[var(--dna-accent)]"
                >
                  {copiedScenario ? copy.scenarioCopied : copy.shareScenario}
                </DnaButton>
                <span className="text-[10px] text-[var(--dna-muted)]">{copy.separationGuard}</span>
              </div>
            </div>
            <p dir="ltr" data-ltr="true" className="text-[11px] font-sans text-[var(--dna-muted)]">
              {geometry.methodNote}
            </p>
          </div>
        </div>
      </div>

      {!compact && (
        <section
          aria-label={copy.benchmarkHeading}
          className="relative border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] p-6 sm:p-8 space-y-4"
        >
          <SacredCornerBrackets />
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
            <h2 className="font-monument text-base sm:text-lg tracking-[0.16em] text-[var(--dna-text)] uppercase">
              {copy.benchmarkHeading}
            </h2>
            <span className="font-mono text-[10px] text-[var(--dna-accent)]">
              {copy.benchmarkSourcePrefix}{" "}
              <span dir="ltr" data-ltr="true">
                ANTIKYTHERA-TIME v0.11 / MTIME-HIJRI
              </span>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {MTIME_HISTORICAL_BENCHMARKS.map((item) => (
              <div
                key={item.id}
                className="border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] p-4 space-y-1.5"
              >
                <div className="flex items-center justify-between font-mono text-[10.5px]">
                  <span dir="ltr" data-ltr="true" className="text-[var(--dna-accent)] font-bold">
                    {item.id} · {item.officialMonthStart}
                  </span>
                  <DnaBadge
                    dir="ltr"
                    data-ltr="true"
                    className="font-mono text-[10px] text-[var(--dna-text)]"
                  >
                    {item.criterionStatus}
                  </DnaBadge>
                </div>
                <div
                  dir="ltr"
                  data-ltr="true"
                  className="font-mono text-[10px] text-[var(--dna-accent)]"
                >
                  {item.sourceAuthority} · {item.observationStatus}
                </div>
                <p className="font-serif text-xs text-[var(--dna-muted)]">{item.sourceNote}</p>
                <div className="pt-1">
                  <DnaButton
                    tone="secondary"
                    onClick={() => {
                      const targetIso =
                        BENCHMARK_EVE_MAP[item.id] ?? `${item.officialMonthStart}T11:00:00Z`;
                      setDateIso(targetIso);
                      setProfileId("MABIMS_ID_2026");
                      setSiteId("ID-JAKARTA");
                      if (typeof window !== "undefined") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className="px-3 py-1 text-[10px] text-[var(--dna-accent)] uppercase"
                  >
                    {copy.loadIntoEvaluator}
                  </DnaButton>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function MTimeObservatory() {
  const { locale, direction, dictionary } = useTranslation();
  const copy = MTIME_COPY[locale];

  return (
    <div
      dir={direction}
      className="min-h-screen bg-[var(--dna-canvas)] text-[var(--dna-text)] bg-girih-filigree"
    >
      <SiteSubpageHeader activeRoute="mtime" />
      <main id="main" className="relative mx-auto max-w-7xl px-4 py-12 sm:px-8 space-y-8">
        <CutoutArtwork
          id="horizon-sextant"
          decorative
          className="pointer-events-none absolute right-6 top-8 hidden h-24 w-24 text-[var(--dna-accent)] opacity-20 md:block"
        />
        <CutoutArtwork
          id="astrolabe-disc"
          decorative
          className="pointer-events-none absolute left-6 top-8 hidden h-24 w-24 text-[var(--dna-accent)] opacity-20 md:block"
        />
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <DnaBrandLogo id="mtime-horizon" variant="lockup" size={26} decorative />
          </div>
          <div className="font-mono text-[11px] tracking-[0.26em] text-[var(--dna-accent)] uppercase">
            {copy.eyebrow}
          </div>
          <h1 className="font-monument text-3xl sm:text-5xl tracking-[0.16em] text-gold-gradient uppercase">
            {dictionary.sanctuary.mtime.heading}
          </h1>
          <p className="mx-auto max-w-3xl font-serif text-base text-[var(--dna-muted)] leading-relaxed">
            {dictionary.sanctuary.mtime.subheading} {copy.explanation}
          </p>
          <div>
            <DnaButton
              asChild
              tone="secondary"
              className="min-h-0 inline-flex items-center px-4 py-1.5 font-mono text-[10.5px] text-[var(--dna-accent)] uppercase"
            >
              <Link href="/codex?door=sovereign-runtimes">{copy.doorLink}</Link>
            </DnaButton>
          </div>
        </div>

        <MTimeInteractiveEngine />
        <MTimeLiveTelemetryPanel />
      </main>
    </div>
  );
}
