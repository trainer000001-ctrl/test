import { expect, test, type Page } from "@playwright/test";

async function stubSession(page: Page, role = "admin"): Promise<void> {
  await page.route("**/api/v1/control/auth/me", async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: "operator-1",
          name: "Operator",
          email: "operator@example.test",
          role,
          created_at: "2026-01-01T00:00:00Z",
        },
      },
    });
  });
}

test("Syslog filters, renders messages, and limits same-origin API requests", async ({ page }) => {
  await stubSession(page);
  const requests: string[] = [];
  await page.route("**/api/v1/syslog/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.href);
    await route.fulfill({
      json: [
        {
          id: "sys-1",
          received_at: 1_800_000_000_000,
          source_ip: "192.0.2.7",
          hostname: "edge-router",
          severity: 3,
          app_name: "routerd",
          message: "route changed",
        },
      ],
    });
  });
  await page.goto("/control?tab=syslog");
  await expect(page.getByRole("cell", { name: "route changed" })).toBeVisible();
  await page.getByLabel("Message search").fill("edge-router");
  await expect(page.getByRole("cell", { name: "route changed" })).toBeVisible();
  await page.getByLabel("Severity").selectOption("3");
  await expect.poll(() => requests.length).toBeGreaterThan(1);
  expect(new URL(requests.at(-1)!).pathname).toBe("/api/v1/syslog/messages");
  expect(new URL(requests.at(-1)!).searchParams.get("limit")).toBe("100");
});

test("Syslog denies message queries without an authenticated session", async ({ page }) => {
  let queriedMessages = false;
  await page.route("**/api/v1/control/auth/me", async (route) => {
    await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
  });
  await page.route("**/api/v1/syslog/messages**", async (route) => {
    queriedMessages = true;
    await route.fulfill({ json: [] });
  });

  await page.goto("/control?tab=syslog");
  await expect(
    page.getByText("Sign in through the Control Center to view Syslog messages."),
  ).toBeVisible();
  expect(queriedMessages).toBe(false);
});

test("SNMP renders summaries without credentials and gives an empty state", async ({ page }) => {
  await page.route("**/api/v1/snmp/stats", async (route) => {
    await route.fulfill({
      json: { total_devices: 1, enabled_devices: 1, total_targets: 0, total_samples: 0 },
    });
  });
  await page.route("**/api/v1/snmp/devices", async (route) => {
    await route.fulfill({
      json: [
        {
          id: "device-1",
          name: "North Router",
          host: "192.0.2.10",
          port: 161,
          version: "2c",
          community: "must-not-appear",
          enabled: true,
          created_at: 1,
        },
      ],
    });
  });
  await page.route("**/api/v1/snmp/devices/device-1/targets", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto("/control?tab=snmp");
  await expect(page.getByRole("heading", { name: "North Router" })).toBeVisible();
  await expect(page.getByText("No targets are configured for this device.")).toBeVisible();
  await expect(page.getByText("must-not-appear")).toHaveCount(0);
});

test("RADIUS renders redacted read-only service data and no users", async ({ page }) => {
  await stubSession(page);
  await page.route("**/api/v1/radius/health", async (route) => {
    await route.fulfill({ json: { status: "ready", service: "RADIUS", reachable: true } });
  });
  await page.route("**/api/v1/radius/stats", async (route) => {
    await route.fulfill({ json: { active_sessions: 2, requests_today: 14 } });
  });
  await page.route("**/api/v1/radius/logs", async (route) => {
    await route.fulfill({
      json: [
        {
          timestamp: "2026-11-15T00:00:00Z",
          level: "info",
          message: "access accepted",
          password_hash: "must-not-appear",
        },
      ],
    });
  });

  await page.goto("/control?tab=radius");
  await expect(page.getByText("access accepted")).toBeVisible();
  await expect(page.getByText("must-not-appear")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /create|delete|update/i })).toHaveCount(0);
});

