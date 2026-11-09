CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
  started TEXT NOT NULL,
  finished TEXT,
  result TEXT,
  error TEXT
);
--> statement-breakpoint
CREATE INDEX agent_runs_owner_started ON agent_runs (owner, started DESC);
