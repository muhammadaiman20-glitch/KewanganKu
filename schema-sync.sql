CREATE TABLE IF NOT EXISTS account_state (
  owner TEXT PRIMARY KEY,
  document TEXT NOT NULL,
  revision INTEGER NOT NULL,
  generation INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Proof of payment (receipt / transfer slip photos). A transaction whose receiptUrl points here is realised;
-- one marked floating:true has no proof yet. Images are base64 JPEG/PNG/WebP, compressed by the client (about 300 KB).
CREATE TABLE IF NOT EXISTS proofs (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  mime TEXT NOT NULL,
  data TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proofs_owner ON proofs (owner, created_at);
