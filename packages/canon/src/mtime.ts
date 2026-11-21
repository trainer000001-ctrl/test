export type MTimeProfileId = "MABIMS_ID_2026" | "DIYANET_1978";
export type MTimeElongationBasis =
  | "GEOCENTRIC_CENTER_TO_CENTER"
  | "GEOCENTRIC_APPARENT";

export interface MTimeObserverSite {
  readonly id: string;
  readonly label: string;
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly tzOffsetHours: number;
}

export interface MTimeHistoricalBenchmark {
  readonly id: string;
  readonly officialMonthStart: string;
  readonly criterionStatus: string;
  readonly sourceAuthority: string;
  readonly observationStatus: string;
  readonly sourceNote: string;
}

export interface MTimeSolarLunarEstimate {
  readonly utcIso: string;
  readonly julianDayUtc: number;
  readonly moonAgeDays: number;
  readonly illuminatedPercent: number;
  readonly elongationGeocentricDeg: number;
  readonly estimatedSunsetAltitudeDeg: number;
  readonly methodNote: string;
}

export interface MTimeCriterionClause {
  readonly id: string;
  readonly passed: boolean | null;
  readonly reason: string;
}

export interface MTimeCriterionEvaluation {
  readonly profileId: MTimeProfileId;
  readonly verdict: "CRITERION_MET" | "CRITERION_NOT_MET" | "UNKNOWN_SEMANTIC_MISMATCH";
  readonly computedAction: string;
  readonly clauses: readonly MTimeCriterionClause[];
}

export const MTIME_OBSERVER_SITES: readonly MTimeObserverSite[] = [
  {
    id: "ID-JAKARTA",
    label: "Jakarta · Pelabuhan Ratu (ID)",
    latDeg: -6.2088,
    lonDeg: 106.8456,
    tzOffsetHours: 7,
  },
  {
    id: "ID-ACEH",
    label: "Banda Aceh · Lhoknga (ID)",
    latDeg: 5.5483,
    lonDeg: 95.3238,
    tzOffsetHours: 7,
  },
  {
    id: "SA-MAKKAH",
    label: "Makkah · Al-Haram Meridian (SA)",
    latDeg: 21.4225,
    lonDeg: 39.8262,
    tzOffsetHours: 3,
  },
  {
    id: "TR-ISTANBUL",
    label: "Istanbul · Kandilli Meridian (TR)",
    latDeg: 41.0633,
    lonDeg: 29.0592,
    tzOffsetHours: 3,
  },
];

export const MTIME_HISTORICAL_BENCHMARKS: readonly MTimeHistoricalBenchmark[] = [
  {
    id: "ID-RAMADAN-1447",
    officialMonthStart: "2026-02-19",
    criterionStatus: "BELOW_MABIMS_29_SHABAN",
    sourceAuthority: "KEMENAG RI Sidang Isbat",
    observationStatus: "ISTIKMAL_30_SHABAN",
    sourceNote:
      "On 17 Feb 2026 eve across Indonesian horizons, crescent altitude and elongation stayed below MABIMS thresholds; Sha'ban completed 30 days.",
  },
  {
    id: "ID-SHAWWAL-1447",
    officialMonthStart: "2026-03-20",
    criterionStatus: "ABOVE_MABIMS_29_RAMADAN",
    sourceAuthority: "KEMENAG RI Sidang Isbat",
    observationStatus: "CRITERION_SATISFIED_AND_OBSERVED",
    sourceNote:
      "On 19 Mar 2026 sunset across Western Indonesia, solar-lunar geometry satisfied MABIMS altitude >= 3.0° and elongation >= 6.4°.",
  },
  {
    id: "ID-DHULHIJJAH-1447",
    officialMonthStart: "2026-05-18",
    criterionStatus: "BORDERLINE_WEST_HORIZON",
    sourceAuthority: "KEMENAG RI Sidang Isbat",
    observationStatus: "FIELD_RUKYAT_REQUIRED",
    sourceNote:
      "Demonstrates strict separation between computed horizon geometry, physical field rukyat testimony, and official governmental decree.",
  },
  {
    id: "ID-RAMADAN-1446",
    officialMonthStart: "2025-03-01",
    criterionStatus: "ABOVE_MABIMS_ACEH_HORIZON",
    sourceAuthority: "KEMENAG RI Sidang Isbat",
    observationStatus: "OBSERVED_AT_BANDA_ACEH",
    sourceNote:
      "On 28 Feb 2025 sunset, Aceh meridian exceeded MABIMS thresholds with verified rukyat witness testimony.",
  },
];

const SYNODIC_MONTH_DAYS = 29.530588853;
// Reference astronomical new moon (J2000 epoch conjunction: 2000-01-06T18:14:00Z)
const REF_NEW_MOON_JD = 2451550.259722;

function toJulianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function computeMTimeSolarLunarEstimate(
  dateIso: string,
  site: MTimeObserverSite,
): MTimeSolarLunarEstimate {
  const parsed = new Date(dateIso);
  const validDate = Number.isNaN(parsed.getTime()) ? new Date("2026-03-19T11:00:00Z") : parsed;
  const jd = toJulianDay(validDate);

  // Mean lunar phase age since conjunction (synodic cycle)
  const rawCycles = (jd - REF_NEW_MOON_JD) / SYNODIC_MONTH_DAYS;
  const phaseFraction = ((rawCycles % 1) + 1) % 1;
  const moonAgeDays = phaseFraction * SYNODIC_MONTH_DAYS;

  // Approximate geocentric elongation in degrees [0..180]
  const phaseAngleRad = phaseFraction * 2 * Math.PI;
  const illuminatedPercent = ((1 - Math.cos(phaseAngleRad)) / 2) * 100;
  const elongationBase =
    phaseFraction <= 0.5
      ? phaseFraction * 360
      : (1 - phaseFraction) * 360;

  // Small longitude/latitude parallax & ecliptic inclination adjustment for sunset estimate
  const siteLonAdjust = (106.8456 - site.lonDeg) * 0.032;
  const latFactor = Math.cos((site.latDeg * Math.PI) / 180);
  const elongationGeocentricDeg = Math.max(0, Math.min(180, elongationBase + siteLonAdjust * 0.15));

  // Estimated sunset altitude (young crescent near conjunction has steep projection near equator)
  const effectiveYoungElongation =
    phaseFraction <= 0.5 ? elongationGeocentricDeg : -Math.min(12, (1 - phaseFraction) * 360);
  const estimatedSunsetAltitudeDeg =
    effectiveYoungElongation * 0.62 * Math.max(0.45, latFactor) + siteLonAdjust * 0.45 - 0.85;

  return {
    utcIso: validDate.toISOString(),
    julianDayUtc: round(jd, 4),
    moonAgeDays: round(moonAgeDays, 2),
    illuminatedPercent: round(illuminatedPercent, 2),
    elongationGeocentricDeg: round(elongationGeocentricDeg, 2),
    estimatedSunsetAltitudeDeg: round(estimatedSunsetAltitudeDeg, 2),
    methodNote: `Deterministic synodic ephemeris estimate at ${site.label} (${site.latDeg.toFixed(2)}°, ${site.lonDeg.toFixed(2)}°). Computed geometry never replaces physical rukyat or official authority.`,
  };
}

export function evaluateMTimeCriterion(
  profileId: MTimeProfileId,
  input: {
    readonly moonAltitudeDeg: number;
    readonly elongationDeg: number;
    readonly semantics: {
      readonly altitudeBasis: "TOPOCENTRIC" | "GEOCENTRIC";
      readonly elongationBasis: MTimeElongationBasis;
    };
  },
): MTimeCriterionEvaluation {
  const minAlt = profileId === "MABIMS_ID_2026" ? 3.0 : 5.0;
  const minElong = profileId === "MABIMS_ID_2026" ? 6.4 : 8.0;

  const altPassed = input.moonAltitudeDeg >= minAlt;
  const semanticMismatch =
    profileId === "MABIMS_ID_2026" &&
    input.semantics.elongationBasis !== "GEOCENTRIC_CENTER_TO_CENTER";

  const elongPassed: boolean | null = semanticMismatch
    ? null
    : input.elongationDeg >= minElong;

  const clauses: MTimeCriterionClause[] = [
    {
      id: `${profileId}:ALTITUDE>=${minAlt.toFixed(1)}°`,
      passed: altPassed,
      reason: `Estimated topocentric sunset altitude ${input.moonAltitudeDeg.toFixed(2)}° vs threshold >= ${minAlt.toFixed(1)}°.`,
    },
    {
      id: `${profileId}:ELONGATION>=${minElong.toFixed(1)}°`,
      passed: elongPassed,
      reason: semanticMismatch
        ? `UNKNOWN: MABIMS_ID_2026 requires GEOCENTRIC_CENTER_TO_CENTER elongation; received ${input.semantics.elongationBasis}.`
        : `Elongation (${input.semantics.elongationBasis}) ${input.elongationDeg.toFixed(2)}° vs threshold >= ${minElong.toFixed(1)}°.`,
    },
  ];

  if (elongPassed === null) {
    return {
      profileId,
      verdict: "UNKNOWN_SEMANTIC_MISMATCH",
      computedAction: "HALT_AND_ALIGN_ELONGATION_BASIS",
      clauses,
    };
  }

  if (altPassed && elongPassed) {
    return {
      profileId,
      verdict: "CRITERION_MET",
      computedAction: "PROCEED_TO_FIELD_RUKYAT_AND_OFFICIAL_ISBAT",
      clauses,
    };
  }

  return {
    profileId,
    verdict: "CRITERION_NOT_MET",
    computedAction: "PREPARE_ISTIKMAL_30_DAYS_PENDING_DECREE",
    clauses,
  };
}
