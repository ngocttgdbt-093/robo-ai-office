CREATE TABLE work_events (
  id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  title TEXT NOT NULL,
  phase TEXT NOT NULL,
  previous TEXT,
  status TEXT NOT NULL,
  updated TEXT NOT NULL,
  agent TEXT NOT NULL,
  skills TEXT NOT NULL,
  PRIMARY KEY (id, seq)
);
