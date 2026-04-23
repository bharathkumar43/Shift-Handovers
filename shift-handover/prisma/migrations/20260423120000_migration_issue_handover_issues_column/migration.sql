-- Link one MigrationIssue row per shift-handover client line (synced from ClientEntry.issues)
ALTER TABLE "MigrationIssue" ADD COLUMN IF NOT EXISTS "sourceClientEntryId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "MigrationIssue_sourceClientEntryId_key" ON "MigrationIssue"("sourceClientEntryId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MigrationIssue_sourceClientEntryId_fkey'
  ) THEN
    ALTER TABLE "MigrationIssue"
      ADD CONSTRAINT "MigrationIssue_sourceClientEntryId_fkey"
      FOREIGN KEY ("sourceClientEntryId") REFERENCES "ClientEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
