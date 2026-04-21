-- Multi-select migration types + overage flag; backfill array from legacy single column.
ALTER TABLE "MigrationProject" ADD COLUMN IF NOT EXISTS "migrationTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MigrationProject" ADD COLUMN IF NOT EXISTS "overagePaid" BOOLEAN NOT NULL DEFAULT false;

UPDATE "MigrationProject"
SET "migrationTypes" = ARRAY["migrationType"]::TEXT[]
WHERE "migrationType" IS NOT NULL
  AND cardinality("migrationTypes") = 0;
