"use client";

import { useCallback, useEffect, useState } from "react";
import { requestApiJson } from "@moonwitness/contracts/sdk";
import { SkinOrnament } from "@moonwitness/ui";
import { DnaBadge, DnaButton, SacredCornerBrackets } from "@moonwitness/ui/imperium";
import type { Locale } from "@/configs/i18n";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { useCurrentIdentity } from "@/lib/session";

interface LiveNowPayload {
  hijri?: { year?: number; month?: number; day?: number; monthName?: string };
  lunar?: { phaseName?: string; illumination?: number; elongationDeg?: number };
}

interface LivePrayerTimesPayload {
  date?: string;
  convention?: string;
  fajr?: string;
  sunrise?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
  qibla_bearing?: number;
}

interface LiveHilalPayload {
  altitude_deg?: number;
  elongation_deg?: number;
  crescent_width_arcmin?: number;
  mabims_criterion?: { status?: string; passed?: boolean; description?: string };
  odeh_criterion?: { category?: string; v_value?: number; description?: string };
  overall_verdict?: string;
}

interface LiveQiblaPayload {
  qibla_bearing_deg?: number;
  cardinal_direction?: string;
  distance_to_kabah_km?: number;
}

interface LiveObservatorySummaryPayload {
  feeds?: number;
  operations?: number;
}

type PrayerKey = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

const TELEMETRY_COPY: Record<
  Locale,
  {
    readonly heading: string;
    readonly ornamentLabel: string;
    readonly coordinatesLabel: string;
    readonly feedsLabel: string;
    readonly opsLabel: string;
    readonly syncing: string;
    readonly syncFeed: string;
    readonly refreshTelemetry: string;
    readonly refreshTooltip: string;
    readonly loadingCopy: string;
    readonly readyCopy: string;
    readonly errorCopy: string;
    readonly hilalVerdictLabel: string;
    readonly altitudeShort: string;
    readonly elongationShort: string;
    readonly prayers: Record<PrayerKey, string>;
  }
> = {
  en: {
    heading: "LIVE CELESTIAL API TELEMETRY · PRAYER SCHEDULE & QIBLA",
    ornamentLabel: "CELESTIAL + OBSERVATORY ADDONS",
    coordinatesLabel: "COORDS",
    feedsLabel: "FEEDS",
    opsLabel: "OPS",
    syncing: "SYNCING…",
    syncFeed: "SYNC EPHEMERIS FEED",
    refreshTelemetry: "REFRESH TELEMETRY",
    refreshTooltip: "Fetch latest prayer schedule, Qibla bearing, and hilal telemetry",
    loadingCopy: "Probing live celestial API telemetry…",
    readyCopy:
      "Live celestial API telemetry ready (GET /api/v1/celestial/prayer-times, hilal, qibla).",
    errorCopy: "Celestial telemetry feed unavailable.",
    hilalVerdictLabel: "API HILAL VERDICT:",
    altitudeShort: "ALT",
    elongationShort: "ELONG",
    prayers: {
      Fajr: "Fajr",
      Sunrise: "Sunrise",
      Dhuhr: "Dhuhr",
      Asr: "Asr",
      Maghrib: "Maghrib",
      Isha: "Isha",
    },
  },
  id: {
    heading: "TELEMETRI LANGIT & JADWAL SALAT API LANGSUNG",
    ornamentLabel: "ADDON LANGIT + OBSERVATORIUM",
    coordinatesLabel: "KOORD",
    feedsLabel: "UMPAN",
    opsLabel: "OPS",
    syncing: "MENYINKRONKAN…",
    syncFeed: "SINKRONKAN UMPAN EFEMERIS",
    refreshTelemetry: "SEGARKAN TELEMETRI",
    refreshTooltip: "Muat ulang jadwal salat, arah Kiblat, dan telemetri hilal terbaru",
    loadingCopy: "Memindai telemetri API langit langsung…",
    readyCopy:
      "Telemetri API langit langsung siap (GET /api/v1/celestial/prayer-times, hilal, qibla).",
    errorCopy: "Umpan telemetri langit tidak tersedia.",
    hilalVerdictLabel: "PUTUSAN HILAL API:",
    altitudeShort: "TINGGI",
    elongationShort: "ELONGASI",
    prayers: {
      Fajr: "Subuh",
      Sunrise: "Terbit",
      Dhuhr: "Dzuhur",
      Asr: "Ashar",
      Maghrib: "Maghrib",
      Isha: "Isya",
    },
  },
  ar: {
    heading: "القياس الفلكي الحي · مواقيت الصلاة والقبلة",
    ornamentLabel: "إضافات الرصد الفلكي",
    coordinatesLabel: "الإحداثيات",
    feedsLabel: "المصادر",
    opsLabel: "العمليات",
    syncing: "جارٍ المزامنة…",
    syncFeed: "مزامنة بيانات التقويم الفلكي",
    refreshTelemetry: "تحديث القياسات",
    refreshTooltip: "تحديث مواقيت الصلاة وسمت القبلة وقياسات الهلال الحية",
    loadingCopy: "جارٍ فحص القياسات الفلكية الحية…",
    readyCopy: "القياسات الفلكية الحية جاهزة (GET /api/v1/celestial/prayer-times, hilal, qibla).",
    errorCopy: "تعذر الوصول إلى خدمة القياسات الفلكية الحية.",
    hilalVerdictLabel: "حكم الهلال من الواجهة البرمجية:",
    altitudeShort: "الارتفاع",
    elongationShort: "الاستطالة",
    prayers: {
      Fajr: "الفجر",
      Sunrise: "الشروق",
      Dhuhr: "الظهر",
      Asr: "العصر",
      Maghrib: "المغرب",
      Isha: "العشاء",
    },
  },
};

