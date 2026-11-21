import { NextResponse } from "next/server";
import { probeEcosystemHealth } from "@/lib/ecosystem-probe";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const snapshot = await probeEcosystemHealth();
  return NextResponse.json(snapshot, {
    headers: {
      "cache-control": "no-store",
      "x-health-contract": snapshot.healthContract,
    },
  });
}
