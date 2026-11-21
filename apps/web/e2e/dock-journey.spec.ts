import { expect, test, type Page } from "@playwright/test";
import type { Era, TimelineEvent } from "@moonwitness/contracts/types";

const eras: Era[] = [
  {
    id: "origins",
    name: "Origins",
    years: "2020-2022",
    tagline: "The first witnesses.",
    color: "#3b82f6",
  },
  {
    id: "neon",
    name: "Neon",
    years: "2022-2024",
    tagline: "City lights, signal glow.",
    color: "#ec4899",
  },
];

const journeyEvents: TimelineEvent[] = [
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

async function mockTimelineApi(page: Page, records: TimelineEvent[]): Promise<void> {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith("/timeline/eras")) {
      await route.fulfill({ json: { data: eras } });
      return;
    }
    if (path.endsWith("/timeline/stats")) {
      const byEra: Record<string, number> = {};
      const byKind: Record<string, number> = {};
      for (const event of records) {
        byEra[event.era] = (byEra[event.era] ?? 0) + 1;
        byKind[event.kind] = (byKind[event.kind] ?? 0) + 1;
      }
      await route.fulfill({ json: { data: { total: records.length, byEra, byKind } } });
      return;
    }
    const eventPrefix = "/timeline/events/";
    if (path.includes(eventPrefix)) {
      const eventId = decodeURIComponent(
        path.slice(path.lastIndexOf(eventPrefix) + eventPrefix.length),
      );
      const event = records.find((record) => record.id === eventId);
      if (!event) {
        await route.fulfill({ status: 404, json: { error: "Event not found" } });
        return;
      }
      await route.fulfill({ json: { data: event } });
      return;
    }
    if (path.endsWith("/timeline/events")) {
      const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
      const era = url.searchParams.get("era");
      const sort = url.searchParams.get("sort");
      const filtered = records
        .filter((event) => !era || event.era === era)
        .filter(
          (event) =>
            !query ||
            `${event.title} ${event.excerpt} ${event.body} ${event.location} ${event.tags.join(" ")}`
              .toLowerCase()
              .includes(query),
        )
        .sort((left, right) =>
          sort === "newest"
            ? right.date.localeCompare(left.date) || right.id.localeCompare(left.id)
            : left.date.localeCompare(right.date) || left.id.localeCompare(right.id),
        );
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 100);
      await route.fulfill({
        json: { data: filtered.slice(offset, offset + limit), total: filtered.length },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { error: "Not found" } });
  });
}

test("filters, opens details, and follows a related event", async ({ page }) => {
  await mockTimelineApi(page, journeyEvents);
  await page.goto("/dock");

  await page
    .getByRole("group", { name: "Filter by era" })
    .getByRole("button", { name: "Neon", exact: true })
    .click();
  await expect(page).toHaveURL(/era=neon/);
  await page.getByRole("button", { name: /SIGNAL IN THE FOG/i }).click();
  await expect(page).toHaveURL(/event=evt-002/);
  await expect(
    page
      .getByRole("complementary", { name: "Event detail" })
      .getByRole("heading", { name: "SIGNAL IN THE FOG" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /FIRST WITNESS STATION/i }).click();
  await expect(page).toHaveURL(/event=evt-001/);
  await expect(page).toHaveURL(/era=neon/);
  await expect(
    page
      .getByRole("complementary", { name: "Event detail" })
      .getByRole("heading", { name: "FIRST WITNESS STATION" }),
  ).toBeVisible();
});

test("restores shared event, search, era, and sort state from the URL", async ({ page }) => {
  await mockTimelineApi(page, journeyEvents);
  await page.goto("/dock?q=signal&era=neon&sort=oldest&event=evt-002");

  await expect(page.getByRole("textbox", { name: "Search timeline events…" })).toHaveValue(
    "signal",
  );
  await expect(
    page.getByRole("group", { name: "Filter by era" }).getByRole("button", {
      name: "Neon",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Sort events")).toHaveValue("oldest");
  await expect(
    page
      .getByRole("complementary", { name: "Event detail" })
      .getByRole("heading", { name: "SIGNAL IN THE FOG" }),
  ).toBeVisible();
});

test("paginates API results and stores the page in the URL", async ({ page }) => {
  const records = Array.from({ length: 13 }, (_, index): TimelineEvent => ({
    ...journeyEvents[0]!,
    id: `page-${index + 1}`,
    date: `2020-01-${String(index + 1).padStart(2, "0")}`,
    title: `Archive Record ${String(index + 1).padStart(2, "0")}`,
    related: [],
  }));
  await mockTimelineApi(page, records);
  await page.goto("/dock");

  await expect(page.getByText("Showing 1–12 of 13 events")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("button", { name: /ARCHIVE RECORD 01/i })).toBeVisible();
  await expect(page.getByText("Showing 13–13 of 13 events")).toBeVisible();
});

test("shows the seeded timeline through the live API without a frontend fixture", async ({
  page,
}) => {
  const requestedTimelinePaths: string[] = [];
  await page.route("**/api/v1/timeline/**", async (route) => {
    requestedTimelinePaths.push(new URL(route.request().url()).pathname);
    await route.continue();
  });

  await page.goto("/dock");
  await expect(page.getByRole("button", { name: /FIRST WITNESS STATION/i })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: /FIRST WITNESS STATION/i }).click();
  await expect(page).toHaveURL(/event=evt-001/);
  await expect(
    page
      .getByRole("complementary", { name: "Event detail" })
      .getByRole("heading", { name: "FIRST WITNESS STATION" }),
  ).toBeVisible();
  await expect
    .poll(() => requestedTimelinePaths.some((path) => path.endsWith("/timeline/events/evt-001")))
    .toBe(true);
});
