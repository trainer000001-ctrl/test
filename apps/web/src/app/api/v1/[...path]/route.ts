import { handleEmbeddedPlatformRequest } from "@/lib/platform-runtime";
import { proxyUpstreamRequest } from "../../_lib/upstream-proxy";

export const dynamic = "force-dynamic";

function resolveApiTargetUrl(incomingUrl: URL): string {
  const baseUrl = (process.env.API_INTERNAL_URL?.trim() || "http://127.0.0.1:3002").replace(
    /\/+$/,
    "",
  );
  return `${baseUrl}${incomingUrl.pathname}${incomingUrl.search}`;
}

async function handleApiProxy(request: Request): Promise<Response> {
  const configuredUpstream = process.env.API_INTERNAL_URL?.trim();
  if (configuredUpstream) {
    return proxyUpstreamRequest(request, {
      resolveTargetUrl: resolveApiTargetUrl,
      unavailableMessage: "Upstream API unreachable",
    });
  }

  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/v1\/?/, "");
  return handleEmbeddedPlatformRequest(request, subpath);
}

export async function GET(request: Request): Promise<Response> {
  return handleApiProxy(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleApiProxy(request);
}

export async function PUT(request: Request): Promise<Response> {
  return handleApiProxy(request);
}

export async function PATCH(request: Request): Promise<Response> {
  return handleApiProxy(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handleApiProxy(request);
}

export async function HEAD(request: Request): Promise<Response> {
  return handleApiProxy(request);
}

export async function OPTIONS(request: Request): Promise<Response> {
  return handleApiProxy(request);
}
