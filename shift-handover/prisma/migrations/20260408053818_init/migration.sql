-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'LEAD', 'ENGINEER');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('COMPLETE', 'IN_PROGRESS', 'PENDING', 'DELTA', 'NA');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ENGINEER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shift1Timing" TEXT NOT NULL,
    "shift2Timing" TEXT NOT NULL,
    "shift3Timing" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHandover" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "projectId" TEXT NOT NULL,
    "shiftNumber" INTEGER NOT NULL,
    "leadId" TEXT,
    "leadNotes" TEXT,
    "status" "HandoverStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientEntry" (
    "id" TEXT NOT NULL,
    "shiftHandoverId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tickets" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'NA',
    "engineerWorked" TEXT,
    "issues" TEXT,
    "updates" TEXT,
    "handoverNotes" TEXT,
    "engineerId" TEXT,
    "filledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyDashboard" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dutyManager" TEXT,
    "week" TEXT,
    "keyIssues" TEXT,
    "actionsForTomorrow" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_projectId_key" ON "Client"("name", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftHandover_date_projectId_shiftNumber_key" ON "ShiftHandover"("date", "projectId", "shiftNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ClientEntry_shiftHandoverId_clientId_key" ON "ClientEntry"("shiftHandoverId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDashboard_date_key" ON "DailyDashboard"("date");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEntry" ADD CONSTRAINT "ClientEntry_shiftHandoverId_fkey" FOREIGN KEY ("shiftHandoverId") REFERENCES "ShiftHandover"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEntry" ADD CONSTRAINT "ClientEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEntry" ADD CONSTRAINT "ClientEntry_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEntry" ADD CONSTRAINT "ClientEntry_filledById_fkey" FOREIGN KEY ("filledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
