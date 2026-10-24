# ChainTrace Phase 3 Implementation Report: Persistence, API & Auditability

**Date:** October 25, 2026  
**Status:** Completed & Fully Verified  
**Baseline Test Results:** 65 passed, 2 skipped (opt-in live smoke tests) across 11 test suites  

---

## 1. Executive Summary

Phase 3 builds the durable service and API layers around the Phase 1 dependency-aware domain engine and the Phase 2 LayerZero v2 protocol adapter. It transitions ChainTrace from an ephemeral in-memory evaluation engine to a reproducible, queryable, and auditable verification service.

### Core Principles Upheld
1. **Core Remains Authoritative:** The HTTP and API layer orchestrates requests, validates bounds, and formats output; it does not duplicate or implement a parallel claim-state machine.
2. **Reproducibility:** Every query response returns explicit evidence references, verification method (`DIRECT_RPC`), policy versions (`1.0.0`), reason codes, and trust model caveats.
3. **Append-Only Audit History:** State transitions and evaluation snapshots are transactionally appended to an immutable audit table. Historical records are never updated or deleted.
4. **Least Privilege & Mutation Protection:** Read-only routes (`/v1/trails/...`, `/v1/claims/...`, `/v1/evidence/...`, `/v1/trails/.../audit`) are accessible without authentication. State-mutating refreshes (`POST /v1/trails/:trailId/refresh`) require an authorized API key, rate-limiting (sliding window), and support idempotent deduplication.
5. **No Unjustified Infrastructure:** Standard relational storage using SQLite (`node:sqlite` DatabaseSync) and ANSI SQL migrations. No speculative graph databases or auxiliary consensus components.

---

## 2. Architecture & Boundaries

```
Client Request
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Fastify API Server (packages/api)                           │
│  - Input validation (hex regex, positive integer IDs)       │
│  - Request correlation (x-correlation-id)                   │
│  - Auth guard for mutations (x-api-key header)              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ DurableTrailService (packages/service)                      │
│  - Cache check in relational store                          │
│  - Idempotency key lookup & caching                         │
│  - Per-trail sliding-window rate limiting                   │
└──────────────┬──────────────────────────────┬───────────────┘
               │ (Cache Miss / Refresh)       │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│ Phase 2 LayerZeroV2Adapter   │ │ Relational SqliteStore     │
│  - Direct JSON-RPC checks    │ │  - ACID transactions      │
│  - Non-blocking network I/O  │ │  - Schema migrations      │
└──────────────┬───────────────┘ │  - Optimistic concurrency  │
               ▼                 │  - Foreign key constraints │
┌──────────────────────────────┐ │  - Paginated audit queries │
│ Phase 1 DependencyEngine     │ └────────────▲───────────────┘
│  - Deterministic evaluation  │              │
│  - Cascading revalidation    │──────────────┘ (Atomic commit)
└──────────────────────────────┘
```

### Boundary Guarantees
- **No Long-Lived DB Locks Across Network Calls:** External RPC queries to Sepolia and Polygon Amoy execute before opening database transactions. Once data is fetched, persistence of trails, claims, evidence, dependencies, and audit events commits atomically in a single localized transaction.
- **Optimistic Concurrency Control (OCC):** Claims carry incrementing version numbers. Concurrent refreshes attempting to update from stale versions fail with `VersionConflictError` rather than silently overwriting state.

---

## 3. Relational Schema & Migrations

