import { describe, expect, it, beforeEach } from 'vitest';
import { AppendOnlyAuditLog } from '../../packages/domain/src/index.js';
import { DependencyEngine } from '../../packages/dependency-engine/src/index.js';
import { evaluateDestinationExecutionPolicy, evaluateEventInclusionPolicy, evaluateMessageMatchPolicy, evaluatePathSupportPolicy, evaluateSourceFinalityPolicy, POLICY_IDS } from '../../packages/verification/src/index.js';
import { FIXTURE_CLAIM_DEST_EXECUTED, FIXTURE_CLAIM_MESSAGE_MATCH, FIXTURE_CLAIM_PATH_SUPPORTED, FIXTURE_CLAIM_SOURCE_FINALIZED, FIXTURE_CLAIM_SOURCE_INCLUDED, FIXTURE_DEST_EVENT, FIXTURE_DEPENDENCY_EDGES, FIXTURE_EVIDENCE_ATTESTATION, FIXTURE_EVIDENCE_DEST_EXEC, FIXTURE_EVIDENCE_FINALITY, FIXTURE_EVIDENCE_INCLUSION, FIXTURE_SOURCE_EVENT } from '../fixtures/deterministic-trail.js';
describe('DependencyEngine - Subtree Revalidation and Recovery', () => {
    let engine;
    beforeEach(() => {
        engine = new DependencyEngine();
        engine.registerPolicyEvaluator(POLICY_IDS.EVENT_INCLUSION, evaluateEventInclusionPolicy);
        engine.registerPolicyEvaluator(POLICY_IDS.SOURCE_FINALITY, evaluateSourceFinalityPolicy);
        engine.registerPolicyEvaluator(POLICY_IDS.MESSAGE_MATCH, evaluateMessageMatchPolicy);
        engine.registerPolicyEvaluator(POLICY_IDS.DESTINATION_EXECUTION, evaluateDestinationExecutionPolicy);
        engine.registerPolicyEvaluator(POLICY_IDS.PATH_SUPPORT, evaluatePathSupportPolicy);
        // Setup standard trail
        engine.registerEvent(FIXTURE_SOURCE_EVENT);
        engine.registerEvent(FIXTURE_DEST_EVENT);
        engine.registerEvidence(FIXTURE_EVIDENCE_INCLUSION);
        engine.registerEvidence(FIXTURE_EVIDENCE_FINALITY);
        engine.registerEvidence(FIXTURE_EVIDENCE_ATTESTATION);
        engine.registerEvidence(FIXTURE_EVIDENCE_DEST_EXEC);
        engine.registerClaim(FIXTURE_CLAIM_SOURCE_INCLUDED);
        engine.registerClaim(FIXTURE_CLAIM_SOURCE_FINALIZED);
        engine.registerClaim(FIXTURE_CLAIM_MESSAGE_MATCH);
        engine.registerClaim(FIXTURE_CLAIM_DEST_EXECUTED);
        engine.registerClaim(FIXTURE_CLAIM_PATH_SUPPORTED);
        for (const edge of FIXTURE_DEPENDENCY_EDGES) {
            engine.addDependency(edge);
        }
    });
    it('re-evaluates affected subtree after temporary invalidation and restores VERIFIED status', async () => {
        // 1. Initial complete verification
        await engine.evaluateClaim(FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id);
        await engine.evaluateClaim(FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id);
        await engine.evaluateClaim(FIXTURE_CLAIM_MESSAGE_MATCH.claim_id);
        await engine.evaluateClaim(FIXTURE_CLAIM_DEST_EXECUTED.claim_id);
        await engine.evaluateClaim(FIXTURE_CLAIM_PATH_SUPPORTED.claim_id);
        expect(engine.getClaim(FIXTURE_CLAIM_PATH_SUPPORTED.claim_id)?.status).toBe('VERIFIED');
        // 2. Invalidate finality checkpoint
        const updatedFinalityEv = {
            ...FIXTURE_EVIDENCE_FINALITY,
            result: 'INCONCLUSIVE'
        };
        engine.registerEvidence(updatedFinalityEv);
        expect(engine.getClaim(FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id)?.status).toBe('REVALIDATION_REQUIRED');
        expect(engine.getClaim(FIXTURE_CLAIM_MESSAGE_MATCH.claim_id)?.status).toBe('REVALIDATION_REQUIRED');
        expect(engine.getClaim(FIXTURE_CLAIM_PATH_SUPPORTED.claim_id)?.status).toBe('REVALIDATION_REQUIRED');
        // Revalidate subtree while inconclusive
        await engine.revalidateSubtree(FIXTURE_EVIDENCE_FINALITY.evidence_id);
        expect(engine.getClaim(FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id)?.status).toBe('INCONCLUSIVE');
        // 3. New valid finalized checkpoint is established
        const recoveredFinalityEv = {
            ...FIXTURE_EVIDENCE_FINALITY,
            content_hash: '0xNEW_CONFIRMED_FINAL_CHECKPOINT_HASH',
            result: 'PASS'
        };
        engine.registerEvidence(recoveredFinalityEv);
        // Revalidate full subtree
        const reevaluated = await engine.revalidateSubtree(FIXTURE_EVIDENCE_FINALITY.evidence_id);
        expect(reevaluated.length).toBeGreaterThanOrEqual(3);
        // Verify all restored to VERIFIED
        expect(engine.getClaim(FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id)?.status).toBe('VERIFIED');
        expect(engine.getClaim(FIXTURE_CLAIM_MESSAGE_MATCH.claim_id)?.status).toBe('VERIFIED');
        expect(engine.getClaim(FIXTURE_CLAIM_PATH_SUPPORTED.claim_id)?.status).toBe('VERIFIED');
        // Verify destination execution claim remained continuously VERIFIED throughout
        expect(engine.getClaim(FIXTURE_CLAIM_DEST_EXECUTED.claim_id)?.status).toBe('VERIFIED');
    });
    it('proves audit trail integrity over 100 consecutive transitions', () => {
        const auditLog = new AppendOnlyAuditLog();
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
        expect(auditLog.count).toBe(100);
        expect(auditLog.verifyChainIntegrity()).toBe(true);
        expect(auditLog.getHistoryForClaim(claimId).length).toBe(100);
    });
});
