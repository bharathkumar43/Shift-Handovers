-- DropTable
DROP TABLE IF EXISTS "JiraTicket";

-- AlterTable
ALTER TABLE "MigrationProject" DROP COLUMN IF EXISTS "jiraProjectKey";

-- DropEnum
DROP TYPE IF EXISTS "JiraTicketType";
DROP TYPE IF EXISTS "JiraTicketStatus";

-- DropTable (Jira credentials; no longer used)
DROP TABLE IF EXISTS "AppSettings";
