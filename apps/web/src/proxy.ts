import { NextResponse, type NextRequest } from "next/server";

const MOONWITNESS_HOSTS = new Set(["moonwitness.biz.id", "www.moonwitness.biz.id"]);

export function normalizeHost(rawHost: string): string {
  const candidate = rawHost.trim().toLowerCase();
  if (!candidate) {
    return "";
  }
  if (candidate.startsWith("[")) {
    const closeBracketIndex = candidate.indexOf("]");
    if (closeBracketIndex !== -1) {
      return candidate.slice(0, closeBracketIndex + 1);
    }
    return candidate;
  }
  return candidate.replace(/^([^:]+):(\d+)$/, "$1").replace(/\.+$/, "");
}

export function resolveRequestHost(request: NextRequest): string {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")
    .map((part) => part.trim())
    .find((part) => part.length > 0);
  if (forwardedHost) {
    return forwardedHost;
  }

  const headerHost = request.headers.get("host")?.trim();
  if (headerHost) {
    return headerHost;
  }

  return request.nextUrl.host;
}

/**
 * Host-based root routing proxy for unified `@moonwitness/web`.
 * Serves Sanctuary at `/` by default and rewrites `moonwitness.biz.id/` to `/moonwitness`
 * unless `?sanctuary=1` is explicitly requested.
 */
export function proxy(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mw-pathname", request.nextUrl.pathname);

  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (request.nextUrl.searchParams.get("sanctuary") === "1") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const normalizedHost = normalizeHost(resolveRequestHost(request));
  if (MOONWITNESS_HOSTS.has(normalizedHost)) {
    const target = request.nextUrl.clone();
    target.pathname = "/moonwitness";
    return NextResponse.rewrite(target, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/"],
};
