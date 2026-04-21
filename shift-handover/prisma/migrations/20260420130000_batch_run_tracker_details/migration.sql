-- Excel-style row values per batch (messaging / email / content trackers).
ALTER TABLE "BatchRun" ADD COLUMN IF NOT EXISTS "trackerDetails" JSONB;