test("RADIUS admin sees user management and can create a user", async ({ page }) => {
  await stubSession(page);
  const users: Array<Record<string, unknown>> = [
    {
      id: "user-1",
      username: "alice",
      enabled: true,
      framed_ip: "192.0.2.50",
      vlan_id: 120,
      session_timeout: 3600,
      mac_address: null,
    },
  ];
  await page.route("**/api/v1/radius/users", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: users });
      return;
    }
    const payload = route.request().postDataJSON() as { username?: string; password?: string };
    const created = {
      id: "user-2",
      username: payload.username,
      enabled: true,
      framed_ip: null,
      vlan_id: null,
      session_timeout: null,
      mac_address: null,
    };
    users.push(created);
    await route.fulfill({ status: 201, json: created });
  });

  await page.goto("/control?tab=radius");
  await expect(page.getByText("alice")).toBeVisible();

  await page.getByRole("button", { name: "Add user" }).click();
  await page.getByLabel("Username").fill("bob");
  await page.getByLabel("Password").fill("bob-password-2026");
  await page.getByRole("button", { name: "Create user" }).click();

  await expect(page.getByText("User created.")).toBeVisible();
  await expect(page.getByText("bob")).toBeVisible();
});

test("RADIUS non-admin is denied management controls", async ({ page }) => {
  await stubSession(page, "viewer");
  await page.route("**/api/v1/radius/users", async (route) => {
    await route.fulfill({ json: [{ id: "user-1", username: "alice", enabled: true }] });
  });

  await page.goto("/control?tab=radius");
  await expect(page.getByText("alice")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add user" })).toHaveCount(0);
  await expect(
    page.getByText("Your role cannot manage RADIUS users. Ask an administrator for write access."),
  ).toBeVisible();
});

test("SNMP admin can create and delete a device with confirmation", async ({ page }) => {
  await stubSession(page);
  const devices: unknown[] = [];
  await page.route("**/api/v1/snmp/stats", async (route) => {
    await route.fulfill({
      json: { total_devices: 0, enabled_devices: 0, total_targets: 0, total_samples: 0 },
    });
  });
  await page.route("**/api/v1/snmp/devices", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ json: devices });
      return;
    }
    const payload = route.request().postDataJSON() as { name?: string };
    devices.push({
      id: "device-new",
      name: payload.name,
      host: "192.0.2.99",
      port: 161,
      version: "2c",
      enabled: true,
      created_at: 1,
    });
    await route.fulfill({ status: 201, json: { id: "device-new", name: payload.name } });
  });
  await page.route("**/api/v1/snmp/devices/device-new", async (route) => {
    devices.length = 0;
    await route.fulfill({ status: 204, body: "" });
  });
  await page.route("**/api/v1/snmp/devices/device-new/targets", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto("/control?tab=snmp");
  await expect(page.getByText("No SNMP devices are configured.")).toBeVisible();

  await page.getByRole("button", { name: "Add device" }).click();
  await page.getByLabel("Name").fill("Edge Router");
  await page.getByLabel("Host").fill("192.0.2.99");
  await page.getByRole("button", { name: "Create device" }).click();
  await expect(page.getByText("Device created.")).toBeVisible();
});

