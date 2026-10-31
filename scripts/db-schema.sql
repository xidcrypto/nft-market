-- Aegis Crown V2 SQLite Schema
-- Run once on VPS: sqlite3 /path/to/aegis.db < scripts/db-schema.sql

PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS mints (
  token_id           INTEGER PRIMARY KEY,
  owner              TEXT NOT NULL,
  agent_id_token_id  INTEGER NOT NULL UNIQUE,
  tier               TEXT NOT NULL,
  power              INTEGER NOT NULL,
  tx_hash            TEXT NOT NULL UNIQUE,
  block_number       INTEGER NOT NULL,
  minted_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  token_id    INTEGER PRIMARY KEY,
  seller      TEXT NOT NULL,
  price_wei   TEXT NOT NULL,
  listed_at   TEXT NOT NULL,
  tx_hash     TEXT
);

CREATE TABLE IF NOT EXISTS sales (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id      INTEGER NOT NULL,
  seller        TEXT NOT NULL,
  buyer         TEXT NOT NULL,
  price_wei     TEXT NOT NULL,
  fee_wei       TEXT NOT NULL,
  tx_hash       TEXT NOT NULL UNIQUE,
  block_number  INTEGER NOT NULL,
  sold_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mints_owner ON mints(owner);
CREATE INDEX IF NOT EXISTS idx_mints_tier  ON mints(tier);
CREATE INDEX IF NOT EXISTS idx_mints_agent ON mints(agent_id_token_id);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price_wei);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);

-- Seed meta checkpoint at V2 deploy block
INSERT OR IGNORE INTO meta(key, value) VALUES
  ('last_indexed_block', '130833161'),
  ('last_indexed_at',    ''),
  ('indexer_version',    '2.0.0'),
  ('chain_id',           '56');
