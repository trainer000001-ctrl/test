import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface ComposePort {
  mode?: string;
  host_ip?: string;
  target: number;
  published: string;
  protocol: string;
}

interface ComposeService {
  ports?: ComposePort[];
  networks?: Record<string, unknown>;
  environment?: Record<string, string>;
  healthcheck?: {
    test: string[];
    timeout?: string;
    interval?: string;
    retries?: number;
    start_period?: string;
  };
  [key: string]: unknown;
}

interface ComposeNetwork {
  name: string;
  driver?: string;
  internal?: boolean;
}

interface ComposeVolume {
  name: string;
}

interface ComposeConfig {
  services: Record<string, ComposeService>;
  networks: Record<string, ComposeNetwork>;
  volumes: Record<string, ComposeVolume>;
}

describe("VPS Topology & Compose Architecture (MW-0035)", () => {
  const repoRoot = resolve(__dirname, "../../../..");
  const composePath = resolve(repoRoot, "docker-compose.yml");
  const caddyfilePath = resolve(repoRoot, "Caddyfile");
  const envExamplePath = resolve(repoRoot, ".env.example");

  it("ensures canonical root topology artifacts exist", () => {
    expect(existsSync(composePath)).toBe(true);
    expect(existsSync(caddyfilePath)).toBe(true);
    expect(existsSync(envExamplePath)).toBe(true);
  });

  it("enforces canonical app workspace topology under apps/ (MW-0101 + edge)", () => {
    const appDirs = readdirSync(resolve(repoRoot, "apps"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();
    expect(appDirs).toEqual(["api", "edge", "rocksoul", "web"]);
  });

  it("validates Caddy reverse proxy routing and security headers", () => {
    const caddyContent = readFileSync(caddyfilePath, "utf-8");

    // Routing targets
    expect(caddyContent).toContain("reverse_proxy web:3000");
    expect(caddyContent).toContain("reverse_proxy api:3002");

    // Hostnames and issuer domain
    expect(caddyContent).toContain("moonwitness.biz.id");
    expect(caddyContent).toContain("a-l-l-a-h.com");
    expect(caddyContent).toContain("api.moonwitness.biz.id");
    expect(caddyContent).toContain("id.moonwitness.biz.id");

    // Security headers snippet
    expect(caddyContent).toContain("Strict-Transport-Security");
    expect(caddyContent).toContain("X-Content-Type-Options");
    expect(caddyContent).toContain("X-Frame-Options");
  });

  it("validates canonical Compose topology via docker compose config", () => {
    let coreConfig: ComposeConfig;
    let opsConfig: ComposeConfig;

    try {
      const coreOutput = execFileSync(
        "docker",
        ["compose", "-f", composePath, "config", "--format", "json"],
        {
          cwd: repoRoot,
          encoding: "utf-8",
        },
      );
      coreConfig = JSON.parse(coreOutput) as ComposeConfig;

      const opsOutput = execFileSync(
        "docker",
        ["compose", "-f", composePath, "--profile", "ops", "config", "--format", "json"],
        {
          cwd: repoRoot,
          encoding: "utf-8",
        },
      );
      opsConfig = JSON.parse(opsOutput) as ComposeConfig;
    } catch {
      // In environments where Docker daemon is unreachable, verify via direct file inspection
      const rawCompose = readFileSync(composePath, "utf-8");
      expect(rawCompose).toContain("caddy:");
      expect(rawCompose).toContain("web:");
      expect(rawCompose).toContain("api:");
      expect(rawCompose).toContain("postgres:");
      expect(rawCompose).toContain("radius:");
      expect(rawCompose).toContain("snmp-poller:");
      expect(rawCompose).toContain("syslog:");
      expect(rawCompose).toContain("storage:");
      expect(rawCompose).not.toContain("sqlite:/data/");
      expect(rawCompose).toContain("@postgres:5432/${RADIUS_POSTGRES_DB:-radius}");
      expect(rawCompose).toContain("@postgres:5432/${SNMP_POSTGRES_DB:-snmp}");
      expect(rawCompose).toContain("@postgres:5432/${SYSLOG_POSTGRES_DB:-syslog}");
      expect(rawCompose).toContain("@postgres:5432/${STORAGE_POSTGRES_DB:-storage}");
      return;
    }

    // 1. Core stack validation (default profile)
    const coreServices = ["caddy", "web", "api", "postgres"];
    for (const service of coreServices) {
      expect(coreConfig.services).toHaveProperty(service);
    }
    expect(coreConfig.services).not.toHaveProperty("radius");
    expect(coreConfig.services).not.toHaveProperty("snmp-poller");
    expect(coreConfig.services).not.toHaveProperty("syslog");
    expect(coreConfig.services).not.toHaveProperty("storage");

    const { services, networks, volumes } = opsConfig;

    // 2. Ops profile Service Set validation
    const expectedServices = [
      "caddy",
      "web",
      "api",
      "postgres",
      "radius",
      "snmp-poller",
      "syslog",
      "storage",
    ];
    for (const service of expectedServices) {
      expect(services).toHaveProperty(service);
    }
    // Excluded services
    expect(services).not.toHaveProperty("allah");
    expect(services).not.toHaveProperty("memory");
    expect(services).not.toHaveProperty("rocksoul");

    const caddy = services.caddy;
    const web = services.web;
    const api = services.api;
    const postgres = services.postgres;
    const radius = services.radius;
    const snmp = services["snmp-poller"];
    const syslog = services.syslog;
    const storage = services.storage;
    const netInternal = networks["moonwitness-internal"];

    expect(caddy).toBeDefined();
    expect(web).toBeDefined();
    expect(api).toBeDefined();
    expect(postgres).toBeDefined();
    expect(radius).toBeDefined();
    expect(snmp).toBeDefined();
    expect(syslog).toBeDefined();
    expect(storage).toBeDefined();
    expect(netInternal).toBeDefined();

    if (
      !caddy ||
      !web ||
      !api ||
      !postgres ||
      !radius ||
      !snmp ||
      !syslog ||
      !storage ||
      !netInternal
    ) {
      throw new Error("Missing expected services or networks in configuration");
    }

    // 2. Ingress & Port Boundary Enforcement
    // Caddy must be the only public web ingress (ports 80 and 443)
    const caddyPorts =
      caddy.ports?.map((p: ComposePort) => `${p.published}:${p.target}/${p.protocol}`) ?? [];
    expect(caddyPorts).toContain("80:80/tcp");
    expect(caddyPorts).toContain("443:443/tcp");

    // Internal app/API/management services must NOT publish host ports directly
    expect(web.ports).toBeUndefined();
    expect(api.ports).toBeUndefined();
    expect(postgres.ports).toBeUndefined();
    expect(snmp.ports).toBeUndefined();
    expect(storage.ports).toBeUndefined();

    // RADIUS publishes only UDP auth/acct ports bound to 127.0.0.1 by default
    const radiusPorts =
      radius.ports?.map((p: ComposePort) => `${p.published}:${p.target}/${p.protocol}`) ?? [];
    expect(radiusPorts).toContain("1812:1812/udp");
    expect(radiusPorts).toContain("1813:1813/udp");
    for (const p of radius.ports ?? []) {
      expect(p.protocol).toBe("udp");
      expect(p.host_ip).toBe("127.0.0.1");
    }

    // Syslog publishes ingest ports bound to 127.0.0.1 by default
    for (const p of syslog.ports ?? []) {
      expect(p.host_ip).toBe("127.0.0.1");
    }

    // 3. Network Isolation
    expect(networks).toHaveProperty("moonwitness-public");
    expect(networks).toHaveProperty("moonwitness-internal");
    expect(netInternal.internal).toBe(true);

    // Private backends & database isolated only on moonwitness-internal
    expect(postgres.networks).toHaveProperty("moonwitness-internal");
    expect(postgres.networks).not.toHaveProperty("moonwitness-public");
    expect(radius.networks).toHaveProperty("moonwitness-internal");
    expect(radius.networks).not.toHaveProperty("moonwitness-public");
    expect(snmp.networks).toHaveProperty("moonwitness-internal");
    expect(snmp.networks).not.toHaveProperty("moonwitness-public");
    expect(syslog.networks).toHaveProperty("moonwitness-internal");
    expect(syslog.networks).not.toHaveProperty("moonwitness-public");
    expect(storage.networks).toHaveProperty("moonwitness-internal");
    expect(storage.networks).not.toHaveProperty("moonwitness-public");

    // Frontends on moonwitness-public
    expect(web.networks).toHaveProperty("moonwitness-public");

    // API bridges both networks
    expect(api.networks).toHaveProperty("moonwitness-public");
    expect(api.networks).toHaveProperty("moonwitness-internal");

    // 4. Service-to-Service DNS Resolution & Per-Service PostgreSQL Isolation
    expect(api.environment?.RADIUS_URL).toBe("http://radius:8090");
    expect(api.environment?.STORAGE_URL).toBe("http://storage:8091");
    expect(api.environment?.SNMP_POLLER_URL).toBe("http://snmp-poller:8094");
    expect(api.environment?.SYSLOG_URL).toBe("http://syslog:8093");
    expect(web.environment?.API_INTERNAL_URL).toBe("http://api:3002");

    expect(radius.environment?.DATABASE_URL).toMatch(/^postgresql:\/\/.*@postgres:5432\/radius$/);
    expect(snmp.environment?.DATABASE_URL).toMatch(/^postgresql:\/\/.*@postgres:5432\/snmp$/);
    expect(syslog.environment?.DATABASE_URL).toMatch(/^postgresql:\/\/.*@postgres:5432\/syslog$/);
    expect(storage.environment?.DATABASE_URL).toMatch(/^postgresql:\/\/.*@postgres:5432\/storage$/);

    // 5. Stateful Persistence Volumes
    expect(volumes).toHaveProperty("moonwitness-data");
    expect(volumes).toHaveProperty("postgres-data");
    expect(volumes).toHaveProperty("radius-data");
    expect(volumes).toHaveProperty("snmp-data");
    expect(volumes).toHaveProperty("syslog-data");
    expect(volumes).toHaveProperty("storage-data");
    expect(volumes).toHaveProperty("caddy_data");
    expect(volumes).toHaveProperty("caddy_config");

    // 6. Healthchecks defined on every service
    for (const service of expectedServices) {
      const s = services[service];
      expect(s).toBeDefined();
      expect(s?.healthcheck).toBeDefined();
      expect(s?.healthcheck?.test).toBeDefined();
    }
  });
});
