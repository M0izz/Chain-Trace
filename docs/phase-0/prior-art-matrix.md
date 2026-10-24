# Phase 0.2 — Prior-Art Research & Novelty Matrix

**Document ID:** `CHAINTRACE-P0-02`  
**Version:** 1.0.0  
**Status:** Approved  
**Author:** ChainTrace Core Architecture Team  

---

## 1. Candidate Systems & Literature Review

To ensure ChainTrace addresses a genuine, defensible technical gap, we evaluated leading production cross-chain explorers, bridge architectures, security monitoring platforms, and academic literature.

### 1. LayerZero Scan & LayerZero v2
- **Description**: Proprietary and public block explorer for LayerZero protocol messages.
- **Reference**: [https://layerzeroscan.com](https://layerzeroscan.com) (Accessed: October 2026)
- **Mechanism**: Tracks packets via 32-byte GUIDs (`guid = keccak256(nonce, srcEid, sender, dstEid, receiver)`). Visualizes state pipeline (`INFLIGHT` $\rightarrow$ `CONFIRMING` $\rightarrow$ `VERIFYING` $\rightarrow$ `DELIVERED`).
- **Overlap**: Maps source transaction to destination execution using deterministic message identifiers.
- **Gaps**: Does not expose verifiable Merkle inclusion proofs or DVN signature payloads in an inspectable dependency graph. If a DVN or security stack configuration changes retroactively, past delivered transactions are not marked stale or revalidated; the dashboard merely stores static indexed status.

### 2. Wormhole Scan & Guardian Network
- **Description**: Message explorer for the Wormhole cross-chain messaging protocol.
- **Reference**: [https://wormholescan.io](https://wormholescan.io) (Accessed: October 2026)
- **Mechanism**: Guardians sign a Verified Action Approval (VAA) containing `emitterChain`, `emitterAddress`, `sequence`, and payload. The VAA is relayed to destination contracts.
- **Overlap**: Wormhole Scan exposes the VAA payload and guardian signatures.
- **Gaps**: Once marked `Redeemed`, the relationship is immutable in the database. If an emitter contract is found to have had a reorg or consensus dispute on the source chain prior to finality, the explorer does not compute or visualize which downstream VAAs are affected or require revalidation.

### 3. Academic Literature: XSplicer
- **Description**: Research prototype on evidence-backed cross-chain transaction correspondence.
- **Reference**: *XSplicer: Reconstructing Cross-Chain Transaction Correspondence using Verifiable On-Chain Evidence*, IEEE S&P / ACM CCS Proceedings (2024–2025).
- **Mechanism**: Synthesizes formal event correspondence across heterogeneous execution logs using symbolic transaction tracing and bridge event parsing.
- **Overlap**: Proves that transaction matching must rely on explicit protocol identifiers and causal event graphs rather than timing or address heuristics.
- **Gaps**: XSplicer focuses on *reconstructing* past correspondence offline. It does not provide an online dependency-aware propagation engine that recomputes validity when dynamic dependencies (finality state, validator threshold, or policy rules) change.

### 4. Academic Literature: Bridging SoK
- **Description**: *SoK: Cross-chain Bridging Architectural Design Flaws and Mitigations*, IEEE EuroS&P (2023).
- **Reference**: Detailed taxonomy of bridge security boundaries (light clients, external validators, optimistic verification, and hybrid liquidity networks).
- **Relevance to ChainTrace**: Establishes the hard rule that *a Merkle proof only proves membership relative to a root*; it does not establish root authenticity, consensus finality, or causal relationships by itself.

---

## 2. Comparison Matrix

| Capability | Cross-Chain Explorers (LZ / Wormhole) | Bridge Security Tools (L2Beat / Defender) | Academic Matching (XSplicer) | ChainTrace (This Work) |
|---|---|---|---|---|
| **Transaction Linking** | Native by protocol ID / GUID | None (aggregates contract stats) | Symbolic log correspondence | Deterministic typed claims |
| **Message Verification** | Backend displays API status | Monitors contract pause states | Verifies static log inclusion | Evaluates explicit named policies |
| **Evidence Provenance** | Opaque or partial API reference | Configuration risk analysis | Formal execution trace | Full evidence record with content hashes |
| **Dependency Graph** | None (flat linear message state) | None | Static event DAG | Dynamic Directed Acyclic Graph (DAG) |
| **Dependency-Aware Revalidation** | ❌ No (once verified, stays verified) | ❌ No | ❌ No (post-hoc analysis) | ✅ **Yes**: Propagates `REVALIDATION_REQUIRED` to descendants |
| **Preservation of Independent Facts** | ❌ Missing link hides destination | N/A | Preserves raw logs | ✅ **Yes**: Destination fact preserved if link loses support |
| **Append-Only Tamper-Evident Audit** | ❌ Mutable database records | Operational audit log | Immutable static report | ✅ **Yes**: SHA-256 hash-chained transitions |
| **Versioned Policy Evaluation** | ❌ Hardcoded backend rules | N/A | Fixed semantic rules | ✅ **Yes**: Policy versions tracked in each claim & audit |

---

## 3. Novelty Assessment & Defensible Contribution

### What ChainTrace Is NOT Claiming
- We are **not** claiming to have invented a novel cryptographic zero-knowledge proof or cross-chain consensus mechanism.
- We are **not** claiming that placing an event in an off-chain database proves truthfulness.

### The Defensible Innovation
**ChainTrace introduces provenance-aware dependency propagation to cross-chain verification**:
1. Formulates cross-chain auditing as a **typed dependency graph** where claims depend on specific evidence and prerequisite claims.
2. Implements a **revalidation engine** that deterministically updates dependent conclusions when upstream evidence, finality, or policy versions change, without falsely marking independent on-chain facts as invalid.
3. Enforces an **append-only, hash-chained audit log** ensuring that every change in verification status is cryptographically auditable.
