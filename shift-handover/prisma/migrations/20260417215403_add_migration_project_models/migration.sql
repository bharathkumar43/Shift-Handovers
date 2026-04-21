-- CreateEnum
CREATE TYPE "MigrationProjectStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MigrationType" AS ENUM ('GMAIL_TO_GOOGLE_WORKSPACE', 'EXCHANGE_TO_MICROSOFT_365', 'MICROSOFT_365_TO_MICROSOFT_365', 'BOX_TO_SHAREPOINT', 'DROPBOX_TO_SHAREPOINT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('CONTENT', 'MESSAGE', 'EMAIL');

-- CreateEnum
CREATE TYPE "JiraTicketType" AS ENUM ('BUG', 'TASK', 'STORY', 'EPIC', 'INCIDENT', 'CHANGE_REQUEST');

-- CreateEnum
CREATE TYPE "JiraTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "MigrationProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "MigrationProjectStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "projectManagerId" TEXT,
    "sowStartDate" DATE,
    "sowEndDate" DATE,
    "kickoffDate" DATE,
    "migrationType" "MigrationType",
    "productType" "ProductType",
    "sourceSystem" TEXT,
    "destinationSystem" TEXT,
    "description" TEXT,
    "internalNotes" TEXT,
    "jiraProjectKey" TEXT,
    "sharepointItemId" TEXT,
    "sharepointData" JSONB,
    "sharepointSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JiraTicket" (
    "id" TEXT NOT NULL,
    "migrationProjectId" TEXT NOT NULL,
    "jiraKey" TEXT,
    "title" TEXT NOT NULL,
    "type" "JiraTicketType" NOT NULL DEFAULT 'TASK',
    "status" "JiraTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignee" TEXT,
    "priority" TEXT,
    "url" TEXT,
    "description" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JiraTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchRun" (
    "id" TEXT NOT NULL,
    "migrationProjectId" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "batchName" TEXT NOT NULL,
    "batchNumber" INTEGER,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "migratedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "skippedItems" INTEGER NOT NULL DEFAULT 0,
    "totalSizeGb" DOUBLE PRECISION,
    "migratedSizeGb" DOUBLE PRECISION,
    "plannedStartDate" DATE,
    "plannedEndDate" DATE,
    "actualStartDate" DATE,
    "actualEndDate" DATE,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "errorSummary" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectComment" (
    "id" TEXT NOT NULL,
    "migrationProjectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MigrationProject_clientId_key" ON "MigrationProject"("clientId");

-- CreateIndex
CREATE INDEX "JiraTicket_migrationProjectId_idx" ON "JiraTicket"("migrationProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "JiraTicket_migrationProjectId_jiraKey_key" ON "JiraTicket"("migrationProjectId", "jiraKey");

-- CreateIndex
CREATE INDEX "BatchRun_migrationProjectId_idx" ON "BatchRun"("migrationProjectId");

-- CreateIndex
CREATE INDEX "ProjectComment_migrationProjectId_createdAt_idx" ON "ProjectComment"("migrationProjectId", "createdAt");

-- AddForeignKey
ALTER TABLE "MigrationProject" ADD CONSTRAINT "MigrationProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationProject" ADD CONSTRAINT "MigrationProject_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraTicket" ADD CONSTRAINT "JiraTicket_migrationProjectId_fkey" FOREIGN KEY ("migrationProjectId") REFERENCES "MigrationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchRun" ADD CONSTRAINT "BatchRun_migrationProjectId_fkey" FOREIGN KEY ("migrationProjectId") REFERENCES "MigrationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_migrationProjectId_fkey" FOREIGN KEY ("migrationProjectId") REFERENCES "MigrationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
