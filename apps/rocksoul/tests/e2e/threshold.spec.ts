import { expect, test } from "@playwright/test";

test("Awakening enters Threshold, which routes to rooms and back", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ROCKSOUL DX" })).toBeVisible();
  await page.getByRole("button", { name: "ENTER THE UNKNOWN" }).click();
  await expect(page).toHaveURL(/#\/threshold$/);
  await expect(page.getByRole("navigation", { name: "Four destinations" }).getByRole("button")).toHaveCount(4);

  const search = page.getByRole("searchbox", { name: "Search destinations" });
  await search.fill("signal");
  await expect(page.getByRole("button", { name: "Enter THE SIGNAL ROOM room preview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter THE ARCHIVE room preview" })).toHaveCount(0);
  await search.press("Enter");

  await expect(page).toHaveURL(/#\/signal-room$/);
  await expect(page.getByRole("heading", { name: "THE SIGNAL ROOM" })).toBeVisible();
  await expect(page.getByText("Research workflows are not part of this visual foundation.")).toBeVisible();

  await page.getByRole("button", { name: "RETURN TO THE THRESHOLD" }).click();
  await expect(page).toHaveURL(/#\/threshold$/);
  await expect(page.getByRole("heading", { name: "ROCKSOUL DX" })).toBeVisible();
});

test("the low-motion control updates the world scene state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ENTER THE UNKNOWN" }).click();
  await page.getByRole("button", { name: "LOW MOTION OFF" }).click();
  await expect(page.locator(".universe-screen")).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.getByRole("button", { name: "LOW MOTION ON" })).toHaveAttribute("aria-pressed", "true");
});

test("the world stays usable on narrow screens and its skip link preserves the route", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "ENTER THE UNKNOWN" }).click();

  await expect(page.locator(".world-canvas canvas")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Four destinations" }).getByRole("button")).toHaveCount(4);
  const pageWidth = await page.locator("html").evaluate((element) => element.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(390);

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to destinations" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("navigation", { name: "Four destinations" })).toBeFocused();
  await expect(page).toHaveURL(/#\/threshold$/);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByRole("region", { name: "Recent work" })).toBeHidden();
});

test("Awakening direct shortcuts open WORKBENCH, OVERSEER monitor, and GIT patch view", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "AGENT MONITOR" }).click();

  await expect(page).toHaveURL(/#\/monitor$/);
  await expect(page.getByRole("heading", { name: "OVERSEER" })).toBeVisible();
  await expect(page.getByText(/MOONWITNESS ECOSYSTEM NODES/)).toBeVisible();

  await page.getByTitle("GIT").click();
  await expect(page).toHaveURL(/#\/git$/);
  await expect(page.getByRole("heading", { name: "GIT JUNGLE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "PATCH" })).toBeVisible();

  await page.getByTitle("DECK").click();
  await expect(page).toHaveURL(/#\/deck$/);
  await expect(page.getByLabel("Live Overseer summary")).toBeVisible();
  await expect(page.getByLabel("Live Overseer summary")).not.toContainText("DISK C::");
});
