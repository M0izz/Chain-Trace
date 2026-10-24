# Phase 0.6B — API Contract Specification

**Document ID:** `CHAINTRACE-P0-06B`  
**Version:** 1.0.0  
**Status:** Approved  
**Author:** ChainTrace Core Architecture Team  

---

## 1. Overview & Protocol Principles

The ChainTrace API surface is deliberately compact and strictly separates **mutation/verification operations** from **read/query endpoints**. All endpoints use JSON for requests and responses.

Base Path: `/v1`

---

## 2. Endpoints Specification

### 2.1 `POST /v1/events`
Registers an observed on-chain transaction or protocol event.
- **Idempotency:** Enforced on `event_id` (`event:chainId:txHash:eventIndex`).
- **Request Body:**
  ```json
  {
    "event_id": "event:11155111:0x9a8f4c2e6d...:2",
    "chain_id": 11155111,
    "tx_hash": "0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
    "block_number": 5420100,
    "block_hash": "0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000",
    "event_index": 2,
    "contract_address": "0x6EDCE65403992e310A62460808c4b910D972f10f",
    "event_signature": "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
    "observed_at": "2026-10-24T12:00:00.000Z",
    "payload": {
      "guid": "0xmsg-eth-pol-001",
      "sender": "0xAlice...",
      "receiver": "0xBob..."
    }
  }
  ```
- **Response:** `201 Created` or `200 OK` (if existing idempotent record returned).

---

### 2.2 `POST /v1/evidence`
Attaches an evidence artifact to an event or claim.
- **Request Body:**
  ```json
  {
    "evidence_id": "evidence:eth:inclusion:001",
    "evidence_type": "INCLUSION_PROOF",
    "subject_ref": "event:11155111:0x9a8f4c2e6d...:2",
    "content_hash": "0xabc123789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
    "source_reference": "rpc://sepolia.infura.io/v3/proof",
    "verification_method": "MerkleReceiptProof",
    "policy_version": "1.0.0",
    "result": "PASS",
    "checked_at": "2026-10-24T12:01:00.000Z"
  }
  ```
- **Response:** `201 Created`

---

### 2.3 `POST /v1/claims`
Registers a typed claim and its prerequisite dependency edges.
- **Constraints:** Validates schema, rejects self-dependencies and multi-node cycles (`400 Bad Request`).
- **Request Body:**
  ```json
  {
    "claim_id": "claim:source-included:001",
    "claim_type": "EVENT_INCLUDED",
    "subject_refs": ["event:11155111:0x9a8f4c2e6d...:2"],
    "status": "UNVERIFIED",
    "policy_id": "policy:event-inclusion",
    "policy_version": "1.0.0",
    "status_reason": {
      "code": "AWAITING_VERIFICATION",
      "message": "Registered and awaiting evaluation"
    },
    "dependencies": [
      {
        "dependency_id": "dep:inc-proof->src-inc",
        "parent_type": "EVIDENCE",
        "parent_id": "evidence:eth:inclusion:001",
        "dependency_type": "SUPPORTS",
        "required": true
      }
    ]
  }
  ```
- **Response:** `201 Created`

---

### 2.4 `POST /v1/claims/{id}/verify`
Evaluates a claim under its declared policy and dependencies.
- **Response:** `200 OK`
  ```json
  {
    "claim_id": "claim:source-included:001",
    "status": "VERIFIED",
    "policy": {
      "id": "policy:event-inclusion",
      "version": "1.0.0"
    },
    "status_reason": {
      "code": "INCLUSION_VERIFIED",
      "message": "Event inclusion verified against authenticated receipt/proof"
    },
    "last_verified_at": "2026-10-24T12:01:30.000Z",
    "audit_id": "audit:claim:source-included:001:1:1792842000"
  }
  ```

---

### 2.5 `POST /v1/dependencies/{id}/change` *(Protected Admin / Simulation)*
Simulates or signals an upstream dependency change (e.g. block reorg, policy update).
- **Request Body:**
  ```json
  {
    "change_reason": "REORG_DETECTED_CANONICAL_BLOCK_CHANGED"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "dependency_id": "evidence:eth:finality:001",
    "change_reason": "REORG_DETECTED_CANONICAL_BLOCK_CHANGED",
    "affected_claims": [
      "claim:source-finalized:001",
      "claim:message-match:001",
      "claim:path-supported:001"
    ],
    "affected_count": 3,
    "duration_ms": 1.45,
    "audit_events_created": 3
  }
  ```

---

### 2.6 `GET /v1/trails/{chainId}/{txHash}`
Retrieves the complete cross-chain execution trail starting from a source transaction.
- **Response:** `200 OK`
  ```json
  {
    "source_tx_hash": "0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
    "events": [ ... ],
    "claims": [ ... ],
    "evidence": [ ... ],
    "dependencies": [ ... ],
    "audit_history": [ ... ]
  }
  ```

---

### 2.7 `GET /v1/claims/{id}`
Inspects a specific claim, its evidence, parent/child dependencies, and complete hash-chained audit history.

---

### 2.8 `GET /health`
Returns service status:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-10-25T11:00:00Z"
}
```
