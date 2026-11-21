import type { ModelMetadataSnapshot } from "@moonwitness/orm";
import type {
  ViewDefinition,
  ViewFilterSpec,
  ViewInheritanceOp,
  ViewSpec,
  ViewType,
} from "./types";

function cloneSpec(spec: ViewSpec): ViewSpec {
  return {
    ...spec,
    columns: spec.columns ? [...spec.columns] : undefined,
    formFields: spec.formFields ? [...spec.formFields] : undefined,
    cardFields: spec.cardFields ? [...spec.cardFields] : undefined,
    searchFields: spec.searchFields ? [...spec.searchFields] : undefined,
    groupBy: spec.groupBy ? [...spec.groupBy] : undefined,
    filters: spec.filters ? spec.filters.map((f) => ({ ...f, domain: [...f.domain] })) : undefined,
  };
}

function applyListOperation(
  list: string[],
  op: ViewInheritanceOp,
): string[] {
  const next = [...list];
  const valStr = typeof op.value === "string" ? op.value : "";

  if (op.op === "remove" && op.anchor) {
    return next.filter((item) => item !== op.anchor);
  }
  if (op.op === "replace" && op.anchor && valStr) {
    const idx = next.indexOf(op.anchor);
    if (idx >= 0) next[idx] = valStr;
    return next;
  }
  if (op.op === "after" && valStr) {
    const clean = next.filter((item) => item !== valStr);
    const idx = op.anchor ? clean.indexOf(op.anchor) : clean.length - 1;
    if (idx >= 0) clean.splice(idx + 1, 0, valStr);
    else clean.push(valStr);
    return clean;
  }
  if (op.op === "before" && valStr) {
    const clean = next.filter((item) => item !== valStr);
    const idx = op.anchor ? clean.indexOf(op.anchor) : 0;
    if (idx >= 0) clean.splice(idx, 0, valStr);
    else clean.unshift(valStr);
    return clean;
  }
  return next;
}

function applyFilterOperation(
  filters: ViewFilterSpec[],
  op: ViewInheritanceOp,
): ViewFilterSpec[] {
  const next = [...filters];
  if (op.op === "remove" && op.anchor) {
    return next.filter((f) => f.key !== op.anchor);
  }
  const spec = op.value as ViewFilterSpec | undefined;
  if (!spec || typeof spec.key !== "string") return next;

  if (op.op === "replace" && op.anchor) {
    const idx = next.findIndex((f) => f.key === op.anchor);
    if (idx >= 0) next[idx] = spec;
    return next;
  }
  const clean = next.filter((f) => f.key !== spec.key);
  if (op.op === "before" && op.anchor) {
    const idx = clean.findIndex((f) => f.key === op.anchor);
    if (idx >= 0) clean.splice(idx, 0, spec);
    else clean.unshift(spec);
    return clean;
  }
  const idx = op.anchor ? clean.findIndex((f) => f.key === op.anchor) : clean.length - 1;
  if (idx >= 0) clean.splice(idx + 1, 0, spec);
  else clean.push(spec);
  return clean;
}

/**
 * Pure, deterministic Odoo-style declarative View Inheritance processor.
 */
export function applyViewInheritance(
  baseSpec: ViewSpec,
  operations: readonly ViewInheritanceOp[],
): ViewSpec {
  let result = cloneSpec(baseSpec);

  for (const op of operations) {
    if (op.target === "spec" && op.op === "attributes" && op.value && typeof op.value === "object") {
      result = { ...result, ...(op.value as Record<string, unknown>) };
      continue;
    }

    if (op.target === "filters") {
      result = {
        ...result,
        filters: applyFilterOperation(result.filters ?? [], op),
      };
      continue;
    }

    if (
      op.target === "columns" ||
      op.target === "formFields" ||
      op.target === "cardFields" ||
      op.target === "searchFields" ||
      op.target === "groupBy"
    ) {
      const current = (result[op.target] as string[] | undefined) ?? [];
      result = {
        ...result,
        [op.target]: applyListOperation(current, op),
      };
    }
  }

  return result;
}

/**
 * Automatic Default View Generator: creates working list, form, kanban, and search
 * views purely from ORM model metadata when an addon does not supply explicit views.
 */
export function generateDefaultViews(meta: ModelMetadataSnapshot): ViewDefinition[] {
  const fieldNames = meta.fields.map((f) => f.name);
  const selectionField = meta.fields.find((f) => f.selection && f.selection.length > 0);
  const stageField =
    selectionField?.name ??
    meta.fields.find((f) => /stage|state|status|phase|tier|category/i.test(f.name))?.name ??
    fieldNames[0];

  const defaultColumns = fieldNames.slice(0, 6);
  const defaultFormFields = fieldNames;
  const defaultSearchFields = meta.fields
    .filter((f) => f.fieldType === "text" || f.fieldType === "selection")
    .slice(0, 5)
    .map((f) => f.name);
  const defaultGroupBy = meta.fields
    .filter((f) => f.fieldType === "selection" || f.fieldType === "boolean" || Boolean(f.relation))
    .map((f) => f.name);

  const defaultFilters: ViewFilterSpec[] = [];
  if (selectionField?.selection) {
    for (const choice of selectionField.selection.slice(0, 5)) {
      defaultFilters.push({
        key: `${selectionField.name}_${choice}`,
        label: `${selectionField.label}: ${choice}`,
        domain: [[selectionField.name, "=", choice]],
      });
    }
  }

  const views: ViewDefinition[] = [
    {
      id: `${meta.name}.default.list`,
      model: meta.name,
      view_type: "list",
      addon: meta.originAddon,
      priority: 100,
      spec: {
        title: meta.name,
        columns: defaultColumns,
        defaultOrder: "write_date DESC",
      },
    },
    {
      id: `${meta.name}.default.form`,
      model: meta.name,
      view_type: "form",
      addon: meta.originAddon,
      priority: 100,
      spec: {
        title: meta.name,
        formFields: defaultFormFields,
      },
    },
    {
      id: `${meta.name}.default.search`,
      model: meta.name,
      view_type: "search",
      addon: meta.originAddon,
      priority: 100,
      spec: {
        searchFields: defaultSearchFields,
        filters: defaultFilters,
        groupBy: defaultGroupBy,
      },
    },
  ];

  if (stageField) {
    views.push({
      id: `${meta.name}.default.kanban`,
      model: meta.name,
      view_type: "kanban",
      addon: meta.originAddon,
      priority: 100,
      spec: {
        title: meta.name,
        stageField,
        cardFields: fieldNames.slice(0, 4),
      },
    });
  }

  return views;
}

