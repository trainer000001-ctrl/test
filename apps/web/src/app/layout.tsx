import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import localFont from "next/font/local";
import { SkipLink } from "@moonwitness/ui";
import themeConfig from "@/configs/themeConfig";
import { resolveRequestLocale } from "@/utils/i18n";
import "./globals.css";

// Saksi — proprietary MoonWitness type family (see packages/assets/fonts).
const brush = localFont({
  src: [
    { path: "../../public/fonts/saksi-marker-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/saksi-marker-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-brush",
  display: "swap",
});
const hand = localFont({
  src: [
    { path: "../../public/fonts/saksi-hand-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/saksi-hand-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-hand",
  display: "swap",
});
const mono = localFont({
  src: [
    { path: "../../public/fonts/saksi-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/saksi-mono-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});
const cinzel = localFont({
  src: [
    { path: "../../public/fonts/cinzel-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/cinzel-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/cinzel-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://a-l-l-a-h.com"),
  title: {
    default: "A-L-L-A-H.COM — Empire of the Light",
    template: "%s | Moonwitness Ecosystem",
  },
  description:
    "In the Name of Allah. A-L-L-A-H.COM (Accountable Life, Learning & Action Hub) — Empire of the Light & MoonWitness Universe.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: "https://a-l-l-a-h.com",
    siteName: "A-L-L-A-H.COM — Empire of the Light",
    title: "A-L-L-A-H.COM — Empire of the Light",
    description:
      "Neutral monocentric sanctuary uniting four revealed scriptural witnesses (Taurat, Zabur, Injīl, Al-Qur’ān), explainable M-Time, and MoonWitness engineering.",
    images: [
      {
        url: "/og-empire-light.jpg",
        width: 1200,
        height: 630,
        alt: "A-L-L-A-H.COM — Empire of the Light",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "A-L-L-A-H.COM — Empire of the Light",
    description:
      "Neutral sanctuary uniting Taurat, Zabur, Injīl & Al-Qur’ān comparative study, M-Time calendrics, and open MoonWitness engineering.",
    images: ["/og-empire-light.jpg"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let pathname: string | null = null;
  let acceptLanguage: string | null = null;
  let cookieLocale: string | null = null;

  try {
    const headerStore = await headers();
    pathname =
      headerStore.get("x-mw-pathname") ??
      headerStore.get("next-url") ??
      headerStore.get("x-invoke-path");
    acceptLanguage = headerStore.get("accept-language");
  } catch {
    // Fallback cleanly outside request contexts
  }

  try {
    const cookieStore = await cookies();
    cookieLocale = cookieStore.get(themeConfig.localeCookieName)?.value ?? null;
  } catch {
    // Fallback cleanly outside request contexts
  }

  const { lang, dir } = resolveRequestLocale({
    pathname,
    cookieLocale,
    acceptLanguage,
  });

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${brush.variable} ${hand.variable} ${mono.variable} ${cinzel.variable}`}
    >
      <body className="min-h-screen antialiased">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
