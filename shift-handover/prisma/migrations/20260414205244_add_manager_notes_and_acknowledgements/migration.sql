-- AlterTable
ALTER TABLE "ClientEntry" ADD COLUMN     "managerNotes" TEXT;

-- AlterTable
ALTER TABLE "ShiftHandover" ADD COLUMN     "engineerAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "engineerAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "engineerAcknowledgedById" TEXT,
ADD COLUMN     "managerAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "managerAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "managerAcknowledgedById" TEXT;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_engineerAcknowledgedById_fkey" FOREIGN KEY ("engineerAcknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_managerAcknowledgedById_fkey" FOREIGN KEY ("managerAcknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
