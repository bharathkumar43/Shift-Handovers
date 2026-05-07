-- Add productType to Client for per-client product classification
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "productType" "ProductType";
