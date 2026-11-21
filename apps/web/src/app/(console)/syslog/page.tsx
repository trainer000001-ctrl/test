import { redirect } from "next/navigation";

export default function LegacySyslogPage() {
  redirect("/control?tab=syslog");
}
