import { expect, test as base, type Locator, type Page, type TestInfo } from "@playwright/test";

const viewports = [
  { width: 1672, height: 1000 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];
const presets = [
  { id: "default", label: "Moonwitness" },
  { id: "riot", label: "Riot" },
  { id: "editorial", label: "Editorial" },
  { id: "technical", label: "Technical" },
  { id: "archive", label: "Archive" },
  { id: "transmission", label: "Transmission" },
];
const readFixtures: Record<string, unknown> = {
  "/api/v1/auth/me": { user: null },
  "/api/v1/command-center/state": {
    workflows: [
      {
        id: "console-read-only",
        name: "Fixture archive indexing",
        detail: "Deterministic console preview",
        status: "Succeeded",
      },
    ],
    alerts: [],
  },
  "/api/v1/command-center/stats": {
    workflows: 1,
    running: 0,
    queued: 0,
    paused: 0,
    succeeded: 1,
    failed: 0,
    cancelled: 0,
    alerts: 0,
  },
  "/api/v1/timeline/events": { data: [], total: 0 },
  "/api/v1/timeline/eras": { data: [] },
  "/api/v1/timeline/stats": { data: { total: 0, byEra: {}, byKind: {} } },
  "/api/v1/probes/nodes": {
    nodes: [
      {
        id: "id-provider",
        name: "MID Sovereign",
        targetUrl: "https://mid.moonwitness.biz.id/health",
        environment: "production",
        isEdge: true,
      },
    ],
  },
  "/api/v1/probes/events": {
    events: [],
    total: 0,
  },
  "/api/v1/_meta/models": { models: [] },
};

// All browser API traffic stays local to fixtures; accidental mutations fail without reaching a server.
const test = base.extend<{ runtimeGuard: void }>({
  runtimeGuard: [
    async ({ context, page }, use) => {
      const errors: string[] = [];
      const blocked: string[] = [];
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.stack ?? error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") {
          const location = message.location();
          errors.push(`console: ${message.text()} (${location.url}:${location.lineNumber})`);
        }
      });
      page.on("response", (response) => {
        if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
      });
      page.on("requestfailed", (request) => {
        const reason = request.failure()?.errorText;
        // Next navigation can intentionally cancel an in-flight read.
        if (reason !== "net::ERR_ABORTED") errors.push(`requestfailed: ${request.url()} ${reason}`);
      });
      await context.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (!["GET", "HEAD"].includes(request.method())) {
          blocked.push(`${request.method()} ${url.pathname}`);
          await route.fulfill({ status: 405, json: { error: "Console tests are read-only" } });
        } else if (url.pathname.startsWith("/api/")) {
          if (Object.hasOwn(readFixtures, url.pathname)) {
            await route.fulfill({ json: readFixtures[url.pathname] });
          } else {
            blocked.push(`Unmocked API: ${url.pathname}`);
            await route.fulfill({ status: 404, json: { error: "Missing read-only fixture" } });
          }
        } else {
          await route.continue();
        }
      });
      await use();
      expect.soft(blocked, "No writes or unmocked API requests").toEqual([]);
      expect.soft(errors, "No console errors, pageerrors, or failed resources").toEqual([]);
    },
    { auto: true },
  ],
});

test.use({
  viewport: { width: 1672, height: 1000 },
  colorScheme: "dark",
  reducedMotion: "reduce",
  serviceWorkers: "block",
  screenshot: "only-on-failure",
});

async function openConsole(page: Page) {
  await page.goto("/mission-control");
  await expect(
    page.getByRole("region", { name: /universe\s*status/i }).getByText("LIVE", { exact: true }),
  ).toBeVisible();
}

async function noHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect
    .soft(dimensions.document, JSON.stringify(dimensions))
    .toBeLessThanOrEqual(dimensions.viewport + 1);
  expect
    .soft(dimensions.body, JSON.stringify(dimensions))
    .toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  if (!value) throw new Error(`No visible bounds: ${locator}`);
  return value;
}

