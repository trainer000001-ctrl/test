import type { Metadata } from "next";
import { MTimeObservatory } from "@/components/mtime-observatory";

export const metadata: Metadata = {
  title: "M-Time Mīqāt Observatory",
  description:
    "Explainable Hijri & crescent visibility evaluator separating physical time, solar-lunar geometry, criteria profiles, and official authority.",
  alternates: { canonical: "/mtime" },
  openGraph: {
    title: "M-Time Mīqāt Observatory | A-L-L-A-H.COM",
    description: "Explainable lunar-solar ephemeris & MABIMS/Diyanet visibility evaluation.",
    url: "/mtime",
    images: [{ url: "/og-empire-light.jpg", width: 1200, height: 630 }],
  },
};

export default function MTimePage() {
  return <MTimeObservatory />;
}
