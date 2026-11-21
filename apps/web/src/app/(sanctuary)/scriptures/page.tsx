import type { Metadata } from "next";
import { ScripturesStudio } from "@/components/scriptures-studio";

export const metadata: Metadata = {
  title: "Four Scriptures Studio",
  description:
    "Neutral comparative study across Taurat, Zabur, Injīl, and Al-Qur’ān with live Uthmani witness search and ethical concordance.",
  alternates: { canonical: "/scriptures" },
  openGraph: {
    title: "Four Scriptures Studio | A-L-L-A-H.COM",
    description:
      "Comparative primary-source witness study across Taurat, Zabur, Injīl, and Al-Qur’ān.",
    url: "/scriptures",
    images: [{ url: "/og-empire-light.jpg", width: 1200, height: 630 }],
  },
};

export default function ScripturesPage() {
  return <ScripturesStudio />;
}
