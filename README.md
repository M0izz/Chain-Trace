# ChainTrace — Verifiable Cross-Chain Transaction Graph & Dependency Engine

> **Foundation Plan Phase 1 Implementation**  
> *A prototype for tracing cross-chain transaction relationships with evidence dependencies, auditable claims, and dependency-aware revalidation.*

---

## Important Scope & Trust Model Notice (Phase 1)

> [!IMPORTANT]
> **Phase 1 Disclaimer & Limitation:**
> **Phase 1 tests dependency logic and state machine semantics only.** It does **NOT** perform live cryptographic proof verification against running blockchain clients, nor does it claim trustless verification. RPC endpoints, Merkle proofs, and attestations are represented as structured domain evidence models. Live RPC adapters, light-client verification, and contract registries are scheduled for subsequent phases.

---

## 1. Core Thesis & Design Principles

When cross-chain transactions execute across heterogeneous networks, applications must evaluate assertions about foreign chain events without modifying base consensus protocols.

ChainTrace is built on five core principles:
1. **Evidence over assertion**: Never label a relationship verified merely because an RPC provider or backend claims it is true.
2. **Facts and relationships are separate**: An observed event (e.g., a destination transaction execution) exists as an immutable historical fact even if the claimed cross-chain causal relationship is invalidated or re-evaluated.
3. **Explicit trust assumptions**: Every verification result records the exact verification policy, policy version, and evidence inputs it evaluated.
4. **Revalidation, not erasure**: When upstream evidence changes or reorganizes, affected downstream claims are marked `REVALIDATION_REQUIRED`—preserving the complete audit trail and explaining *why* the status changed, rather than blindly marking everything invalid or erasing history.
5. **Deterministic DAG with cycle rejection**: Dependency edges form a directed acyclic graph. Cycles are rejected at write time with deterministic errors.

---

## 2. Architecture & Data Model

The system separates observed facts, evidence records, typed claims, dependency edges, and audit transitions into distinct schemas:

```
[ Observed Events ]  ──>  [ Evidence Records ]
         │                        │
         ▼                        ▼
[ Factual Claims ]  ──(Dependency Edges)──>  [ Relational Claims ]
                                                     │
                                                     ▼
                                          [ Append-Only Audit Log ]
```

### Schemas

- **`EventRecord`**: An observed transaction or protocol event identified by `chain_id`, `tx_hash`, `block_number`, `block_hash`, and `event_index`.
- **`EvidenceRecord`**: Authenticated data (e.g., `RECEIPT_REFERENCE`, `INCLUSION_PROOF`, `AUTHENTICATED_HEADER`, `MESSAGE_ATTESTATION`) evaluated under a versioned policy.
- **`ClaimRecord`**: A typed proposition (`EVENT_INCLUDED`, `SOURCE_FINALIZED`, `MESSAGE_MATCHED`, `DESTINATION_EXECUTED`, `PATH_SUPPORTED`).
- **`DependencyEdge`**: A typed relationship (`SUPPORTS`, `AUTHENTICATES`, `MATCHES`, `FINALITY_GUARD`, `POLICY_DEPENDENCY`) pointing from prerequisite to dependent claim.
- **`AuditEvent`**: An immutable, append-only record capturing every status transition, prior status, triggering dependency, reason code, policy version, timestamp, and evaluation hash.

### Claim State Machine

| Status | Meaning | Allowed Next Steps |
|---|---|---|
| `UNVERIFIED` | Claim exists but has not passed a verification policy | `VERIFIED`, `INCONCLUSIVE`, `INVALID` |
| `VERIFIED` | Claim passed named policy against recorded evidence | `REVALIDATION_REQUIRED`, `INVALID`, `INCONCLUSIVE` |
| `REVALIDATION_REQUIRED` | Upstream dependency/policy changed; needs re-evaluation | `VERIFIED`, `INVALID`, `INCONCLUSIVE` |
| `INVALID` | Claim failed verification check under stated policy | `REVALIDATION_REQUIRED`, `INCONCLUSIVE`, `VERIFIED` (on new evidence) |
| `INCONCLUSIVE` | Evidence is ambiguous, incomplete, or unconfirmed | `VERIFIED`, `INVALID`, `REVALIDATION_REQUIRED` |

---

## 3. Dependency-Aware Revalidation Algorithm

