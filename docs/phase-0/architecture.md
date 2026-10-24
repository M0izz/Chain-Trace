# Phase 0.6A — Architecture & Module Boundaries

**Document ID:** `CHAINTRACE-P0-06A`  
**Version:** 1.0.0  
**Status:** Approved  
**Author:** ChainTrace Core Architecture Team  

---

## 1. System Architecture Overview

ChainTrace is architected into five decoupled modules with strict interface contracts and well-defined non-responsibilities.

```
┌────────────────────────────────────────────────────────┐
│                   External Blockchains                 │
│      Ethereum Sepolia (Source)   Polygon Amoy (Dest)    │
└───────────────────┬───────────────────┬────────────────┘
                    │                   │
                    ▼                   ▼
┌────────────────────────────────────────────────────────┐
│               1. Chain Adapters (Ingestion)            │
│  - Reads raw blocks, transactions, receipts, and logs  │
│  - Emits deterministic EventRecords                    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               2. Evidence Verifier (Policies)          │
│  - Evaluates proofs against versioned policies         │
│  - Emits PolicyEvaluationResults with explicit reasons  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│          3. Claim Dependency Engine (Core DAG)         │
│  - Directed Acyclic Graph (DAG)                        │
│  - Write-time cycle detection (CycleDetectedError)     │
│  - Deterministic topological descendant traversal      │
│  - Dependency-aware revalidation propagation           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│          4. Registry & Append-Only Audit Store         │
│  - Persists Events, Claims, Evidence, and Edges        │
│  - SHA-256 hash-chained immutable audit log            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 5. Query API & Visualizer              │
│  - GET /v1/trails/{chainId}/{txHash}                   │
│  - Interactive evidence inspector & revalidation view  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Module Responsibilities & Non-Responsibilities

| Module | Core Responsibility | Explicit NON-Responsibility (*What it does NOT do*) |
|---|---|---|
| **1. Chain Adapters** | Fetch blocks, transactions, receipts, and bridge events; normalize them into deterministic `EventRecord` schemas. | **Does NOT** decide that an arbitrary event is verified or authentic. |
| **2. Evidence Verifier** | Evaluate evidence using named, versioned policies; produce structured result codes and evaluation input digests. | **Does NOT** infer causal links from superficial timestamp or address similarities. |
| **3. Claim Dependency Engine** | Maintain directed dependency edges, reject cycles at write-time, propagate `REVALIDATION_REQUIRED` to affected descendants, recompute claims. | **Does NOT** alter historical chain facts or silently erase previous decisions. |
| **4. Registry / Storage** | Persist claims, evidence references, dependency edges, status transitions, and audit records. | **Does NOT** treat mere presence in a database as cryptographic proof. |
| **5. API & UI** | Query cross-chain trails, inspect evidence provenance, visualize dependency graphs and audit timelines. | **Does NOT** independently upgrade a claim to `VERIFIED` without verifier approval. |

---

## 3. On-Chain vs. Off-Chain Boundary

- **Off-Chain Execution (Fastify API + TypeScript Engine + PostgreSQL):**
  - Dependency graph indexing and topological sorting.
  - JSON-RPC event discovery, Merkle proof evaluation, and policy checks.
  - Query layer for fast trail inspection and graph visualization.
  - Rationale: High-frequency graph traversal, recursive CTEs, and arbitrary proof structures are cost-prohibitive on-chain.
- **On-Chain Boundary (Optional Minimal Solidity Contract):**
  - Canonical message GUID registry and state commitment publication for tamper-evident multi-party arbitration.
  - Raw chain histories and large proofs are kept off-chain.

---

## 4. End-to-End Data Flow

```
Step 01 [Observe]   ──> Chain Adapter reads source/destination logs and block headers.
Step 02 [Normalize] ──> Adapter emits stable event IDs (e.g. event:chainId:txHash:logIndex).
Step 03 [Verify]    ──> Policy Evaluator verifies evidence against declared versioned rules.
Step 04 [Link]      ──> Dependency Engine records typed edges and verifies DAG acyclicity.
Step 05 [Persist]   ──> Registry records claim, dependencies, and SHA-256 chained audit event.
Step 06 [Query]     ──> API returns complete trail with evidence provenance and status rationale.
```
