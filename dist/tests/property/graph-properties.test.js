"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../../packages/dependency-engine/src/index.js");
const index_js_2 = require("../../packages/verification/src/index.js");
(0, vitest_1.describe)('Phase 1 Property-Style Tests (Section 1.6)', () => {
    /**
     * Property 1: No accepted graph contains a cycle.
     */
    (0, vitest_1.it)('Property 1: Invariant — No accepted graph ever contains a cycle', () => {
        const dag = new index_js_1.DependencyDAG();
        const nodeCount = 20;
        // Build a multi-layered DAG
        for (let i = 0; i < nodeCount - 1; i++) {
            dag.addEdge(`N_${i}`, 'CLAIM', `N_${i + 1}`, 'CLAIM');
            if (i + 2 < nodeCount) {
                dag.addEdge(`N_${i}`, 'CLAIM', `N_${i + 2}`, 'CLAIM');
            }
        }
        // Topological sort must succeed on any accepted graph without error
        const sorted = dag.topologicalSort();
        (0, vitest_1.expect)(sorted.length).toBe(nodeCount);
        // Attempting to add ANY backward edge must be rejected
        for (let i = 1; i < nodeCount; i++) {
            (0, vitest_1.expect)(() => {
                dag.addEdge(`N_${i}`, 'CLAIM', `N_0`, 'CLAIM');
            }).toThrow(index_js_1.CycleDetectedError);
        }
    });
    /**
     * Property 2 & 3: Reachability completeness and soundness.
     * Every returned descendant is reachable from the changed node,
     * and no reachable dependent claim is omitted.
     */
    (0, vitest_1.it)('Property 2 & 3: Invariant — Descendants set is exact (sound and complete)', () => {
        const dag = new index_js_1.DependencyDAG();
        // Branching and converging tree
        // R -> A -> C -> E
        // R -> B -> D -> E
        // Isolated: X -> Y
        dag.addEdge('R', 'EVIDENCE', 'A', 'CLAIM');
        dag.addEdge('R', 'EVIDENCE', 'B', 'CLAIM');
        dag.addEdge('A', 'CLAIM', 'C', 'CLAIM');
        dag.addEdge('B', 'CLAIM', 'D', 'CLAIM');
        dag.addEdge('C', 'CLAIM', 'E', 'CLAIM');
        dag.addEdge('D', 'CLAIM', 'E', 'CLAIM');
        dag.addEdge('X', 'EVIDENCE', 'Y', 'CLAIM');
        const descendantsFromR = dag.getDescendants('R');
        // Completeness: all reachable nodes must be present
        (0, vitest_1.expect)(descendantsFromR).toContain('A');
        (0, vitest_1.expect)(descendantsFromR).toContain('B');
        (0, vitest_1.expect)(descendantsFromR).toContain('C');
        (0, vitest_1.expect)(descendantsFromR).toContain('D');
        (0, vitest_1.expect)(descendantsFromR).toContain('E');
        // Soundness: unreachable nodes must NOT be present
        (0, vitest_1.expect)(descendantsFromR).not.toContain('X');
        (0, vitest_1.expect)(descendantsFromR).not.toContain('Y');
        (0, vitest_1.expect)(descendantsFromR.length).toBe(5);
    });
    /**
     * Property 4: Topological order never places a dependent before its affected prerequisite.
     */
    (0, vitest_1.it)('Property 4: Invariant — Topological ordering strictly precedes dependents after prerequisites', () => {
        const dag = new index_js_1.DependencyDAG();
        const edges = [
            ['R', 'A'],
            ['A', 'B'],
            ['A', 'C'],
            ['B', 'D'],
            ['C', 'D'],
            ['D', 'E']
        ];
        for (const [p, c] of edges) {
            dag.addEdge(p, 'CLAIM', c, 'CLAIM');
        }
        const order = dag.topologicalSort();
        for (const [parent, child] of edges) {
            const parentIdx = order.indexOf(parent);
            const childIdx = order.indexOf(child);
            (0, vitest_1.expect)(parentIdx).toBeLessThan(childIdx);
        }
    });
    /**
     * Property 5: Idempotency: Applying the same change event twice produces
     * the exact same domain state as applying it once.
     */
    (0, vitest_1.it)('Property 5: Invariant — Idempotency of repeated dependency-change events', () => {
        const engine = new index_js_1.DependencyEngine();
        const rootEvId = 'evidence:root';
        const claim1Id = 'claim:c1';
        const claim2Id = 'claim:c2';
        engine.registerEvidence({
            evidence_id: rootEvId,
            evidence_type: 'INCLUSION_PROOF',
            subject_ref: 'event:1',
            content_hash: '0xhash1',
            source_reference: 'rpc://test',
            verification_method: 'MerkleProof',
            policy_version: '1.0.0',
            result: 'PASS',
            checked_at: new Date().toISOString()
        });
        engine.registerClaim({
            claim_id: claim1Id,
            claim_type: 'EVENT_INCLUDED',
            subject_refs: ['event:1'],
            status: 'VERIFIED',
            policy_id: index_js_2.POLICY_IDS.EVENT_INCLUSION,
            policy_version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'INIT', message: 'Initial' },
            version: 1
        });
        engine.registerClaim({
            claim_id: claim2Id,
            claim_type: 'PATH_SUPPORTED',
            subject_refs: ['event:1'],
            status: 'VERIFIED',
            policy_id: index_js_2.POLICY_IDS.PATH_SUPPORT,
            policy_version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'INIT', message: 'Initial' },
            version: 1
        });
        engine.addDependency({
            dependency_id: 'dep:root->c1',
            parent_type: 'EVIDENCE',
            parent_id: rootEvId,
            dependent_claim_id: claim1Id,
            dependency_type: 'SUPPORTS',
            required: true
        });
        engine.addDependency({
            dependency_id: 'dep:c1->c2',
            parent_type: 'CLAIM',
            parent_id: claim1Id,
            dependent_claim_id: claim2Id,
            dependency_type: 'SUPPORTS',
            required: true
        });
        // 1st application
        const prop1 = engine.onDependencyChanged(rootEvId, 'UPSTREAM_CHANGE');
        (0, vitest_1.expect)(prop1.affectedCount).toBe(2);
        (0, vitest_1.expect)(prop1.auditEventsCreated).toBe(2);
        const snapshotAfter1st = {
            c1Status: engine.getClaim(claim1Id)?.status,
            c2Status: engine.getClaim(claim2Id)?.status,
            auditLength: engine.getAllAuditEvents().length
        };
        // 2nd application with identical trigger
        const prop2 = engine.onDependencyChanged(rootEvId, 'UPSTREAM_CHANGE');
        (0, vitest_1.expect)(prop2.auditEventsCreated).toBe(0); // Deduplicated!
        const snapshotAfter2nd = {
            c1Status: engine.getClaim(claim1Id)?.status,
            c2Status: engine.getClaim(claim2Id)?.status,
            auditLength: engine.getAllAuditEvents().length
        };
        (0, vitest_1.expect)(snapshotAfter2nd).toEqual(snapshotAfter1st);
    });
    /**
     * Property 6: Revalidation never modifies claims outside the affected subgraph.
     */
    (0, vitest_1.it)('Property 6: Invariant — Revalidation never modifies claims outside the affected subgraph', () => {
        const engine = new index_js_1.DependencyEngine();
        const rootEvId = 'evidence:root';
        const affectedClaimId = 'claim:affected';
        const independentClaimId = 'claim:independent';
        engine.registerEvidence({
            evidence_id: rootEvId,
            evidence_type: 'INCLUSION_PROOF',
            subject_ref: 'event:1',
            content_hash: '0xhash1',
            source_reference: 'rpc://test',
            verification_method: 'MerkleProof',
            policy_version: '1.0.0',
            result: 'PASS',
            checked_at: new Date().toISOString()
        });
        engine.registerClaim({
            claim_id: affectedClaimId,
            claim_type: 'EVENT_INCLUDED',
            subject_refs: ['event:1'],
            status: 'VERIFIED',
            policy_id: index_js_2.POLICY_IDS.EVENT_INCLUSION,
            policy_version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'INIT', message: 'Initial' },
            version: 1
        });
        engine.registerClaim({
            claim_id: independentClaimId,
            claim_type: 'DESTINATION_EXECUTED',
            subject_refs: ['event:independent'],
            status: 'VERIFIED',
            policy_id: index_js_2.POLICY_IDS.EVENT_INCLUSION,
            policy_version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'INIT', message: 'Initial' },
            version: 1
        });
        engine.addDependency({
            dependency_id: 'dep:root->aff',
            parent_type: 'EVIDENCE',
            parent_id: rootEvId,
            dependent_claim_id: affectedClaimId,
            dependency_type: 'SUPPORTS',
            required: true
        });
        const independentBefore = { ...engine.getClaim(independentClaimId) };
        engine.onDependencyChanged(rootEvId, 'EVIDENCE_MODIFIED');
        const independentAfter = engine.getClaim(independentClaimId);
        (0, vitest_1.expect)(independentAfter.status).toBe(independentBefore.status);
        (0, vitest_1.expect)(independentAfter.version).toBe(independentBefore.version);
        (0, vitest_1.expect)(independentAfter.updated_at).toBe(independentBefore.updated_at);
    });
});
