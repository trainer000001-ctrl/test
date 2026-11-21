import type { AddonDefinition, AddonLoadContext } from "./types";

const ADDON_NAME_RE = /^(__base|[a-z][a-z0-9_-]{0,63})$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export class AddonRegistryError extends Error {
  readonly code: string;
  readonly addon?: string;

  constructor(message: string, code = "ADDON_REGISTRY_ERROR", addon?: string) {
    super(message);
    this.name = "AddonRegistryError";
    this.code = code;
    this.addon = addon;
  }
}

export class AddonRegistry {
  private readonly addons = new Map<string, AddonDefinition>();
  private readonly loaded = new Set<string>();

  add(definition: AddonDefinition): this {
    const name = definition.manifest?.name?.trim();
    if (!name || !ADDON_NAME_RE.test(name)) {
      throw new AddonRegistryError(
        `Invalid addon manifest name '${String(name)}'. Expected lowercase slug or '__base'.`,
        "INVALID_MANIFEST",
        name,
      );
    }
    if (!definition.manifest.version || !SEMVER_RE.test(definition.manifest.version)) {
      throw new AddonRegistryError(
        `Invalid semver version '${String(definition.manifest.version)}' in addon '${name}'.`,
        "INVALID_MANIFEST",
        name,
      );
    }
    if (this.addons.has(name)) {
      throw new AddonRegistryError(
        `Duplicate addon '${name}' already registered.`,
        "DUPLICATE_ADDON",
        name,
      );
    }
    this.addons.set(name, definition);
    return this;
  }

  get(name: string): AddonDefinition | undefined {
    return this.addons.get(name);
  }

  list(): AddonDefinition[] {
    return [...this.addons.values()];
  }

  has(name: string): boolean {
    return this.addons.has(name);
  }

  isLoaded(name: string): boolean {
    return this.loaded.has(name);
  }

  validate(): void {
    const claimedRoutes = new Map<string, string>();
    const claimedModels = new Map<string, string>();

    for (const def of this.addons.values()) {
      const { name, depends, provides } = def.manifest;
      for (const dep of depends) {
        if (!this.addons.has(dep)) {
          throw new AddonRegistryError(
            `Missing addon dependency '${dep}' required by '${name}'.`,
            "MISSING_DEPENDENCY",
            name,
          );
        }
      }

      for (const route of provides?.routes ?? []) {
        const owner = claimedRoutes.get(route);
        if (owner && owner !== name) {
          throw new AddonRegistryError(
            `Route '${route}' claimed by '${name}' is already claimed by another addon ('${owner}').`,
            "ROUTE_COLLISION",
            name,
          );
        }
        claimedRoutes.set(route, name);
      }

      for (const model of provides?.models ?? []) {
        const owner = claimedModels.get(model);
        if (owner && owner !== name) {
          throw new AddonRegistryError(
            `Model '${model}' claimed by '${name}' is already claimed by another addon ('${owner}').`,
            "MODEL_COLLISION",
            name,
          );
        }
        claimedModels.set(model, name);
      }
    }

    // Trigger cycle detection via topological resolution
    this.resolveOrder();
  }

  resolveOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const stack: string[] = [];
    const order: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        const cycleStart = stack.indexOf(name);
        const cyclePath = [...stack.slice(cycleStart), name].join(" -> ");
        throw new AddonRegistryError(
          `Circular addon dependency detected: ${cyclePath}`,
          "CIRCULAR_DEPENDENCY",
          name,
        );
      }

      const def = this.addons.get(name);
      if (!def) {
        throw new AddonRegistryError(
          `Missing addon dependency '${name}'.`,
          "MISSING_DEPENDENCY",
          name,
        );
      }

      visiting.add(name);
      stack.push(name);
      for (const dep of def.manifest.depends) {
        visit(dep);
      }
      stack.pop();
      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of this.addons.keys()) {
      visit(name);
    }

    return order;
  }

  getDependents(addonName: string): string[] {
    const dependents: string[] = [];
    for (const def of this.addons.values()) {
      if (def.manifest.depends.includes(addonName)) {
        dependents.push(def.manifest.name);
      }
    }
    return dependents;
  }

  async load(target?: unknown): Promise<string[]> {
    this.validate();
    const order = this.resolveOrder();
    const loadedSoFar: string[] = [];

    for (const name of order) {
      const def = this.addons.get(name)!;
      if (def.register) {
        const ctx: AddonLoadContext = {
          loaded: [...loadedSoFar],
          target,
        };
        await def.register(ctx);
      }
      this.loaded.add(name);
      loadedSoFar.push(name);
    }

    return order;
  }
}
