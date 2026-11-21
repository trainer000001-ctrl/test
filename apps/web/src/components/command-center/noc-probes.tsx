"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, ZineCardRough } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";
import {
  fetchProbeNodes,
  fetchRecentProbeEvents,
  runProbes,
  type ProbeEvent,
  type ProbeNode,
} from "@/lib/api/probes";

export function NocProbesPanel() {
  const [nodes, setNodes] = useState<ProbeNode[]>([]);
  const [events, setEvents] = useState<ProbeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [nodesData, eventsData] = await Promise.all([
        fetchProbeNodes(),
        fetchRecentProbeEvents(10),
      ]);
      setNodes(Array.isArray(nodesData?.nodes) ? nodesData.nodes : []);
      setEvents(Array.isArray(eventsData?.events) ? eventsData.events : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NOC probes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunProbes = async (nodeId?: string) => {
    try {
      setProbing(true);
      setError(null);
      await runProbes(nodeId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Probe execution failed");
    } finally {
      setProbing(false);
    }
  };

  const getLatestEventForNode = (nodeId: string): ProbeEvent | undefined => {
    return events.find((ev) => ev.nodeId === nodeId);
  };

  return (
    <section aria-labelledby="noc-probes-heading" className="mt-4 scroll-mt-24">
      <SectionHeading
        id="noc-probes-heading"
        title="EDGE NOC"
        accent="HEALTH PROBES"
        note="consolidated igate runtime"
      />
      <ZineCardRough className="flex flex-col p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--border)]/40 pb-4">
          <div>
            <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-[var(--primary)]">
              SOVEREIGN GATEWAY PROBE MATRIX
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Canonical identity, API, and sanctuary endpoints verified by Core API.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={probing || loading}
            onClick={() => handleRunProbes()}
            className="border-2 border-[var(--border)] px-4 py-2 font-mono text-xs font-bold shadow-[3px_3px_0px_var(--ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            {probing ? "PROBING ALL NODES…" : "PROBE ALL NODES"}
          </Button>
        </div>

        {error && (
          <div className="mt-3 border-2 border-[var(--destructive)] bg-[var(--destructive)]/15 p-2 font-mono text-xs text-[var(--destructive)]">
            {error}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b-2 border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="py-2 pr-4">NODE</th>
                <th className="py-2 pr-4">CATEGORY</th>
                <th className="py-2 pr-4">TARGET</th>
                <th className="py-2 pr-4">STATUS</th>
                <th className="py-2 pr-4">LATENCY</th>
                <th className="py-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/40">
              {nodes.map((node) => {
                const latest = getLatestEventForNode(node.id);
                const isOk = latest ? latest.ok : null;
                return (
                  <tr key={node.id} className="hover:bg-[var(--muted)]/50">
                    <td className="py-2.5 pr-4 font-bold">{node.name}</td>
                    <td className="py-2.5 pr-4 text-[var(--muted-foreground)] uppercase">
                      {node.category}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[11px] opacity-80">
                      {node.targetUrl}
                    </td>
                    <td className="py-2.5 pr-4">
                      {isOk === null ? (
                        <span className="text-[var(--muted-foreground)]">UNPROBED</span>
                      ) : isOk ? (
                        <Badge
                          variant="default"
                          className="border-[var(--green)] bg-[var(--green)]/15 text-[var(--green)]"
                        >
                          ONLINE ({latest?.statusCode})
                        </Badge>
                      ) : (
                        <Badge
                          variant="default"
                          className="bg-[var(--destructive)] text-[var(--destructive-foreground)]"
                        >
                          DEGRADED ({latest?.statusCode})
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">{latest ? `${latest.latencyMs} ms` : "—"}</td>
                    <td className="py-2.5 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={probing}
                        onClick={() => handleRunProbes(node.id)}
                        className="min-h-0 border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-bold text-[var(--card-foreground)] shadow-[2px_2px_0px_var(--ink)] hover:bg-[var(--muted)]"
                      >
                        PROBE
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ZineCardRough>
    </section>
  );
}
