import { initDb, closeDb, syncModels } from "@moonwitness/orm";
import {
  eras,
  events,
  seedTimeline,
  timelineEraModel,
  timelineEventModel,
} from "@moonwitness/addons/timeline";
import { env, resolveApiDatabaseUrl } from "./shared/env";
import { assertDemoSeedAllowed } from "./shared/seed-safety";

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function buildD1SeedSql(now: string): string {
  const lines: string[] = [];
  for (const era of eras) {
    lines.push(
      `INSERT OR IGNORE INTO timeline_eras (id, name, years, tagline, color, create_date, write_date, source) VALUES (${[
        sqlString(era.id),
        sqlString(era.name),
        sqlString(era.years),
        sqlString(era.tagline),
        sqlString(era.color),
        sqlString(now),
        sqlString(now),
        "'seed'",
      ].join(", ")});`,
    );
  }
  for (const ev of events) {
    lines.push(
      `INSERT OR IGNORE INTO timeline_events (id, kind, date, era, title, excerpt, body, location, tags, sources, notes, image, imagePosition, related, create_date, write_date, source) VALUES (${[
        sqlString(ev.id),
        sqlString(ev.kind),
        sqlString(ev.date),
        sqlString(ev.era),
        sqlString(ev.title),
        sqlString(ev.excerpt),
        sqlString(ev.body),
        sqlString(ev.location),
        sqlString(JSON.stringify(ev.tags)),
        String(ev.sources),
        String(ev.notes),
        sqlString(ev.image),
        ev.imagePosition ? sqlString(ev.imagePosition) : "NULL",
        sqlString(JSON.stringify(ev.related)),
        sqlString(now),
        sqlString(now),
        "'seed'",
      ].join(", ")});`,
    );
  }
  return lines.join("\n");
}

async function main() {
  assertDemoSeedAllowed({
    nodeEnv: env.NODE_ENV,
    allowDemoSeed: process.env.ALLOW_DEMO_SEED ?? "0",
  });
  if (process.argv.includes("--sql")) {
    process.stdout.write(`${buildD1SeedSql(new Date().toISOString())}\n`);
    return;
  }
  const dbPath = resolveApiDatabaseUrl(process.env.DATABASE_URL ?? env.DATABASE_URL, env.NODE_ENV);
  await initDb(dbPath);
  await syncModels([timelineEventModel, timelineEraModel]);
  await seedTimeline();
  console.log("Database seeded (idempotent)");
  closeDb();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  closeDb();
  process.exit(1);
});
