import { cookies } from "next/headers";
import { i18n, type Locale } from "@/configs/i18n";
import themeConfig from "@/configs/themeConfig";
import { isValidLocale } from "@/utils/i18n";
import type { Settings } from "@core/contexts/settingsContext";

export async function getLocaleFromCookie(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(themeConfig.localeCookieName)?.value;
    return isValidLocale(raw) ? raw : i18n.defaultLocale;
  } catch {
    return i18n.defaultLocale;
  }
}

export async function getSettingsFromCookie(): Promise<Partial<Settings>> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(themeConfig.settingsCookieName)?.value;
    return raw ? (JSON.parse(raw) as Partial<Settings>) : {};
  } catch {
    return {};
  }
}

export async function getServerMode(): Promise<"dark" | "light" | "system"> {
  const settings = await getSettingsFromCookie();
  return settings.mode ?? themeConfig.mode;
}