When an upstream dependency (evidence, finalized block, or policy version) changes:
1. **Descendant Traversal**: `descendantsOf(dependencyId)` finds all direct and indirect downstream nodes in the DAG.
2. **Topological Ordering**: `topologicalSort(affected)` produces a deterministic topological ordering (using Kahn's algorithm with alphanumeric tie-breaking).
3. **Idempotent Transition**: Each affected claim is transitioned to `REVALIDATION_REQUIRED` with reason `DEPENDENCY_CHANGED`. Repeated triggers are deduplicated to prevent redundant audit events.
4. **Fact Preservation**: Independent claims and factual event records outside the affected subgraph remain completely untouched.
5. **Subtree Revalidation**: Claims are rechecked in topological order using current dependency states and versioned policies.

---

## 4. Acceptance Tests (T01 – T12)

The implementation passes all 12 functional and security acceptance scenarios defined in the Foundation Plan:

| ID | Scenario | Result |
|---|---|---|
| **T01** | Valid evidence passes policy | Claim becomes `VERIFIED`; policy version and evidence hashes recorded. |
| **T02** | Tampered evidence or invalid proof | Claim fails verification (`INVALID`); failure reason code recorded. |
| **T03** | Mismatched message IDs | Rejected (`INVALID`); no causal link inferred from timestamps or amounts alone. |
| **T04** | Duplicate submission | Idempotent registration; no duplicate claims, events, or edges created. |
| **T05** | Upstream dependency changes | Affected claims marked `REVALIDATION_REQUIRED` with triggering dependency in audit history. |
| **T06** | Source relationship loses support | Destination fact remains recorded; relationship revalidated independently. |
| **T07** | Dependency cycle introduced | Cycle rejected at write-time with deterministic `CycleDetectedError`. |
| **T08** | Duplicate dependency change trigger | Idempotent; no duplicate audit transitions or status oscillations. |
| **T09** | Policy version changes | Affected claims become `REVALIDATION_REQUIRED`; historical policy version retained. |
| **T10** | Ambiguous/missing evidence | Yields `INCONCLUSIVE`, not falsely marked invalid or verified. |
| **T11** | Unauthenticated RPC receipt | Follows declared policy; does not claim trustless verification. |
| **T12** | Large graph with shared ancestors | Identifies all and only affected descendants with measured runtime (<100ms). |

---

## 5. Getting Started

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Installation
```bash
npm install
```

### Building TypeScript (Strict Mode)
```bash
npm run build
```

### Running Tests
```bash
# Run unit and acceptance tests with Vitest
npm test
```

---

## 6. Project Layout

```
chaintrace/
├── index.ts                             # Root module exports
├── package.json                         # Project manifest & scripts
├── tsconfig.json                        # TypeScript strict configuration
├── vitest.config.ts                     # Vitest test runner configuration
├── docs/
│   └── phase-0/                         # Phase 0 Specification, Research & Threat Model
│       ├── problem-definition.md        # Problem statement & MVP workflow
│       ├── prior-art-matrix.md          # State of the art & novelty assessment
│       ├── integration-profile.md       # Sepolia -> Polygon Amoy (LayerZero v2)
│       ├── claim-taxonomy.md            # Typed claim definitions & dependencies
│       ├── verification-model.md        # State machine & verification levels
│       ├── threat-model.md              # Threat register & response templates
│       ├── architecture.md              # Module boundaries & data flows
│       ├── api-contract.md              # REST API schemas & endpoints
│       ├── acceptance-criteria.md       # Acceptance criteria & test matrix (T01-T12)
│       ├── demo-scenario.md             # 2-minute judge demo runbook
│       └── decision-log.md              # Architectural Decision Records (ADRs)
│   └── phase-1/                         # Phase 1 Implementation & Acceptance
│       └── phase-1-report.md            # Phase 1 exit gate report & test results
│   └── phase-2/                         # Phase 2 Real Chain Integration
│       └── phase-2-report.md            # Phase 2 implementation report & acceptance
│   └── phase-3/                         # Phase 3 Persistence, API & Auditability
│       └── phase-3-report.md            # Phase 3 implementation report & acceptance
├── packages/
│   ├── domain/                          # Domain models, schemas & audit trail
│   │   └── src/
│   │       ├── types.ts                 # Typed schemas (Event, Evidence, Claim, Edge, Audit)
│   │       ├── schemas.ts               # Invariant checkers & validators
│   │       ├── audit.ts                 # Cryptographically chained append-only audit log
│   │       ├── errors.ts                # Domain errors (NotFoundError, CycleDetectedError, etc.)
│   │       ├── repositories.ts          # In-memory persistence repositories
│   │       └── index.ts                 # Domain exports
│   ├── dependency-engine/               # Core DAG and propagation engine
│   │   └── src/
│   │       ├── dag.ts                   # Deterministic DAG with cycle rejection
│   │       ├── engine.ts                # DependencyEngine with propagation & revalidation
│   │       └── index.ts                 # Engine exports
│   ├── verification/                    # Phase 1 verification policies
│   │   └── src/
│   │       ├── policies.ts              # Event inclusion, finality, message match policies
│   │       └── index.ts                 # Verification exports
│   ├── chain-adapters/                  # Phase 2 Real-World Protocol Adapters
│   │   └── src/
│   │       ├── profile.ts               # LayerZero v2 profile (Sepolia -> Polygon Amoy)
│   │       ├── rpc-client.ts            # ReadOnlyRpcClient with retry, timeout & 429 backoff
│   │       ├── decoder.ts               # PacketSent & PacketDelivered ABI decoders
│   │       ├── adapter.ts               # LayerZeroV2Adapter source/dest evidence collection
│   │       ├── trail-service.ts         # CrossChainTrailService (connects adapter to DAG engine)
│   │       ├── errors.ts                # Typed RPC & adapter error classes
│   │       └── index.ts                 # Chain adapters exports
│   ├── persistence/                     # Phase 3 Relational Persistence
│   │   └── src/
│   │       ├── schema.sql               # ANSI SQL schema (trails, claims, evidence, audit)
│   │       ├── migrator.ts              # Schema migrator with version tracking
│   │       ├── sqlite-store.ts          # SQLite store with transactions, OCC & pagination
│   │       └── index.ts                 # Persistence exports
│   ├── service/                         # Phase 3 Durable Service Layer
│   │   └── src/
│   │       ├── durable-trail-service.ts # Orchestrates live ingestion, caching & atomic writes
│   │       └── index.ts                 # Service exports
│   └── api/                             # Phase 3 Fastify REST API
│       └── src/
│           ├── server.ts                # Fastify server, validation, auth guard, rate limits
│           └── index.ts                 # API exports
└── tests/
    ├── acceptance.test.ts               # Phase 1 Acceptance suite for T01 - T12
    ├── adapters/                        # Phase 2 RPC, Decoder & Adapter tests
    ├── integration/                     # Phase 2 Real chain end-to-end integration tests
    ├── persistence/                     # Phase 3 SQLite migrations, OCC & restart tests
    ├── api/                             # Phase 3 Fastify HTTP endpoints & auth tests
    ├── unit/                            # DAG cycle detection & fault injection tests
    └── property/                        # Graph property-based invariant tests
```

---

## 7. Phase 3 REST API & Persistence

Phase 3 exposes a versioned, narrow, and predictable Fastify REST API:

### Endpoints

| Endpoint | Access | Description |
|---|---|---|
| `GET /health` | Public | Operational liveness probe |
| `GET /ready` | Public | Dependency readiness probe |
| `GET /v1/trails/:sourceChainId/:sourceTxHash` | Public | Retrieves complete trail graph; serves from cache or ingests live |
| `GET /v1/claims/:claimId` | Public | Inspects individual claim status, reason code, and policy version |
| `GET /v1/evidence/:evidenceId` | Public | Retrieves evidence record, provider, and raw observation payload |
| `GET /v1/trails/:trailId/audit` | Public | Retrieves paginated append-only audit trail (`limit`, `offset`) |
| `POST /v1/trails/:trailId/refresh` | Authenticated | Re-evaluates trail against fresh RPC state (rate-limited, idempotent) |

### Mutation Protection & Security
- **Authentication**: `POST /v1/trails/:trailId/refresh` requires `x-api-key`.
- **Idempotency**: Clients supply an `idempotency-key` header to cache and deduplicate expensive refresh requests.
- **Rate Limiting**: Refreshes are bound to 5 requests/minute per trail ID.
- **Input Validation**: Rejects non-hex tx hashes and invalid chain IDs with 400 Bad Request before hitting storage or RPC.

---

## 8. Verification & Test Commands

```bash
# Typecheck entire TypeScript codebase
npm run typecheck

# Run Phase 1 unit & acceptance tests
npm run test:unit
npm run test:integration

# Run Phase 2 adapter tests
npm run test:adapters

# Run Phase 3 persistence tests (SQLite migrations, OCC, restart survival)
npm run test:persistence

# Run Phase 3 Fastify REST API tests (auth, validation, endpoints, rate limits)
npm run test:api

# Run entire test suite (65 passing tests)
npm test

# Build production bundle
npm run build
```
