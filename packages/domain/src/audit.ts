import { createHash } from 'node:crypto';
import { AuditEvent, ClaimStatus } from './types.js';
import { validateAuditEvent } from './schemas.js';

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
export class AppendOnlyAuditLog {
  private readonly events: ChainedAuditEvent[] = [];
  private readonly claimEventsIndex: Map<string, number[]> = new Map();

  /**
   * Append a new transition event to the audit trail.
   */
  public append(params: {
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
  }): ChainedAuditEvent {
    const sequence = this.events.length;
    const timestamp = params.timestamp || new Date().toISOString();
    const auditId = `audit:${params.claimId}:${sequence}:${Date.now()}`;
    const prevHash = sequence === 0 ? 'GENESIS_ROOT' : this.events[sequence - 1].record_hash;

    const baseEvent: AuditEvent = {
      audit_id: auditId,
      claim_id: params.claimId,
      previous_status: params.previousStatus,
      new_status: params.newStatus,
      triggering_dependency: params.triggeringDependency,
      reason_code: params.reasonCode,
      policy_version: params.policyVersion,
      timestamp,
      inputs_hash: params.inputsHash,
      details: params.details,
      aggregate_type: params.aggregateType,
      event_type: params.eventType,
      correlation_id: params.correlationId
    };

    validateAuditEvent(baseEvent);

    const recordHash = createHash('sha256')
      .update(
        JSON.stringify({
          sequence,
          prevHash,
          baseEvent
        })
      )
      .digest('hex');

    const chainedEvent: ChainedAuditEvent = Object.freeze({
      ...baseEvent,
      sequence,
      prev_hash: prevHash,
      record_hash: recordHash
    });

    this.events.push(chainedEvent);

    const indices = this.claimEventsIndex.get(params.claimId) || [];
    indices.push(sequence);
    this.claimEventsIndex.set(params.claimId, indices);

    return chainedEvent;
  }

  /**
   * Retrieve all audit events for a given claim. Returns an immutable copy.
   */
  public getHistoryForClaim(claimId: string): readonly ChainedAuditEvent[] {
    const indices = this.claimEventsIndex.get(claimId) || [];
    return Object.freeze(indices.map((idx) => this.events[idx]));
  }

  /**
   * Retrieve the complete audit trail. Returns an immutable copy.
   */
  public getAllEvents(): readonly ChainedAuditEvent[] {
    return Object.freeze([...this.events]);
  }

  /**
   * Total number of audit records.
   */
  public get count(): number {
    return this.events.length;
  }

  /**
   * Validates the cryptographic integrity of the entire audit chain.
   */
  public verifyChainIntegrity(): boolean {
    for (let i = 0; i < this.events.length; i++) {
      const current = this.events[i];
      const expectedPrev = i === 0 ? 'GENESIS_ROOT' : this.events[i - 1].record_hash;

      if (current.prev_hash !== expectedPrev) {
        return false;
      }

      const { sequence, prev_hash, record_hash, ...baseEvent } = current;
      const computedHash = createHash('sha256')
        .update(
          JSON.stringify({
            sequence,
            prevHash: prev_hash,
            baseEvent
          })
        )
        .digest('hex');

      if (computedHash !== record_hash) {
        return false;
      }
    }
    return true;
  }
}
