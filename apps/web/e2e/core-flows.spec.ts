import { test, expect, type Page } from "@playwright/test";

async function mockSetupStatus(page: Page, initialized: boolean) {
  await page.route("**/api/v1/control/setup/status", (route) =>
    route.fulfill({
      json: {
        initialized,
        version: "test",
        instance: { id: "test-instance", name: "Moonwitness", version: "test" },
      },
    }),
  );
}

async function mockControlSession(page: Page) {
  await mockSetupStatus(page, true);
  await page.route("**/api/v1/control/auth/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "test-user",
          name: "Test User",
          email: "test@example.com",
          role: "admin",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      },
    }),
  );
}

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/moonwitness");
  });

  test("should load homepage", async ({ page }) => {
    await expect(page).toHaveTitle(/Moonwitness/i);
  });

  test("should navigate to setup page", async ({ page }) => {
    await mockSetupStatus(page, false);
    await page.goto("/shadow?mode=setup");
    await expect(page.getByRole("heading", { name: /welcome to the shadow/i })).toBeVisible();
  });

  test("should show VPN page", async ({ page }) => {
    await mockControlSession(page);
    await page.goto("/control?tab=vpn");
    await expect(page.getByRole("heading", { name: /vpn tunnel/i })).toBeVisible();
  });
});

test.describe("VPN Setup Flow", () => {
  test("should explain when WireGuard tools are missing from the host", async ({ page }) => {
    await mockControlSession(page);
    await page.route("**/api/v1/control/vpn/status", (route) =>
      route.fulfill({
        json: {
          enabled: false,
          interface: "wg0",
          address: "",
          listen_port: 51820,
          endpoint: "",
          manage_firewall: false,
          public_key: "",
          server_configured: false,
          peer_count: 0,
          peers: [],
          available: false,
          missing_tools: ["wireguard-tools"],
        },
      }),
    );
    await page.goto("/control?tab=vpn");
    await expect(page.getByRole("heading", { name: /tool belum ada/i })).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test("should load dashboard page", async ({ page }) => {
    await page.goto("/mission-control");
    await expect(page.locator("h1")).toContainText(/shadow\s*command center/i);
    await expect(page.getByText("THE BATTERIES").first()).toBeVisible();
    await page.getByRole("button", { name: /NEW EPISODE/ }).click();
    const storyForge = page.getByRole("dialog", { name: "Story Forge console" });
    await expect(storyForge).toBeVisible();
    await storyForge.getByRole("button", { name: "Close module console" }).click();
    await expect(storyForge).toBeHidden();
  });

  test("should display dock", async ({ page }) => {
    await page.goto("/dock");
    await expect(page.getByRole("heading", { name: /dock.*timeline chronicle/i })).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("should navigate between main pages", async ({ page }) => {
    await mockControlSession(page);
    const pages = [
      { path: "/", title: /A-L-L-A-H\.COM/i },
      { path: "/moonwitness", title: /Moonwitness/i },
      { path: "/control?tab=vpn", title: /ARSY Control Plane/i },
      { path: "/shadow?mode=setup", title: /A-L-L-A-H\.COM/i },
      { path: "/mission-control", title: /Shadow Command Center/i },
      { path: "/dock", title: /Dock/i },
    ];

    for (const { path, title } of pages) {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
    }
  });
});

test.describe("Host-Based Routing", () => {
  test("serves Moonwitness at / for moonwitness.biz.id and A-L-L-A-H at / for a-l-l-a-h.com", async ({
    page,
    request,
  }) => {
    const mwRes = await request.get("/", {
      headers: { "x-forwarded-host": "moonwitness.biz.id" },
    });
    expect(mwRes.status()).toBe(200);
    const mwHtml = await mwRes.text();
    expect(mwHtml).toContain("MOONWITNESS");
    expect(mwHtml).toMatch(/<title>Moonwitness/i);

    const allahRes = await request.get("/", {
      headers: { "x-forwarded-host": "a-l-l-a-h.com" },
    });
    expect(allahRes.status()).toBe(200);
    const allahHtml = await allahRes.text();
    expect(allahHtml).toContain('id="the-gate"');
    expect(allahHtml).toMatch(/<title>A-L-L-A-H\.COM/i);

    await page.setExtraHTTPHeaders({ "x-forwarded-host": "moonwitness.biz.id" });
    await page.goto("/");
    await expect(page).toHaveTitle(/Moonwitness/i);
    await expect(page.locator("#home")).toBeVisible();
    await expect(page.locator("h1")).toContainText(/MOONWITNESS/i);

    await page.setExtraHTTPHeaders({ "x-forwarded-host": "a-l-l-a-h.com" });
    await page.goto("/");
    await expect(page).toHaveTitle(/A-L-L-A-H\.COM/i);
    await expect(page.locator("section#the-gate")).toBeVisible();
  });
});