export function MTimeLiveTelemetryPanel({
  lat = -6.2088,
  lon = 106.8456,
}: {
  lat?: number;
  lon?: number;
}) {
  const { locale, direction, dictionary } = useTranslation();
  const copy = TELEMETRY_COPY[locale];
  const session = useCurrentIdentity();
  const canRefreshFeed = session?.role === "admin" || session?.role === "editor";
  const [hijri, setHijri] = useState<LiveNowPayload["hijri"] | null>(null);
  const [prayers, setPrayers] = useState<LivePrayerTimesPayload | null>(null);
  const [hilal, setHilal] = useState<LiveHilalPayload | null>(null);
  const [qiblaDeg, setQiblaDeg] = useState<number | null>(null);
  const [obsSummary, setObsSummary] = useState<LiveObservatorySummaryPayload | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchLiveTelemetry = useCallback(async () => {
    setRefreshing(true);
    setHasError(false);
    const coords = `lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lon))}`;
    let failedCount = 0;
    const markFailure = () => {
      failedCount += 1;
      return null;
    };
    try {
      const [nowRes, pRes, qRes, oRes] = await Promise.all([
        requestApiJson<LiveNowPayload>(`/api/v1/celestial/now?${coords}`).catch(markFailure),
        requestApiJson<LivePrayerTimesPayload>(`/api/v1/celestial/prayer-times?${coords}`).catch(
          markFailure,
        ),
        requestApiJson<LiveQiblaPayload>(`/api/v1/celestial/qibla?${coords}`).catch(markFailure),
        requestApiJson<LiveObservatorySummaryPayload>("/api/v1/observatory/summary").catch(
          markFailure,
        ),
      ]);
      const elongation = Number.isFinite(nowRes?.lunar?.elongationDeg)
        ? Number(nowRes!.lunar!.elongationDeg).toFixed(2)
        : "6.80";
      const hRes = await requestApiJson<LiveHilalPayload>(
        `/api/v1/celestial/hilal?altitude=3.50&elongation=${encodeURIComponent(elongation)}&width=0.35`,
      ).catch(markFailure);
      if (nowRes?.hijri) setHijri(nowRes.hijri);
      if (pRes) setPrayers(pRes);
      if (hRes) setHilal(hRes);
      if (qRes?.qibla_bearing_deg !== undefined) setQiblaDeg(qRes.qibla_bearing_deg);
      if (oRes) setObsSummary(oRes);
      if (failedCount === 5) {
        setHasError(true);
      }
    } finally {
      setRefreshing(false);
      setInitialLoaded(true);
    }
  }, [lat, lon]);

  useEffect(() => {
    void fetchLiveTelemetry();
  }, [fetchLiveTelemetry]);

  async function handleRefreshFeed() {
    setRefreshing(true);
    try {
      if (canRefreshFeed) {
        await requestApiJson("/api/v1/observatory/refresh/noaa_kp_index", {
          method: "POST",
        }).catch(() => null);
      }
      await fetchLiveTelemetry();
    } finally {
      setRefreshing(false);
    }
  }

  const prayerEntries = prayers
    ? (
        [
          ["Fajr", prayers.fajr],
          ["Sunrise", prayers.sunrise],
          ["Dhuhr", prayers.dhuhr],
          ["Asr", prayers.asr],
          ["Maghrib", prayers.maghrib],
          ["Isha", prayers.isha],
        ] as Array<[PrayerKey, string | undefined]>
      ).filter((entry): entry is [PrayerKey, string] => Boolean(entry[1]))
    : [];

  return (
    <section
      dir={direction}
      aria-label={copy.heading}
      className="relative border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] p-6 sm:p-8 space-y-4"
    >
      <SacredCornerBrackets />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-monument text-base sm:text-lg tracking-[0.16em] text-[var(--dna-text)] uppercase">
            {copy.heading}
          </h2>
          <SkinOrnament slot="tag" label={copy.ornamentLabel} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DnaBadge className="font-mono text-[10px]">
            <span>{copy.coordinatesLabel}: </span>
            <span dir="ltr" data-ltr="true" data-testid="telemetry-coords">
              {lat.toFixed(4)}°, {lon.toFixed(4)}°
            </span>
          </DnaBadge>
          <DnaBadge className="font-mono text-[10px]">
            <span>{dictionary.sanctuary.mtime.azimuthLabel}: </span>
            <span dir="ltr" data-ltr="true" data-testid="telemetry-qibla">
              {qiblaDeg ?? prayers?.qibla_bearing ?? "295.15"}°
            </span>
          </DnaBadge>
          {hijri?.year && hijri?.month && hijri?.day ? (
            <DnaBadge className="font-mono text-[10px]">
              <span>{dictionary.sanctuary.mtime.hijriDateLabel}: </span>
              <span dir="ltr" data-ltr="true" data-testid="telemetry-hijri">
                {hijri.year}-{String(hijri.month).padStart(2, "0")}-
                {String(hijri.day).padStart(2, "0")}
              </span>
            </DnaBadge>
          ) : null}
          <DnaBadge className="font-mono text-[10px]">
            <span>{copy.feedsLabel}: </span>
            <span dir="ltr" data-ltr="true">
              {obsSummary?.feeds ?? 0}
            </span>
            <span> · {copy.opsLabel}: </span>
            <span dir="ltr" data-ltr="true">
              {obsSummary?.operations ?? 0}
            </span>
          </DnaBadge>
          <DnaButton
            tone="secondary"
            aria-label={copy.refreshTooltip}
            title={copy.refreshTooltip}
            onClick={() => void handleRefreshFeed()}
            className="px-3 py-1 font-mono text-[10px] text-[var(--dna-accent)]"
          >
            {refreshing ? copy.syncing : canRefreshFeed ? copy.syncFeed : copy.refreshTelemetry}
          </DnaButton>
        </div>
      </div>

      {prayerEntries.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-6 font-mono text-xs">
          {prayerEntries.map(([key, time]) => (
            <div
              key={key}
              className="border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] p-3"
            >
              <div className="text-[10px] uppercase text-[var(--dna-muted)]">
                {copy.prayers[key]}
              </div>
              <div
                dir="ltr"
                data-ltr="true"
                data-testid={`prayer-time-${key.toLowerCase()}`}
                className="mt-1 text-sm font-bold text-[var(--dna-text)]"
              >
                {time}
              </div>
            </div>
          ))}
        </div>
      ) : !initialLoaded && refreshing ? (
        <div className="font-mono text-xs text-[var(--dna-muted)]">
          {dictionary.common.loading} {copy.loadingCopy}
        </div>
      ) : hasError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)] px-4 py-2.5 font-mono text-xs text-[var(--dna-text)]"
        >
          <span>
            {copy.errorCopy} {dictionary.errors.networkOffline}
          </span>
          <DnaButton
            tone="secondary"
            onClick={() => void fetchLiveTelemetry()}
            className="px-3 py-1 text-[10px] text-[var(--dna-accent)]"
          >
            {dictionary.common.refresh}
          </DnaButton>
        </div>
      ) : (
        <div className="font-mono text-xs text-[var(--dna-muted)]">{copy.readyCopy}</div>
      )}

      {hilal ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--dna-accent)]/25 bg-[var(--dna-surface)] px-4 py-2.5 font-mono text-xs">
          <span>
            {copy.hilalVerdictLabel}{" "}
            <strong dir="ltr" data-ltr="true" className="text-[var(--dna-accent)]">
              {hilal.overall_verdict ??
                (hilal.mabims_criterion?.passed ? "MABIMS_PASS" : "IMKAN_BELOW_THRESHOLD")}
            </strong>
          </span>
          <span className="text-[var(--dna-muted)]">
            {copy.altitudeShort}:{" "}
            <span dir="ltr" data-ltr="true" data-testid="telemetry-hilal-alt">
              {hilal.altitude_deg ?? 0}°
            </span>{" "}
            · {copy.elongationShort}:{" "}
            <span dir="ltr" data-ltr="true" data-testid="telemetry-hilal-elong">
              {hilal.elongation_deg ?? 0}°
            </span>
          </span>
        </div>
      ) : null}
    </section>
  );
}
export default MTimeLiveTelemetryPanel;
