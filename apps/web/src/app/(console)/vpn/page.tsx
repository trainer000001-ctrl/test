import { redirect } from "next/navigation";

export default function LegacyVpnPage() {
  redirect("/control?tab=vpn");
}