The schema is defined in [`packages/persistence/src/schema.sql`](file:///c:/Users/Moiz/Desktop/Chain%20Trace/packages/persistence/src/schema.sql) and managed via [`SchemaMigrator`](file:///c:/Users/Moiz/Desktop/Chain%20Trace/packages/persistence/src/migrator.ts).

```sql
-- Schema Migrations Tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

-- Core Verification Trails
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

-- Normalized Evidence Records
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

-- Current Claim State & Policy Snapshots
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

-- Prerequisite Dependency Graph
CREATE TABLE IF NOT EXISTS dependencies (
  dependency_id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  parent_type TEXT NOT NULL,
  dependent_claim_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (dependent_claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE,
  UNIQUE(parent_id, dependent_claim_id)
);

-- Evaluation Snapshots
CREATE TABLE IF NOT EXISTS evaluations (
  evaluation_id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  result TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE
);

-- Append-Only Audit History
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_id TEXT UNIQUE NOT NULL,
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
  actor_identity TEXT NOT NULL DEFAULT 'SYSTEM',
  timestamp TEXT NOT NULL,
  FOREIGN KEY (trail_id) REFERENCES trails(trail_id) ON DELETE CASCADE
);

-- Idempotency Keys & Caching
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

### Strategic Indexes
- `idx_trails_lookup`: `(source_chain_id, source_tx_hash)` for instant trail lookups.
- `idx_evidence_trail`: `(trail_id)` for batch retrieval of evidence.
- `idx_claims_trail`: `(trail_id)` for batch retrieval of claims.
- `idx_audit_trail`: `(trail_id, sequence, timestamp)` for pagination without gaps.
- `idx_audit_claim`: `(claim_id, timestamp)` for per-claim audit drilldowns.

---

## 4. API Endpoints & Request Semantics

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness probe returning operational state and server timestamp. |
| `GET` | `/ready` | Public | Readiness probe checking database connectivity. |
| `GET` | `/v1/trails/:sourceChainId/:sourceTxHash` | Public | Fetches complete trail graph; serves from SQLite cache if present or ingests live on first read. |
| `GET` | `/v1/claims/:claimId` | Public | Inspects specific claim status, reason code, and policy version. |
| `GET` | `/v1/evidence/:evidenceId` | Public | Returns normalized evidence record with content hash and raw observation payload. |
| `GET` | `/v1/trails/:trailId/audit` | Public | Retrieves ordered append-only audit trail with stable `limit` and `offset` pagination. |
| `POST` | `/v1/trails/:trailId/refresh` | Authenticated | Bounded re-fetch and re-evaluation. Requires `x-api-key`, enforces rate limits, and supports `Idempotency-Key`. |

---

## 5. Security & Abuse Controls

1. **Authentication:**
   - Evaluated using constant-time or direct comparison on `x-api-key` header.
   - Missing or invalid key yields `401 Unauthorized` with zero state mutation.
2. **Input Validation:**
   - Chain IDs must be positive integers (`/^[1-9]\d*$/`).
   - Transaction hashes must match strict 32-byte hexadecimal format (`/^0x[a-fA-F0-9]{64}$/`).
   - Invalid parameters return `400 Bad Request` prior to invoking database or RPC services.
3. **Rate Limiting:**
   - In-memory sliding-window limiter bounds refresh calls to a max of 5 requests/minute per trail. Exceeding limits returns `429 Too Many Requests`.
4. **Idempotency:**
   - Clients supply an `Idempotency-Key` header with mutation requests.
   - Cached responses are stored in the `idempotency_keys` table with TTL (default 300s). Duplicate submissions return the identical cached payload without repeating expensive network or computation tasks.
5. **Secret Hygiene:**
   - Environment variables (`API_KEY`, `RPC_SEPOLIA_URL`, `RPC_AMOY_URL`) are read from process environment; `.env` is ignored by git.
   - Health probes disclose no secrets, connection strings, or system paths.

---

## 6. Testing & Acceptance Matrix Verification

| Acceptance Matrix Test | Expected Result | Layer | Status |
|---|---|---|---|
| **Fresh database migration** | Schema initializes and indexes/constraints exist | DB Integration | **PASS** |
| **Restart persistence** | Trail, evidence, claims, and audit history survive store restart | Integration | **PASS** |
| **Unique source identity** | Duplicate trail ingestion resolves deterministically; no duplicate rows | Repo / Store | **PASS** |
| **Atomic transition** | Claim state and audit event commit or roll back together | DB Integration | **PASS** |
| **Duplicate refresh request** | Idempotency key prevents duplicate work and duplicate transitions | Service / API | **PASS** |
| **Unauthorized refresh** | Missing/invalid `x-api-key` rejected with 401 without mutation | API / Security | **PASS** |
| **Malformed input** | Malformed chain ID or non-hex tx hash rejected with 400 | API Validation | **PASS** |
| **Provider outage** | Outage preserves prior evidence and returns 502 without corrupted state | Service | **PASS** |
| **Audit pagination** | Stable deterministic pagination (`limit`, `offset`, `total`) | API / Store | **PASS** |
| **Concurrent refreshes** | Stale update rejected via Optimistic Concurrency Control (`VersionConflictError`) | Persistence | **PASS** |
| **Trail aggregate status** | Aggregate status computed from rules (`VERIFIED` only if all claims verified) | Domain / Service | **PASS** |

### Test Suite Execution Summary
- `tests/persistence/sqlite-store.test.ts`: 6 passed
- `tests/api/server.test.ts`: 8 passed
- `tests/adapters/adapter.test.ts`: 4 passed
- `tests/adapters/decoder.test.ts`: 4 passed
- `tests/adapters/rpc-client.test.ts`: 5 passed
- `tests/integration/phase-2-e2e.test.ts`: 5 passed
- `tests/acceptance.test.ts`: 14 passed
- `tests/unit/dag.test.ts`: 7 passed
- `tests/unit/fault-injection.test.ts`: 5 passed
- `tests/unit/revalidation.test.ts`: 2 passed
- `tests/property/graph-properties.test.ts`: 5 passed
- **Total: 65 passed tests, 2 skipped opt-in live tests across 11 files.**

---

## 7. Sample API Responses

### `GET /v1/trails/11155111/0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d`
```json
{
  "schemaVersion": "1.0",
  "trailId": "trail:11155111:0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
  "source": {
    "chainId": 11155111,
    "txHash": "0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d"
  },
  "destination": {
    "chainId": 80002,
    "txHash": "0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c"
  },
  "status": "VERIFIED",
  "claims": [
    {
      "claim_id": "claim:event-inclusion:0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
      "claim_type": "EVENT_INCLUDED",
      "subject_refs": ["0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d"],
      "status": "VERIFIED",
      "policy_id": "policy:event-inclusion",
      "policy_version": "1.0.0",
      "status_reason": {
        "code": "STATUS_CONFIRMED",
        "message": "Receipt status verified on chain 11155111"
      },
      "version": 1,
      "created_at": "2026-10-25T12:00:00.000Z",
      "updated_at": "2026-10-25T12:00:00.000Z",
      "last_verified_at": "2026-10-25T12:00:00.000Z"
    }
  ],
  "evidence": [
    {
      "evidence_id": "ev:receipt:11155111:0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
      "evidence_type": "RECEIPT_REFERENCE",
      "subject_ref": "0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
      "content_hash": "0x3e18a03f443b0d2d3a0889f8990176ef95779ecba4313fa5c052ca2e646fb886",
      "source_reference": "https://rpc.sepolia.org",
      "verification_method": "DIRECT_RPC",
      "policy_version": "1.0.0",
      "result": "PASS",
      "checked_at": "2026-10-25T12:00:00.000Z",
      "raw_data": {
        "status": 1,
        "blockNumber": 5420052,
        "confirmations": 28
      }
    }
  ],
  "trustAssumptions": [
    "RPC provider data is trusted for observed receipt fields",
    "Source chain finality threshold (12 blocks) is assumed non-reorganizable",
    "LayerZero DVN quorum signatures are assumed valid if emitted by EndpointV2"
  ],
  "lastEvaluatedAt": "2026-10-25T12:00:00.000Z",
  "isFromCache": false
}
```

### `GET /v1/trails/:trailId/audit?limit=2&offset=0`
```json
{
  "trailId": "trail:11155111:0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
  "limit": 2,
  "offset": 0,
  "total": 5,
  "events": [
    {
      "audit_id": "audit:claim:event-inclusion:0:1761393600000",
      "sequence": 0,
      "claim_id": "claim:event-inclusion:0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
      "previous_status": "UNVERIFIED",
      "new_status": "VERIFIED",
      "reason_code": "STATUS_CONFIRMED",
      "policy_version": "1.0.0",
      "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
      "record_hash": "62e92cbf3df6a1f0a1c676d1e4e2a89309874cb54942cfcbba5be12267885b54",
      "details": "Initial verification of event inclusion",
      "timestamp": "2026-10-25T12:00:00.000Z"
    }
  ]
}
```

---

## 8. Known Limitations & Trust Assumptions

1. **Database-Backed Audit Table Semantics:**
   - The SQLite audit log is append-only by application convention. It prevents accidental overwrite/deletion during ordinary application workflows. It does not provide cryptographic immutability against a privileged host administrator with direct filesystem access.
2. **Provider Authenticity:**
   - Content hashes calculated on JSON-RPC receipts detect post-facto modification of stored records; they cannot detect a malicious RPC endpoint lying during the initial fetch.
3. **LayerZero DVN Verification:**
   - Phase 2/3 treats the LayerZero EndpointV2 `PacketDelivered` event as authentic evidence of DVN quorum verification. It does not re-execute internal DVN threshold signature validation off-chain.

---

## 9. Manual Setup & Verification Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build & Typecheck
```bash
npm run typecheck
npm run build
```

### Step 3: Run Unit, Integration & API Tests
```bash
# Run persistence test suite (migrations, restart survival, OCC)
npm run test:persistence

# Run Fastify API test suite (health, auth, rate limiting, idempotency)
npm run test:api

# Run entire test suite
npm test
```

### Step 4: Run API Server in Production Mode
```bash
# Start standalone server
node dist/packages/api/src/server.js
```
The server will listen on `http://127.0.0.1:3000` with native SQLite persistence initialized at `chaintrace.db`.
