# Phase 0.3 — Protocol Integration Profile

**Document ID:** `CHAINTRACE-P0-03`  
**Version:** 1.0.0  
**Status:** Frozen  
**Author:** ChainTrace Core Architecture Team  

---

## 1. Candidate Comparison & Protocol Selection

To provide a concrete, reproducible verification flow for the prototype, two leading cross-chain messaging candidates were evaluated:

| Criterion | LayerZero v2 (EndpointV2) | Wormhole (Guardian VAAs) | Evaluation Outcome |
|---|---|---|---|
| **Message Identifier** | 32-byte deterministic `guid` computed from fixed packet header fields | `(emitterChain, emitterAddress, sequence)` composite tuple | Both offer canonical, unique identifiers |
| **Verification Route** | Decentralized Verifier Networks (DVN) verify payload; Executor delivers | Guardian Multi-Sig (13/19) emits signed binary VAA | LayerZero separates verification from execution cleanly |
| **Public Testnet Support** | Sepolia $\leftrightarrow$ Polygon Amoy natively deployed and documented | Sepolia $\leftrightarrow$ Polygon Amoy deployed | Equal availability |
| **Receipt / Event Clarity** | Clear event logs: `PacketSent`, `PacketVerified`, `PacketDelivered` | `LogMessagePublished`, `TransferRedeemed` | LayerZero event pipeline aligns cleanly with discrete claims |

**Decision:** We select **LayerZero v2** on **Ethereum Sepolia (Chain ID: 11155111) $\rightarrow$ Polygon Amoy (Chain ID: 80002)** as the reference integration profile for ChainTrace.

---

## 2. Frozen Integration Specification

### 2.1 Chain Pair & Network Parameters
- **Source Network:** Ethereum Sepolia Testnet (EVM)
  - `chain_id`: `11155111`
  - `endpoint_id` (LayerZero EID): `40161`
  - Finality Assumption: Proof-of-Stake Casper FFG (requires $\ge 2$ finalized epochs, 64 slots / ~12.8 minutes for absolute finality, or 12 block confirmations for safe unfinalized observation).
- **Destination Network:** Polygon Amoy Testnet (EVM)
  - `chain_id`: `80002`
  - `endpoint_id` (LayerZero EID): `40267`
  - Execution Assumption: Inclusion in a canonical Polygon block verified via transaction receipt status `0x1`.

### 2.2 Contract Addresses & Event Definitions

#### Source: Ethereum Sepolia
- **EndpointV2 Address:** `0x6EDCE65403992e310A62460808c4b910D972f10f`
- **Emitted Event:** `PacketSent(bytes encodedPayload, bytes options, address sendLibrary)`
  - **Topic 0 Signature:** `0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925`
  - **Packet Header Format:**
    - `nonce`: uint64
    - `srcEid`: uint32 (`40161`)
    - `sender`: bytes32 (originating contract address)
    - `dstEid`: uint32 (`40267`)
    - `receiver`: bytes32 (destination recipient contract)
    - `guid`: bytes32 (`keccak256(nonce, srcEid, sender, dstEid, receiver)`)
    - `message`: arbitrary byte payload

#### Destination: Polygon Amoy
- **EndpointV2 Address:** `0x6EDCE65403992e310A62460808c4b910D972f10f`
- **Emitted Event:** `PacketDelivered(bytes32 guid, address origin, address receiver)`
  - **Topic 0 Signature:** `0x3e18a03f443b0d2d3a0889f8990176ef95779ecba4313fa5c052ca2e646fb886`

---

## 3. Matching Rules & Verification Conditions

Matching is strictly domain-separated. The system **never** infers a match based on timestamp proximity, recipient address, or token amount alone.

1. **Source Event Inclusion (`EVENT_INCLUDED`):**
   - Verified by checking receipt status `status === 0x1` and validating block inclusion proof against the canonical block header.
2. **Source Finalization (`SOURCE_FINALIZED`):**
   - Verified when the block height is confirmed by Beacon chain checkpoint attestation (`safe` or `finalized` block tag).
3. **Message Match (`MESSAGE_MATCHED`):**
   - The canonical `guid` in `PacketSent` must match the `guid` in `PacketDelivered` exactly.
   - The `srcEid` and `dstEid` must match the declared domain separation parameters (`40161` $\rightarrow$ `40267`).
4. **Attestation Validity (`ATTESTATION_VALID`):**
   - DVN attestation payload must be signed by the configured verifier threshold and committed to the destination Endpoint.
5. **Destination Execution (`DESTINATION_EXECUTED`):**
   - The destination transaction must have `receipt.status === 0x1` and emit `PacketDelivered` with identical `guid`.
6. **Path Support (`PATH_SUPPORTED`):**
   - All prerequisite claims (Source Inclusion, Source Finality, Message Match, and Destination Execution) must be in status `VERIFIED`.

---

## 4. Test Examples

### Positive Test Vector (Valid Delivery)
- **Source Tx (Sepolia):** `0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d`
- **GUID:** `0xmsg-eth-pol-001`
- **Destination Tx (Polygon Amoy):** `0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c`
- **Outcome:** All 5 claims reach status `VERIFIED`.

### Negative Test Vector 1 (Mismatched Message GUID)
- **Source GUID:** `0xmsg-eth-12345`
- **Destination GUID:** `0xmsg-pol-99999`
- **Outcome:** `MESSAGE_MATCHED` evaluates to `INVALID` (`MESSAGE_ID_MISMATCH`). Path claim fails.

### Negative Test Vector 2 (Tampered Inclusion Proof)
- **Source Tx:** Valid hash, but inclusion proof content hash does not verify against receipt root.
- **Outcome:** `EVENT_INCLUDED` evaluates to `INVALID` (`INCLUSION_PROOF_FAILED`).

---

## 5. Explicit Limitations: What Is NOT Independently Verified

To maintain intellectual honesty, ChainTrace explicitly documents boundaries that are trusted rather than proved:
1. **Consensus Full Node Execution:** ChainTrace queries standard JSON-RPC endpoints (Infura, Alchemy, public nodes). It does not run an internal Ethereum execution or consensus light client.
2. **DVN Internal Key Management:** The system checks that on-chain DVN attestations match expected contract formats, but does not audit the physical operational security of the DVN private keys off-chain.
3. **Application Contract Logic:** ChainTrace verifies delivery of the LayerZero packet to the destination contract address; it does not verify whether the downstream dApp’s business logic executed without economic exploits.
