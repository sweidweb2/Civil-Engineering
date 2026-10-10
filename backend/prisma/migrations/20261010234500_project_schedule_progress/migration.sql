-- Progress is the elapsed share of startDate → endDate, not a manually entered percent.
UPDATE "projects"
SET "progress" = CASE
  WHEN "startDate" IS NULL OR "endDate" IS NULL OR "endDate" <= "startDate" THEN 0
  WHEN CURRENT_TIMESTAMP <= "startDate" THEN 0
  WHEN CURRENT_TIMESTAMP >= "endDate" THEN 100
  ELSE LEAST(
    100,
    GREATEST(
      0,
      ROUND(
        (
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - "startDate"))
          / EXTRACT(EPOCH FROM ("endDate" - "startDate"))
        ) * 100
      )::int
    )
  )
END;

-- CreateIndex
CREATE INDEX "projects_startDate_idx" ON "projects"("startDate");
