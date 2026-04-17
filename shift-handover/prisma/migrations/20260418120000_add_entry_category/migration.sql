-- CreateEnum
CREATE TYPE "EntryCategory" AS ENUM ('RED', 'AMBER', 'YELLOW');

-- AlterTable
ALTER TABLE "ClientEntry" ADD COLUMN     "category" "EntryCategory";
