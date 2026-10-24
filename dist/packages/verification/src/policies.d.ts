import { PolicyEvaluationInput, PolicyEvaluationResult } from '../../domain/src/index.js';
/**
 * Standard policy IDs used in ChainTrace Phase 1
 */
export declare const POLICY_IDS: {
    readonly EVENT_INCLUSION: "policy:event-inclusion";
    readonly SOURCE_FINALITY: "policy:source-finality";
    readonly MESSAGE_MATCH: "policy:message-match";
    readonly DESTINATION_EXECUTION: "policy:destination-execution";
    readonly PATH_SUPPORT: "policy:path-support";
};
/**
 * Evaluates an EVENT_INCLUDED claim.
 * Requires:
 * - At least one required Evidence of type INCLUSION_PROOF or RECEIPT_REFERENCE with result === 'PASS'.
 * - If evidence has result === 'INCONCLUSIVE', returns INCONCLUSIVE.
 * - If evidence has result === 'FAIL', returns INVALID.
 */
export declare function evaluateEventInclusionPolicy(input: PolicyEvaluationInput): PolicyEvaluationResult;
/**
 * Evaluates SOURCE_FINALIZED claim.
 * Requires parent EVENT_INCLUDED claim to be VERIFIED, plus header attestation / finality guard.
 */
export declare function evaluateSourceFinalityPolicy(input: PolicyEvaluationInput): PolicyEvaluationResult;
/**
 * Evaluates MESSAGE_MATCHED claim.
 * Checks protocol-specific message IDs, domain separation, and attestation.
 * Does NOT infer match from superficial timestamp or amount similarity alone.
 */
export declare function evaluateMessageMatchPolicy(input: PolicyEvaluationInput): PolicyEvaluationResult;
/**
 * Evaluates DESTINATION_EXECUTED claim.
 */
export declare function evaluateDestinationExecutionPolicy(input: PolicyEvaluationInput): PolicyEvaluationResult;
/**
 * Evaluates PATH_SUPPORTED claim.
 * Requires that all dependent prerequisite claims along the cross-chain path are VERIFIED.
 */
export declare function evaluatePathSupportPolicy(input: PolicyEvaluationInput): PolicyEvaluationResult;
