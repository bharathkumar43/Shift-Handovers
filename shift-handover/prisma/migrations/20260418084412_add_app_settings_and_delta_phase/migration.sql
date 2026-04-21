-- CreateEnum
CREATE TYPE "MigrationPhase" AS ENUM ('PILOT', 'ONE_TIME', 'DELTA', 'COMPLETED');

-- AlterTable
ALTER TABLE "BatchRun" ADD COLUMN     "batchPhase" "MigrationPhase";

-- AlterTable
ALTER TABLE "MigrationProject" ADD COLUMN     "deltaCompletedAt" DATE,
ADD COLUMN     "deltaNotes" TEXT,
ADD COLUMN     "deltaReadyConfirmedAt" DATE,
ADD COLUMN     "deltaScheduledDate" DATE,
ADD COLUMN     "migrationPhase" "MigrationPhase" DEFAULT 'PILOT';

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "jiraBaseUrl" TEXT,
    "jiraEmail" TEXT,
    "jiraApiToken" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
