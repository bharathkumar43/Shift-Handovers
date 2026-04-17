-- AlterTable
ALTER TABLE "ClientEntry" ADD COLUMN     "engineerWorkedUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "assignedShifts" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AddForeignKey
ALTER TABLE "ClientEntry" ADD CONSTRAINT "ClientEntry_engineerWorkedUserId_fkey" FOREIGN KEY ("engineerWorkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
