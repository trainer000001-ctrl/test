"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ZineCardRough } from "@moonwitness/ui";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { useCurrentUser, useSetupStatus } from "@/lib/api/onboarding";
import { ControlLogin } from "./login";

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <h1 className="font-brush text-2xl text-[var(--primary)]">{children}</h1>
    </div>
  );
}

function RedirectToSetup({ label }: { label: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace("/shadow?mode=setup");
  }, [router]);
  return <FullScreen>{label}</FullScreen>;
}

/**
 * ControlGate memastikan urutan yang sama untuk semua halaman control:
 * belum initialized → /setup, belum login → form login, sudah login → isi.
 */
export function ControlGate({ children }: { children: ReactNode }) {
  const { locale } = useTranslation();
  const setup = useSetupStatus();
  const me = useCurrentUser();

  const checkingLabel =
    locale === "id"
      ? "MEMERIKSA INSTANCE…"
      : locale === "ar"
        ? "جارٍ فحص الخادم…"
        : "CHECKING CONTROL PLANE…";
  const setupLabel =
    locale === "id" ? "MEMBUKA SETUP…" : locale === "ar" ? "جارٍ فتح الإعداد…" : "OPENING SETUP…";
  const sessionLabel =
    locale === "id" ? "MEMBUKA SESI…" : locale === "ar" ? "جارٍ فتح الجلسة…" : "OPENING SESSION…";
  const offlineTitle =
    locale === "id"
      ? "ARSY TIDAK TERJANGKAU"
      : locale === "ar"
        ? "تعذّر الوصول إلى مستوى التحكم ARSY"
        : "ARSY CONTROL PLANE UNREACHABLE";
  const offlineHint =
    locale === "id"
      ? "Pastikan arsy serve berjalan dan ARSY_URL di apps/api terkonfigurasi dengan benar."
      : locale === "ar"
        ? "تأكد من تشغيل خدمة arsy وضبط ARSY_URL في apps/api."
        : "Ensure arsy serve is running and ARSY_URL in apps/api is configured cleanly.";

  if (setup.isLoading) return <FullScreen>{checkingLabel}</FullScreen>;

  if (setup.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ZineCardRough className="max-w-lg p-6">
          <h1 className="font-brush text-2xl text-[var(--red)]">{offlineTitle}</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {(setup.error as Error).message}
          </p>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">{offlineHint}</p>
        </ZineCardRough>
      </div>
    );
  }

  if (!setup.data?.initialized) return <RedirectToSetup label={setupLabel} />;

  if (me.isLoading) return <FullScreen>{sessionLabel}</FullScreen>;

  if (me.isError) return <ControlLogin instanceName={setup.data.instance?.name} />;

  return <>{children}</>;
}
