-- One-to-one: handover line <-> issues tab row (auto-updated on handover save)
ALTER TABLE "MigrationIssue" ADD COLUMN "sourceClientEntryId" TEXT;

CREATE UNIQUE INDEX "MigrationIssue_sourceClientEntryId_key" ON "MigrationIssue"("sourceClientEntryId");

ALTER TABLE "MigrationIssue" ADD CONSTRAINT "MigrationIssue_sourceClientEntryId_fkey" FOREIGN KEY ("sourceClientEntryId") REFERENCES "ClientEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
