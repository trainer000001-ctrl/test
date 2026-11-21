import type { Metadata } from "next";
import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: "Moonwitness",
};

export default function HomePage() {
  return <Landing />;
}
