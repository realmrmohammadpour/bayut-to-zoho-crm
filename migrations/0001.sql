CREATE TABLE IF NOT EXISTS inquiry_inbox (
  inquiry_id TEXT PRIMARY KEY NOT NULL,
  normalized_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'retry', 'done', 'dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at INTEGER NOT NULL DEFAULT (unixepoch()),
  claimed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  error_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_inquiry_inbox_due ON inquiry_inbox(status, available_at);
