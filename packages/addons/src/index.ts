import type { AddonDefinition, AddonHostContext } from "@moonwitness/addon-runtime";
import { createAuthAddon } from "./auth";
import { createBaseAddonDefinition } from "./base";
import {
  createCabAddon,
  createCanonLoreAddon,
  createProbesAddon,
  createSupportingPlatformAddons,
  createTimelineAddon,
  createWitnessResearchAddon,
} from "./domains";
import { createProjectAddon } from "./project";

export * from "./base";
export * from "./auth";
export * from "./project";
export * from "./domains";

/**
 * Returns the canonical first-party MoonWitness platform addons in modular form.
 * When `includeBase` is true (default for embedded runtime), `__base` is included first.
 */
export function createPlatformAddons(
  _host?: Partial<AddonHostContext>,
  options: { includeBase?: boolean } = {},
): AddonDefinition[] {
  const addons: AddonDefinition[] = [
    createAuthAddon(),
    createCabAddon(),
    createTimelineAddon(),
    createCanonLoreAddon(),
    createWitnessResearchAddon(),
    createProbesAddon(),
    createProjectAddon(),
    ...createSupportingPlatformAddons(),
  ];

  if (options.includeBase) {
    return [createBaseAddonDefinition(), ...addons];
  }
  return addons;
}
