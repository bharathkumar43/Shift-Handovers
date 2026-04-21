/** Normalize DB row: prefer `migrationTypes` array, else legacy single `migrationType`. */
export function normalizeMigrationTypesFromDb(mp: {
  migrationTypes?: string[];
  migrationType: string | null;
}): string[] {
  if (mp.migrationTypes && mp.migrationTypes.length > 0) return [...mp.migrationTypes];
  if (mp.migrationType) return [mp.migrationType];
  return [];
}
