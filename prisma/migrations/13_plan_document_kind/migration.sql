-- A document's kind: which institution artifact it is. The original rows are the
-- language access plan ('plan'); the interpreter job description, evaluation
-- materials, and quality records collected in the "How you hire and evaluate"
-- section reuse the same table, discriminated by this column.
--
-- Additive and idempotent: the column defaults to 'plan', so every existing plan
-- document keeps its meaning with no backfill. This database is shared with other
-- live services, so only ADD COLUMN IF NOT EXISTS appears here. Numeric prefix 13
-- sorts after 11 (the table) so the column target exists first.

ALTER TABLE "app_plan_document"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'plan';

CREATE INDEX IF NOT EXISTS "app_plan_document_organizationId_kind_idx"
  ON "app_plan_document" ("organizationId", "kind");
