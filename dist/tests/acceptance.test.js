"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../packages/domain/src/index.js");
const index_js_2 = require("../packages/dependency-engine/src/index.js");
const index_js_3 = require("../packages/verification/src/index.js");
const deterministic_trail_js_1 = require("./fixtures/deterministic-trail.js");
(0, vitest_1.describe)('ChainTrace Phase 1 - Acceptance & Security Tests (T01 - T12)', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new index_js_2.DependencyEngine();
        // Register all default policy evaluators
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.EVENT_INCLUSION, index_js_3.evaluateEventInclusionPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.SOURCE_FINALITY, index_js_3.evaluateSourceFinalityPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.MESSAGE_MATCH, index_js_3.evaluateMessageMatchPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.DESTINATION_EXECUTION, index_js_3.evaluateDestinationExecutionPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.PATH_SUPPORT, index_js_3.evaluatePathSupportPolicy);
    });
    /**
     * Helper to initialize the standard deterministic fixture trail
     */
    function setupStandardTrail(e) {
        e.registerEvent(deterministic_trail_js_1.FIXTURE_SOURCE_EVENT);
        e.registerEvent(deterministic_trail_js_1.FIXTURE_DEST_EVENT);
        e.registerEvidence(deterministic_trail_js_1.FIXTURE_EVIDENCE_INCLUSION);
        e.registerEvidence(deterministic_trail_js_1.FIXTURE_EVIDENCE_FINALITY);
        e.registerEvidence(deterministic_trail_js_1.FIXTURE_EVIDENCE_ATTESTATION);
        e.registerEvidence(deterministic_trail_js_1.FIXTURE_EVIDENCE_DEST_EXEC);
        e.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED);
        e.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED);
        e.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH);
        e.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_DEST_EXECUTED);
        e.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED);
        for (const edge of deterministic_trail_js_1.FIXTURE_DEPENDENCY_EDGES) {
            e.addDependency(edge);
        }
    }
    // --------------------------------------------------------------------------
    // T01: Valid evidence passes the selected policy
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T01: Valid evidence passes the selected policy; records policy version and evidence', async () => {
        setupStandardTrail(engine);
        // Initial evaluation of source included claim
        const evaluated = await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        (0, vitest_1.expect)(evaluated.status).toBe('VERIFIED');
        (0, vitest_1.expect)(evaluated.policy_version).toBe('1.0.0');
        (0, vitest_1.expect)(evaluated.status_reason.code).toBe('INCLUSION_VERIFIED');
        (0, vitest_1.expect)(evaluated.last_verified_at).toBeDefined();
        // Check audit trail recorded transition
        const audit = engine.getAuditHistory(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        (0, vitest_1.expect)(audit.length).toBeGreaterThanOrEqual(2); // Registration + Verification
        const lastAudit = audit[audit.length - 1];
        (0, vitest_1.expect)(lastAudit.previous_status).toBe('UNVERIFIED');
        (0, vitest_1.expect)(lastAudit.new_status).toBe('VERIFIED');
        (0, vitest_1.expect)(lastAudit.policy_version).toBe('1.0.0');
    });
    // --------------------------------------------------------------------------
    // T02: Tampered evidence or invalid proof
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T02: Tampered evidence or invalid proof fails verification with reason', async () => {
        setupStandardTrail(engine);
        // Provide tampered evidence with FAIL result
        const tamperedEvidence = {
            ...deterministic_trail_js_1.FIXTURE_EVIDENCE_INCLUSION,
            evidence_id: 'evidence:eth:inclusion:tampered',
            content_hash: '0xBAD_HASH_CORRUPTED_PROOF',
            result: 'FAIL'
        };
        engine.registerEvidence(tamperedEvidence);
        const testClaim = {
            ...deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED,
            claim_id: 'claim:tampered-test',
            status: 'UNVERIFIED'
        };
        engine.registerClaim(testClaim);
        engine.addDependency({
            dependency_id: 'dep:tampered->test',
            parent_type: 'EVIDENCE',
            parent_id: tamperedEvidence.evidence_id,
            dependent_claim_id: testClaim.claim_id,
            dependency_type: 'SUPPORTS',
            required: true
        });
        const evaluated = await engine.evaluateClaim(testClaim.claim_id);
        (0, vitest_1.expect)(evaluated.status).toBe('INVALID');
        (0, vitest_1.expect)(evaluated.status_reason.code).toBe('INCLUSION_PROOF_FAILED');
        // Audit log must reflect failure
        const audit = engine.getAuditHistory(testClaim.claim_id);
        const lastAudit = audit[audit.length - 1];
        (0, vitest_1.expect)(lastAudit.new_status).toBe('INVALID');
        (0, vitest_1.expect)(lastAudit.reason_code).toBe('INCLUSION_PROOF_FAILED');
    });
    // --------------------------------------------------------------------------
    // T03: Source and destination message IDs do not match
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T03: Mismatched source and destination message IDs are rejected (no inferred link)', async () => {
        setupStandardTrail(engine);
        // Create a claim where source message ID does not match destination message ID
        const mismatchedClaim = {
            claim_id: 'claim:mismatched-message-ids',
            claim_type: 'MESSAGE_MATCHED',
            subject_refs: [deterministic_trail_js_1.FIXTURE_SOURCE_EVENT.event_id, deterministic_trail_js_1.FIXTURE_DEST_EVENT.event_id],
            status: 'UNVERIFIED',
            policy_id: index_js_3.POLICY_IDS.MESSAGE_MATCH,
            policy_version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'PENDING', message: 'Pending' },
            metadata: {
                source_message_id: '0xmsg-eth-12345',
                destination_message_id: '0xmsg-pol-99999' // MISMATCH
            }
        };
        engine.registerClaim(mismatchedClaim);
        // Attach required attestation evidence
        engine.addDependency({
            dependency_id: 'dep:attest->mismatched',
            parent_type: 'EVIDENCE',
            parent_id: deterministic_trail_js_1.FIXTURE_EVIDENCE_ATTESTATION.evidence_id,
            dependent_claim_id: mismatchedClaim.claim_id,
            dependency_type: 'AUTHENTICATES',
            required: true
        });
        const result = await engine.evaluateClaim(mismatchedClaim.claim_id);
        (0, vitest_1.expect)(result.status).toBe('INVALID');
        (0, vitest_1.expect)(result.status_reason.code).toBe('MESSAGE_ID_MISMATCH');
        (0, vitest_1.expect)(result.status_reason.message).toContain('does not match');
    });
    // --------------------------------------------------------------------------
    // T04: Same message / event submitted twice (Idempotency)
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T04: Submitting the same event or claim twice is idempotent and does not create duplicates', () => {
        setupStandardTrail(engine);
        const initialStats = engine.getGraphStats();
        // Re-register identical event
        const regAgain = engine.registerEvent(deterministic_trail_js_1.FIXTURE_SOURCE_EVENT);
        (0, vitest_1.expect)(regAgain.event_id).toBe(deterministic_trail_js_1.FIXTURE_SOURCE_EVENT.event_id);
        // Re-register identical claim
        const claimAgain = engine.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED);
        (0, vitest_1.expect)(claimAgain.claim_id).toBe(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        // Re-add identical dependency edge
        const depAgain = engine.addDependency(deterministic_trail_js_1.FIXTURE_DEPENDENCY_EDGES[0]);
        (0, vitest_1.expect)(depAgain.dependency_id).toBe(deterministic_trail_js_1.FIXTURE_DEPENDENCY_EDGES[0].dependency_id);
        const afterStats = engine.getGraphStats();
        (0, vitest_1.expect)(afterStats.totalEvents).toBe(initialStats.totalEvents);
        (0, vitest_1.expect)(afterStats.totalClaims).toBe(initialStats.totalClaims);
        (0, vitest_1.expect)(afterStats.totalEdges).toBe(initialStats.totalEdges);
    });
    // --------------------------------------------------------------------------
    // T05: Dependency changes after a claim was verified
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T05: Dependency changes mark downstream claims REVALIDATION_REQUIRED with audit history', async () => {
        setupStandardTrail(engine);
        // First, verify all claims in order
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_DEST_EXECUTED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id);
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id)?.status).toBe('VERIFIED');
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id)?.status).toBe('VERIFIED');
        // Simulate upstream checkpoint reorganization / evidence change
        const propagation = engine.onDependencyChanged(deterministic_trail_js_1.FIXTURE_EVIDENCE_FINALITY.evidence_id, 'REORG_DETECTED_CANONICAL_BLOCK_CHANGED');
        // Affected claims should include source-finalized, message-match, and path-supported
        (0, vitest_1.expect)(propagation.affectedCount).toBe(3);
        (0, vitest_1.expect)(propagation.affectedClaimIds).toEqual([
            deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id,
            deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id,
            deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id
        ]);
        // Check statuses are REVALIDATION_REQUIRED, NOT blindly marked INVALID
        const sourceFin = engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id);
        const msgMatch = engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id);
        const pathClaim = engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id);
        (0, vitest_1.expect)(sourceFin.status).toBe('REVALIDATION_REQUIRED');
        (0, vitest_1.expect)(msgMatch.status).toBe('REVALIDATION_REQUIRED');
        (0, vitest_1.expect)(pathClaim.status).toBe('REVALIDATION_REQUIRED');
        // Verify audit log has transition with triggering dependency
        const pathAudit = engine.getAuditHistory(pathClaim.claim_id);
        const lastAudit = pathAudit[pathAudit.length - 1];
        (0, vitest_1.expect)(lastAudit.previous_status).toBe('VERIFIED');
        (0, vitest_1.expect)(lastAudit.new_status).toBe('REVALIDATION_REQUIRED');
        (0, vitest_1.expect)(lastAudit.triggering_dependency).toBe(deterministic_trail_js_1.FIXTURE_EVIDENCE_FINALITY.evidence_id);
        (0, vitest_1.expect)(lastAudit.reason_code).toBe('DEPENDENCY_CHANGED');
    });
    // --------------------------------------------------------------------------
    // T06: Downstream fact exists but source relationship loses support
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T06: Preserves independent facts when cross-chain relationship loses support', async () => {
        setupStandardTrail(engine);
        // Verify all claims
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_DEST_EXECUTED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id);
        // Invalidate the source inclusion evidence
        engine.onDependencyChanged(deterministic_trail_js_1.FIXTURE_EVIDENCE_INCLUSION.evidence_id, 'SOURCE_BLOCK_ORPHANED');
        // The destination execution claim does NOT depend on source inclusion
        const destExec = engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_DEST_EXECUTED.claim_id);
        (0, vitest_1.expect)(destExec.status).toBe('VERIFIED'); // PRESERVED!
        // The destination event fact also remains completely intact
        const destEvent = engine.getEvent(deterministic_trail_js_1.FIXTURE_DEST_EVENT.event_id);
        (0, vitest_1.expect)(destEvent).toBeDefined();
        (0, vitest_1.expect)(destEvent.tx_hash).toBe(deterministic_trail_js_1.FIXTURE_DEST_EVENT.tx_hash);
        // Only source-dependent claims are affected
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id)?.status).toBe('REVALIDATION_REQUIRED');
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id)?.status).toBe('REVALIDATION_REQUIRED');
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id)?.status).toBe('REVALIDATION_REQUIRED');
    });
    // --------------------------------------------------------------------------
    // T07: Dependency graph contains a cycle
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T07: Dependency graph rejects cycles with deterministic CycleDetectedError', () => {
        setupStandardTrail(engine);
        // Current chain:
        // source-finalized -> message-match -> path-supported
        // Attempting to add path-supported -> source-finalized creates a cycle:
        // source-finalized -> message-match -> path-supported -> source-finalized
        (0, vitest_1.expect)(() => {
            engine.addDependency({
                dependency_id: 'dep:cycle-attempt',
                parent_type: 'CLAIM',
                parent_id: deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id,
                dependent_claim_id: deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id,
                dependency_type: 'SUPPORTS',
                required: true
            });
        }).toThrow(index_js_2.CycleDetectedError);
        // Self-dependency cycle
        (0, vitest_1.expect)(() => {
            engine.addDependency({
                dependency_id: 'dep:self-cycle',
                parent_type: 'CLAIM',
                parent_id: deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id,
                dependent_claim_id: deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id,
                dependency_type: 'SUPPORTS',
                required: true
            });
        }).toThrow(index_js_2.CycleDetectedError);
    });
    // --------------------------------------------------------------------------
    // T08: Same dependency-change event processed twice
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T08: Repeated dependency change events produce no inconsistent statuses or duplicate audit records', async () => {
        setupStandardTrail(engine);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id);
        // First trigger
        const prop1 = engine.onDependencyChanged(deterministic_trail_js_1.FIXTURE_EVIDENCE_FINALITY.evidence_id, 'FINALITY_CONDITION_CHANGED');
        (0, vitest_1.expect)(prop1.auditEventsCreated).toBeGreaterThan(0);
        const auditCountAfterFirst = engine.getAuditHistory(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id).length;
        // Second trigger with exact same reason
        const prop2 = engine.onDependencyChanged(deterministic_trail_js_1.FIXTURE_EVIDENCE_FINALITY.evidence_id, 'FINALITY_CONDITION_CHANGED');
        (0, vitest_1.expect)(prop2.auditEventsCreated).toBe(0); // Deduplicated
        const auditCountAfterSecond = engine.getAuditHistory(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id).length;
        (0, vitest_1.expect)(auditCountAfterSecond).toBe(auditCountAfterFirst);
    });
    // --------------------------------------------------------------------------
    // T09: Policy version changes
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T09: Policy version changes mark affected claims REVALIDATION_REQUIRED and preserve history', async () => {
        setupStandardTrail(engine);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        const initialClaim = engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        (0, vitest_1.expect)(initialClaim.status).toBe('VERIFIED');
        (0, vitest_1.expect)(initialClaim.policy_version).toBe('1.0.0');
        // Register a policy dependency edge
        const policyId = 'policy:inclusion:rule';
        engine.addDependency({
            dependency_id: 'dep:policy-version->claim',
            parent_type: 'POLICY',
            parent_id: policyId,
            dependent_claim_id: deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id,
            dependency_type: 'POLICY_DEPENDENCY',
            required: true
        });
        // Policy updated from 1.0.0 to 2.0.0
        engine.onDependencyChanged(policyId, 'POLICY_UPGRADED_TO_2.0.0');
        const updatedClaim = engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        (0, vitest_1.expect)(updatedClaim.status).toBe('REVALIDATION_REQUIRED');
        // Verify historical audit events retain old policy version 1.0.0
        const history = engine.getAuditHistory(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        const verifiedEvent = history.find((h) => h.new_status === 'VERIFIED');
        (0, vitest_1.expect)(verifiedEvent).toBeDefined();
        (0, vitest_1.expect)(verifiedEvent?.policy_version).toBe('1.0.0');
    });
    // --------------------------------------------------------------------------
    // T10: Evidence unavailable or ambiguous
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T10: Inconclusive or ambiguous evidence yields INCONCLUSIVE, not falsely invalid or verified', async () => {
        setupStandardTrail(engine);
        // Create an inconclusive evidence record
        const ambiguousEvidence = {
            evidence_id: 'evidence:eth:inconclusive:001',
            evidence_type: 'AUTHENTICATED_HEADER',
            subject_ref: deterministic_trail_js_1.FIXTURE_SOURCE_EVENT.event_id,
            content_hash: '0x1234567890abcdef',
            source_reference: 'rpc://testnet.checkpoint/ambiguous',
            verification_method: 'HeaderVerification',
            policy_version: '1.0.0',
            result: 'INCONCLUSIVE',
            checked_at: new Date().toISOString()
        };
        engine.registerEvidence(ambiguousEvidence);
        const testClaim = {
            claim_id: 'claim:test-inconclusive',
            claim_type: 'EVENT_INCLUDED',
            subject_refs: [deterministic_trail_js_1.FIXTURE_SOURCE_EVENT.event_id],
            status: 'UNVERIFIED',
            policy_id: index_js_3.POLICY_IDS.EVENT_INCLUSION,
            policy_version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'PENDING', message: 'Pending' }
        };
        engine.registerClaim(testClaim);
        engine.addDependency({
            dependency_id: 'dep:ambiguous->test',
            parent_type: 'EVIDENCE',
            parent_id: ambiguousEvidence.evidence_id,
            dependent_claim_id: testClaim.claim_id,
            dependency_type: 'SUPPORTS',
            required: true
        });
        const evaluated = await engine.evaluateClaim(testClaim.claim_id);
        (0, vitest_1.expect)(evaluated.status).toBe('INCONCLUSIVE');
        (0, vitest_1.expect)(evaluated.status_reason.code).toBe('EVIDENCE_INCONCLUSIVE');
    });
    // --------------------------------------------------------------------------
    // T11: RPC provider returns a receipt without authenticated proof path
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T11: Unauthenticated RPC receipt does not claim trustless verification', async () => {
        // Declared policy limitation: Receipt alone without inclusion proof cannot be labeled VERIFIED trustless
        const unauthenticatedEvidence = {
            evidence_id: 'evidence:unauthenticated-rpc:001',
            evidence_type: 'RECEIPT_REFERENCE',
            subject_ref: 'event:eth:mock',
            content_hash: '0xunauthenticated',
            source_reference: 'https://cheap-rpc.org/tx',
            verification_method: 'UnauthenticatedRPCQuery',
            policy_version: '1.0.0',
            result: 'NOT_CHECKED',
            checked_at: new Date().toISOString()
        };
        engine.registerEvidence(unauthenticatedEvidence);
        const unverifiedClaim = {
            claim_id: 'claim:rpc-unauthenticated',
            claim_type: 'EVENT_INCLUDED',
            subject_refs: ['event:eth:mock'],
            status: 'UNVERIFIED',
            policy_id: index_js_3.POLICY_IDS.EVENT_INCLUSION,
            policy_version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'UNVERIFIED', message: 'Unauthenticated RPC observation' }
        };
        engine.registerClaim(unverifiedClaim);
        engine.addDependency({
            dependency_id: 'dep:unauth->claim',
            parent_type: 'EVIDENCE',
            parent_id: unauthenticatedEvidence.evidence_id,
            dependent_claim_id: unverifiedClaim.claim_id,
            dependency_type: 'SUPPORTS',
            required: true
        });
        const evaluated = await engine.evaluateClaim(unverifiedClaim.claim_id);
        (0, vitest_1.expect)(evaluated.status).toBe('INCONCLUSIVE');
        (0, vitest_1.expect)(evaluated.status).not.toBe('VERIFIED');
    });
    // --------------------------------------------------------------------------
    // T12: Large dependency graph with shared ancestors
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('T12: Large dependency graph with shared ancestors identifies all and only affected descendants with measured runtime', () => {
        // Generate a diamond/lattice DAG with N layers, each layer having M claims
        const layers = 6;
        const nodesPerLayer = 10;
        const rootEvidenceId = 'evidence:root:shared';
        engine.registerEvidence({
            evidence_id: rootEvidenceId,
            evidence_type: 'INCLUSION_PROOF',
            subject_ref: 'event:root',
            content_hash: '0xroot',
            source_reference: 'root://ref',
            verification_method: 'MerkleProof',
            policy_version: '1.0.0',
            result: 'PASS',
            checked_at: new Date().toISOString()
        });
        const createdClaimIds = [];
        for (let l = 0; l < layers; l++) {
            for (let i = 0; i < nodesPerLayer; i++) {
                const claimId = `claim:layer-${l}:node-${i}`;
                createdClaimIds.push(claimId);
                engine.registerClaim({
                    claim_id: claimId,
                    claim_type: 'EVENT_INCLUDED',
                    subject_refs: ['event:root'],
                    status: 'VERIFIED',
                    policy_id: index_js_3.POLICY_IDS.EVENT_INCLUSION,
                    policy_version: '1.0.0',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    status_reason: { code: 'INITIAL', message: 'Initial' }
                });
                if (l === 0) {
                    // Layer 0 connects to root evidence
                    engine.addDependency({
                        dependency_id: `dep:root->${claimId}`,
                        parent_type: 'EVIDENCE',
                        parent_id: rootEvidenceId,
                        dependent_claim_id: claimId,
                        dependency_type: 'SUPPORTS',
                        required: true
                    });
                }
                else {
                    // Layer L connects to nodes from layer L-1 (shared ancestors)
                    const parentClaim1 = `claim:layer-${l - 1}:node-${i % nodesPerLayer}`;
                    const parentClaim2 = `claim:layer-${l - 1}:node-${(i + 1) % nodesPerLayer}`;
                    engine.addDependency({
                        dependency_id: `dep:${parentClaim1}->${claimId}`,
                        parent_type: 'CLAIM',
                        parent_id: parentClaim1,
                        dependent_claim_id: claimId,
                        dependency_type: 'SUPPORTS',
                        required: true
                    });
                    engine.addDependency({
                        dependency_id: `dep:${parentClaim2}->${claimId}`,
                        parent_type: 'CLAIM',
                        parent_id: parentClaim2,
                        dependent_claim_id: claimId,
                        dependency_type: 'SUPPORTS',
                        required: true
                    });
                }
            }
        }
        // Also register an independent claim that is NOT connected to root evidence
        const independentClaimId = 'claim:independent:island';
        engine.registerClaim({
            claim_id: independentClaimId,
            claim_type: 'EVENT_INCLUDED',
            subject_refs: ['event:independent'],
            status: 'VERIFIED',
            policy_id: index_js_3.POLICY_IDS.EVENT_INCLUSION,
            policy_version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'INITIAL', message: 'Initial' }
        });
        // Trigger dependency change on root evidence
        const prop = engine.onDependencyChanged(rootEvidenceId, 'ROOT_EVIDENCE_REORGANIZED');
        // All created layer nodes (layers * nodesPerLayer = 60) should be affected
        (0, vitest_1.expect)(prop.affectedCount).toBe(layers * nodesPerLayer);
        (0, vitest_1.expect)(prop.durationMs).toBeLessThan(100); // Fast sub-100ms execution
        (0, vitest_1.expect)(prop.affectedClaimIds.includes(independentClaimId)).toBe(false);
        // Independent claim remains untouched
        (0, vitest_1.expect)(engine.getClaim(independentClaimId)?.status).toBe('VERIFIED');
    });
    // --------------------------------------------------------------------------
    // Audit Trail Immutability & Chained Hash Verification
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('Enforces append-only immutable audit trail with cryptographic hash chaining', () => {
        const auditLog = new index_js_1.AppendOnlyAuditLog();
        const ev1 = auditLog.append({
            claimId: 'claim:test:001',
            previousStatus: 'UNVERIFIED',
            newStatus: 'VERIFIED',
            reasonCode: 'VERIFIED_OK',
            policyVersion: '1.0.0'
        });
        const ev2 = auditLog.append({
            claimId: 'claim:test:001',
            previousStatus: 'VERIFIED',
            newStatus: 'REVALIDATION_REQUIRED',
            reasonCode: 'DEPENDENCY_CHANGED',
            policyVersion: '1.0.0'
        });
        (0, vitest_1.expect)(ev1.sequence).toBe(0);
        (0, vitest_1.expect)(ev1.prev_hash).toBe('GENESIS_ROOT');
        (0, vitest_1.expect)(ev2.sequence).toBe(1);
        (0, vitest_1.expect)(ev2.prev_hash).toBe(ev1.record_hash);
        // Verify whole chain integrity
        (0, vitest_1.expect)(auditLog.verifyChainIntegrity()).toBe(true);
        // Attempting to mutate returned events throws in strict mode or has no effect
        const history = auditLog.getHistoryForClaim('claim:test:001');
        (0, vitest_1.expect)(Object.isFrozen(history)).toBe(true);
        (0, vitest_1.expect)(Object.isFrozen(history[0])).toBe(true);
    });
    // --------------------------------------------------------------------------
    // Full Trail Retrieval
    // --------------------------------------------------------------------------
    (0, vitest_1.it)('Returns complete trail with events, claims, evidence, dependencies, and audit history', async () => {
        setupStandardTrail(engine);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_DEST_EXECUTED.claim_id);
        const trail = engine.getTrail(deterministic_trail_js_1.FIXTURE_SOURCE_EVENT.tx_hash);
        (0, vitest_1.expect)(trail.events.length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(trail.claims.length).toBeGreaterThanOrEqual(3);
        (0, vitest_1.expect)(trail.evidence.length).toBeGreaterThanOrEqual(2);
        (0, vitest_1.expect)(trail.dependencies.length).toBeGreaterThanOrEqual(2);
        (0, vitest_1.expect)(trail.auditHistory.length).toBeGreaterThanOrEqual(2);
    });
});
