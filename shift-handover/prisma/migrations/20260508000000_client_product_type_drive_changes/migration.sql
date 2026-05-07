-- Add GOOD and BAD to EntryStatus enum for Drive Changes toggle
ALTER TYPE "EntryStatus" ADD VALUE IF NOT EXISTS 'GOOD';
ALTER TYPE "EntryStatus" ADD VALUE IF NOT EXISTS 'BAD';
