export const i18n = {
  defaultLocale: "en",
  locales: ["en", "id", "ar"],
  langDirection: {
    en: "ltr",
    id: "ltr",
    ar: "rtl",
  },
} as const;

export type Locale = (typeof i18n)["locales"][number];
export type Direction = "ltr" | "rtl";
