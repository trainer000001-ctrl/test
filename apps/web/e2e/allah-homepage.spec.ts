import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../test-results/screenshots",
);
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-wide", width: 1440, height: 900 },
  { name: "desktop-standard", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "mobile-narrow", width: 360, height: 800 },
] as const;

test.describe("A-L-L-A-H.COM Homepage (01-imperium-lumen)", () => {
  for (const vp of VIEWPORTS) {
    test(`renders cleanly without horizontal overflow at ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });

      const hero = page.locator("section#the-gate");
      await expect(hero).toBeVisible();
      await expect(hero.locator("h1")).toBeVisible();
      await expect(hero.locator("a, button").first()).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
      expect(errors).toEqual([]);

      await page.screenshot({
        path: resolve(SCREENSHOT_DIR, `allah-${vp.name}-${vp.width}x${vp.height}.png`),
      });
    });
  }

  test("cycles all 9 worlds, verifies honest dock telemetry, and captures section screenshots", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const brokenImages = await page.evaluate(() =>
      Array.from(document.querySelectorAll("img"))
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.getAttribute("src") ?? "unknown"),
    );
    expect(brokenImages).toEqual([]);

    const worldTiles = page.locator(".mw-world-tile");
    await expect(worldTiles).toHaveCount(9);

    for (let i = 0; i < 9; i++) {
      await worldTiles.nth(i).click();
      await expect(worldTiles.nth(i)).toHaveAttribute("aria-pressed", "true");
    }

    const worldsSection = page.locator("section#the-worlds");
    await worldsSection.scrollIntoViewIfNeeded();
    await expect(worldsSection).toBeVisible();
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, "allah-worlds-sanctum-1440x900.png"),
    });

    const dockSection = page.locator("section#the-dock");
    await dockSection.scrollIntoViewIfNeeded();
    await expect(dockSection).toBeVisible();
    const dockText = await dockSection.innerText();
    expect(dockText).not.toContain("100% · 1ms");
    expect(dockText).not.toContain("100% · 4ms");
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, "allah-dock-matrix-1440x900.png"),
    });
  });

  test("supports mobile menu, keyboard navigation, and prefers-reduced-motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });

    const menuButton = page.getByRole("button", { name: "Toggle Empire Navigation Menu" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.locator("#mobile-sanctuary-nav")).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.keyboard.press("Tab");
    const activeTag = await page.evaluate(() => document.activeElement?.tagName ?? "");
    expect(["A", "BUTTON"]).toContain(activeTag);
  });
});
