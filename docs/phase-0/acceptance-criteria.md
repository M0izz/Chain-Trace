# Phase 0.6C — Acceptance Criteria & Test Matrix

**Document ID:** `CHAINTRACE-P0-06C`  
**Version:** 1.0.0  
**Status:** Approved  
**Author:** ChainTrace Core Architecture Team  

---

## 1. Acceptance Criteria by Domain

### 1.1 Verification
- Valid evidence passes declared policy checks and records policy version and evidence hashes.
- Forged, invalid, or corrupted proofs fail verification and transition claim to `INVALID` with a precise reason code.
- Mismatched protocol message IDs are rejected; no relationship is inferred from timestamp, amount, or address similarity.
- Unavailable or ambiguous evidence yields `INCONCLUSIVE` or `UNVERIFIED`; it is never falsely labeled invalid or verified.

### 1.2 Dependencies & Graph Execution
- The dependency graph strictly rejects cycles (both 1-node self loops and N-node cycles) at write-time with a deterministic `CycleDetectedError`.
- Dependency changes identify all direct and indirect downstream descendants in deterministic topological order.
- Upstream changes transition affected descendants to `REVALIDATION_REQUIRED` without blindly marking independent facts invalid.
- Repeated dependency change triggers are idempotent and produce no duplicate audit records or state oscillations.

### 1.3 Auditability
- Every status transition is captured in an append-only audit record containing sequence number, previous status, new status, triggering dependency, reason code, policy version, and timestamp.
- Audit records form an unbroken SHA-256 hash chain (`prev_hash` $\rightarrow$ `record_hash`) whose integrity is mathematically verifiable.
- Read operations return immutable frozen objects (`Object.freeze`).

### 1.4 Operations
- Processing is deterministic across runs and environments.
- Subgraph traversal and propagation benchmarked under 100ms for $\ge 50$ claims.

---

## 2. Acceptance Scenarios Matrix (T01 – T12)

| Test ID | Scenario | Input Condition | Expected System Behavior | Implementation Status |
|---|---|---|---|---|
| **T01** | Valid evidence passes policy | Valid inclusion proof attached to source claim | Claim transitions to `VERIFIED`; policy version and evidence hashes recorded. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T02** | Tampered evidence / invalid proof | Corrupted proof content hash (`result: FAIL`) | Claim evaluates to `INVALID` with reason `INCLUSION_PROOF_FAILED`. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T03** | Mismatched message IDs | `source_message_id !== destination_message_id` | Relationship rejected (`INVALID`, `MESSAGE_ID_MISMATCH`). No inferred link. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T04** | Duplicate submission | Submit identical event, claim, or edge twice | Idempotent response; no duplicate records created in registries. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T05** | Upstream dependency changes | Source finality checkpoint is invalidated | Downstream claims marked `REVALIDATION_REQUIRED`; audit event recorded. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T06** | Preserving independent facts | Source block orphaned after path verification | Destination execution claim and event remain `VERIFIED`; path claim revalidated. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T07** | Dependency graph cycle | Attempt to create edge closing a dependency loop | Deterministic rejection throwing `CycleDetectedError`. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T08** | Duplicate change trigger | Send same `onDependencyChanged` event twice | Idempotent; duplicate trigger deduplicated, 0 redundant audit events created. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T09** | Policy version changes | Policy upgraded from `1.0.0` to `2.0.0` | Dependent claim marked `REVALIDATION_REQUIRED`; historical audit retains `1.0.0`. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T10** | Ambiguous/missing evidence | Evidence marked `INCONCLUSIVE` | Claim transitions to `INCONCLUSIVE`, not falsely labeled invalid or verified. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T11** | Unauthenticated RPC receipt | Receipt provided without authenticated Merkle proof | Returns `INCONCLUSIVE`; system declares limitation without false trustless claim. | ✅ PASS (`tests/acceptance.test.ts`) |
| **T12** | Large graph traversal | 60-node multi-layer diamond graph | Traverses all and only affected descendants in $<100$ms; unlinked node unaffected. | ✅ PASS (`tests/acceptance.test.ts`) |
