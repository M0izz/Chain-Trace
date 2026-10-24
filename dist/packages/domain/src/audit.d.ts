import { AuditEvent, ClaimStatus } from './types.js';
export interface ChainedAuditEvent extends AuditEvent {
    sequence: number;
    prev_hash: string;
    record_hash: string;
}
/**
 * AppendOnlyAuditLog enforces:
 * 1. Strict append-only semantics (no updates or deletes).
 * 2. Cryptographic/hash chaining of consecutive events for tamper evidence.
 * 3. Immutable snapshots upon reading.
 */
export declare class AppendOnlyAuditLog {
    private readonly events;
    private readonly claimEventsIndex;
    /**
     * Append a new transition event to the audit trail.
     */
    append(params: {
        claimId: string;
        previousStatus: ClaimStatus;
        newStatus: ClaimStatus;
        reasonCode: string;
        policyVersion: string;
        triggeringDependency?: string;
        inputsHash?: string;
        details?: string;
        timestamp?: string;
        aggregateType?: import('./types.js').AuditAggregateType;
        eventType?: import('./types.js').AuditEventType;
        correlationId?: string;
    }): ChainedAuditEvent;
    /**
     * Retrieve all audit events for a given claim. Returns an immutable copy.
     */
    getHistoryForClaim(claimId: string): readonly ChainedAuditEvent[];
    /**
     * Retrieve the complete audit trail. Returns an immutable copy.
     */
    getAllEvents(): readonly ChainedAuditEvent[];
    /**
     * Total number of audit records.
     */
    get count(): number;
    /**
     * Validates the cryptographic integrity of the entire audit chain.
     */
    verifyChainIntegrity(): boolean;
}
