-- Purge MigrationIssue rows created by the old handover→Issues auto-sync (footer marker in description).
-- Manual issues do not contain this phrase.
DELETE FROM "MigrationIssue" WHERE "description" ILIKE '%synced from shift handover%';