export class ViewRegistry {
  private readonly views = new Map<string, ViewDefinition>();

  register(view: ViewDefinition): void {
    this.views.set(view.id, view);
  }

  unregisterById(viewId: string): boolean {
    return this.views.delete(viewId);
  }

  unregisterByAddon(addonName: string): number {
    let removed = 0;
    for (const [id, view] of this.views.entries()) {
      if (view.addon === addonName) {
        this.views.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  listForModel(modelName: string, activeAddons?: ReadonlySet<string>): ViewDefinition[] {
    return [...this.views.values()].filter(
      (v) =>
        v.model === modelName &&
        (!activeAddons || !v.addon || activeAddons.has(v.addon)),
    );
  }

  /**
   * Resolves effective views for a model:
   * 1. Collects active base views (falling back to generated default views per missing view_type).
   * 2. Applies all active inherited views targeting each base view ID (or '*' wildcard for same view_type) in priority order.
   * 3. Strips fields the requesting actor is not permitted to read (permission-aware view pruning).
   */
  resolveForModel(
    meta: ModelMetadataSnapshot,
    activeAddons?: ReadonlySet<string>,
  ): Array<{
    readonly id: string;
    readonly view_type: ViewType;
    readonly addon: string;
    readonly priority: number;
    readonly spec: ViewSpec;
  }> {
    const allowedFields = new Set(meta.fields.map((f) => f.name));
    const registered = this.listForModel(meta.name, activeAddons);
    const baseViews = registered.filter((v) => !v.inherit_id);
    const inheritedViews = registered
      .filter((v) => Boolean(v.inherit_id))
      .sort((a, b) => (a.priority ?? 16) - (b.priority ?? 16));

    const defaults = generateDefaultViews(meta);
    const effectiveBases: ViewDefinition[] = [...baseViews];
    const coveredTypes = new Set(baseViews.map((v) => v.view_type));
    for (const defView of defaults) {
      if (!coveredTypes.has(defView.view_type)) {
        effectiveBases.push(defView);
      }
    }

    effectiveBases.sort((a, b) => (a.priority ?? 16) - (b.priority ?? 16));

    return effectiveBases.map((base) => {
      let mergedSpec = cloneSpec(base.spec ?? {});
      for (const ext of inheritedViews) {
        const matchesTarget =
          ext.inherit_id === base.id ||
          (ext.inherit_id === "*" && ext.view_type === base.view_type);
        if (matchesTarget) {
          if (ext.spec) {
            mergedSpec = { ...mergedSpec, ...ext.spec };
          }
          if (ext.operations?.length) {
            mergedSpec = applyViewInheritance(mergedSpec, ext.operations);
          }
        }
      }

      // Include any newly added custom fields in list/form automatically if not explicitly hidden
      const customFieldNames = meta.fields.filter((f) => f.isCustom).map((f) => f.name);
      let nextColumns = mergedSpec.columns ? [...mergedSpec.columns] : undefined;
      let nextFormFields = mergedSpec.formFields ? [...mergedSpec.formFields] : undefined;
      if (nextColumns && customFieldNames.length > 0) {
        for (const cf of customFieldNames) {
          if (!nextColumns.includes(cf)) nextColumns.push(cf);
        }
      }
      if (nextFormFields && customFieldNames.length > 0) {
        for (const cf of customFieldNames) {
          if (!nextFormFields.includes(cf)) nextFormFields.push(cf);
        }
      }

      // Permission-aware pruning: remove fields unreadable by current actor
      const prunedSpec: ViewSpec = {
        ...mergedSpec,
        ...(nextColumns ? { columns: nextColumns.filter((f) => allowedFields.has(f)) } : {}),
        ...(nextFormFields ? { formFields: nextFormFields.filter((f) => allowedFields.has(f)) } : {}),
        ...(mergedSpec.cardFields
          ? { cardFields: mergedSpec.cardFields.filter((f) => allowedFields.has(f)) }
          : {}),
        ...(mergedSpec.searchFields
          ? { searchFields: mergedSpec.searchFields.filter((f) => allowedFields.has(f)) }
          : {}),
        ...(mergedSpec.groupBy
          ? { groupBy: mergedSpec.groupBy.filter((f) => allowedFields.has(f)) }
          : {}),
      };

      return {
        id: base.id,
        view_type: base.view_type,
        addon: base.addon ?? meta.originAddon,
        priority: base.priority ?? 16,
        spec: prunedSpec,
      };
    });
  }
}
