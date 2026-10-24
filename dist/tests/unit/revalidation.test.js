"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../../packages/domain/src/index.js");
const index_js_2 = require("../../packages/dependency-engine/src/index.js");
const index_js_3 = require("../../packages/verification/src/index.js");
const deterministic_trail_js_1 = require("../fixtures/deterministic-trail.js");
(0, vitest_1.describe)('DependencyEngine - Subtree Revalidation and Recovery', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new index_js_2.DependencyEngine();
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.EVENT_INCLUSION, index_js_3.evaluateEventInclusionPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.SOURCE_FINALITY, index_js_3.evaluateSourceFinalityPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.MESSAGE_MATCH, index_js_3.evaluateMessageMatchPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.DESTINATION_EXECUTION, index_js_3.evaluateDestinationExecutionPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.PATH_SUPPORT, index_js_3.evaluatePathSupportPolicy);
        // Setup standard trail
        engine.registerEvent(deterministic_trail_js_1.FIXTURE_SOURCE_EVENT);
        engine.registerEvent(deterministic_trail_js_1.FIXTURE_DEST_EVENT);
        engine.registerEvidence(deterministic_trail_js_1.FIXTURE_EVIDENCE_INCLUSION);
        engine.registerEvidence(deterministic_trail_js_1.FIXTURE_EVIDENCE_FINALITY);
        engine.registerEvidence(deterministic_trail_js_1.FIXTURE_EVIDENCE_ATTESTATION);
        engine.registerEvidence(deterministic_trail_js_1.FIXTURE_EVIDENCE_DEST_EXEC);
        engine.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED);
        engine.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED);
        engine.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH);
        engine.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_DEST_EXECUTED);
        engine.registerClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED);
        for (const edge of deterministic_trail_js_1.FIXTURE_DEPENDENCY_EDGES) {
            engine.addDependency(edge);
        }
    });
    (0, vitest_1.it)('re-evaluates affected subtree after temporary invalidation and restores VERIFIED status', async () => {
        // 1. Initial complete verification
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_DEST_EXECUTED.claim_id);
        await engine.evaluateClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id);
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id)?.status).toBe('VERIFIED');
        // 2. Invalidate finality checkpoint
        const updatedFinalityEv = {
            ...deterministic_trail_js_1.FIXTURE_EVIDENCE_FINALITY,
            result: 'INCONCLUSIVE'
        };
        engine.registerEvidence(updatedFinalityEv);
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id)?.status).toBe('REVALIDATION_REQUIRED');
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id)?.status).toBe('REVALIDATION_REQUIRED');
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id)?.status).toBe('REVALIDATION_REQUIRED');
        // Revalidate subtree while inconclusive
        await engine.revalidateSubtree(deterministic_trail_js_1.FIXTURE_EVIDENCE_FINALITY.evidence_id);
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id)?.status).toBe('INCONCLUSIVE');
        // 3. New valid finalized checkpoint is established
        const recoveredFinalityEv = {
            ...deterministic_trail_js_1.FIXTURE_EVIDENCE_FINALITY,
            content_hash: '0xNEW_CONFIRMED_FINAL_CHECKPOINT_HASH',
            result: 'PASS'
        };
        engine.registerEvidence(recoveredFinalityEv);
        // Revalidate full subtree
        const reevaluated = await engine.revalidateSubtree(deterministic_trail_js_1.FIXTURE_EVIDENCE_FINALITY.evidence_id);
        (0, vitest_1.expect)(reevaluated.length).toBeGreaterThanOrEqual(3);
        // Verify all restored to VERIFIED
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id)?.status).toBe('VERIFIED');
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id)?.status).toBe('VERIFIED');
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id)?.status).toBe('VERIFIED');
        // Verify destination execution claim remained continuously VERIFIED throughout
        (0, vitest_1.expect)(engine.getClaim(deterministic_trail_js_1.FIXTURE_CLAIM_DEST_EXECUTED.claim_id)?.status).toBe('VERIFIED');
    });
    (0, vitest_1.it)('proves audit trail integrity over 100 consecutive transitions', () => {
        const auditLog = new index_js_1.AppendOnlyAuditLog();
        const claimId = 'claim:stress-test';
        for (let i = 0; i < 100; i++) {
            auditLog.append({
                claimId,
                previousStatus: i % 2 === 0 ? 'UNVERIFIED' : 'VERIFIED',
                newStatus: i % 2 === 0 ? 'VERIFIED' : 'REVALIDATION_REQUIRED',
                reasonCode: `STEP_${i}`,
                policyVersion: '1.0.0',
                details: `Stress transition sequence #${i}`
            });
        }
        (0, vitest_1.expect)(auditLog.count).toBe(100);
        (0, vitest_1.expect)(auditLog.verifyChainIntegrity()).toBe(true);
        (0, vitest_1.expect)(auditLog.getHistoryForClaim(claimId).length).toBe(100);
    });
});
