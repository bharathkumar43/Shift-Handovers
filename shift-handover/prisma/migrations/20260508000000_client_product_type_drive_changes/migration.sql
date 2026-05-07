-- Add GOOD and BAD to EntryStatus enum for Drive Changes toggle
ALTER TYPE "EntryStatus" ADD VALUE IF NOT EXISTS 'GOOD';
ALTER TYPE "EntryStatus" ADD VALUE IF NOT EXISTS 'BAD';

-- Add productType to Client so admins can mark each client as CONTENT / EMAIL / MESSAGE
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "productType" "ProductType";