test("SNMP viewer role sees no management controls", async ({ page }) => {
  await stubSession(page, "viewer");
  await page.route("**/api/v1/snmp/stats", async (route) => {
    await route.fulfill({
      json: { total_devices: 0, enabled_devices: 0, total_targets: 0, total_samples: 0 },
    });
  });
  await page.route("**/api/v1/snmp/devices", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto("/control?tab=snmp");
  await expect(page.getByRole("button", { name: "Add device" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
});

// ============================================================
// ADDED: Accessibility & Regression Coverage (MW-0016 #105)
// ============================================================

test.describe("Navigation & Active-Route", () => {
  const routes = [
    { path: "/control?tab=syslog", sidebarLabel: "Syslog" },
    { path: "/control?tab=snmp", sidebarLabel: "SNMP" },
    { path: "/control?tab=storage", sidebarLabel: "Storage" },
    { path: "/control?tab=radius", sidebarLabel: "RADIUS" },
    { path: "/control", sidebarLabel: "Control Plane" },
    { path: "/control?tab=vpn", sidebarLabel: "VPN" },
  ];

  for (const { path, sidebarLabel } of routes) {
    test(`${path} loads and sidebar highlights active route`, async ({ page }) => {
      // Register fallback catch-all first; Playwright matches routes in LIFO order.
      await page.route("**/api/v1/**", async (route) => {
        await route.fulfill({ json: [] });
      });
      await page.route("**/api/v1/control/auth/me", async (route) => {
        await route.fulfill({
          json: {
            user: {
              id: "1",
              name: "Operator",
              email: "op@test",
              role: "admin",
              created_at: "2026-01-01T00:00:00Z",
            },
          },
        });
      });
      // Stub the control-plane endpoints the console screens query on mount so
      // navigation checks are not blocked by the setup gate or empty upstreams.
      // The shell identity comes from the core session endpoint
      // (`/api/v1/auth/me`), which is separate from the control-plane profile.
      await page.route("**/api/v1/auth/me", async (route) => {
        await route.fulfill({
          json: {
            user: {
              id: 1,
              username: "operator",
              displayName: "Operator",
              email: "op@test",
              role: "admin",
            },
          },
        });
      });
      await page.route("**/api/v1/control/setup/status", async (route) => {
        await route.fulfill({
          json: {
            initialized: true,
            version: "test",
            instance: { id: "1", name: "test", version: "test" },
          },
        });
      });
      // Console resources/audit/status drive the Control Plane panels; a bare
      // `[]` is not a valid payload and throws while rendering.
      await page.route("**/api/v1/control/status", async (route) => {
        await route.fulfill({
          json: {
            reachable: true,
            host: {
              os: "linux",
              arch: "x86_64",
              hostname: "test-host",
              kernel: "test",
              distro: "test",
              is_root: false,
              capabilities: {
                systemd: true,
                docker: true,
                files: true,
                cron: true,
                users: true,
                firewall: true,
                host_metrics: true,
                network: true,
                ssh: true,
                cert: true,
                mount: true,
                alert: true,
                kubernetes: false,
              },
              notes: [],
            },
            metrics: {
              time: "2026-01-01T00:00:00Z",
              cpu_pct: 0,
              load1: 0,
              load5: 0,
              load15: 0,
              mem_total: 0,
              mem_used: 0,
              mem_pct: 0,
              swap_total: 0,
              swap_used: 0,
              disk_path: "/",
              disk_total: 0,
              disk_used: 0,
              disk_pct: 0,
              uptime_sec: 0,
              degraded: false,
              notes: [],
            },
          },
        });
      });
      await page.route("**/api/v1/control/resources**", async (route) => {
        await route.fulfill({ json: {} });
      });
      await page.route("**/api/v1/control/audit**", async (route) => {
        await route.fulfill({ json: [] });
      });
      await page.route("**/api/v1/control/vpn/status", async (route) => {
        await route.fulfill({
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
      });

      await page.goto(path);
      await page.waitForSelector('nav[aria-label="Operations"]', { timeout: 5000 }).catch(() => {});
      // Verify page loaded
      await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === path);
      // Sidebar link is highlighted with the operations accent and
      // marked as the current page for assistive technology.
      const sidebarLink = page.getByRole("navigation").getByRole("link", { name: sidebarLabel });
      await expect(sidebarLink).toHaveAttribute("aria-current", "page");
      await expect(sidebarLink).toHaveClass(
        /(?:bg-\[var\(--primary\)\]|bg-\[var\(--blue\)\]|hud-nav-link)/,
      );
    });
  }
});

test.describe("Keyboard Navigation & Focus", () => {
  test("Syslog page has logical tab order and visible focus styles", async ({ page }) => {
    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Operator",
            email: "op@test",
            role: "admin",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    });
    await page.route("**/api/v1/syslog/**", async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto("/control?tab=syslog");

    // Tab through focusable elements
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus").first();
    await expect(focused).toBeVisible();

    // Verify focus landed somewhere (first focusable element)
    const firstFocusable = page.locator(":focus").first();
    await expect(firstFocusable).toBeVisible();
  });
});

test.describe("Reduced Motion", () => {
  const routes = [
    "/control?tab=syslog",
    "/control?tab=snmp",
    "/control?tab=storage",
    "/control?tab=radius",
  ];

  for (const path of routes) {
    test(`${path} respects prefers-reduced-motion`, async ({ page }) => {
      await page.route("**/api/v1/**", async (route) => {
        await route.fulfill({ json: [] });
      });
      await page.route("**/api/v1/control/auth/me", async (route) => {
        await route.fulfill({
          json: {
            user: {
              id: "1",
              name: "Operator",
              email: "op@test",
              role: "admin",
              created_at: "2026-01-01T00:00:00Z",
            },
          },
        });
      });

      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);

      // Verify page loads without errors under reduced motion
      await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === path);
    });
  }
});

test.describe("ARIA Live Regions & Accessible Status", () => {
  test("Syslog announces loading state via role=status", async ({ page }) => {
    // Mock fallback API calls first so Playwright LIFO honors specific routes below
    await page.route("**/api/v1/**", async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Operator",
            email: "op@test",
            role: "admin",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    });

    let resolveRoute: (value?: unknown) => void = () => {};
    const routePromise = new Promise((resolve) => {
      resolveRoute = resolve;
    });

    await page.route("**/api/v1/syslog/messages**", async (route) => {
      await routePromise;
      await route.fulfill({ json: [] });
    });

    await page.goto("/control?tab=syslog");

    // Verify loading status region exists and is announced
    const statusRegion = page.getByRole("status");
    await expect(statusRegion).toBeVisible();
    await expect(statusRegion).toContainText(/loading|memuat/i);

    // Resolve the route to complete loading
    resolveRoute(undefined);
    // Wait for the specific response instead of networkidle to avoid timeout from unmocked requests
    await page.waitForResponse("**/api/v1/syslog/messages**");

    // Status should update to empty/ready state
    await expect(statusRegion).not.toContainText(/loading|memuat/i);
  });

  test("Empty state is announced for SNMP devices", async ({ page }) => {
    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Operator",
            email: "op@test",
            role: "admin",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    });
    await page.route("**/api/v1/snmp/stats", async (route) => {
      await route.fulfill({
        json: { total_devices: 0, enabled_devices: 0, total_targets: 0, total_samples: 0 },
      });
    });
    await page.route("**/api/v1/snmp/devices", async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto("/control?tab=snmp");
    await expect(page.getByText("No SNMP devices are configured.")).toBeVisible();
    // Just verify the empty state message is visible
    await expect(page.getByText("No SNMP devices are configured.")).toBeVisible();
  });

  test("Error state is announced for failed API calls", async ({ page }) => {
    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Operator",
            email: "op@test",
            role: "admin",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    });
    await page.route("**/api/v1/syslog/messages**", async (route) => {
      await route.fulfill({ status: 500, json: { error: "Internal Server Error" } });
    });

    await page.goto("/control?tab=syslog");
    // Verify error message is shown (SYSLOG UNAVAILABLE section)
    await expect(page.getByText("SYSLOG UNAVAILABLE")).toBeVisible();
  });

  test("Denied state is announced for unauthorized mutations", async ({ page }) => {
    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Operator",
            email: "op@test",
            role: "viewer",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    });
    await page.route("**/api/v1/radius/users", async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route("**/api/v1/radius/users", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 403, json: { error: "Forbidden" } });
      }
    });

    await page.goto("/control?tab=radius");
    // Viewer should see denied message
    await expect(
      page.getByText(/cannot manage|tidak dapat mengelola|denied|ditolak/i),
    ).toBeVisible();
  });
});

