import { expect, test, type Page } from "@playwright/test";
import type { Era, TimelineEvent } from "@moonwitness/contracts/types";

const JOURNEY_VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const SAMPLE_ERAS: Era[] = [
  {
    id: "origins",
    name: "Origins",
    years: "2020-2022",
    tagline: "First witnesses.",
    color: "#3b82f6",
  },
  {
    id: "neon",
    name: "Neon",
    years: "2022-2024",
    tagline: "City signals.",
    color: "#ec4899",
  },
];

const SAMPLE_EVENTS: TimelineEvent[] = [
  {
    id: "evt-001",
    kind: "PROJECT",
    date: "2021-03-12",
    era: "origins",
    title: "First Witness Station",
    excerpt: "We lit the first relay.",
    body: "The first station came online under a waxing moon.",
    location: "Rooftop, Sector 1",
    tags: ["station", "relay"],
    sources: 2,
    notes: 1,
    image: "hero-witness",
    related: ["evt-002"],
  },
  {
    id: "evt-002",
    kind: "STORY",
    date: "2022-08-21",
    era: "neon",
    title: "Signal in the Fog",
    excerpt: "A voice came through the static.",
    body: "We traced the call back to the old tunnel network.",
    location: "Tunnel 7",
    tags: ["signal", "voice"],
    sources: 4,
    notes: 2,
    image: "signal-tunnel",
    related: ["evt-001"],
  },
];

