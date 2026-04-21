-- Allow any batch status label (not only enum values).
ALTER TABLE "BatchRun" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BatchRun" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);
ALTER TABLE "BatchRun" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE IF EXISTS "BatchStatus";
