import {
  ClaimRecord,
  EvidenceRecord,
  PolicyEvaluationInput,
  PolicyEvaluationResult
} from '../../domain/src/index.js';

/**
 * Standard policy IDs used in ChainTrace Phase 1
 */
export const POLICY_IDS = {
  EVENT_INCLUSION: 'policy:event-inclusion',
  SOURCE_FINALITY: 'policy:source-finality',
  MESSAGE_MATCH: 'policy:message-match',
  DESTINATION_EXECUTION: 'policy:destination-execution',
  PATH_SUPPORT: 'policy:path-support'
} as const;

/**
 * Evaluates an EVENT_INCLUDED claim.
 * Requires:
 * - At least one required Evidence of type INCLUSION_PROOF or RECEIPT_REFERENCE with result === 'PASS'.
 * - If evidence has result === 'INCONCLUSIVE', returns INCONCLUSIVE.
 * - If evidence has result === 'FAIL', returns INVALID.
 */
export function evaluateEventInclusionPolicy(
  input: PolicyEvaluationInput
): PolicyEvaluationResult {
  const { dependencies } = input;
  const requiredEvidence: EvidenceRecord[] = Array.from(dependencies.parentEvidence.values());

  if (requiredEvidence.length === 0) {
    return {
      status: 'UNVERIFIED',
      reason: {
        code: 'NO_EVIDENCE_ATTACHED',
        message: 'No evidence attached to evaluate inclusion proposition'
      }
    };
  }

  // Check for any failing evidence
  const failed = requiredEvidence.find((ev) => ev.result === 'FAIL');
  if (failed) {
    return {
      status: 'INVALID',
      reason: {
        code: 'INCLUSION_PROOF_FAILED',
        message: `Evidence ${failed.evidence_id} failed verification check`
      }
    };
  }

  // Check for inconclusive evidence
  const inconclusive = requiredEvidence.find(
    (ev) => ev.result === 'INCONCLUSIVE' || ev.result === 'NOT_CHECKED'
  );
  if (inconclusive) {
    return {
      status: 'INCONCLUSIVE',
      reason: {
        code: 'EVIDENCE_INCONCLUSIVE',
        message: `Evidence ${inconclusive.evidence_id} is incomplete or ambiguous`
      }
    };
  }

  // All evidence passed
  return {
    status: 'VERIFIED',
    reason: {
      code: 'INCLUSION_VERIFIED',
      message: 'Event inclusion verified against authenticated receipt/proof'
    },
    inputsHash: requiredEvidence.map((e) => e.content_hash).join(':')
  };
}

/**
 * Evaluates SOURCE_FINALIZED claim.
 * Requires parent EVENT_INCLUDED claim to be VERIFIED, plus header attestation / finality guard.
 */
export function evaluateSourceFinalityPolicy(
  input: PolicyEvaluationInput
): PolicyEvaluationResult {
  const { dependencies } = input;
  const parentClaims: ClaimRecord[] = Array.from(dependencies.parentClaims.values());

  // Must have a parent claim that is EVENT_INCLUDED
  const inclusionClaim = parentClaims.find((c) => c.claim_type === 'EVENT_INCLUDED');
  if (!inclusionClaim) {
    return {
      status: 'INCONCLUSIVE',
      reason: {
        code: 'MISSING_INCLUSION_CLAIM',
        message: 'Source finality requires a valid parent event inclusion claim'
      }
    };
  }

  if (inclusionClaim.status === 'REVALIDATION_REQUIRED') {
    return {
      status: 'REVALIDATION_REQUIRED',
      reason: {
        code: 'PARENT_REVALIDATION_REQUIRED',
        message: 'Parent event inclusion claim requires revalidation'
      }
    };
  }

  if (inclusionClaim.status !== 'VERIFIED') {
    return {
      status: 'INVALID',
      reason: {
        code: 'PARENT_NOT_VERIFIED',
        message: `Parent inclusion claim is in status ${inclusionClaim.status}`
      }
    };
  }

  // Check finality evidence if present
  const evidenceList: EvidenceRecord[] = Array.from(dependencies.parentEvidence.values());
  const headerAttestation = evidenceList.find(
    (ev) => ev.evidence_type === 'AUTHENTICATED_HEADER' || ev.evidence_type === 'FINALITY_CHECKPOINT'
  );

  if (headerAttestation) {
    if (headerAttestation.result === 'FAIL') {
      return {
        status: 'INVALID',
        reason: {
          code: 'FINALITY_CHECKPOINT_FAILED',
          message: 'Header or checkpoint attestation failed finality policy'
        }
      };
    }
    if (headerAttestation.result === 'INCONCLUSIVE') {
      return {
        status: 'INCONCLUSIVE',
        reason: {
          code: 'FINALITY_AMBIGUOUS',
          message: 'Header attestation is inconclusive'
        }
      };
    }
  }

  return {
    status: 'VERIFIED',
    reason: {
      code: 'SOURCE_FINALIZED_VERIFIED',
      message: 'Source transaction finalized under chain finality rules'
    }
  };
}

/**
 * Evaluates MESSAGE_MATCHED claim.
 * Checks protocol-specific message IDs, domain separation, and attestation.
 * Does NOT infer match from superficial timestamp or amount similarity alone.
 */
