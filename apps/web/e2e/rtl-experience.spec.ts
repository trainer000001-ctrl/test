import { expect, test, type Page } from "@playwright/test";

const RTL_VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

async function mockRtlApi(page: Page): Promise<void> {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith("/api/v1/auth/me")) {
      return route.fulfill({
        status: 200,
        json: {
          user: { id: "ops-ar-1", displayName: "QA Steward", username: "qa", role: "admin" },
        },
      });
    }
    if (path.endsWith("/api/v1/control/auth/me")) {
      return route.fulfill({
        status: 200,
        json: {
          user: {
            id: "ops-ar-1",
            name: "QA Steward",
            email: "qa@moonwitness.test",
            role: "admin",
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
          instance: { id: "qa-rtl", name: "Moonwitness", version: "1.0.0" },
        },
      });
    }
    if (path.endsWith("/api/v1/control/status")) {
      return route.fulfill({
        status: 200,
        json: {
          reachable: true,
          host: {
            hostname: "arsy-rtl-node",
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
            cpu_pct: 22.4,
            load1: 0.42,
            load5: 0.35,
            load15: 0.28,
            mem_pct: 48.1,
            mem_used: 2_147_483_648,
            mem_total: 4_294_967_296,
            disk_pct: 31.0,
            disk_used: 15_000_000_000,
            disk_total: 50_000_000_000,
            disk_path: "/",
            swap_used: 0,
            swap_total: 0,
            uptime_sec: 7200,
          },
          units: [],
          certificates: [],
          audit: [],
        },
      });
    }
    if (path.endsWith("/api/v1/control/resources")) {
      return route.fulfill({ status: 200, json: {} });
    }
    if (path.endsWith("/api/v1/control/audit")) {
      return route.fulfill({ status: 200, json: [] });
    }
    if (path.endsWith("/api/v1/command-center/state")) {
      return route.fulfill({
        status: 200,
        json: {
          workflows: [
            {
              id: "wf-rtl-1",
              name: "Arabic Chronology Sync",
              detail: "Deterministic RTL preview",
              status: "Succeeded",
            },
          ],
          alerts: [],
          feed: [],
        },
      });
    }
    if (path.endsWith("/api/v1/command-center/stats")) {
      return route.fulfill({
        status: 200,
        json: {
          workflows: 1,
          running: 0,
          queued: 0,
          paused: 0,
          succeeded: 1,
          failed: 0,
          cancelled: 0,
          alerts: 0,
        },
      });
    }
    if (path.endsWith("/api/v1/timeline/eras")) {
      return route.fulfill({ status: 200, json: { data: [] } });
    }
    if (path.endsWith("/api/v1/timeline/stats")) {
      return route.fulfill({ status: 200, json: { data: { total: 0, byEra: {}, byKind: {} } } });
    }
    if (path.endsWith("/api/v1/timeline/events")) {
      return route.fulfill({ status: 200, json: { data: [], total: 0 } });
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
    if (path.endsWith("/api/v1/probes/nodes")) {
      return route.fulfill({ status: 200, json: { nodes: [] } });
    }
    if (path.endsWith("/api/v1/probes/events")) {
      return route.fulfill({ status: 200, json: { events: [], total: 0 } });
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
    return route.fulfill({ status: 200, json: { data: [] } });
  });
}

async function assertZeroHorizontalOverflow(page: Page, contextLabel: string): Promise<void> {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    metrics.scrollWidth,
    `Expected zero document horizontal overflow on ${contextLabel}: ${JSON.stringify(metrics)}`,
  ).toBeLessThanOrEqual(metrics.innerWidth);
  expect(
    metrics.bodyScrollWidth,
    `Expected zero body horizontal overflow on ${contextLabel}: ${JSON.stringify(metrics)}`,
  ).toBeLessThanOrEqual(metrics.innerWidth);
}

