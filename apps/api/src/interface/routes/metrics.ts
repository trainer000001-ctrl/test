const DURATION_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000] as const;

export interface AddonMetricSummary {
  total: number;
  installed: number;
  disabled: number;
}

export interface ApiMetricsCollector {
  observeRequest(method: string, statusCode: number, durationMs: number): void;
  renderPrometheus(addons?: AddonMetricSummary): string;
}

function statusClass(code: number): string {
  if (code >= 500) return "5xx";
  if (code >= 400) return "4xx";
  if (code >= 300) return "3xx";
  if (code >= 200) return "2xx";
  return "1xx";
}

function sanitizeMethod(method: string): string {
  const upper = method.trim().toUpperCase();
  return /^[A-Z]+$/.test(upper) ? upper : "OTHER";
}

/** Lightweight dependency-free Prometheus text format collector for Fastify API routes. */
export function createApiMetricsCollector(): ApiMetricsCollector {
  const requestCounts = new Map<string, number>();
  const bucketCounts = new Map<number, number>();
  for (const bound of DURATION_BUCKETS_MS) {
    bucketCounts.set(bound, 0);
  }
  let totalCount = 0;
  let durationSumMs = 0;

  return {
    observeRequest(method: string, statusCode: number, durationMs: number): void {
      const m = sanitizeMethod(method);
      const cls = statusClass(statusCode);
      const key = `${m}|${cls}`;
      requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);

      const safeDuration = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
      totalCount += 1;
      durationSumMs += safeDuration;
      for (const bound of DURATION_BUCKETS_MS) {
        if (safeDuration <= bound) {
          bucketCounts.set(bound, (bucketCounts.get(bound) ?? 0) + 1);
        }
      }
    },

    renderPrometheus(addons?: AddonMetricSummary): string {
      const lines: string[] = [
        "# HELP moonwitness_http_requests_total Total HTTP requests processed by Moonwitness API.",
        "# TYPE moonwitness_http_requests_total counter",
      ];

      for (const [key, value] of [...requestCounts.entries()].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        const [method, cls] = key.split("|");
        lines.push(
          `moonwitness_http_requests_total{method="${method}",status_class="${cls}"} ${value}`,
        );
      }

      lines.push(
        "# HELP moonwitness_http_request_duration_ms HTTP request duration histogram in milliseconds.",
        "# TYPE moonwitness_http_request_duration_ms histogram",
      );
      for (const bound of DURATION_BUCKETS_MS) {
        lines.push(
          `moonwitness_http_request_duration_ms_bucket{le="${bound}"} ${bucketCounts.get(bound) ?? 0}`,
        );
      }
      lines.push(`moonwitness_http_request_duration_ms_bucket{le="+Inf"} ${totalCount}`);
      lines.push(`moonwitness_http_request_duration_ms_sum ${durationSumMs.toFixed(3)}`);
      lines.push(`moonwitness_http_request_duration_ms_count ${totalCount}`);

      const mem = process.memoryUsage();
      lines.push(
        "# HELP moonwitness_process_uptime_seconds Node process uptime in seconds.",
        "# TYPE moonwitness_process_uptime_seconds gauge",
        `moonwitness_process_uptime_seconds ${Math.floor(process.uptime())}`,
        "# HELP moonwitness_process_resident_memory_bytes Resident set size in bytes.",
        "# TYPE moonwitness_process_resident_memory_bytes gauge",
        `moonwitness_process_resident_memory_bytes ${mem.rss}`,
      );

      if (addons) {
        lines.push(
          "# HELP moonwitness_addons_total Registered addons by runtime state.",
          "# TYPE moonwitness_addons_total gauge",
          `moonwitness_addons_total{state="total"} ${addons.total}`,
          `moonwitness_addons_total{state="installed"} ${addons.installed}`,
          `moonwitness_addons_total{state="disabled"} ${addons.disabled}`,
        );
      }

      return `${lines.join("\n")}\n`;
    },
  };
}