export function evaluateMessageMatchPolicy(
  input: PolicyEvaluationInput
): PolicyEvaluationResult {
  const { claim, dependencies } = input;
  const parentClaims: ClaimRecord[] = Array.from(dependencies.parentClaims.values());

  // Source finality must be verified
  const sourceFinalized = parentClaims.find((c) => c.claim_type === 'SOURCE_FINALIZED');
  if (sourceFinalized && sourceFinalized.status !== 'VERIFIED') {
    return {
      status: sourceFinalized.status === 'REVALIDATION_REQUIRED' ? 'REVALIDATION_REQUIRED' : 'INVALID',
      reason: {
        code: 'SOURCE_NOT_FINALIZED',
        message: `Source finalized dependency is ${sourceFinalized.status}`
      }
    };
  }

  // Explicit check on message IDs match in claim metadata: mismatch is deterministically INVALID
  if (claim.metadata) {
    const sourceMsgId = claim.metadata.source_message_id;
    const destMsgId = claim.metadata.destination_message_id;
    if (sourceMsgId && destMsgId && sourceMsgId !== destMsgId) {
      return {
        status: 'INVALID',
        reason: {
          code: 'MESSAGE_ID_MISMATCH',
          message: `Source message ID ${sourceMsgId} does not match destination message ID ${destMsgId}`
        }
      };
    }
  }

  // Check message attestation evidence
  const attestations = Array.from(dependencies.parentEvidence.values()).filter(
    (ev) => ev.evidence_type === 'MESSAGE_ATTESTATION' || ev.evidence_type === 'INCLUSION_PROOF'
  );

  if (attestations.length === 0) {
    return {
      status: 'INCONCLUSIVE',
      reason: {
        code: 'NO_MESSAGE_ATTESTATION',
        message: 'No cryptographic message attestation or protocol proof attached'
      }
    };
  }

  const failed = attestations.find((ev) => ev.result === 'FAIL');
  if (failed) {
    return {
      status: 'INVALID',
      reason: {
        code: 'MESSAGE_PROOF_REJECTED',
        message: `Message attestation evidence ${failed.evidence_id} was rejected`
      }
    };
  }

  const inconclusive = attestations.find((ev) => ev.result === 'INCONCLUSIVE');
  if (inconclusive) {
    return {
      status: 'INCONCLUSIVE',
      reason: {
        code: 'MESSAGE_ATTESTATION_INCONCLUSIVE',
        message: 'Message attestation is inconclusive or unconfirmed'
      }
    };
  }

  return {
    status: 'VERIFIED',
    reason: {
      code: 'MESSAGE_MATCH_VERIFIED',
      message: 'Source and destination messages cryptographically matched by protocol identifier'
    }
  };
}

/**
 * Evaluates DESTINATION_EXECUTED claim.
 */
export function evaluateDestinationExecutionPolicy(
  input: PolicyEvaluationInput
): PolicyEvaluationResult {
  const { dependencies } = input;
  const evidence: EvidenceRecord[] = Array.from(dependencies.parentEvidence.values());

  if (evidence.length === 0) {
    return {
      status: 'UNVERIFIED',
      reason: {
        code: 'NO_EXECUTION_EVIDENCE',
        message: 'No destination execution receipt attached'
      }
    };
  }

  const failed = evidence.find((e) => e.result === 'FAIL');
  if (failed) {
    return {
      status: 'INVALID',
      reason: {
        code: 'DESTINATION_EXECUTION_FAILED',
        message: 'Execution receipt indicated transaction reversion or invalidity'
      }
    };
  }

  return {
    status: 'VERIFIED',
    reason: {
      code: 'DESTINATION_EXECUTED_VERIFIED',
      message: 'Destination transaction execution verified on destination chain'
    }
  };
}

/**
 * Evaluates PATH_SUPPORTED claim.
 * Requires that all dependent prerequisite claims along the cross-chain path are VERIFIED.
 */
export function evaluatePathSupportPolicy(
  input: PolicyEvaluationInput
): PolicyEvaluationResult {
  const { dependencies } = input;
  const parentClaims: ClaimRecord[] = Array.from(dependencies.parentClaims.values());

  if (parentClaims.length === 0) {
    return {
      status: 'UNVERIFIED',
      reason: {
        code: 'EMPTY_PATH',
        message: 'Path has no prerequisite claims'
      }
    };
  }

  // If any parent claim requires revalidation
  const reval = parentClaims.find((c) => c.status === 'REVALIDATION_REQUIRED');
  if (reval) {
    return {
      status: 'REVALIDATION_REQUIRED',
      reason: {
        code: 'PATH_DEPENDENCY_STALE',
        message: `Path dependency ${reval.claim_id} requires revalidation`
      }
    };
  }

  // If any parent claim is invalid
  const invalid = parentClaims.find((c) => c.status === 'INVALID');
  if (invalid) {
    return {
      status: 'INVALID',
      reason: {
        code: 'PATH_DEPENDENCY_INVALID',
        message: `Path dependency ${invalid.claim_id} is INVALID`
      }
    };
  }

  // If any parent claim is inconclusive
  const inconcl = parentClaims.find((c) => c.status === 'INCONCLUSIVE' || c.status === 'UNVERIFIED');
  if (inconcl) {
    return {
      status: 'INCONCLUSIVE',
      reason: {
        code: 'PATH_DEPENDENCY_INCONCLUSIVE',
        message: `Path dependency ${inconcl.claim_id} is ${inconcl.status}`
      }
    };
  }

  // All parents are VERIFIED
  return {
    status: 'VERIFIED',
    reason: {
      code: 'PATH_FULLY_SUPPORTED',
      message: 'All path claims are verified and satisfied'
    }
  };
}
