import { ECOSYSTEM_HEALTH_CONTRACT_VERSION } from "@moonwitness/canon";

export interface D1PreparedStatementLike {
  all<T = Record<string, unknown>>(): Promise<{ readonly results?: readonly T[] }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

export interface SanctuaryWorkerEnv {
  readonly DB?: D1DatabaseLike;
  readonly WEB_INTERNAL_URL?: string;
  readonly API_INTERNAL_URL?: string;
  readonly ARSY_URL?: string;
  readonly MEMORY_BACKEND_URL?: string;
  readonly MEMORY_API_URL?: string;
}

export type ServiceHealthState = "online" | "degraded" | "offline";
export type EcosystemRuntimeMode = "local-node" | "cloudflare-edge";

export type TelemetrySourceKind = "live-http-probe" | "unmeasured";

export interface EcosystemServiceStatus {
  readonly id: "web" | "api" | "arsy" | "memory";
  readonly name: string;
  readonly url: string;
  readonly status: ServiceHealthState;
  readonly httpStatus: number | null;
  readonly latencyMs: number | null;
  readonly measuredAt: string | null;
  readonly source: TelemetrySourceKind;
}

export interface EcosystemEdgeStatus {
  readonly id: "codex-edge" | "community" | "radio" | "igate";
  readonly name: string;
  readonly url: string;
  readonly status: ServiceHealthState;
  readonly httpStatus: number | null;
  readonly latencyMs: number | null;
  readonly measuredAt: string | null;
  readonly source: TelemetrySourceKind;
}

export interface EcosystemGitStatus {
  readonly available: boolean;
  readonly branch: string | null;
  readonly headShort: string | null;
  readonly dirtyCount: number;
  readonly lastCommitSubject: string | null;
  readonly lastCommitAge: string | null;
}

export interface CodexGovernanceSnapshot {
  readonly source: "cloudflare-d1" | "unavailable";
  readonly milestonesCount: number;
  readonly tasksCount: number;
  readonly docsCount: number;
  readonly releasesCount: number;
  readonly latestReleases: readonly {
    readonly tag: string;
    readonly title: string;
    readonly channel: string;
  }[];
  readonly coreDocs: readonly {
    readonly id: string;
    readonly category: string;
    readonly title: string;
    readonly version: string;
  }[];
}

export interface EcosystemSnapshot {
  readonly healthContract: typeof ECOSYSTEM_HEALTH_CONTRACT_VERSION;
  readonly generatedAt: string;
  readonly runtimeMode: EcosystemRuntimeMode;
  readonly status: "online" | "offline";
  readonly databaseStatus: string | null;
  readonly timelineTotal: number | null;
  readonly erasCount: number | null;
  readonly services: readonly EcosystemServiceStatus[];
  readonly edges: readonly EcosystemEdgeStatus[];
  readonly git: EcosystemGitStatus;
  readonly codexGovernance: CodexGovernanceSnapshot;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export type GitRunnerLike = (args: readonly string[]) => Promise<string | null>;

const PROBE_TIMEOUT_MS = 1200;

interface ProbeTarget<TId extends string> {
  readonly id: TId;
  readonly name: string;
  readonly displayUrl: string;
  readonly probeUrl: string;
}

function isCloudflareWorkersRuntime(): boolean {
  const userAgent =
    typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
      ? navigator.userAgent
      : "";
  if (userAgent.includes("Cloudflare-Workers")) {
    return true;
  }
  if (typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair === "function") {
    return true;
  }
  return (globalThis as { caches?: { default?: unknown } }).caches?.default !== undefined;
}

function isNodeRuntime(): boolean {
  if (isCloudflareWorkersRuntime()) {
    return false;
  }
  return (
    typeof process !== "undefined" &&
    Boolean(process.versions?.node) &&
    typeof process.cwd === "function"
  );
}

function isLoopbackUrl(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(url);
}

function resolveServiceUrl(
  cfValue: string | undefined,
  envValue: string | undefined,
  fallback: string,
): string {
  const candidate = (cfValue ?? envValue)?.trim();
  const normalized = candidate && candidate.length > 0 ? candidate : fallback;
  return normalized.replace(/\/+$/, "");
}

function buildProbeTargets(
  cfEnv?: SanctuaryWorkerEnv | null,
): readonly ProbeTarget<EcosystemServiceStatus["id"]>[] {
  const webBase = resolveServiceUrl(
    cfEnv?.WEB_INTERNAL_URL,
    process.env.WEB_INTERNAL_URL,
    "http://127.0.0.1:3000",
  );
  const apiBase = resolveServiceUrl(
    cfEnv?.API_INTERNAL_URL,
    process.env.API_INTERNAL_URL,
    "http://127.0.0.1:3002",
  );
  const arsyBase = resolveServiceUrl(
    cfEnv?.ARSY_URL,
    process.env.ARSY_URL,
    "http://127.0.0.1:8787",
  );
  const memoryBase = resolveServiceUrl(
    cfEnv?.MEMORY_BACKEND_URL ?? cfEnv?.MEMORY_API_URL,
    process.env.MEMORY_BACKEND_URL ?? process.env.MEMORY_API_URL,
    "http://127.0.0.1:8088",
  );

  return [
    { id: "web", name: "Web Portal", displayUrl: webBase, probeUrl: webBase },
    {
      id: "api",
      name: "Core API",
      displayUrl: apiBase,
      probeUrl: `${apiBase}/api/v1/healthz`,
    },
    { id: "arsy", name: "ARSY Control", displayUrl: arsyBase, probeUrl: `${arsyBase}/v1/health` },
    {
      id: "memory",
      name: "Memory Engine",
      displayUrl: memoryBase,
      probeUrl: `${memoryBase}/health`,
    },
  ];
}

function buildEdgeTargets(): readonly ProbeTarget<EcosystemEdgeStatus["id"]>[] {
  return [
    {
      id: "codex-edge",
      name: "Sovereign Codex Edge",
      displayUrl: "https://codex.a-l-l-a-h.com",
      probeUrl: "https://codex.a-l-l-a-h.com/health",
    },
    {
      id: "community",
      name: "Rocksoul Community",
      displayUrl: "https://community.moonwitness.biz.id",
      probeUrl: "https://community.moonwitness.biz.id/",
    },
    {
      id: "radio",
      name: "MoonWitness Radio",
      displayUrl: "https://moonwitness-radio.bjo163.workers.dev",
      probeUrl: "https://moonwitness-radio.bjo163.workers.dev/health",
    },
    {
      id: "igate",
      name: "Rocksoul iGate",
      displayUrl: "https://igate.moonwitness.biz.id",
      probeUrl: "https://igate.moonwitness.biz.id/health",
    },
  ];
}

async function defaultGitRunner(args: readonly string[]): Promise<string | null> {
  if (!isNodeRuntime()) {
    return null;
  }
  try {
    const [{ execFile }, { promisify }] = await Promise.all([
      import("node:child_process"),
      import("node:util"),
    ]);
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync("git", [...args], {
      cwd: process.cwd(),
      timeout: PROBE_TIMEOUT_MS,
      windowsHide: true,
    });
    return stdout.trimEnd();
  } catch {
    return null;
  }
}

export async function probeLocalGit(
  gitRunner: GitRunnerLike = defaultGitRunner,
): Promise<EcosystemGitStatus> {
  const [branchRaw, headRaw, statusRaw, logRaw] = await Promise.all([
    gitRunner(["rev-parse", "--abbrev-ref", "HEAD"]),
    gitRunner(["rev-parse", "--short", "HEAD"]),
    gitRunner(["status", "--porcelain"]),
    gitRunner(["log", "-1", "--format=%s\x1f%ar"]),
  ]);

  if (!branchRaw && !headRaw) {
    return {
      available: false,
      branch: null,
      headShort: null,
      dirtyCount: 0,
      lastCommitSubject: null,
      lastCommitAge: null,
    };
  }

  const dirtyCount = statusRaw
    ? statusRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean).length
    : 0;

