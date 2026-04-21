-- CreateEnum
CREATE TYPE "TaskAssignedTo" AS ENUM ('CLOUDFUZE', 'CUSTOMER', 'CUSTOMER_CLOUDFUZE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MigrationItemStatus" AS ENUM ('INITIATED_MIGRATION', 'INITIATED_ONE_TIME', 'PILOT_COMPLETED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MigrationCombination" AS ENUM ('MYDRIVE_MYDRIVE', 'SHAREDDRIVE_SHAREDDRIVE', 'MYDRIVE_SHAREDDRIVE', 'SHAREDDRIVE_MYDRIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ContactRole" AS ENUM ('PRIMARY', 'TECHNICAL', 'BILLING', 'SPONSOR', 'OTHER');

-- CreateTable
CREATE TABLE "MigrationTask" (
    "id" TEXT NOT NULL,
    "migrationProjectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "taskName" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" "TaskAssignedTo" NOT NULL DEFAULT 'CLOUDFUZE',
    "plannedStartDate" DATE,
    "plannedEndDate" DATE,
    "actualStartDate" DATE,
    "actualEndDate" DATE,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "comments" TEXT,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationItem" (
    "id" TEXT NOT NULL,
    "migrationProjectId" TEXT NOT NULL,
    "batchRunId" TEXT,
    "sourceEmail" TEXT,
    "sourcePath" TEXT,
    "destinationEmail" TEXT,
    "destinationPath" TEXT,
    "sourceValidation" TEXT,
    "destinationValidation" TEXT,
    "migrationStatus" "MigrationItemStatus" NOT NULL DEFAULT 'INITIATED_MIGRATION',
    "combination" "MigrationCombination" NOT NULL DEFAULT 'MYDRIVE_MYDRIVE',
    "server" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationIssue" (
    "id" TEXT NOT NULL,
    "migrationProjectId" TEXT NOT NULL,
    "occurredAt" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "l3TicketKey" TEXT,
    "cfitsTicketKey" TEXT,
    "ticketStatus" "IssueTicketStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" DATE,
    "resolution" TEXT,
    "daysToSolve" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "migrationProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "ContactRole" NOT NULL DEFAULT 'PRIMARY',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MigrationTask_migrationProjectId_sortOrder_idx" ON "MigrationTask"("migrationProjectId", "sortOrder");

-- CreateIndex
CREATE INDEX "MigrationItem_migrationProjectId_idx" ON "MigrationItem"("migrationProjectId");

-- CreateIndex
CREATE INDEX "MigrationItem_batchRunId_idx" ON "MigrationItem"("batchRunId");

-- CreateIndex
CREATE INDEX "MigrationIssue_migrationProjectId_idx" ON "MigrationIssue"("migrationProjectId");

-- CreateIndex
CREATE INDEX "CustomerContact_migrationProjectId_idx" ON "CustomerContact"("migrationProjectId");

-- AddForeignKey
ALTER TABLE "MigrationTask" ADD CONSTRAINT "MigrationTask_migrationProjectId_fkey" FOREIGN KEY ("migrationProjectId") REFERENCES "MigrationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationItem" ADD CONSTRAINT "MigrationItem_migrationProjectId_fkey" FOREIGN KEY ("migrationProjectId") REFERENCES "MigrationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationItem" ADD CONSTRAINT "MigrationItem_batchRunId_fkey" FOREIGN KEY ("batchRunId") REFERENCES "BatchRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationIssue" ADD CONSTRAINT "MigrationIssue_migrationProjectId_fkey" FOREIGN KEY ("migrationProjectId") REFERENCES "MigrationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_migrationProjectId_fkey" FOREIGN KEY ("migrationProjectId") REFERENCES "MigrationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
