"use client";

import { redirect, usePathname } from "next/navigation";
import type { Locale } from "@/configs/i18n";
import themeConfig from "@/configs/themeConfig";
import { getLocalizedUrl } from "@/utils/i18n";

export function AuthRedirect({ lang }: { lang?: Locale }) {
  const pathname = usePathname();
  const loginBase = lang ? getLocalizedUrl(themeConfig.loginUrl, lang) : themeConfig.loginUrl;
  const homePage = lang ? getLocalizedUrl(themeConfig.homePageUrl, lang) : themeConfig.homePageUrl;

  if (pathname === loginBase) {
    return null;
  }
  const target =
    pathname === homePage || pathname === "/"
      ? loginBase
      : `${loginBase}?redirectTo=${encodeURIComponent(pathname)}`;
  redirect(target);
}
export default AuthRedirect;
