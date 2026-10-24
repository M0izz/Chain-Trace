-- ChainTrace Phase 3 Relational Persistence Schema
-- Supports SQLite and PostgreSQL (ANSI SQL Compliant)

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trails (
  trail_id TEXT PRIMARY KEY,
  source_chain_id INTEGER NOT NULL,
  source_tx_hash TEXT NOT NULL,
  destination_chain_id INTEGER,
  destination_tx_hash TEXT,
  adapter_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source_chain_id, source_tx_hash)
);

CREATE TABLE IF NOT EXISTS evidence (
  evidence_id TEXT PRIMARY KEY,
  trail_id TEXT,
  chain_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  subject_ref TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  verification_method TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT,
  checked_at TEXT NOT NULL,
  raw_payload TEXT,
  FOREIGN KEY (trail_id) REFERENCES trails(trail_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claims (
  claim_id TEXT PRIMARY KEY,
  trail_id TEXT,
  claim_type TEXT NOT NULL,
  status TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  reason_message TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_verified_at TEXT,
  FOREIGN KEY (trail_id) REFERENCES trails(trail_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dependencies (
  dependency_id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  parent_type TEXT NOT NULL,
  dependent_claim_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  UNIQUE(parent_id, dependent_claim_id),
  FOREIGN KEY (dependent_claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluations (
  evaluation_id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  status TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  reason_message TEXT NOT NULL,
  inputs_hash TEXT,
  evaluated_at TEXT NOT NULL,
  FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_events (
  audit_id TEXT PRIMARY KEY,
  sequence INTEGER NOT NULL,
  trail_id TEXT,
  claim_id TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  triggering_dependency TEXT,
  prev_hash TEXT NOT NULL,
  record_hash TEXT NOT NULL,
  details TEXT,
  actor_identity TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (trail_id) REFERENCES trails(trail_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS policy_versions (
  policy_id TEXT NOT NULL,
  version TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  effective_at TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (policy_id, version)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Indexes for performance & query patterns
CREATE INDEX IF NOT EXISTS idx_trails_lookup ON trails(source_chain_id, source_tx_hash);
CREATE INDEX IF NOT EXISTS idx_claims_trail ON claims(trail_id);
CREATE INDEX IF NOT EXISTS idx_evidence_trail ON evidence(trail_id);
CREATE INDEX IF NOT EXISTS idx_audit_claim_seq ON audit_events(claim_id, sequence);
CREATE INDEX IF NOT EXISTS idx_audit_trail_time ON audit_events(trail_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_dependencies_dep ON dependencies(dependent_claim_id);
