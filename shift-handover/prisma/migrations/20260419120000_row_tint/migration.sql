-- Row highlight colors (admin-only in app); replaces legacy EntryCategory / category column.
CREATE TYPE "RowTint" AS ENUM ('RED', 'AMBER', 'SILVER', 'GREEN');

ALTER TABLE "ClientEntry" ADD COLUMN "rowTint" "RowTint";

DO $migrate$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ClientEntry' AND column_name = 'category'
  ) THEN
    UPDATE "ClientEntry" SET "rowTint" = CASE
      WHEN "category"::text = 'RED' THEN 'RED'::"RowTint"
      WHEN "category"::text = 'AMBER' THEN 'AMBER'::"RowTint"
      WHEN "category"::text = 'YELLOW' THEN 'SILVER'::"RowTint"
      ELSE NULL
    END
    WHERE "category" IS NOT NULL;
    ALTER TABLE "ClientEntry" DROP COLUMN "category";
  END IF;
END $migrate$;

DROP TYPE IF EXISTS "EntryCategory";
