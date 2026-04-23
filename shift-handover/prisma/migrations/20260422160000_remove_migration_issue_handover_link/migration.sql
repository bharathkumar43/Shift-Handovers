-- Disconnect Issues tab from shift handover (issues are manual-only)
ALTER TABLE "MigrationIssue" DROP CONSTRAINT IF EXISTS "MigrationIssue_sourceClientEntryId_fkey";

DROP INDEX IF EXISTS "MigrationIssue_sourceClientEntryId_key";

ALTER TABLE "MigrationIssue" DROP COLUMN IF EXISTS "sourceClientEntryId";