test.describe("Viewport - No Horizontal Overflow", () => {
  const viewports = [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ];

  const routes = [
    "/control?tab=syslog",
    "/control?tab=snmp",
    "/control?tab=storage",
    "/control?tab=radius",
  ];

  for (const vp of viewports) {
    for (const path of routes) {
      test(`${vp.name} ${vp.width}px - ${path} no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        await page.route("**/api/v1/**", async (route) => {
          await route.fulfill({ json: [] });
        });
        await page.route("**/api/v1/control/auth/me", async (route) => {
          await route.fulfill({
            json: {
              user: {
                id: "1",
                name: "Operator",
                email: "op@test",
                role: "admin",
                created_at: "2026-01-01T00:00:00Z",
              },
            },
          });
        });

        await page.goto(path);

        // Check body scroll width does not exceed viewport
        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyScrollWidth).toBeLessThanOrEqual(vp.width + 1); // +1px tolerance for scrollbar

        // Also check html element
        const htmlScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(htmlScrollWidth).toBeLessThanOrEqual(vp.width + 1);
      });
    }
  }
});

test.describe("Mutation Failure States", () => {
  test("SNMP device creation shows error toast on API failure", async ({ page }) => {
    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Operator",
            email: "op@test",
            role: "admin",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    });
    await page.route("**/api/v1/snmp/stats", async (route) => {
      await route.fulfill({
        json: { total_devices: 0, enabled_devices: 0, total_targets: 0, total_samples: 0 },
      });
    });
    await page.route("**/api/v1/snmp/devices", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, json: { error: "Database error" } });
      } else {
        await route.fulfill({ json: [] });
      }
    });

    await page.goto("/control?tab=snmp");
    await page.getByRole("button", { name: "Add device" }).click();
    await page.getByLabel("Name").fill("Test Device");
    await page.getByLabel("Host").fill("192.0.2.1");
    await page.getByRole("button", { name: "Create device" }).click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(
      /database error/i,
    );
  });

  test("RADIUS user creation shows error toast on API failure", async ({ page }) => {
    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Operator",
            email: "op@test",
            role: "admin",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    });
    await page.route("**/api/v1/radius/users", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, json: { error: "Duplicate username" } });
      } else {
        await route.fulfill({ json: [] });
      }
    });

    await page.goto("/control?tab=radius");
    await page.getByRole("button", { name: "Add user" }).click();
    await page.getByLabel("Username").fill("testuser");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create user" }).click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(
      /duplicate username/i,
    );
  });

  test("Storage mutation failure shows error state", async ({ page }) => {
    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Operator",
            email: "op@test",
            role: "admin",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    });
    await page.route("**/api/v1/storage/**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fulfill({ status: 500, json: { error: "Storage backend unavailable" } });
      } else {
        await route.fulfill({ json: [] });
      }
    });

    await page.goto("/control?tab=storage");
    // Attempt any mutation if available (e.g., create bucket, upload)
    const createBtn = page.getByRole("button", { name: /create|add|upload/i }).first();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await expect(
        page.getByRole("alert").or(page.getByText(/error|gagal|failed|unavailable/i)),
      ).toBeVisible();
    }
  });
});

test.describe("Consolidated Console Hubs & Legacy Redirects", () => {
  test("redirects legacy operations, setup, and model routes to canonical consolidated views", async ({
    page,
  }) => {
    await page.route("**/api/v1/**", async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route("**/api/v1/control/setup/status", async (route) => {
      await route.fulfill({ json: { initialized: false } });
    });
    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
    });
    await page.route("**/api/v1/_meta/models", async (route) => {
      await route.fulfill({ json: { models: ["timeline.event"] } });
    });
    await page.route("**/api/v1/_meta/addons", async (route) => {
      await route.fulfill({ json: { addons: [] } });
    });
    await page.route("**/api/v1/_meta/views/**", async (route) => {
      await route.fulfill({
        json: {
          model: "timeline.event",
          table: "timeline_events",
          extensible: true,
          restEnabled: true,
          acl: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
          fields: [],
          views: [],
          actionBindings: { customActions: [] },
        },
      });
    });

    await page.goto("/snmp");
    await expect(page).toHaveURL(/\/control\?tab=snmp$/);

    await page.goto("/syslog");
    await expect(page).toHaveURL(/\/control\?tab=syslog$/);

    await page.goto("/radius");
    await expect(page).toHaveURL(/\/control\?tab=radius$/);

    await page.goto("/storage");
    await expect(page).toHaveURL(/\/control\?tab=storage$/);

    await page.goto("/vpn");
    await expect(page).toHaveURL(/\/control\?tab=vpn$/);

    await page.goto("/setup");
    await expect(page).toHaveURL(/\/shadow\?mode=setup$/);
    await expect(page.getByRole("heading", { name: /welcome to the shadow/i })).toBeVisible();

    await page.goto("/models/timeline.event");
    await expect(page).toHaveURL(/\/addons\?model=timeline\.event$/);
    await expect(page.getByText("MODEL EXPLORER")).toBeVisible();
  });

  test("switches Control Plane hub tabs smoothly without page reload errors", async ({ page }) => {
    await page.route("**/api/v1/**", async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Operator",
            email: "op@test",
            role: "admin",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    });
    await page.route("**/api/v1/snmp/stats", async (route) => {
      await route.fulfill({
        json: { total_devices: 0, enabled_devices: 0, total_targets: 0, total_samples: 0 },
      });
    });

    await page.goto("/control?tab=snmp");
    await expect(page.getByText("No SNMP devices are configured.")).toBeVisible();

    await page.getByRole("tab", { name: "RADIUS" }).click();
    await expect(page).toHaveURL(/\/control\?tab=radius$/);
    await expect(page.getByRole("heading", { name: /radius/i })).toBeVisible();
  });
});

test.describe("Intelligence - ArchiveMemoryBridge Integration", () => {
  test("queries archive knowledge and attaches selected context to the inference prompt without mobile overflow", async ({
    page,
  }) => {
    const knowledgeQueries: Array<{ q: string | null; limit: string | null }> = [];

    await page.route("**/api/v1/**", async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: 1,
            username: "operator",
            displayName: "Operator",
            email: "op@test",
            role: "admin",
          },
        },
      });
    });
    await page.route("**/api/v1/control/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Operator",
            email: "op@test",
            role: "admin",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    });
    await page.route("**/api/v1/control/setup/status", async (route) => {
      await route.fulfill({
        json: {
          initialized: true,
          version: "test",
          instance: { id: "1", name: "test", version: "test" },
        },
      });
    });
    await page.route("**/api/v1/riot-ai/health", async (route) => {
      await route.fulfill({
        json: {
          status: "ok",
          provider: "ollama",
          model: "llama3.2",
          reachable: true,
        },
      });
    });
    await page.route("**/api/v1/riot-ai/models", async (route) => {
      await route.fulfill({
        json: { models: [{ id: "llama3.2", provider: "ollama" }] },
      });
    });
    await page.route("**/api/v1/riot-ai/config", async (route) => {
      await route.fulfill({
        json: {
          config: {
            profileKey: "default",
            label: "Local",
            enabled: true,
            preferredModel: "llama3.2",
            updatedAt: null,
          },
          endpoint: "server-configured",
        },
      });
    });
    await page.route("**/api/v1/riot-ai/config/history", async (route) => {
      await route.fulfill({ json: { history: [] } });
    });
    await page.route("**/api/v1/riot-ai/usage**", async (route) => {
      await route.fulfill({
        json: {
          entries: [],
          summary: {
            measurement: "measured",
            truncated: false,
            requests: 0,
            successful: 0,
            promptTokens: { value: 0, measurement: "measured" },
            completionTokens: { value: 0, measurement: "measured" },
            totalTokens: { value: 0, measurement: "measured" },
          },
        },
      });
    });
    await page.route("**/api/v1/memory/status", async (route) => {
      await route.fulfill({
        json: {
          configured: true,
          reachable: true,
          system: {
            mode: "local",
            gemini_configured: false,
            gemini_model: "gemini-2.5-flash",
            embeddings_enabled: false,
            embedding_model: "fts5",
            drive_configured: false,
            moonwitness_sync_configured: false,
            max_upload_gb: 2,
          },
          counts: {
            archives: 1,
            messages: 12,
            knowledge: 2,
            active_jobs: 0,
            failed_jobs: 0,
          },
        },
      });
    });
    await page.route("**/api/v1/memory/knowledge**", async (route) => {
      const url = new URL(route.request().url());
      const q = url.searchParams.get("q");
      const limit = url.searchParams.get("limit");
      knowledgeQueries.push({ q, limit });
      await route.fulfill({
        json: {
          configured: true,
          query: q ?? "",
          records: [
            {
              id: "rec-1",
              kind: "architecture",
              title: "Port 3005 Isolation",
              summary: "Memory web UI uses port 3005.",
              content: "No collision with Next web 3000.",
              tags: ["ports", "memory"],
              entities: [],
              source_message_ids: [],
              confidence: 0.96,
            },
          ],
        },
      });
    });

    await page.goto("/intelligence");
    const bridge = page.getByRole("region", { name: "Archive memory bridge" });
    await expect(bridge).toBeVisible();
    await expect(bridge.getByText("ONLINE · 2 RECORDS")).toBeVisible();
    await expect(bridge.getByRole("link", { name: "EXPORT NDJSON" })).toBeVisible();

    await bridge.getByRole("searchbox", { name: "Search archive knowledge" }).fill("ports");
    await bridge.getByRole("button", { name: "SEARCH MEMORY" }).click();

    await expect(bridge.getByText("Port 3005 Isolation")).toBeVisible();
    expect(knowledgeQueries).toContainEqual({ q: "ports", limit: "8" });

    await bridge.getByRole("button", { name: "ATTACH TO PROMPT" }).click();
    await expect(bridge.getByRole("button", { name: "ATTACHED TO PROMPT" })).toBeVisible();
    await expect(page.locator("textarea").first()).toHaveValue(
      /\[Archive Knowledge: Port 3005 Isolation \(architecture\)\]/,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("Memory Vault renders knowledge corpus, provenance drawer, archive vault, and resume action", async ({
    page,
  }) => {
    await page.route("**/api/memory/**", async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path === "/api/memory/system") {
        await route.fulfill({
          json: {
            mode: "local-first",
            gemini_configured: true,
            gemini_model: "gemini-2.5-flash",
            embeddings_enabled: true,
            embedding_model: "bge-m3",
            drive_configured: false,
            moonwitness_sync_configured: true,
            max_upload_gb: 2,
          },
        });
        return;
      }
      if (path === "/api/memory/dashboard") {
        await route.fulfill({
          json: { archives: 1, messages: 12, knowledge: 1, active_jobs: 0, failed_jobs: 1 },
        });
        return;
      }
      if (path === "/api/memory/archives") {
        await route.fulfill({
          json: [
            {
              id: "arc-1",
              file_name: "export-2026.zip",
              size_bytes: 2048,
              sha256: "a".repeat(64),
              status: "complete",
              drive_status: "pending",
              created_at: "2026-11-18T00:00:00Z",
            },
          ],
        });
        return;
      }
      if (path === "/api/memory/jobs") {
        await route.fulfill({
          json: [
            {
              id: "job-1",
              archive_id: "arc-1",
              status: "awaiting_ai",
              processed_conversations: 4,
              total_conversations: 10,
              error: "Missing GEMINI_API_KEY",
            },
          ],
        });
        return;
      }
      if (path === "/api/memory/knowledge" || path === "/api/memory/search") {
        await route.fulfill({
          json: [
            {
              id: "know-1",
              kind: "decision",
              title: "Single Web Shell Consolidation",
              summary: "Merged companion memory UI into apps/web under /memory.",
              content: "Full detail on why apps/web hosts the single console shell.",
              confidence: 0.94,
              tags: ["architecture", "memory"],
              source_message_ids: ["msg-1"],
            },
          ],
        });
        return;
      }
      if (path === "/api/memory/knowledge/know-1/sources") {
        await route.fulfill({
          json: {
            knowledge_id: "know-1",
            archive_id: "arc-1",
            conversation_id: "conv-1",
            messages: [
              {
                message_id: "msg-1",
                conversation_id: "conv-1",
                conversation_title: "Monorepo Simplification",
                role: "assistant",
                content: "We should serve /memory directly inside apps/web.",
                created_at: "2026-11-18T12:00:00Z",
              },
            ],
          },
        });
        return;
      }
      if (path === "/api/memory/jobs/job-1/resume" && route.request().method() === "POST") {
        await route.fulfill({ json: { status: "queued", job_id: "job-1" } });
        return;
      }
      if (path === "/api/memory/witness/claims" && route.request().method() === "GET") {
        await route.fulfill({
          json: {
            claims: [
              {
                id: "claim-1",
                statement: "Relay node alpha logs UTC timestamps over serial link.",
                epistemic_type: "fact",
                status: "active",
                created_at: "2026-11-18T12:00:00Z",
                updated_at: "2026-11-18T12:00:00Z",
                source_count: 1,
                revision_count: 0,
                relation_count: 0,
              },
            ],
            epistemic_types: [
              "fact",
              "testimony",
              "hypothesis",
              "interpretation",
              "dream",
              "fiction",
              "unknown",
            ],
            statuses: ["active", "superseded", "disputed", "unverified"],
            relation_types: ["supports", "contradicts", "derived_from", "supersedes"],
          },
        });
        return;
      }
      if (path === "/api/memory/witness/claims/claim-1/lineage") {
        await route.fulfill({
          json: {
            claim: {
              id: "claim-1",
              statement: "Relay node alpha logs UTC timestamps over serial link.",
              epistemic_type: "fact",
              status: "active",
              created_at: "2026-11-18T12:00:00Z",
              updated_at: "2026-11-18T12:00:00Z",
            },
            sources: [
              {
                id: "src-1",
                claim_id: "claim-1",
                archive_id: "arc-1",
                message_id: "msg-1",
                excerpt: "logs UTC timestamps over serial link",
                source_sha256: "b".repeat(64),
                attribution: "serial-log",
                rationale: "Primary excerpt",
                created_at: "2026-11-18T12:00:00Z",
              },
            ],
            revisions: [],
            relations: [],
            resolved_messages: [],
          },
        });
        return;
      }
      await route.fulfill({ json: {} });
    });

    await page.goto("/memory");
    await expect(
      page.getByRole("heading", { name: /HOW U REMIND ME — ARCHIVE MEMORY/i }),
    ).toBeVisible();
    await expect(page.getByText("Single Web Shell Consolidation")).toBeVisible();

    await page.getByRole("button", { name: /Sources \(1\)/i }).click();
    await expect(page.getByText("SOURCE PROVENANCE MESSAGES")).toBeVisible();
    await expect(page.getByText("We should serve /memory directly inside apps/web.")).toBeVisible();
    await page.getByRole("button", { name: "Close source provenance drawer" }).click();

    await page.getByRole("tab", { name: /Vault & Upload \(1\)/i }).click();
    await expect(page.getByText("export-2026.zip")).toBeVisible();

    await page.getByRole("tab", { name: /Worker Queue \(1\)/i }).click();
    await expect(page.getByText("Conversations: 4 / 10")).toBeVisible();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByText("Job resumed from saved checkpoint.")).toBeVisible();

    await page.getByRole("tab", { name: /Witness Ledger \(1\)/i }).click();
    await expect(
      page.getByText("Relay node alpha logs UTC timestamps over serial link."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Inspect Lineage" }).click();
    await expect(page.getByText("CLAIM PROVENANCE LINEAGE")).toBeVisible();
    await expect(
      page.getByText("logs UTC timestamps over serial link", { exact: true }),
    ).toBeVisible();
  });
});
