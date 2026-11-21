import { redirect } from "next/navigation";

export default function LegacyRadiusPage() {
  redirect("/control?tab=radius");
}
