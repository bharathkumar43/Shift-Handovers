/** Product types that drive batch tracker templates and BatchRun.productType. */
export type AppProductType = "CONTENT" | "MESSAGE" | "EMAIL";

function isAppProductType(s: string): s is AppProductType {
  return s === "CONTENT" || s === "MESSAGE" || s === "EMAIL";
}

/**
 * Prefer the migration type’s category (from MigrationTypeOption.productType).
 * Fall back to stored MigrationProject.productType when the migration type is missing, "OTHER"/ALL, or unknown.
 */
export function resolveEffectiveProductType(
  migrationOptionProductType: string | null | undefined,
  storedProductType: string | null | undefined
): AppProductType | null {
  if (migrationOptionProductType && migrationOptionProductType !== "ALL") {
    if (isAppProductType(migrationOptionProductType)) return migrationOptionProductType;
  }
  if (storedProductType && isAppProductType(storedProductType)) return storedProductType;
  return null;
}

/** First matching concrete product type from multiple migration type options (order preserved). */
export function resolveEffectiveProductTypeFromMigrationOptions(
  options: { productType: string }[],
  storedProductType: string | null | undefined
): AppProductType | null {
  for (const o of options) {
    const t = resolveEffectiveProductType(o.productType, null);
    if (t) return t;
  }
  return resolveEffectiveProductType(null, storedProductType);
}
