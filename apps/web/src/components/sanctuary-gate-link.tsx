"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useSanctuaryHref } from "@/lib/sanctuary-url";

type SanctuaryGateLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  readonly suffix?: string;
};

/**
 * Navigates cleanly to the A-L-L-A-H Sanctuary root without looping on `moonwitness.biz.id`.
 */
export function SanctuaryGateLink({ suffix = "", ...rest }: SanctuaryGateLinkProps) {
  const baseHref = useSanctuaryHref();
  const target = suffix ? `${baseHref === "/" ? "" : baseHref}${suffix}` : baseHref;
  return <Link href={target} {...rest} />;
}
