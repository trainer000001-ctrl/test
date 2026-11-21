export function assertDemoSeedAllowed(config: {
  nodeEnv: "development" | "production" | "test";
  allowDemoSeed: string;
}): void {
  if (config.nodeEnv === "production" && config.allowDemoSeed !== "1") {
    throw new Error(
      "Refusing to seed fictional timeline fixtures in production. Set ALLOW_DEMO_SEED=1 only for an intentional seed run.",
    );
  }
}
