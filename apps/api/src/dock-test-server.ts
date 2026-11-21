import { buildApp } from "./app";

const port = Number(process.env.PORT ?? "3002");
const database = process.env.DATABASE_URL ?? ":memory:";

// `buildApp` already mounts the base and timeline addons and seeds the demo
// fixtures, so this disposable server only needs to listen.
const app = await buildApp({ dbPath: database, prefix: "/api/v1", seed: true });

await app.listen({ port, host: "127.0.0.1" });
console.log(`Disposable Dock test API listening on 127.0.0.1:${port}`);

const shutdown = async () => {
  await app.close();
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
