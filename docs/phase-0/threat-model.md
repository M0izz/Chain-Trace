# Phase 0.5 — Threat Model & Failure Analysis

**Document ID:** `CHAINTRACE-P0-05`  
**Version:** 1.0.0  
**Status:** Approved  
**Author:** ChainTrace Core Architecture Team  

---

## 1. Assets to Protect

1. **Integrity of Evidence & Claim Records:** Preventing fabricated or tampered proofs from producing a `VERIFIED` state.
2. **Correctness of Cross-Chain Associations:** Ensuring destination executions are linked to source events only when protocol message identity and domain separation hold.
3. **Traceability of Audit History:** Ensuring all status transitions are immutable and tamper-evident.
4. **Availability & Bounded Processing:** Protecting the graph and dependency traversal from algorithmic complexity denial-of-service (cycles, recursion bombs, or unbounded batch queries).

---

## 2. Trust Boundaries & Risk Controls

| System Boundary | Input / Responsibility | Risk to Control | Implemented Defense |
|---|---|---|---|
| **External RPC Nodes** | Blocks, receipts, logs, headers | Stale, inconsistent, or fabricated JSON-RPC data | Do not treat RPC responses as proof. Validate hashes against block headers & canonical checkpoint tags. |
| **Chain Adapters** | Normalizes raw RPC logs into EventRecords | Field dropping, wrong endianness, contract misidentification | Schema validation, deterministic ID generation (`event:chainId:txHash:logIndex`). |
| **Verification Engine** | Evaluates evidence under versioned rules | False positives, weak heuristic matching, policy drift | Explicit versioned evaluators; require cryptographic GUID / message ID matches. |
| **Dependency Engine** | Traverses DAG and propagates state changes | Cycles, missed descendants, non-idempotent spam | Write-time cycle rejection (`CycleDetectedError`), Kahn's topological sort, trigger deduplication. |
| **Audit Log Store** | Records state transitions | History erasure, retroactive status modification | Append-only store with cryptographic SHA-256 hash chaining (`prev_hash` $\rightarrow$ `record_hash`). |
| **API & Visualization** | Displays trails to users | Misleading status badges, leaking internal data | Strict status semantics: `REVALIDATION_REQUIRED` rendered with needs-check warning; read-only frozen data. |

---

## 3. Prioritized Threat Register

| Threat ID | Threat Name | Concrete Scenario | Severity | Required System Response |
|---|---|---|---|---|
| **TH-01** | **Forged Evidence** | Attacker crafts a fake transaction receipt or proof with forged topics. | High | Verifier checks content hash against authenticated block receipt root. If verification fails, claim is marked `INVALID` with reason `INCLUSION_PROOF_FAILED`. |
| **TH-02** | **Mismatched Message Match** | Attacker claims a destination execution corresponds to a high-value source transfer by matching similar amounts and timestamps. | High | Message match evaluator checks protocol-specific 32-byte GUID and domain parameters (`srcEid`, `dstEid`). Rejects mismatch as `INVALID` (`MESSAGE_ID_MISMATCH`). Never infers match. |
| **TH-03** | **Source Reorganization** | A source block previously observed at depth 2 is orphaned during a consensus fork. | High | Finality monitor signals canonical block change. Dependency engine flags `SOURCE_FINALIZED` and all downstream claims as `REVALIDATION_REQUIRED`. Destination execution fact remains preserved. |
| **TH-04** | **Dependency Cycle Injection** | Malicious claim registration creates a cyclic dependency (A $\rightarrow$ B $\rightarrow$ C $\rightarrow$ A) to cause infinite revalidation loops. | High | Graph engine rejects cyclic edge creation at write time with `CycleDetectedError`. No state modified. |
| **TH-05** | **Replay / Duplicate Submission** | Same bridge event or message ID is submitted multiple times to duplicate balances or claims. | Medium | Event and claim registries enforce canonical deterministic IDs. Repeated submissions return existing record idempotently. |
| **TH-06** | **Compromised RPC Provider** | Single RPC node returns manipulated log or drops valid logs. | Medium | ChainTrace records provider provenance in evidence record. If evidence cannot be cross-referenced or verified against root, returns `INCONCLUSIVE`. |
| **TH-07** | **Audit Trail Tampering** | Attacker alters database record to change status from `INVALID` to `VERIFIED`. | High | `AppendOnlyAuditLog` verifies cryptographic chain. Modified record breaks hash link (`verifyChainIntegrity() === false`). |
| **TH-08** | **DoS via Deep Lattice Graph** | Attacker creates large graph with shared ancestors to degrade traversal performance. | Medium | Topological sort is bounded $O(V + E)$ over induced subgraph; sub-100ms measured runtime for 60-node graphs. |

---

## 4. Threat Response & Recovery Templates

### Template 1: Source Block Reorganization (TH-03)
1. **Detection Signal:** Finality checkpoint watcher observes `block_hash` at `block_number` does not match the canonical chain head.
2. **Claim / Dependency Response:**
   - Call `engine.onDependencyChanged(evidenceId, 'SOURCE_BLOCK_ORPHANED')`.
   - Engine identifies descendants: `claim:source-finalized` $\rightarrow$ `claim:message-match` $\rightarrow$ `claim:path-supported`.
   - All three claims transition to `REVALIDATION_REQUIRED`.
   - `claim:dest-executed` and `event:dest` remain `VERIFIED` and preserved.
3. **Audit Details Preserved:** Append-only log records sequence, prior status `VERIFIED`, new status `REVALIDATION_REQUIRED`, triggering dependency, and timestamp.
4. **Recovery Steps:** When a new canonical block containing the re-included transaction is finalized, new evidence is attached. `revalidateSubtree()` re-evaluates claims in topological order and restores `VERIFIED` status upon proof satisfaction.

### Template 2: Mismatched / Forged Message Link (TH-02)
1. **Detection Signal:** `claim.metadata.source_message_id !== claim.metadata.destination_message_id`.
2. **Claim / Dependency Response:** `MESSAGE_MATCHED` evaluates to `INVALID`. Dependent `PATH_SUPPORTED` claim evaluates to `INVALID`.
3. **Audit Details Preserved:** Audit event records reason `MESSAGE_ID_MISMATCH` with exact string discrepancy.
4. **Recovery Steps:** Status remains `INVALID` unless contradictory valid protocol attestation is submitted under an updated policy.
