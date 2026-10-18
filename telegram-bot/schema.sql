-- TechDesk bot tables (D1 database: techdesk-bot). Finance records stay in kewanganku-sync and are not touched here.

-- Tech issues you track.
CREATE TABLE IF NOT EXISTS issues (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  details     TEXT    NOT NULL DEFAULT '',
  project     TEXT    NOT NULL DEFAULT '',
  status      TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority    TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  solution    TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status, id);

-- Saved fixes, how-tos and snippets.
CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL DEFAULT '',
  tags        TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Rolling conversation memory per chat.
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id     INTEGER NOT NULL,
  role        TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages (chat_id, id);

-- Actions waiting for the owner's confirm button (finance writes, deletes). Expire after a day.
CREATE TABLE IF NOT EXISTS pending_actions (
  token       TEXT PRIMARY KEY,
  payload     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Telegram update ids already handled, so webhook retries don't run twice.
CREATE TABLE IF NOT EXISTS seen_updates (
  update_id   INTEGER PRIMARY KEY,
  at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The record waiting for its receipt photo in each chat: the next photo sent there is attached as its proof.
CREATE TABLE IF NOT EXISTS proof_wait (
  chat_id     INTEGER PRIMARY KEY,
  ref         TEXT NOT NULL,
  label       TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