async function hudStyle(surface: Locator) {
  return surface.evaluate((element) => {
    const style = getComputedStyle(element);
    return JSON.stringify({
      background: style.backgroundColor,
      borderWidths: [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ],
      borderStyles: [
        style.borderTopStyle,
        style.borderRightStyle,
        style.borderBottomStyle,
        style.borderLeftStyle,
      ],
      borderColors: [
        style.borderTopColor,
        style.borderRightColor,
        style.borderBottomColor,
        style.borderLeftColor,
      ],
      shadow: style.boxShadow,
      borderRadius: style.borderRadius,
      fontFamily: style.fontFamily,
      letterSpacing: style.letterSpacing,
    });
  });
}

for (const viewport of viewports) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("console landmarks, overflow, and footer clearance", async ({ page }, info) => {
      await openConsole(page);
      await screenshot(page, info, `console-${viewport.width}-top`);
      await expect(page.getByRole("main", { includeHidden: true })).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, includeHidden: true })).toHaveCount(1);
      await noHorizontalOverflow(page);

      const footer = page.getByRole("contentinfo");
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeInViewport();
      await screenshot(page, info, `console-${viewport.width}-footer`);
      if (viewport.width < 1024) {
        const footerBox = await box(footer);
        const navBox = await box(page.getByRole("navigation", { name: "The Empire", exact: true }));
        expect.soft(footerBox.y).toBeGreaterThanOrEqual(0);
        expect
          .soft(footerBox.y + footerBox.height, "Footer must finish above fixed mobile navigation")
          .toBeLessThanOrEqual(navBox.y + 1);
        expect.soft(navBox.y + navBox.height).toBeLessThanOrEqual(viewport.height + 1);
      }
      await noHorizontalOverflow(page);
    });

    test("Atlas leads the workspace with a readable command-stage composition", async ({
      page,
    }) => {
      await openConsole(page);
      const atlas = page.getByRole("region", { name: /universe\s*map/i });
      const workspace = page.getByRole("region", { name: /recent workspace/i });
      const atlasBox = await box(atlas);
      const workspaceBox = await box(workspace);
      expect(atlasBox.y + atlasBox.height).toBeLessThanOrEqual(workspaceBox.y);
      if (viewport.width >= 1024) {
        const mainBox = await box(page.getByRole("main"));
        expect(atlasBox.width).toBeGreaterThan(mainBox.width * 0.6);
        expect(atlasBox.y).toBeLessThan(viewport.height * 0.55);
      }
      await noHorizontalOverflow(page);
    });

    test("search finds golden results, handles no matches, and resets", async ({ page }) => {
      await openConsole(page);
      const search = page.getByRole("textbox", { name: /search projects/i });
      const workspace = page.getByRole("region", { name: /recent workspace/i });
      const pipeline = page.getByRole("region", { name: /editorial\s*pipeline/i });
      const collections = page.getByRole("region", { name: /collections\s*overview/i });
      const regions = [workspace, pipeline, collections];
      const originalCounts = await Promise.all(
        regions.map((region) => region.getByRole("button").count()),
      );
      expect(originalCounts.every((count) => count > 1)).toBe(true);

      await search.fill("  NeOn  ");
      await expect(workspace.getByRole("button")).toHaveCount(1);
      await expect(workspace.getByRole("button", { name: /neon cities poster/i })).toBeVisible();
      await expect(pipeline.getByRole("button", { name: /neon cities/i })).toHaveCount(2);
      await expect(collections.getByRole("button")).toHaveCount(1);
      await expect(collections.getByRole("button", { name: /neon cities/i })).toBeVisible();

      await search.fill("no-console-match-7f31");
      for (const region of regions) await expect(region.getByRole("button")).toHaveCount(0);
      await expect(page.getByText("No workflows match.", { exact: true })).toBeVisible();
      await expect(page.getByText("No feed items match.", { exact: true })).toBeVisible();
      await search.fill("");
      await expect(search).toHaveValue("");
      for (const [index, region] of regions.entries()) {
        await expect(region.getByRole("button")).toHaveCount(originalCounts[index] ?? 0);
      }
      await expect(workspace.getByRole("button", { name: /batteries/i })).toBeVisible();
      await noHorizontalOverflow(page);
    });

    test("module drawer traps focus and returns it after Escape and close", async ({ page }) => {
      await openConsole(page);
      const opener = page.getByRole("button", { name: /new episode/i });
      const drawer = page.getByRole("dialog", { name: /story forge console/i });
      const close = drawer.getByRole("button", { name: "Close module console" });
      await opener.focus();
      await page.keyboard.press("Enter");
      await expect(drawer).toBeVisible();
      await expect(drawer).toHaveAttribute("aria-modal", "true");
      await expect(close).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(drawer.getByRole("button", { name: /queue new run/i })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(opener).toBeFocused();
      await opener.click();
      await expect(drawer).toBeVisible();
      await close.click();
      await expect(drawer).toBeHidden();
      await expect(opener).toBeFocused();
    });

    test("rail supports Tab, arrows, Home/End, section and route navigation", async ({ page }) => {
      await openConsole(page);
      const nav = page.getByRole("navigation", { name: "The Empire", exact: true });
      const dashboard = nav.getByRole("link", { name: "Mission Control", exact: true });
      const studio = nav.getByRole("link", { name: "Story Studio", exact: true });
      const episodes = nav.getByRole("link", { name: "Episodes", exact: true });
      await dashboard.focus();
      await page.keyboard.press("Tab");
      await expect(studio).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(dashboard).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await expect(studio).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(episodes).toBeFocused();
      await page.keyboard.press("ArrowLeft");
      await expect(studio).toBeFocused();
      await page.keyboard.press("ArrowUp");
      await expect(dashboard).toBeFocused();
      await page.keyboard.press("End");
      await expect(nav.getByRole("link", { name: "Shadow Sign-In", exact: true })).toBeFocused();
      await page.keyboard.press("Home");
      await expect(dashboard).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/mission-control#cc-workspace$/);
      await expect(page.getByRole("heading", { name: /recent workspace/i })).toBeInViewport();
      await expect(episodes).toHaveAttribute("aria-current", "location");
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
      await nav.getByRole("link", { name: "Archive Dock", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/dock$/);
      await expect(page.getByRole("heading", { level: 1, name: /dock/i })).toBeVisible();
    });

    test("six skin presets change rendered HUD styles without breaking chrome layout", async ({
      page,
    }) => {
      await openConsole(page);
      const switcher = page.getByRole("button", { name: "Change skin", exact: true });
      const surfaces = [
        page.getByRole("banner"),
        page.getByRole("navigation", { name: "The Empire", exact: true }),
        page.getByRole("contentinfo"),
      ];
      const signatures = surfaces.map(() => new Set<string>());
      for (const preset of presets) {
        await switcher.click();
        await expect(switcher).toHaveAttribute("aria-expanded", "true");
        await page
          .locator(`[data-mw-skin-switcher-menu="true"] [data-mw-skin-option="${preset.id}"]`)
          .click();
        await expect(switcher).toHaveAttribute("aria-expanded", "false");
        expect(await page.evaluate(() => localStorage.getItem("mw-skin"))).toBe(preset.id);
        for (const [index, surface] of surfaces.entries()) {
          await expect(surface).toHaveClass(new RegExp(`\\bskin-${preset.id}\\b`));
          signatures[index]?.add(await hudStyle(surface));
          const hasCanvasChild = await surface.locator("canvas, [data-texture]").count();
          expect
            .soft(hasCanvasChild, `${preset.id}: HUD chrome has no canvas/texture children`)
            .toBe(0);
          {
            const injectedOverlay = await surface.evaluate((element) =>
              element.matches(".halftone, .halftone-pink, .grain, .scanlines"),
            );
            expect
              .soft(injectedOverlay, `${preset.id}: clean HUD preset keeps base chrome untextured`)
              .toBe(false);
          }
        }
        await noHorizontalOverflow(page);
      }
      for (const [index, styles] of signatures.entries()) {
        expect
          .soft(styles.size, `HUD surface ${index}: all six computed frame styles must differ`)
          .toBe(6);
      }
    });

    test("Atlas pointer, Enter, Space, and city-list selection agree with CITY DETAIL", async ({
      page,
    }, info) => {
      await openConsole(page);
      const atlas = page.getByRole("region", { name: /universe\s*map/i });
      const map = atlas.getByRole("group", { name: "Universe map", exact: true });
      const cityList = atlas.getByRole("list");
      await expect(atlas.getByRole("heading", { name: "CITY DETAIL", exact: true })).toBeVisible();
      await atlas.scrollIntoViewIfNeeded();
      await screenshot(page, info, `atlas-${viewport.width}`);

      async function selected(city: string, signals: number) {
        await expect(atlas.locator("dl dd")).toHaveText([city, String(signals)]);
        await expect(
          map.getByRole("button", { name: `Select ${city}`, exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await expect(
          cityList.getByRole("button", { name: new RegExp(`^${city}\\b`) }),
        ).toHaveAttribute("aria-pressed", "true");
        await expect(map.getByRole("button", { pressed: true })).toHaveCount(1);
        await expect(cityList.getByRole("button", { pressed: true })).toHaveCount(1);
      }

      await cityList.getByRole("button", { name: /^LONDON\b/ }).click();
      await expect(atlas.locator("dl dd")).toHaveText(["LONDON", "412"]);
      const tokyo = map.getByRole("button", { name: "Select TOKYO", exact: true });
      await expect(tokyo).toBeVisible();
      await tokyo.click();
      await selected("TOKYO", 501);
      const seoul = map.getByRole("button", { name: "Select SEOUL", exact: true });
      await seoul.focus();
      await expect(seoul).toBeFocused();
      await page.keyboard.press("Enter");
      await selected("SEOUL", 297);
      await page.keyboard.press("Tab");
      await expect(map.getByRole("button", { name: "Select CAIRO", exact: true })).toBeFocused();
      await page.keyboard.press("Space");
      await selected("CAIRO", 254);
      await cityList.getByRole("button", { name: /^LONDON\b/ }).click();
      await selected("LONDON", 412);
      await noHorizontalOverflow(page);
    });
  });
}

test("landing Storytelling renders existing stories through ScenePanel and FilmStrip", async ({
  page,
}, info) => {
  await page.goto("/moonwitness");
  const storytelling = page.locator("#storytelling");
  await storytelling.getByRole("heading", { level: 2 }).scrollIntoViewIfNeeded();
  await screenshot(page, info, "storytelling-1672");
  // These integration markers are acceptance requirements, not conditional skips while WIP lands.
  await expect.soft(storytelling.locator("[data-film-strip]")).toHaveCount(1);
  const scenes = storytelling.locator("[data-scene-panel]");
  await expect(scenes).toHaveCount(4);
  for (const title of [/batteries/i, /neon cities/i, /pendeta online/i, /^zill$/i]) {
    const scene = scenes.filter({ has: page.getByRole("heading", { name: title }) });
    await expect(scene).toHaveCount(1);
    const heading = scene.getByRole("heading", { name: title });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeInViewport();
    const img = scene.locator("img");
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();
    await expect
      .poll(
        () =>
          img.evaluate(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
  }
  await noHorizontalOverflow(page);
});

test("normal motion preserves Atlas selection and reveals story panels", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openConsole(page);
  const atlas = page.getByRole("region", { name: /universe\s*map/i });
  await atlas.getByRole("button", { name: "Select TOKYO", exact: true }).click();
  await expect(atlas.locator("dl dd")).toHaveText(["TOKYO", "501"]);
  await page.goto("/moonwitness");
  const storytelling = page.locator("#storytelling");
  await storytelling.locator("[data-story-unit]").first().scrollIntoViewIfNeeded();
  await expect(storytelling.locator("[data-story-unit]")).toHaveCount(4);
  for (const panel of await storytelling.locator("[data-story-unit]").all()) {
    await expect(panel).toHaveCSS("opacity", "1", { timeout: 10_000 });
  }
  await noHorizontalOverflow(page);
});

for (const viewport of viewports) {
  test(`story panels preserve manga composition at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto("/moonwitness");
    const section = page.locator("#storytelling");
    await section.getByRole("heading", { level: 2 }).scrollIntoViewIfNeeded();
    const scenes = section.locator("[data-scene-panel]");
    await expect(scenes).toHaveCount(4);
    const first = await box(scenes.nth(0));
    const second = await box(scenes.nth(1));
    const third = await box(scenes.nth(2));
    if (viewport.width >= 1024) {
      expect(first.width).toBeGreaterThan(second.width * 1.4);
      expect(Math.abs(second.y - third.y)).toBeLessThan(10);
    } else {
      expect(second.y).toBeGreaterThan(first.y);
      expect(third.y).toBeGreaterThan(second.y);
    }
    await section.screenshot({
      path: info.outputPath(`story-panels-${viewport.width}.png`),
      animations: "disabled",
    });
    await noHorizontalOverflow(page);
  });
}