  const [subjectPart, agePart] = (logRaw ?? "").split("\x1f");

  return {
    available: true,
    branch: branchRaw || null,
    headShort: headRaw || null,
    dirtyCount,
    lastCommitSubject: subjectPart ? subjectPart : null,
    lastCommitAge: agePart ? agePart : null,
  };
}

async function probeTarget<TId extends string>(
  target: ProbeTarget<TId>,
  fetchFn: FetchLike,
  skipLoopbackOnEdge: boolean,
): Promise<{
  readonly id: TId;
  readonly name: string;
  readonly url: string;
  readonly status: ServiceHealthState;
  readonly httpStatus: number | null;
  readonly latencyMs: number | null;
  readonly measuredAt: string | null;
  readonly source: TelemetrySourceKind;
}> {
  // Cloudflare Workers edge isolates cannot connect to origin 127.0.0.1 services (egress returns 403).
  if (skipLoopbackOnEdge && isLoopbackUrl(target.probeUrl)) {
    return {
      id: target.id,
      name: target.name,
      url: target.displayUrl,
      status: "offline",
      httpStatus: null,
      latencyMs: null,
      measuredAt: null,
      source: "unmeasured",
    };
  }
  const startedAt = Date.now();
  try {
    const response = await fetchFn(target.probeUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const latencyMs = Math.max(0, Date.now() - startedAt);
    return {
      id: target.id,
      name: target.name,
      url: target.displayUrl,
      status: response.ok ? "online" : "degraded",
      httpStatus: response.status,
      latencyMs,
      measuredAt: new Date().toISOString(),
      source: "live-http-probe",
    };
  } catch {
    return {
      id: target.id,
      name: target.name,
      url: target.displayUrl,
      status: "offline",
      httpStatus: null,
      latencyMs: null,
      measuredAt: null,
      source: "unmeasured",
    };
  }
}

async function fetchJsonSafe(
  fetchFn: FetchLike,
  url: string,
  skipLoopbackOnEdge: boolean,
): Promise<unknown> {
  if (skipLoopbackOnEdge && isLoopbackUrl(url)) {
    return null;
  }
  try {
    const response = await fetchFn(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function probeCodexGovernance(
  explicitDb?: D1DatabaseLike | null,
): Promise<CodexGovernanceSnapshot> {
  const emptySnapshot: CodexGovernanceSnapshot = {
    source: "unavailable",
    milestonesCount: 0,
    tasksCount: 0,
    docsCount: 0,
    releasesCount: 0,
    latestReleases: [],
    coreDocs: [],
  };

  try {
    const db = explicitDb ?? null;
    if (!db) return emptySnapshot;

    const [countsRes, releasesRes, docsRes] = await Promise.all([
      db
        .prepare(
          "SELECT 'milestones' AS tbl, COUNT(*) AS cnt FROM codex_milestones UNION ALL SELECT 'tasks', COUNT(*) FROM codex_tasks UNION ALL SELECT 'docs', COUNT(*) FROM codex_docs UNION ALL SELECT 'releases', COUNT(*) FROM codex_releases",
        )
        .all<{ tbl?: string; cnt?: number }>(),
      db
        .prepare(
          "SELECT tag_name, title, channel FROM codex_releases ORDER BY published_at DESC LIMIT 4",
        )
        .all<{ tag_name?: string; title?: string; channel?: string }>(),
      db
        .prepare(
          "SELECT id, category, title, version FROM codex_docs ORDER BY updated_at DESC LIMIT 5",
        )
        .all<{ id?: string; category?: string; title?: string; version?: string }>(),
    ]);

    const countsMap = new Map<string, number>();
    for (const row of countsRes.results ?? []) {
      if (typeof row.tbl === "string" && typeof row.cnt === "number") {
        countsMap.set(row.tbl, row.cnt);
      }
    }

    return {
      source: "cloudflare-d1",
      milestonesCount: countsMap.get("milestones") ?? 0,
      tasksCount: countsMap.get("tasks") ?? 0,
      docsCount: countsMap.get("docs") ?? 0,
      releasesCount: countsMap.get("releases") ?? 0,
      latestReleases: (releasesRes.results ?? []).map((r) => ({
        tag: String(r.tag_name ?? ""),
        title: String(r.title ?? ""),
        channel: String(r.channel ?? ""),
      })),
      coreDocs: (docsRes.results ?? []).map((d) => ({
        id: String(d.id ?? ""),
        category: String(d.category ?? ""),
        title: String(d.title ?? ""),
        version: String(d.version ?? ""),
      })),
    };
  } catch {
    return emptySnapshot;
  }
}

export async function probeEcosystemHealth(options?: {
  readonly fetchFn?: FetchLike;
  readonly gitRunner?: GitRunnerLike;
  readonly runtimeMode?: EcosystemRuntimeMode;
  readonly db?: D1DatabaseLike | null;
  readonly cfEnv?: SanctuaryWorkerEnv | null;
}): Promise<EcosystemSnapshot> {
  const fetchFn = options?.fetchFn ?? ((input: string, init?: RequestInit) => fetch(input, init));
  const gitRunner = options?.gitRunner ?? defaultGitRunner;
  const runtimeMode: EcosystemRuntimeMode =
    options?.runtimeMode ?? (isNodeRuntime() ? "local-node" : "cloudflare-edge");
  const skipLoopbackOnEdge = !options?.fetchFn && runtimeMode === "cloudflare-edge";
  const cfEnv = options?.cfEnv ?? null;

  const targets = buildProbeTargets(cfEnv);
  const edgeTargets = buildEdgeTargets();
  const apiBase = targets.find((item) => item.id === "api")!.displayUrl;

  const [services, edges, git, readyPayload, statsPayload, erasPayload, codexGovernance] =
    await Promise.all([
      Promise.all(targets.map((target) => probeTarget(target, fetchFn, skipLoopbackOnEdge))),
      Promise.all(edgeTargets.map((target) => probeTarget(target, fetchFn, false))),
      probeLocalGit(gitRunner),
      fetchJsonSafe(fetchFn, `${apiBase}/api/v1/readyz`, skipLoopbackOnEdge),
      fetchJsonSafe(fetchFn, `${apiBase}/api/v1/timeline/stats`, skipLoopbackOnEdge),
      fetchJsonSafe(fetchFn, `${apiBase}/api/v1/timeline/eras`, skipLoopbackOnEdge),
      probeCodexGovernance(options?.db ?? cfEnv?.DB),
    ]);

  const apiService = services.find((item) => item.id === "api");
  const apiOnline = apiService?.status === "online";

  let databaseStatus: string | null = null;
  if (readyPayload && typeof readyPayload === "object" && "database" in readyPayload) {
    const rawDb = (readyPayload as { database?: unknown }).database;
    databaseStatus = typeof rawDb === "string" ? rawDb : apiOnline ? "ready" : null;
  } else if (apiOnline) {
    databaseStatus = "ready";
  }

  let timelineTotal: number | null = null;
  if (statsPayload && typeof statsPayload === "object" && "data" in statsPayload) {
    const total = (statsPayload as { data?: { total?: unknown } }).data?.total;
    if (typeof total === "number") timelineTotal = total;
  }

  let erasCount: number | null = null;
  if (erasPayload && typeof erasPayload === "object" && "data" in erasPayload) {
    const list = (erasPayload as { data?: unknown }).data;
    if (Array.isArray(list)) erasCount = list.length;
  }

  return {
    healthContract: ECOSYSTEM_HEALTH_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    runtimeMode,
    status: apiOnline ? "online" : "offline",
    databaseStatus,
    timelineTotal,
    erasCount,
    services,
    edges,
    git,
    codexGovernance,
  };
}
