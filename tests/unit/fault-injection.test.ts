import { describe, expect, it } from 'vitest';
import {
  DuplicateEdgeError,
  InMemoryClaimRepository,
  NotFoundError,
  PolicyNotFoundError,
  VersionConflictError
} from '../../packages/domain/src/index.js';
import { DependencyEngine } from '../../packages/dependency-engine/src/index.js';
import { POLICY_IDS } from '../../packages/verification/src/index.js';

describe('Phase 1 Fault-Injection & Negative Tests (Section 1.6 & 1.7)', () => {
  it('P1-08: Verifier exceptions / timeouts never leave a claim falsely VERIFIED', async () => {
    const engine = new DependencyEngine();
    const policyId = 'policy:crashing-verifier';

    // Register an evaluator that deliberately throws / times out
    engine.registerPolicyEvaluator(policyId, () => {
      throw new Error('RPC provider connection timed out or returned 500');
    });

    const claim = engine.registerClaim({
      claim_id: 'claim:timeout-test',
      claim_type: 'EVENT_INCLUDED',
      subject_refs: ['event:1'],
      status: 'UNVERIFIED',
      policy_id: policyId,
      policy_version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_reason: { code: 'INIT', message: 'Initial' },
      version: 1
    });

    const evaluated = await engine.evaluateClaim(claim.claim_id);

    // Must transition to INCONCLUSIVE with error details, NEVER VERIFIED!
    expect(evaluated.status).toBe('INCONCLUSIVE');
    expect(evaluated.status_reason.code).toBe('VERIFIER_EXCEPTION');
    expect(evaluated.status_reason.message).toContain('timed out');
    expect(evaluated.status).not.toBe('VERIFIED');
  });

  it('P1-02: Rejects edge to non-existent parent node with NotFoundError', () => {
    const engine = new DependencyEngine();

    engine.registerClaim({
      claim_id: 'claim:valid',
      claim_type: 'EVENT_INCLUDED',
      subject_refs: ['event:1'],
      status: 'UNVERIFIED',
      policy_id: POLICY_IDS.EVENT_INCLUSION,
      policy_version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_reason: { code: 'INIT', message: 'Initial' },
      version: 1
    });

    expect(() => {
      engine.addDependency({
        dependency_id: 'dep:missing->valid',
        parent_type: 'CLAIM',
        parent_id: 'claim:non-existent-parent',
        dependent_claim_id: 'claim:valid',
        dependency_type: 'SUPPORTS',
        required: true
      });
    }).toThrow(NotFoundError);
  });

  it('P1-02: Rejects duplicate edge when rejectDuplicate is set with DuplicateEdgeError', () => {
    const engine = new DependencyEngine();

    engine.registerClaim({
      claim_id: 'claim:c1',
      claim_type: 'EVENT_INCLUDED',
      subject_refs: ['event:1'],
      status: 'UNVERIFIED',
      policy_id: POLICY_IDS.EVENT_INCLUSION,
      policy_version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_reason: { code: 'INIT', message: 'Initial' },
      version: 1
    });

    engine.registerClaim({
      claim_id: 'claim:c2',
      claim_type: 'EVENT_INCLUDED',
      subject_refs: ['event:1'],
      status: 'UNVERIFIED',
      policy_id: POLICY_IDS.EVENT_INCLUSION,
      policy_version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_reason: { code: 'INIT', message: 'Initial' },
      version: 1
    });

    // Add first time
    engine.addDependency({
      dependency_id: 'dep:1',
      parent_type: 'CLAIM',
      parent_id: 'claim:c1',
      dependent_claim_id: 'claim:c2',
      dependency_type: 'SUPPORTS',
      required: true
    });

    // Add second time with rejectDuplicate option
    expect(() => {
      engine.addDependency(
        {
          dependency_id: 'dep:2',
          parent_type: 'CLAIM',
          parent_id: 'claim:c1',
          dependent_claim_id: 'claim:c2',
          dependency_type: 'SUPPORTS',
          required: true
        },
        { rejectDuplicate: true }
      );
    }).toThrow(DuplicateEdgeError);
  });

  it('Throws PolicyNotFoundError when claim has unregistered policy ID', async () => {
    const engine = new DependencyEngine();

    const claim = engine.registerClaim({
      claim_id: 'claim:unregistered-policy',
      claim_type: 'EVENT_INCLUDED',
      subject_refs: ['event:1'],
      status: 'UNVERIFIED',
      policy_id: 'policy:unknown-custom-policy',
      policy_version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_reason: { code: 'INIT', message: 'Initial' },
      version: 1
    });

    await expect(engine.evaluateClaim(claim.claim_id)).rejects.toThrow(
      PolicyNotFoundError
    );
  });

  it('Optimistic concurrency: VersionConflictError on stale claim save', async () => {
    const repo = new InMemoryClaimRepository();

    const claim = {
      claim_id: 'claim:concurrent-test',
      claim_type: 'EVENT_INCLUDED',
      subject_refs: ['event:1'],
      status: 'UNVERIFIED' as const,
      policy_id: 'policy:test',
      policy_version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_reason: { code: 'INIT', message: 'Initial' },
      version: 1
    };

    await repo.save(claim);

    // Save with correct expected version 1 succeeds
    await repo.save({ ...claim, status: 'VERIFIED' }, 1);

    // Current version in repo is now 2. Attempting to save with stale expected version 1 fails!
    await expect(
      repo.save({ ...claim, status: 'INVALID' }, 1)
    ).rejects.toThrow(VersionConflictError);
  });
});