async function mockJourneyApis(page: Page, role: "admin" | "viewer" = "admin"): Promise<void> {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith("/api/v1/auth/me")) {
      return route.fulfill({
        status: 200,
        json: {
          user: { id: "journey-1", displayName: "Journey Steward", username: "steward", role },
        },
      });
    }
    if (path.endsWith("/api/v1/control/auth/me")) {
      return route.fulfill({
        status: 200,
        json: {
          user: {
            id: "journey-1",
            name: "Journey Steward",
            email: "steward@moonwitness.test",
            role,
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    }
    if (path.endsWith("/api/v1/control/setup/status")) {
      return route.fulfill({
        status: 200,
        json: {
          initialized: true,
          version: "1.0.0",
          instance: { id: "journey-1", name: "Moonwitness", version: "1.0.0" },
        },
      });
    }
    if (path.endsWith("/api/v1/control/status")) {
      return route.fulfill({
        status: 200,
        json: {
          reachable: true,
          host: {
            hostname: "arsy-journey-node",
            os: "linux",
            arch: "x86_64",
            kernel: "6.8.0",
            is_root: true,
            capabilities: {
              systemd: false,
              docker: false,
              files: true,
              cron: false,
              users: false,
              firewall: false,
              host_metrics: true,
              network: false,
              ssh: false,
              cert: false,
              mount: false,
              alert: false,
              kubernetes: false,
            },
          },
          metrics: {
            time: "2026-11-20T12:00:00Z",
            cpu_pct: 14.5,
            load1: 0.25,
            load5: 0.2,
            load15: 0.18,
            mem_pct: 42.0,
            mem_used: 1_800_000_000,
            mem_total: 4_294_967_296,
            disk_pct: 28.0,
            disk_used: 14_000_000_000,
            disk_total: 50_000_000_000,
            disk_path: "/",
            swap_used: 0,
            swap_total: 0,
            uptime_sec: 3600,
          },
          units: [],
          certificates: [],
          audit: [],
        },
      });
    }
    if (path.endsWith("/api/v1/timeline/eras")) {
      return route.fulfill({ status: 200, json: { data: SAMPLE_ERAS } });
    }
    if (path.endsWith("/api/v1/timeline/stats")) {
      return route.fulfill({
        status: 200,
        json: {
          data: {
            total: SAMPLE_EVENTS.length,
            byEra: { origins: 1, neon: 1 },
            byKind: { PROJECT: 1, STORY: 1 },
          },
        },
      });
    }
    if (path.includes("/api/v1/timeline/events/")) {
      const id = decodeURIComponent(path.split("/").pop() ?? "");
      const found = SAMPLE_EVENTS.find((event) => event.id === id);
      if (!found) {
        return route.fulfill({ status: 404, json: { error: "Not found" } });
      }
      return route.fulfill({ status: 200, json: { data: found } });
    }
    if (path.endsWith("/api/v1/timeline/events")) {
      const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
      const filtered = SAMPLE_EVENTS.filter(
        (event) =>
          !q ||
          `${event.title} ${event.excerpt} ${event.body} ${event.tags.join(" ")}`
            .toLowerCase()
            .includes(q),
      );
      return route.fulfill({
        status: 200,
        json: { data: filtered, total: filtered.length },
      });
    }
    if (path.endsWith("/api/v1/radius/users")) {
      return route.fulfill({
        status: 200,
        json: [{ id: "u-1", username: "alice", enabled: true }],
      });
    }
    if (path.endsWith("/api/v1/snmp/stats")) {
      return route.fulfill({
        status: 200,
        json: { total_devices: 0, enabled_devices: 0, total_targets: 0, total_samples: 0 },
      });
    }
    if (path.endsWith("/api/v1/snmp/devices")) {
      return route.fulfill({ status: 200, json: [] });
    }
    if (path.endsWith("/api/v1/syslog/messages")) {
      return route.fulfill({ status: 200, json: [] });
    }
    if (path.endsWith("/api/v1/_meta/navigation")) {
      return route.fulfill({ status: 200, json: { menus: [] } });
    }
    if (path.endsWith("/api/v1/_meta/models")) {
      return route.fulfill({ status: 200, json: { models: ["witness.claim", "timeline.event"] } });
    }
    if (path.endsWith("/api/v1/_meta/companies")) {
      return route.fulfill({ status: 200, json: { companies: [] } });
    }
    if (path.endsWith("/api/v1/performance/summary")) {
      return route.fulfill({
        status: 200,
        json: {
          runtime: { rssMb: 128, heapUsedMb: 64, heapTotalMb: 96, uptimeSec: 1200 },
          widgets: [],
        },
      });
    }
    if (path.endsWith("/api/v1/probes/nodes")) {
      return route.fulfill({ status: 200, json: { nodes: [] } });
    }
    if (path.endsWith("/api/v1/probes/events")) {
      return route.fulfill({ status: 200, json: { events: [], total: 0 } });
    }
    if (path.endsWith("/api/v1/command-center/state")) {
      return route.fulfill({ status: 200, json: { workflows: [], alerts: [], feed: [] } });
    }
    if (path.endsWith("/api/v1/command-center/stats")) {
      return route.fulfill({
        status: 200,
        json: {
          workflows: 0,
          running: 0,
          queued: 0,
          paused: 0,
          succeeded: 0,
          failed: 0,
          cancelled: 0,
          alerts: 0,
        },
      });
    }
    if (path.endsWith("/api/v1/control/resources")) {
      return route.fulfill({ status: 200, json: {} });
    }
    if (path.endsWith("/api/v1/control/audit")) {
      return route.fulfill({ status: 200, json: [] });
    }
    if (path.endsWith("/api/v1/control/vpn/status")) {
      return route.fulfill({
        status: 200,
        json: {
          enabled: false,
          interface: "wg0",
          address: "10.0.0.1/24",
          listen_port: 51820,
          endpoint: "",
          manage_firewall: false,
          public_key: "test-public-key",
          server_configured: true,
          peer_count: 0,
          peers: [],
          subnets: [],
          available: true,
          missing_tools: [],
        },
      });
    }
    return route.fulfill({ status: 200, json: { data: [] } });
  });
}

test.describe("Issue #488 — End-to-End Experience Journeys", () => {
  for (const vp of JOURNEY_VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("Sanctuary journey: gate, world selection, universal search, and locale history", async ({
        page,
      }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (err) => pageErrors.push(err.message));

        await page.goto("/", { waitUntil: "domcontentloaded" });
        await expect(page.locator("section#the-gate")).toBeVisible();
        await expect(page.locator("section#the-gate h1")).toBeVisible();

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);

        const worldTile = page.locator(".mw-world-tile").first();
        await worldTile.click();
        await expect(worldTile).toHaveAttribute("aria-pressed", "true");

        await page.getByRole("button", { name: "Universal Search" }).click();
        const searchDialog = page.getByRole("dialog", { name: "Search the Empire of the Light" });
        await expect(searchDialog).toBeVisible();
        await searchDialog.getByRole("searchbox", { name: "Search query" }).fill("Sidra");
        await expect(searchDialog.getByText(/SIDRA/i).first()).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(searchDialog).toBeHidden();

        if (vp.width < 1024) {
          const mobileToggle = page.getByRole("button", { name: "Toggle Empire Navigation Menu" });
          await mobileToggle.click();
          await expect(page.locator("#mobile-sanctuary-nav")).toBeVisible();
          await page
            .locator("#mobile-sanctuary-nav")
            .getByRole("button", { name: /Cycle language/i })
            .click();
        } else {
          await page.goto("/en", { waitUntil: "domcontentloaded" });
          await page.locator('header.mw-site-nav [title="Switch Language"]').click();
          await expect(page).toHaveURL(/\/id$/);
          await page.locator('header.mw-site-nav [title="Ganti Bahasa"]').click();
          await expect(page).toHaveURL(/\/ar$/);
          await expect
            .poll(() => page.evaluate(() => document.documentElement.dir), { timeout: 20_000 })
            .toBe("rtl");

          await page.goBack();
          await expect(page).toHaveURL(/\/id$/);
          await expect
            .poll(() => page.evaluate(() => document.documentElement.dir), { timeout: 20_000 })
            .toBe("ltr");

          await page.goBack();
          await expect(page).toHaveURL(/\/en$/);
        }

        expect(pageErrors).toEqual([]);
      });

      test("Chronicle journey: /moonwitness, /[lang]/moonwitness, archive search query, and back/forward", async ({
        page,
      }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (err) => pageErrors.push(err.message));
        await mockJourneyApis(page);

        await page.goto("/en/moonwitness", { waitUntil: "domcontentloaded" });
        await expect(page.getByText("PEOPLE. PLACES. STORIES.")).toBeVisible();

        await page.goto("/id/moonwitness", { waitUntil: "domcontentloaded" });
        await expect(page.getByText("MANUSIA. TEMPAT. KISAH.")).toBeVisible();

        await page.goto("/ar/moonwitness", { waitUntil: "domcontentloaded" });
        await expect(page.getByText("أناس. أماكن. حكايات.")).toBeVisible();
        await expect
          .poll(() => page.evaluate(() => document.documentElement.dir), { timeout: 20_000 })
          .toBe("rtl");

        // Visiting /ar/moonwitness writes the locale cookie (explicit-lang TranslationWrapper
        // effect); the unprefixed route then renders in Arabic. Reset so the default-locale
        // unprefixed route and its English search dialog selectors are deterministic.
        await page.context().clearCookies();
        await page.goto("/moonwitness", { waitUntil: "domcontentloaded" });
        await expect(page.locator("#home h1")).toContainText(/MOONWITNESS/i);

        await page.getByRole("button", { name: "Search the archive" }).click();
        const searchDialog = page.getByRole("dialog", { name: "Search the archive" });
        await expect(searchDialog).toBeVisible();
        await searchDialog.getByRole("textbox", { name: "SEARCH THE SIGNALS" }).fill("signal");
        await searchDialog.getByRole("button", { name: "GO" }).click();

        await expect(page).toHaveURL(/\/dock\?q=signal/);
        await expect(page.getByRole("textbox", { name: "Search timeline events…" })).toHaveValue(
          "signal",
        );
        await expect(page.getByRole("button", { name: /SIGNAL IN THE FOG/i })).toBeVisible();

        await page.goBack();
        await expect(page).toHaveURL(/\/moonwitness$/);
        await expect(page.locator("#home")).toBeVisible();

        await page.goForward();
        await expect(page).toHaveURL(/\/dock\?q=signal/);
        await expect(page.getByRole("textbox", { name: "Search timeline events…" })).toHaveValue(
          "signal",
        );

        expect(pageErrors).toEqual([]);
      });

      test("Operations journey: command palette, localized navigation, and auth guard checks", async ({
        page,
      }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (err) => pageErrors.push(err.message));

        // Disable the dev-only session fallback (session.ts: mw_dev_user) so the mocked
        // auth/me 401 actually yields a null session and AuthGuard performs the localized
        // redirect instead of letting ControlGate reach its setup redirect first.
        await page.addInitScript(() => {
          window.localStorage.setItem("mw_dev_user", "0");
        });

        // 1. AuthGuard unauthenticated redirect on localized private Operations route
        await page.route("**/api/v1/auth/me", (route) =>
          route.fulfill({
            status: 401,
            contentType: "application/json",
            body: '{"error":"unauthorized"}',
          }),
        );
        await page.goto("/en/apps/control", { waitUntil: "domcontentloaded" });
        await page.waitForURL(/\/en\/shadow\?redirectTo=/);
        expect(page.url()).toContain("/en/shadow?redirectTo=%2Fen%2Fapps%2Fcontrol");

        await page.goto("/ar/apps/control", { waitUntil: "domcontentloaded" });
        await page.waitForURL(/\/ar\/shadow\?redirectTo=/);
        expect(page.url()).toContain("/ar/shadow?redirectTo=%2Far%2Fapps%2Fcontrol");

        // 2. Viewer role RBAC guard on RADIUS operations view
        await page.unroute("**/api/v1/auth/me");
        await mockJourneyApis(page, "viewer");
        await page.goto("/control?tab=radius", { waitUntil: "domcontentloaded" });
        await expect(page.getByText("alice")).toBeVisible();
        await expect(page.getByRole("button", { name: "Add user" })).toHaveCount(0);
        await expect(
          page
            .getByRole("region", { name: "RADIUS users" })
            .getByText(
              "Your role cannot manage RADIUS users. Ask an administrator for write access.",
            ),
        ).toBeVisible();

        // 3. Authenticated admin: command palette + localized navigation + back/forward
        await page.unroute("**/api/v1/**");
        await mockJourneyApis(page, "admin");
        await page.goto("/en/apps/control", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /ARSY CONTROL PLANE/i })).toBeVisible();

        // Switch Control hub tab cleanly without horizontal overflow
        await page.getByRole("tab", { name: "SNMP" }).click();
        await expect(page).toHaveURL(/\/en\/apps\/control\?tab=snmp/);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);

        // Open Sovereign Command Palette with keyboard shortcut and navigate
        await page.keyboard.press("Control+k");
        const palette = page.getByRole("dialog", { name: "Sovereign Command Palette" });
        await expect(palette).toBeVisible();
        await palette.getByRole("combobox").fill("witness.claim");
        await palette.getByRole("option", { name: /witness\.claim/i }).click();
        await expect(page).toHaveURL(/\/en\/apps\/addons\?model=witness\.claim/);

        // Switch locale from EN -> AR via LanguageDropdown and verify RTL + back/forward
        await page.getByRole("button", { name: "Change language" }).click();
        await page.getByRole("button", { name: /العربية/ }).click();
        await expect(page).toHaveURL(/\/ar\/apps\/addons\?model=witness\.claim/);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.dir), { timeout: 20_000 })
          .toBe("rtl");

        await page.goBack();
        await expect(page).toHaveURL(/\/en\/apps\/addons\?model=witness\.claim/);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.dir), { timeout: 20_000 })
          .toBe("ltr");

        expect(pageErrors).toEqual([]);
      });
    });
  }
});
