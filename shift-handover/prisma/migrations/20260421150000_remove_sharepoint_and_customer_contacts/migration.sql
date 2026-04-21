-- Drop customer contacts feature
DROP TABLE IF EXISTS "CustomerContact";
DROP TYPE IF EXISTS "ContactRole";

-- Remove SharePoint sync columns from migration projects
ALTER TABLE "MigrationProject" DROP COLUMN IF EXISTS "sharepointItemId";
ALTER TABLE "MigrationProject" DROP COLUMN IF EXISTS "sharepointData";
ALTER TABLE "MigrationProject" DROP COLUMN IF EXISTS "sharepointFieldLabels";
ALTER TABLE "MigrationProject" DROP COLUMN IF EXISTS "sharepointSyncedAt";
