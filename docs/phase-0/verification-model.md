# Phase 0.4B — Verification Model & Status Semantics

**Document ID:** `CHAINTRACE-P0-04B`  
**Version:** 1.0.0  
**Status:** Approved  
**Author:** ChainTrace Core Architecture Team  

---

## 1. Evidence Hierarchy & Levels of Proof

ChainTrace establishes explicit tiers of evidence strength:

| Evidence Level | Semantic Meaning | Limitation / Residual Assumption |
|---|---|---|
| **Level 0: Observed** | Raw data retrieved from a JSON-RPC node or indexer API. | RPC response may be stale, out-of-order, or maliciously forged. |
| **Level 1: Authenticated** | Data matches a cryptographic hash or receipt root committed in a block header. | Does not prove the header is finalized or canonical. |
| **Level 2: Finality-Checked** | The block header is certified by consensus checkpoints (e.g. Casper FFG / Beacon Chain finality). | Relies on source chain consensus security assumptions. |
| **Level 3: Protocol-Verified** | Message attributes (GUID, domain IDs, payloads) satisfy protocol verification rules. | Trust assumptions of bridge verifier / validator set remain. |
| **Level 4: Relationship-Supported** | Complete end-to-end path from source event to destination execution is verified by unbroken evidence. | Valid under the declared verification policies and timestamps. |

> [!IMPORTANT]
> **Hard Rule:** A Merkle proof only proves membership relative to a root. It does not authenticate that root, establish consensus finality, or prove a cross-chain causal relationship by itself.

---

## 2. Claim State Machine & Status Semantics

Every status in ChainTrace has a strict definition and explicit negative constraints (*what it must not mean*):

| Status | Exact Definition | Must NOT Mean | Allowed Next Transitions |
|---|---|---|---|
| `UNVERIFIED` | Claim has been registered into the graph but has not yet been evaluated by its declared policy. | Failed or fraudulent. | `VERIFIED`, `INCONCLUSIVE`, `INVALID` |
| `VERIFIED` | Specified conditions and required evidence passed under the stated policy version at the recorded timestamp. | Universally trustless or permanently valid forever. | `REVALIDATION_REQUIRED`, `INVALID`, `INCONCLUSIVE` |
| `REVALIDATION_REQUIRED` | An upstream dependency, source block canonicality, or verification policy changed. Re-evaluation is required. | Automatically invalid, fraudulent, or non-existent. | `VERIFIED`, `INVALID`, `INCONCLUSIVE` |
| `INVALID` | A required check failed, or contradictory evidence disproved the claim under specified rules. | A blanket judgment about all related transactions on other chains. | `REVALIDATION_REQUIRED`, `INCONCLUSIVE`, `VERIFIED` (if new valid evidence submitted) |
| `INCONCLUSIVE` | Available evidence is incomplete, unconfirmed, or ambiguous. | Proof that the claim is false. | `VERIFIED`, `INVALID`, `REVALIDATION_REQUIRED` |

---

## 3. Mandatory State Machine Invariants

1. **No Assertion Without Proof:** A claim cannot transition to `VERIFIED` without a successful evaluation result from its declared policy and all required evidence dependencies.
2. **Revalidation Visibility:** A claim marked `REVALIDATION_REQUIRED` must never be presented as currently verified in any UI or API without a prominent stale/needs-check indicator.
3. **Revalidation $\ne$ Invalidation:** When a parent claim or evidence becomes invalid or stale, downstream dependent claims are marked `REVALIDATION_REQUIRED`. They are **never blindly marked `INVALID`** until the re-evaluator verifies whether their specific semantics are violated.
4. **Facts Separate from Relationships:** An observed destination event's factual existence is independent of the validity of its cross-chain link. Invalidating a bridge message match never deletes or invalidates the destination transaction's historical occurrence.
5. **Idempotence & Auditability:** Every status transition must append an immutable audit record containing previous status, new status, reason code, triggering dependency, policy version, and timestamp. Re-running the same trigger must produce no spurious state oscillations or duplicate audit entries.
6. **Policy Version Tracking:** Verification policies are explicitly versioned (`x.y.z`). Historical claim results retain the exact policy version that produced them. Upgrading a policy triggers revalidation without erasing past decisions.
