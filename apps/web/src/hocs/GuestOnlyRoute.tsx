"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/configs/i18n";
import themeConfig from "@/configs/themeConfig";
import { useCurrentSessionState } from "@/lib/session";
import { getLocalizedUrl } from "@/utils/i18n";

export function GuestOnlyRoute({ children, lang }: { children: ReactNode; lang?: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading } = useCurrentSessionState();
  const isSetupMode = searchParams.get("mode") === "setup";

  useEffect(() => {
    if (!loading && session && !isSetupMode) {
      const redirectTo = searchParams.get("redirectTo");
      const safeTarget =
        redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : lang
            ? getLocalizedUrl(themeConfig.homePageUrl, lang)
            : themeConfig.homePageUrl;
      router.replace(safeTarget);
    }
  }, [isSetupMode, lang, loading, router, searchParams, session]);

  return <>{children}</>;
}
export default GuestOnlyRoute;
