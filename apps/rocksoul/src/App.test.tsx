import { DEFAULT_MID_ISSUER_URL, encodeBase64Url } from "@moonwitness/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./lib/api", () => ({
  call: vi.fn(),
  isDesktop: vi.fn(() => false),
  subscribeEdgeOrmPubsub: vi.fn(() => () => {}),
}));
vi.mock("./features/world/WorldCanvas", () => ({
  default: ({ destination }: { destination: string }) => (
    <div data-testid="world-canvas" data-destination={destination} />
  ),
}));

import { call, isDesktop } from "./lib/api";
import App from "./App";
import { ROCKSOUL_MID_PKCE_KEY, ROCKSOUL_MID_SESSION_KEY } from "./lib/mid-oidc";

const TEXT_ENCODER = new TextEncoder();

function createTestIdToken(nonce: string): string {
  const header = encodeBase64Url(TEXT_ENCODER.encode(JSON.stringify({ alg: "ES256" })));
  const payload = encodeBase64Url(
    TEXT_ENCODER.encode(
      JSON.stringify({
        sub: "42",
        preferred_username: "rocksoul_op",
        name: "ROCKSOUL Operator",
        role: "admin",
        nonce,
      }),
    ),
  );
  return `${header}.${payload}.sig`;
}

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("App MoonWitness ID integration", () => {
  const localMap = createMemoryStorage();
  const sessionMap = createMemoryStorage();

  beforeEach(() => {
    localMap.map.clear();
    sessionMap.map.clear();
    vi.stubGlobal("localStorage", localMap);
    vi.stubGlobal("sessionStorage", sessionMap);
    delete (window as { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__;
    vi.mocked(isDesktop).mockReturnValue(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("completes browser /auth/callback exchange and surfaces @username in Topbar", async () => {
    sessionMap.map.set(
      ROCKSOUL_MID_PKCE_KEY,
      JSON.stringify({
        issuerUrl: DEFAULT_MID_ISSUER_URL,
        clientId: "rocksoul-dx",
        verifier: "verifier_for_browser_callback_test_01234567890123",
        state: "st_cb_1",
        nonce: "nc_cb_1",
        redirectUri: "http://localhost:1420/auth/callback",
        returnHash: "#/deck",
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const target = typeof input === "string" ? input : input.toString();
        if (target.endsWith("/oauth/token")) {
          return new Response(
            JSON.stringify({
              access_token: "acc_cb",
              id_token: createTestIdToken("nc_cb_1"),
              token_type: "Bearer",
              expires_in: 900,
              refresh_token: "rt_cb",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (target.endsWith("/oauth/userinfo")) {
          return new Response(
            JSON.stringify({
              sub: "42",
              preferred_username: "rocksoul_op",
              name: "ROCKSOUL Operator",
              email: "op@moonwitness.biz.id",
              role: "admin",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(null, { status: 404 });
      }),
    );

    render(
      <MemoryRouter initialEntries={["/auth/callback?code=mwc_cb_1&state=st_cb_1"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText("@rocksoul_op")).toBeInTheDocument();
    expect(localMap.map.get(ROCKSOUL_MID_SESSION_KEY)).toBeTruthy();
  });

  it("renders callback errors and recovers to workbench cleanly", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/callback?error=access_denied&error_description=User+denied"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("User denied");
    fireEvent.click(screen.getByRole("button", { name: "RETURN TO WORKBENCH" }));
    expect(await screen.findByRole("button", { name: /SIGN IN/i })).toBeInTheDocument();
  });

  it("triggers desktop loopback sign-in and sign-out from Topbar", async () => {
    (window as { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__ = {};
    vi.mocked(isDesktop).mockReturnValue(true);
    let nonce = "";

    const callMock = vi.mocked(call as unknown as (command: string, args?: unknown) => Promise<unknown>);
    callMock.mockImplementation(async (command, args: unknown) => {
      if (command === "get_dashboard") {
        return {
          stats: { active: 0, blocked: 0, completed: 0 },
          issues: [],
          repositories: [],
          events: [],
        };
      }
      if (command === "list_projects" || command === "list_milestones") return [];
      if (command === "get_monitor_snapshot") {
        return {
          generated_at: "2026-11-17T00:00:00Z",
          disks: [],
          services: [],
          agent_sessions: [],
          repositories: [],
          plans: [],
        };
      }
      if (command === "await_mid_loopback_callback") {
        const authorizeUrl = new URL((args as { authorizeUrl: string }).authorizeUrl);
        nonce = authorizeUrl.searchParams.get("nonce") ?? "";
        return {
          code: "mwc_desk",
          state: authorizeUrl.searchParams.get("state") ?? "",
          redirect_uri: "http://127.0.0.1:52000/callback",
        };
      }
      return undefined;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const target = typeof input === "string" ? input : input.toString();
        if (target.endsWith("/oauth/token")) {
          return new Response(
            JSON.stringify({
              access_token: "acc_desk",
              id_token: createTestIdToken(nonce),
              token_type: "Bearer",
              expires_in: 900,
              refresh_token: "rt_desk",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (target.endsWith("/oauth/userinfo")) {
          return new Response(
            JSON.stringify({
              sub: "42",
              preferred_username: "rocksoul_op",
              name: "ROCKSOUL Operator",
              email: "op@moonwitness.biz.id",
              role: "admin",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (target.endsWith("/oauth/revoke")) {
          return new Response(JSON.stringify({ revoked: true }), { status: 200 });
        }
        return new Response(null, { status: 404 });
      }),
    );

    render(
      <MemoryRouter initialEntries={["/deck"]}>
        <App />
      </MemoryRouter>,
    );

    const signInBtn = await screen.findByRole("button", { name: /SIGN IN/i });
    fireEvent.click(signInBtn);

    expect(await screen.findByText("@rocksoul_op")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign out @rocksoul_op" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /SIGN IN/i })).toBeInTheDocument());
  });
});
