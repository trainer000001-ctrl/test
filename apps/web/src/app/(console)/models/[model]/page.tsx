import { redirect } from "next/navigation";

export default async function LegacyModelPage({ params }: { params: Promise<{ model: string }> }) {
  const { model } = await params;
  redirect(`/addons?model=${encodeURIComponent(model ?? "")}`);
}
