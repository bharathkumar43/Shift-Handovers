-- Handover Tickets column → migration project Tickets tab (one row per handover client line)
CREATE TABLE "MigrationProjectTicket" (
    "id" TEXT NOT NULL,
    "migrationProjectId" TEXT NOT NULL,
    "sourceClientEntryId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationProjectTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MigrationProjectTicket_sourceClientEntryId_key" ON "MigrationProjectTicket"("sourceClientEntryId");

CREATE INDEX "MigrationProjectTicket_migrationProjectId_idx" ON "MigrationProjectTicket"("migrationProjectId");

ALTER TABLE "MigrationProjectTicket" ADD CONSTRAINT "MigrationProjectTicket_migrationProjectId_fkey" FOREIGN KEY ("migrationProjectId") REFERENCES "MigrationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MigrationProjectTicket" ADD CONSTRAINT "MigrationProjectTicket_sourceClientEntryId_fkey" FOREIGN KEY ("sourceClientEntryId") REFERENCES "ClientEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
