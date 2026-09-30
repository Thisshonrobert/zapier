-- Mutable dispatch state belongs to the generation, never the immutable authority row.
ALTER TABLE "ReplayExecution"
  ADD COLUMN "dispatchToken" text,
  ADD COLUMN "dispatchLeaseUntil" timestamptz,
  ADD COLUMN "dispatchAttempts" integer NOT NULL DEFAULT 0 CHECK ("dispatchAttempts" >= 0),
  ADD COLUMN "nextDispatchAt" timestamptz,
  ADD COLUMN "publishedAt" timestamptz,
  ADD COLUMN "nextStage" integer CHECK ("nextStage" IS NULL OR "nextStage" >= 0);
CREATE INDEX "ReplayExecution_dispatch_idx" ON "ReplayExecution" (status, "publishedAt", "nextDispatchAt");
