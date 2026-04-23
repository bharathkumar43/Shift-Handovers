import type { MigrationTypeOption, ProductType } from "@prisma/client";
import prisma from "@/lib/db";
import { normalizeMigrationTypesFromDb } from "@/lib/migration-project-helpers";
import {
  resolveEffectiveProductTypeFromMigrationOptions,
  type AppProductType,
} from "@/lib/effective-product-type";

async function orderedMigrationOptions(values: string[]): Promise<MigrationTypeOption[]> {
  if (!values.length) return [];
  const all = await prisma.migrationTypeOption.findMany();
  return values
    .map((v) => all.find((o) => o.value.toLowerCase() === v.toLowerCase()))
    .filter((o): o is MigrationTypeOption => o != null);
}

/**
 * Resolves Content / Message / Email for batch tracker templates.
 * Uses migration paths (`migrationTypes` + legacy `migrationType`) and stored `productType`.
 * Falls back to **CONTENT** when nothing is set so batch runs can always be created.
 */
export async function resolveProductLineForBatchTracker(mp: {
  migrationTypes: string[];
  migrationType: string | null;
  productType: ProductType | null;
}): Promise<AppProductType> {
  const norm = normalizeMigrationTypesFromDb(mp);
  const opts = await orderedMigrationOptions(norm);
  const resolved = resolveEffectiveProductTypeFromMigrationOptions(opts, mp.productType);
  return resolved ?? "CONTENT";
}