test.describe("Issue #487 — Arabic SSR & RTL Shared UI Experience", () => {
  test("emits Arabic SSR dir='rtl' and lang='ar' before client interaction", async ({
    request,
  }) => {
    for (const route of ["/ar", "/ar/moonwitness", "/ar/apps/control"]) {
      const bareResponse = await request.get(route);
      expect(bareResponse.status(), `SSR status for ${route}`).toBeLessThan(400);
      const bareHtml = await bareResponse.text();
      expect(bareHtml).toContain('lang="ar"');
      expect(bareHtml).toContain('dir="rtl"');
      expect(bareHtml).toContain('data-locale="ar"');

      const headerNegotiated = await request.get(route, {
        headers: { "accept-language": "ar" },
      });
      expect(headerNegotiated.status()).toBeLessThan(400);
      const negotiatedHtml = await headerNegotiated.text();
      expect(negotiatedHtml).toMatch(/<html[^>]*lang="ar"[^>]*dir="rtl"/);
    }
  });

  for (const vp of RTL_VIEWPORTS) {
    test.describe(`Viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("Sanctuary (/ar) maintains RTL alignment and zero horizontal overflow", async ({
        page,
      }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (err) => pageErrors.push(err.message));

        await page.goto("/ar", { waitUntil: "domcontentloaded" });
        await expect
          .poll(() =>
            page.evaluate(() => ({
              dir: document.documentElement.dir,
              lang: document.documentElement.lang,
              computedDir: getComputedStyle(document.body).direction,
            })),
          )
          .toEqual({ dir: "rtl", lang: "ar", computedDir: "rtl" });

        await expect(page.locator("section#the-gate")).toBeVisible();
        await expect(page.getByText("مَمْلَكَةُ النُّور")).toBeVisible();
        await assertZeroHorizontalOverflow(page, `/ar @ ${vp.width}`);

        if (vp.width >= 1024) {
          const brandBox = await page
            .locator("header.mw-site-nav .home-header-brand")
            .boundingBox();
          const searchBtnBox = await page
            .getByRole("button", { name: "البحث الشامل" })
            .boundingBox();
          expect(brandBox).not.toBeNull();
          expect(searchBtnBox).not.toBeNull();
          expect(brandBox!.x).toBeGreaterThan(searchBtnBox!.x);
        }

        expect(pageErrors).toEqual([]);
      });

      test("Chronicle (/ar/moonwitness) maintains RTL alignment and zero horizontal overflow", async ({
        page,
      }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (err) => pageErrors.push(err.message));
        await mockRtlApi(page);

        await page.goto("/ar/moonwitness", { waitUntil: "domcontentloaded" });
        await expect
          .poll(() =>
            page.evaluate(() => ({
              dir: document.documentElement.dir,
              lang: document.documentElement.lang,
            })),
          )
          .toEqual({ dir: "rtl", lang: "ar" });

        await expect(page.getByText("أناس. أماكن. حكايات.")).toBeVisible();
        await assertZeroHorizontalOverflow(page, `/ar/moonwitness @ ${vp.width}`);
        expect(pageErrors).toEqual([]);
      });

      test("Operations (/ar/apps/control & /ar/mission-control) align HUD rails & popovers in RTL without overflow", async ({
        page,
      }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (err) => pageErrors.push(err.message));
        await mockRtlApi(page);

        for (const opsRoute of ["/ar/apps/control", "/ar/mission-control"]) {
          await page.goto(opsRoute, { waitUntil: "domcontentloaded" });
          await expect
            .poll(() =>
              page.evaluate(() => ({
                dir: document.documentElement.dir,
                lang: document.documentElement.lang,
              })),
            )
            .toEqual({ dir: "rtl", lang: "ar" });

          await expect(page.locator("header.hud-top-rail")).toBeVisible();
          await expect(page.locator("main#main")).toBeVisible();
          await assertZeroHorizontalOverflow(page, `${opsRoute} @ ${vp.width}`);

          const railBox = await page.locator(".console-shell-rail").boundingBox();
          const mainBox = await page.locator("main#main").boundingBox();
          const actionsBox = await page.locator(".hud-top-actions").boundingBox();
          const footerBox = await page.locator("footer.hud-panel").boundingBox();

          expect(railBox).not.toBeNull();
          expect(mainBox).not.toBeNull();
          expect(actionsBox).not.toBeNull();
          expect(footerBox).not.toBeNull();

          expect(actionsBox!.x).toBeGreaterThanOrEqual(0);
          expect(actionsBox!.x + actionsBox!.width).toBeLessThanOrEqual(vp.width + 1);

          if (vp.width >= 1024) {
            expect(railBox!.x + railBox!.width).toBeGreaterThanOrEqual(vp.width - 2);
            expect(mainBox!.x + mainBox!.width).toBeLessThanOrEqual(railBox!.x + 2);
          } else {
            expect(railBox!.y + railBox!.height).toBeLessThanOrEqual(vp.height + 1);
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            const scrolledRailBox = await page.locator(".console-shell-rail").boundingBox();
            const scrolledFooterBox = await page.locator("footer.hud-panel").boundingBox();
            expect(scrolledRailBox).not.toBeNull();
            expect(scrolledFooterBox).not.toBeNull();
            expect(scrolledFooterBox!.y + scrolledFooterBox!.height).toBeLessThanOrEqual(
              scrolledRailBox!.y + 2,
            );
            await page.evaluate(() => window.scrollTo(0, 0));
          }
        }

        await page.getByRole("button", { name: "Change language" }).click();
        const popover = page.locator('[role="dialog"]').last();
        await expect(popover).toBeVisible();
        const popoverBox = await popover.boundingBox();
        expect(popoverBox).not.toBeNull();
        expect(popoverBox!.x).toBeGreaterThanOrEqual(0);
        expect(popoverBox!.x + popoverBox!.width).toBeLessThanOrEqual(vp.width + 1);
        await page.keyboard.press("Escape");

        expect(pageErrors).toEqual([]);
      });
    });
  }

  test("isolates mixed Arabic/Latin/numeric bidi runs and preserves Arabic ligature tracking", async ({
    page,
  }) => {
    await mockRtlApi(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ar/apps/control", { waitUntil: "domcontentloaded" });

    await expect
      .poll(() => page.evaluate(() => document.documentElement.dir), { timeout: 20_000 })
      .toBe("rtl");

    const bidiResult = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.setAttribute("data-testid", "bidi-probe");
      probe.innerHTML = [
        '<span class="font-mono" id="probe-mono">192.0.2.1 // 1420.4 MHz</span>',
        '<span data-ltr="true" id="probe-ltr">MOONWITNESS-487</span>',
        '<code id="probe-code">arsy serve --port 3002</code>',
        '<h2 class="font-brush" id="probe-ar-heading">مملكة النور والقمر</h2>',
      ].join("");
      document.body.append(probe);

      const inspect = (id: string) => {
        const el = document.getElementById(id)!;
        const cs = getComputedStyle(el);
        return {
          direction: cs.direction,
          unicodeBidi: cs.unicodeBidi,
          letterSpacing: cs.letterSpacing,
        };
      };

      const snapshot = {
        mono: inspect("probe-mono"),
        ltr: inspect("probe-ltr"),
        code: inspect("probe-code"),
        heading: inspect("probe-ar-heading"),
      };
      probe.remove();
      return snapshot;
    });

    expect(bidiResult.mono.direction).toBe("ltr");
    expect(bidiResult.mono.unicodeBidi).toBe("isolate");
    expect(bidiResult.ltr.direction).toBe("ltr");
    expect(bidiResult.ltr.unicodeBidi).toBe("isolate");
    expect(bidiResult.code.direction).toBe("ltr");
    expect(bidiResult.code.unicodeBidi).toBe("isolate");
    expect(["0px", "normal"]).toContain(bidiResult.heading.letterSpacing);
  });

  test("supports keyboard focus order and RTL directional navigation on Sanctuary and SideRail", async ({
    page,
  }) => {
    await mockRtlApi(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ar", { waitUntil: "domcontentloaded" });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dir), { timeout: 20_000 })
      .toBe("rtl");

    const visitedTags: string[] = [];
    for (let step = 0; step < 5; step += 1) {
      await page.keyboard.press("Tab");
      const activeTag = await page.evaluate(() => document.activeElement?.tagName ?? "");
      visitedTags.push(activeTag);
    }
    expect(visitedTags.some((tag) => tag === "A" || tag === "BUTTON")).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ar/apps/control", { waitUntil: "domcontentloaded" });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dir), { timeout: 20_000 })
      .toBe("rtl");
    await expect(page.getByText("VERIFYING SOVEREIGN SESSION…")).toBeHidden();

    const railLinks = page.locator(".console-shell-rail .hud-nav-items a[href]");
    await expect(railLinks).toHaveCount(7);
    const linkCount = await railLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(3);

    await railLinks.nth(0).focus();
    await expect(railLinks.nth(0)).toBeFocused();

    await page.keyboard.press("ArrowLeft");
    await expect(railLinks.nth(1)).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(railLinks.nth(0)).toBeFocused();

    await page.keyboard.press("End");
    await expect(railLinks.nth(linkCount - 1)).toBeFocused();

    await page.keyboard.press("Home");
    await expect(railLinks.nth(0)).toBeFocused();
  });
});
