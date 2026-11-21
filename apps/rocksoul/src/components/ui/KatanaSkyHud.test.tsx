import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KatanaSkyHud, extractPort } from "./KatanaSkyHud";
import type { MonitorSnapshot } from "../../lib/contracts";

describe("extractPort", () => {
  it("extracts explicit ports from IPv4, IPv6, and query-string URLs", () => {
    expect(extractPort("http://127.0.0.1:3000/moonwitness")).toBe("3000");
    expect(extractPort("http://[::1]:3000/moonwitness")).toBe("3000");
    expect(extractPort("http://127.0.0.1:3000?tab=1")).toBe("3000");
  });

  it("defaults portless URLs by protocol and handles invalid URLs safely", () => {
    expect(extractPort("https://a-l-l-a-h.com")).toBe("443");
    expect(extractPort("http://a-l-l-a-h.com/scriptures")).toBe("80");
    expect(extractPort("not-a-url")).toBe("—");
  });
});

describe("KatanaSkyHud", () => {
  it("renders parsed ports cleanly for mixed IPv4, IPv6, portless HTTPS, and query URLs", () => {
    const snapshot: MonitorSnapshot = {
      generated_at: "2026-11-18T00:00:00Z",
      disks: [],
      services: [
        {
          id: "web",
          name: "Web",
          url: "http://127.0.0.1:3000/moonwitness",
          status: "online",
          http_status: 200,
          latency_ms: 5,
        },
        {
          id: "ipv6",
          name: "IPv6",
          url: "http://[::1]:3000/moonwitness",
          status: "online",
          http_status: 200,
          latency_ms: 4,
        },
        {
          id: "allah",
          name: "A-L-L-A-H",
          url: "https://a-l-l-a-h.com",
          status: "online",
          http_status: 200,
          latency_ms: 12,
        },
        {
          id: "query",
          name: "Query",
          url: "http://127.0.0.1:3000?tab=1",
          status: "offline",
          http_status: null,
          latency_ms: null,
        },
      ],
      agent_sessions: [],
      repositories: [],
      plans: [],
    };

    render(<KatanaSkyHud monitor={snapshot} mode="compact" />);

    expect(screen.getByRole("button", { name: "Sky reticle web port 3000" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sky reticle ipv6 port 3000" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sky reticle allah port 443" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sky reticle query port 3000" })).toBeInTheDocument();
  });
});
