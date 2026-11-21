import { proxyUpstreamRequest } from "../../_lib/upstream-proxy";

export const dynamic = "force-dynamic";

function resolveMemoryTargetUrl(incomingUrl: URL): string {
  const baseUrl = (
    process.env.MEMORY_BACKEND_URL?.trim() ||
    process.env.MEMORY_API_URL?.trim() ||
    "http://127.0.0.1:8088"
  ).replace(/\/+$/, "");
  const suffix = incomingUrl.pathname.replace(/^\/api\/memory/, "");
  return `${baseUrl}/api${suffix}${incomingUrl.search}`;
}

async function handleMemoryProxy(request: Request): Promise<Response> {
  return proxyUpstreamRequest(request, {
    resolveTargetUrl: resolveMemoryTargetUrl,
    unavailableMessage: "Upstream Memory service unreachable",
  });
}

export async function GET(request: Request): Promise<Response> {
  return handleMemoryProxy(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleMemoryProxy(request);
}

export async function PUT(request: Request): Promise<Response> {
  return handleMemoryProxy(request);
}

export async function PATCH(request: Request): Promise<Response> {
  return handleMemoryProxy(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handleMemoryProxy(request);
}

export async function HEAD(request: Request): Promise<Response> {
  return handleMemoryProxy(request);
}

export async function OPTIONS(request: Request): Promise<Response> {
  return handleMemoryProxy(request);
}
