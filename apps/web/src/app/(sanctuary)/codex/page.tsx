import type { Metadata } from "next";
import { CodexPageClient } from "@/components/codex-page-client";

export const metadata: Metadata = {
  title: "The Canon Codex",
  description:
    "Four architectural gallery doors spanning MoonWitness chronicles, P18 epistemic corpus discipline, unassigned human stewardship, and sovereign runtimes.",
  alternates: { canonical: "/codex" },
  openGraph: {
    title: "The Canon Codex | A-L-L-A-H.COM",
    description:
      "Four Canon Doors organizing witness chronicles, SRGBL/P18 research, stewardship & live runtimes.",
    url: "/codex",
    images: [{ url: "/og-empire-light.jpg", width: 1200, height: 630 }],
  },
};

export default function CodexPage() {
  return <CodexPageClient />;
}
