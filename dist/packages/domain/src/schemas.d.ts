import { ClaimRecord, ClaimStatus, DependencyEdge, EventRecord, EvidenceRecord, AuditEvent } from './types.js';
export declare class DomainValidationError extends Error {
    constructor(message: string);
}
/**
 * Generate a deterministic event ID from canonical attributes.
 */
export declare function generateEventId(chainId: number | string, txHash: string, eventIndex: number): string;
/**
 * Validates an EventRecord against mandatory constraints.
 */
export declare function validateEventRecord(event: EventRecord): void;
/**
 * Validates an EvidenceRecord.
 */
export declare function validateEvidenceRecord(evidence: EvidenceRecord): void;
/**
 * Validates a ClaimRecord and required invariants.
 */
export declare function validateClaimRecord(claim: ClaimRecord): void;
/**
 * Validates a DependencyEdge.
 */
export declare function validateDependencyEdge(edge: DependencyEdge): void;
/**
 * Validates allowed status transitions according to the state machine in Section 6.
 */
export declare function isValidStatusTransition(prev: ClaimStatus, next: ClaimStatus): boolean;
/**
 * Validates an AuditEvent.
 */
export declare function validateAuditEvent(event: AuditEvent): void;
