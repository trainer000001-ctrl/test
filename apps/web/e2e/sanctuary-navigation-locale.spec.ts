import { expect, test } from "@playwright/test";

const MOBILE_VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 800 },
] as const;

test.describe("Sanctuary Navigation & Locale Continuity (#481 & #482)", () => {
  test("cycles en -> id -> ar on unprefixed host root without resetting world, Codex door, or section", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    // Select a non-default world ("SIDRA") in WorldsSanctum
    const sidraTab = page.locator(".mw-world-atlas [role='tab']").nth(3);
    await sidraTab.click();
    await expect(sidraTab).toHaveAttribute("aria-selected", "true");

    // Select a non-default Codex door ("epistemic-corpus")
    const epistemicDoor = page.locator('[data-door-id="epistemic-corpus"]');
    await epistemicDoor.click();
    await expect(epistemicDoor).toHaveAttribute("aria-selected", "true");

    // Activate Codex section via header nav
    const codexNavLink = page.locator('header nav a[href="#the-codex"]');
    await codexNavLink.click();
    await expect(codexNavLink).toHaveAttribute("aria-current", "page");

    // Switch EN -> ID
    await page.getByRole("button", { name: "Cycle language (EN)" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("#worlds-heading")).toHaveText("Atlas Sembilan Dunia");
    await expect(page.locator("#codex-heading")).toHaveText("Kodeks Kanon");
    await expect(sidraTab).toHaveAttribute("aria-selected", "true");
    await expect(epistemicDoor).toHaveAttribute("aria-selected", "true");
    await expect(codexNavLink).toHaveAttribute("aria-current", "page");

    // Switch ID -> AR
    await page.getByRole("button", { name: "Ganti bahasa (ID)" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("#worlds-heading")).toHaveText("أطلس العوالم التسعة");
    await expect(page.locator("#codex-heading")).toHaveText("مدونة الكانون");
    await expect(sidraTab).toHaveAttribute("aria-selected", "true");
    await expect(epistemicDoor).toHaveAttribute("aria-selected", "true");
    await expect(codexNavLink).toHaveAttribute("aria-current", "page");
  });

  test("preserves /[lang] prefix, query string, and hash when switching locales on prefixed routes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en?sanctuary=1#the-worlds", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Cycle language (EN)" }).click();
    await expect(page).toHaveURL(/\/id\?sanctuary=1#the-worlds$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(page.locator("#worlds-heading")).toHaveText("Atlas Sembilan Dunia");

    await page.getByRole("button", { name: "Ganti bahasa (ID)" }).click();
    await expect(page).toHaveURL(/\/ar\?sanctuary=1#the-worlds$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // Subpage header preserves /[lang], query, and hash
    await page.goto("/en/codex?door=epistemic-corpus#the-codex", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cycle language (EN)" }).click();
    await expect(page).toHaveURL(/\/id\/codex\?door=epistemic-corpus#the-codex$/);
    await expect(page.locator('[data-door-id="epistemic-corpus"]')).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  for (const vp of MOBILE_VIEWPORTS) {
    test(`mobile navigation drawer works cleanly at ${vp.width}px width with Escape focus restore`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });

      const trigger = page.locator('button[aria-controls="mobile-sanctuary-nav"]');
      await expect(trigger).toBeVisible();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");

      await trigger.focus();
      await trigger.press("Enter");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");

      const drawer = page.locator("#mobile-sanctuary-nav");
      await expect(drawer).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);

      // Focus inside drawer, press Escape -> closes and restores focus to trigger
      await page.keyboard.press("Tab");
      await page.keyboard.press("Escape");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(drawer).toBeHidden();
      await expect(trigger).toBeFocused();

      // Re-open and click section button -> closes drawer
      await trigger.click();
      await expect(drawer).toBeVisible();
      await drawer.getByRole("button", { name: "Nine Worlds" }).click();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(drawer).toBeHidden();
    });
  }
});
