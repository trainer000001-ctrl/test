import { redirect } from "next/navigation";

export default function LegacySnmpPage() {
  redirect("/control?tab=snmp");
}
