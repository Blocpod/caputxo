PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size TEXT NOT NULL,
  hash TEXT NOT NULL,
  full_hash TEXT,
  outpoint TEXT NOT NULL,
  owner TEXT NOT NULL,
  owner_key TEXT NOT NULL,
  epoch INTEGER NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  ttl INTEGER NOT NULL,
  allow_download INTEGER NOT NULL,
  require_finality INTEGER NOT NULL,
  copy TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  from_owner TEXT NOT NULL,
  to_owner TEXT NOT NULL,
  step TEXT NOT NULL,
  precommitment TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  ok INTEGER NOT NULL,
  policy TEXT NOT NULL,
  time TEXT NOT NULL,
  trace TEXT NOT NULL,
  signed_json TEXT
);

CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  actor TEXT NOT NULL,
  target TEXT NOT NULL,
  result TEXT NOT NULL,
  time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  network TEXT NOT NULL,
  identity TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  last_checked TEXT NOT NULL
);
