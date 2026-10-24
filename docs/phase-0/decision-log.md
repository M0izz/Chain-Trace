# Phase 0.6E — Architecture Decision Log (ADRs)

**Document ID:** `CHAINTRACE-P0-06E`  
**Version:** 1.0.0  
**Status:** Approved  
**Author:** ChainTrace Core Architecture Team  

---

## Decision Index

- **ADR-01:** Focus on Provenance and Dependency-Aware Revalidation over Custom ZK Light Client
- **ADR-02:** Directed Acyclic Graph (DAG) for Claim Dependencies with Write-Time Cycle Rejection
- **ADR-03:** Append-Only Cryptographic Hash-Chained Audit Trail
- **ADR-04:** Strict Decoupling of Observed Event Facts from Relational Claims
- **ADR-05:** Selection of LayerZero v2 on Sepolia $\rightarrow$ Polygon Amoy as Reference Integration
- **ADR-06:** Storage Architecture: Off-Chain PostgreSQL / Domain Engine with Deferred On-Chain Registry
- **ADR-07:** Deterministic Topological Sorting via Kahn's Algorithm with Alphanumeric Tie-Breaking

---

### ADR-01: Focus on Provenance and Revalidation over Custom ZK Light Client
- **Context:** Building a trustless ZK light client for Ethereum consensus inside a hackathon timeframe is high-risk and diverts attention from the core innovation.
- **Decision:** Focus the prototype on the novel contribution: provenance-backed claims, dependency tracking, and revalidation semantics. Use standard JSON-RPC header commitments and DVN attestations with explicitly scoped trust boundaries.
- **Consequences:** Avoids unmanageable cryptographic engineering scope; allows deep testing and benchmarking of the dependency propagation engine.

---

### ADR-02: Directed Acyclic Graph (DAG) with Write-Time Cycle Rejection
- **Context:** Claims depend on prerequisites. If cyclic dependencies (A $\rightarrow$ B $\rightarrow$ A) are permitted, revalidation algorithms can enter infinite recursion.
- **Decision:** Model all claim dependencies as a DAG. Enforce cycle detection before committing any edge. If a path from child to parent exists, throw `CycleDetectedError`.
- **Consequences:** Guarantees termination and determinism of descendant traversal and topological sorting in $O(V + E)$ time.

---

### ADR-03: Append-Only Cryptographically Chained Audit Log
- **Context:** Status changes (such as marking a claim `REVALIDATION_REQUIRED`) must be tamper-evident and historically verifiable, rather than mutating an in-place boolean flag.
- **Decision:** Implement `AppendOnlyAuditLog` where each transition includes sequence index, timestamp, prior status, new status, triggering dependency, reason code, and `prev_hash` $\rightarrow$ `record_hash` using SHA-256. Expose `verifyChainIntegrity()`.
- **Consequences:** Prevents retroactive status tampering; provides complete transparency into why any claim changed status over time.

---

### ADR-04: Strict Decoupling of Observed Event Facts from Relational Claims
- **Context:** In existing explorers, if a cross-chain transfer is canceled or disproved, the destination transaction is often removed or masked.
- **Decision:** Separate `EventRecord` (an immutable fact: a transaction occurred at block X on chain Y) from `ClaimRecord` (an assertion: this event corresponds to message Z).
- **Consequences:** When a cross-chain relationship loses support or is invalidated, the destination event fact remains recorded and unaffected (`T06`).

---

### ADR-05: Selection of LayerZero v2 on Sepolia $\rightarrow$ Polygon Amoy
- **Context:** Need a real, reproducible cross-chain flow with accessible testnet contracts, distinct verification/execution steps, and canonical message IDs.
- **Decision:** Selected LayerZero v2 between Ethereum Sepolia (`40161`) and Polygon Amoy (`40267`), utilizing the 32-byte GUID calculated from `keccak256(nonce, srcEid, sender, dstEid, receiver)`.
- **Consequences:** Provides concrete contract addresses, event signatures, and test vectors for verifiable message delivery and mismatch tests.

---

### ADR-06: Storage Architecture Boundary
- **Context:** Deciding whether to place graph traversal on-chain in Solidity or off-chain in TypeScript/PostgreSQL.
- **Decision:** Off-chain TypeScript execution engine with PostgreSQL indexing for the prototype. An on-chain Solidity contract is reserved exclusively for anchoring canonical message keys and state commitments if multi-party arbitration is required.
- **Consequences:** Keeps gas costs zero for graph analysis; enables millisecond-level revalidation of large dependency graphs.

---

### ADR-07: Deterministic Topological Sorting
- **Context:** Standard topological sorts (DFS or Kahn's) can produce non-deterministic orderings when multiple nodes have in-degree 0, depending on map key iteration orders across different JavaScript engines.
- **Decision:** In Kahn's algorithm, keep available zero-indegree nodes sorted alphanumerically by node ID at every step.
- **Consequences:** Revalidation order is 100% reproducible across all environments, operating systems, and runs.
