-- BatchRun.batchPhase: allow full tracker labels (not only MigrationPhase enum).
ALTER TABLE "BatchRun" ALTER COLUMN "batchPhase" DROP DEFAULT;
ALTER TABLE "BatchRun" ALTER COLUMN "batchPhase" TYPE TEXT USING ("batchPhase"::text);
