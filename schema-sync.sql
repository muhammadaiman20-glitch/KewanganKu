CREATE TABLE IF NOT EXISTS account_state (
  owner TEXT PRIMARY KEY,
  document TEXT NOT NULL,
  revision INTEGER NOT NULL,
  generation INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
