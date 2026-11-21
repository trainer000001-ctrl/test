import React from "react";
import { AstrolabeOrbitPlate } from "@moonwitness/ui/artwork";
import { Crosshair, Radio } from "@moonwitness/ui/icons";
import type { EcosystemServiceStatus, MonitorSnapshot } from "../../lib/contracts";

const PORT_FALLBACKS: EcosystemServiceStatus[] = [
  { id: "allah", name: "A-L-L-A-H", url: "http://127.0.0.1:3000", status: "offline", http_status: null, latency_ms: null },
  { id: "web", name: "WEB", url: "http://127.0.0.1:3000/moonwitness", status: "offline", http_status: null, latency_ms: null },
  { id: "api", name: "CORE API", url: "http://127.0.0.1:3002", status: "offline", http_status: null, latency_ms: null },
  { id: "arsy", name: "ARSY", url: "http://127.0.0.1:8787", status: "offline", http_status: null, latency_ms: null },
  { id: "memory", name: "MEMORY", url: "http://127.0.0.1:8000", status: "offline", http_status: null, latency_ms: null },
];

export function extractPort(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  } catch {
    return "—";
  }
}

export interface KatanaSkyHudProps {
  monitor?: MonitorSnapshot | null | undefined;
  mode?: "compact" | "astrolabe";
  onOpenUrl?: ((url: string) => void) | undefined;
}

/**
 * Combines Concept 08 Sky Sniper Reticles (Deck/Workspace) and Concept 05
 * Abyssal Astrolabe orbital filaments (OVERSEER) without flat SaaS card grids.
 */
export function KatanaSkyHud({ monitor, mode = "compact", onOpenUrl }: KatanaSkyHudProps) {
  const services = monitor?.services?.length ? monitor.services : PORT_FALLBACKS;
  const onlineCount = services.filter((svc) => svc.status === "online").length;
  const disk = monitor?.disks?.[0];
  const session = monitor?.agent_sessions?.[0];

  if (mode === "astrolabe") {
    return (
      <section className="astrolabe-crown" aria-label="Orbital Ecosystem Sanctuary">
        <div className="astrolabe-ring-wrap">
          <AstrolabeOrbitPlate className="astrolabe-svg" />
          <div className="astrolabe-nodes">
            {services.map((svc, idx) => {
              const port = extractPort(svc.url);
              return (
                <button
                  key={svc.id}
                  type="button"
                  className={`astrolabe-monolith status-${svc.status}`}
                  onClick={() => onOpenUrl?.(svc.url)}
                  title={`Open ${svc.name} (${svc.url})`}
                  aria-label={`Orbital lock ${svc.id} port ${port}`}
                >
                  <span className="astrolabe-reticle-head">
                    <Crosshair size={12} aria-hidden="true" />
                    <b>LOCK 0{idx + 1}</b>
                  </span>
                  <strong>:{port}</strong>
                  <small>
                    {svc.id.toUpperCase()} · {svc.status.toUpperCase()}
                    {svc.latency_ms !== null ? ` · ${svc.latency_ms}ms` : ""}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
        <div className="astrolabe-meta-strip">
          <span>
            SANCTUARY LOCK: <b>{onlineCount}/{services.length} ACTIVE</b>
          </span>
          <span>
            CORE DRIVE {disk?.drive ?? "C:"}{" "}
            <b>{disk?.available ? `${disk.free_gb.toFixed(1)} GB (${disk.tier.toUpperCase()})` : "LOCAL"}</b>
          </span>
          <span>
            AGENT TRACE:{" "}
            <b>{session ? `${session.last_tool} · ${session.step_count} STEPS` : "IDLE LISTENER"}</b>
          </span>
        </div>
      </section>
    );
  }

  return (
    <div className="katana-sky-beacons" aria-label="Citadel Sky Sniper Reticles">
      {services.slice(0, 5).map((svc) => {
        const port = extractPort(svc.url);
        return (
          <button
            key={svc.id}
            type="button"
            className={`katana-reticle status-${svc.status}`}
            onClick={() => onOpenUrl?.(svc.url)}
            title={`${svc.name} · ${svc.url}`}
            aria-label={`Sky reticle ${svc.id} port ${port}`}
          >
            <i aria-hidden="true" />
            <span>{svc.id.toUpperCase()}</span>
            <b>:{port}</b>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Cinema-subtitle bar rendered at the bottom edge of ROCKSOUL workspaces.
 */
export function KatanaAgentSubtitle({
  monitor,
  branch,
  pageTitle,
}: {
  monitor?: MonitorSnapshot | null | undefined;
  branch?: string | undefined;
  pageTitle: string;
}) {
  const session = monitor?.agent_sessions?.[0];
  const disk = monitor?.disks?.[0];
  return (
    <span className="anime-subtitle-trace">
      <Radio size={11} aria-hidden="true" />
      <b>[AGENT TRACE]</b>{" "}
      {session
        ? `${session.last_tool} (${session.step_count} steps · ${session.last_status})`
        : `${pageTitle} // STANDBY`}
      {disk?.available ? ` · ${disk.drive} ${disk.free_gb.toFixed(1)}G FREE` : ""}
      {branch ? ` · ${branch.toUpperCase()}` : ""}
    </span>
  );
}
