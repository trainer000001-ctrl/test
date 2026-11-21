import { redirect } from "next/navigation";

export default function LegacyStoragePage() {
  redirect("/control?tab=storage");
}
