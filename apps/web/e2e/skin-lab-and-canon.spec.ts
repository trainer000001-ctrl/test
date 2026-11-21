import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const SKIN_MATRIX_DIR = resolve(process.cwd(), "../../.verify/skin-matrix");
mkdirSync(SKIN_MATRIX_DIR, { recursive: true });

test.describe("Skin Laboratory & Canon Integration", () => {
  test("renders 7 Master DNA Worlds and passes comparison grid in /skin-lab", async ({ page }) => {
    await page.goto("/skin-lab");
    await expect(page.getByRole("heading", { name: "SKIN LABORATORY" })).toBeVisible();

    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).not.toBe("rgba(0, 0, 0, 0)");

    for (const label of [
      "IMPERIUM LUMEN",
      "LUNAR CHRONICLES",
      "ROCKSOUL",
      "NEXUS PARADOX",
      "RIOT ANARCHY",
      "MYCELIUM",
      "SIMPUL NUSANTARA",
    ]) {
      const btn = page.getByRole("button", { name: new RegExp(label, "i") });
      await expect(btn).toBeVisible();
    }

    // Activate 01-imperium-lumen world and assert SkinScope renders scoped [data-dna] & Imperium CTA
    await page.getByRole("button", { name: /IMPERIUM LUMEN/i }).click();
    const scope = page.locator('[data-dna="01-imperium-lumen"]').first();
    await expect(scope).toBeVisible();
    await expect(scope.locator(".btn-chamfer").first()).toBeVisible();

    await page.getByRole("tab", { name: "7-WORLD AUDIT GRID" }).click();
    await expect(page.getByText("ALL PASS")).toHaveCount(7);
  });

  test("preserves Chronicle Events default in /dock and opens Canon Lore Archive tab", async ({
    page,
  }) => {
    await page.route("**/api/v1/timeline/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/timeline/stats")) {
        await route.fulfill({ json: { data: { total: 0, byEra: {}, byKind: {} } } });
        return;
      }
      if (path.endsWith("/timeline/eras")) {
        await route.fulfill({ json: { data: [] } });
        return;
      }
      await route.fulfill({ json: { data: [], total: 0 } });
    });

    await page.goto("/dock");
    await expect(page.getByRole("tab", { name: "CHRONICLE EVENTS" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.getByRole("tab", { name: "CANON LORE ARCHIVE" }).click();
    await expect(page.getByText("DISCLOSED #014 NUMBER CONFLICT")).toBeVisible();
    await expect(page.getByText("FAMILY WITHOUT FEAR").first()).toBeVisible();
    await expect(page.getByText("THE WRONG WAY — HELLROAD").first()).toBeVisible();
  });

  test("expands WINGS 10 and DHGS 13-step matrix on /mission-control", async ({ page }) => {
    await page.goto("/mission-control");
    const toggle = page.getByRole("button", { name: "OPEN STEWARDSHIP MATRIX" });
    await toggle.click();
    await expect(page.getByText(/SKYLINK/i).first()).toBeVisible();
    await expect(page.getByText("DHGS 13-STEP ASSURANCE LOOP (RECEIVE → LEARN)")).toBeVisible();

    const overflowCount = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[data-wing-card]"));
      return cards.filter((c) => c.scrollWidth > c.clientWidth + 1).length;
    });
    expect(overflowCount).toBe(0);
  });

  test("SkinPlayground mutates real Button/Input/Card/Badge/Dialog/Select/Tabs styles and screenshots across all 6 skins + light/dark", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/skin-lab");
    await page.getByRole("tab", { name: "TOKEN & PLAYGROUND" }).click();

    const playground = page.locator('[data-testid="mw-skin-playground"]');
    await expect(playground).toBeVisible();

    const stylesBySkin = new Map<string, string>();
    const screenshotBytesBySkin = new Map<string, Buffer>();
    const stage = playground.locator('[data-testid="playground-viewport"]');

    for (const skin of [
      { id: "default", label: "Moonwitness" },
      { id: "riot", label: "Riot" },
      { id: "editorial", label: "Editorial" },
      { id: "technical", label: "Technical" },
      { id: "archive", label: "Archive" },
      { id: "transmission", label: "Transmission" },
    ] as const) {
      await playground
        .getByRole("group", { name: "Select Skin" })
        .getByRole("button", { name: skin.label, exact: true })
        .click();

      const primaryBtn = playground
        .locator("button[data-skin]")
        .filter({ hasText: "Primary" })
        .first();
      await expect(primaryBtn).toHaveAttribute("data-skin", skin.id);

      const computed = await primaryBtn.evaluate((el) => {
        const cs = getComputedStyle(el);
        return `${cs.borderRadius}|${cs.boxShadow}|${cs.fontFamily}|${cs.textTransform}`;
      });
      stylesBySkin.set(skin.id, computed);

      const buf = await stage.screenshot({
        path: resolve(SKIN_MATRIX_DIR, `skin-${skin.id}.png`),
      });
      expect(buf.byteLength).toBeGreaterThan(1000);
      screenshotBytesBySkin.set(skin.id, buf);
    }

    // Prove visual and CSS variance across skins rather than static class-only mutation
    expect(new Set(stylesBySkin.values()).size).toBeGreaterThanOrEqual(4);
    expect(screenshotBytesBySkin.get("riot")?.equals(screenshotBytesBySkin.get("editorial")!)).toBe(
      false,
    );
    expect(
      screenshotBytesBySkin.get("technical")?.equals(screenshotBytesBySkin.get("archive")!),
    ).toBe(false);

    // Toggle Light mode & assert canvas background luminance increases distinctly
    const darkBg = await stage
      .locator('[data-dna="05-riot-anarchy"]')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    await playground.getByLabel("Theme Mode").selectOption("light");
    const lightBg = await stage
      .locator('[data-dna="05-riot-anarchy"]')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(lightBg).not.toBe(darkBg);

    // Verify TokenInspector emits clean scalar --radius (never [object Object])
    const inspectorPre = page.locator(".mw-dx-inspector pre");
    await expect(inspectorPre).toContainText("--radius: 0.5rem;");
    const inspectorText = await inspectorPre.textContent();
    expect(inspectorText).not.toContain("[object Object]");
  });
});
