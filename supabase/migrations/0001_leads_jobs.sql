-- Sprint 1 MVP schema
-- Two tables: leads (processed intelligence) and jobs (batch processing state)
-- No RLS for MVP — single user, no auth. Add when multi-tenancy is introduced.

CREATE TABLE IF NOT EXISTS leads (
  domain TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on opportunity_score for sorted lead listing
CREATE INDEX IF NOT EXISTS leads_opportunity_score_idx
  ON leads ((data->>'opportunity_score')::int DESC);
