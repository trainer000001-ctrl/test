import { describe, expect, it } from "vitest";
import { assertDemoSeedAllowed } from "./seed-safety";

describe("demo timeline seed safety", () => {
  it("allows explicit fixture seeding outside production", () => {
    expect(() =>
      assertDemoSeedAllowed({ nodeEnv: "development", allowDemoSeed: "0" }),
    ).not.toThrow();
  });

  it("rejects production seeding unless explicitly enabled", () => {
    expect(() => assertDemoSeedAllowed({ nodeEnv: "production", allowDemoSeed: "0" })).toThrow(
      /ALLOW_DEMO_SEED=1/,
    );
  });

  it("allows an explicitly approved production seed run", () => {
    expect(() =>
      assertDemoSeedAllowed({ nodeEnv: "production", allowDemoSeed: "1" }),
    ).not.toThrow();
  });
});
