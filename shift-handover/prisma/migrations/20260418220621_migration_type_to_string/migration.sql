/*
  Warnings:

  - The `migrationType` column on the `MigrationProject` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "MigrationProject" DROP COLUMN "migrationType",
ADD COLUMN     "migrationType" TEXT;

-- DropEnum
DROP TYPE "MigrationType";

-- CreateTable
CREATE TABLE "MigrationTypeOption" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MigrationTypeOption_value_key" ON "MigrationTypeOption"("value");
