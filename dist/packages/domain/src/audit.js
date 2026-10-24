"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppendOnlyAuditLog = void 0;
const node_crypto_1 = require("node:crypto");
const schemas_js_1 = require("./schemas.js");
/**
 * AppendOnlyAuditLog enforces:
 * 1. Strict append-only semantics (no updates or deletes).
 * 2. Cryptographic/hash chaining of consecutive events for tamper evidence.
 * 3. Immutable snapshots upon reading.
 */
class AppendOnlyAuditLog {
    events = [];
    claimEventsIndex = new Map();
    /**
     * Append a new transition event to the audit trail.
     */
    append(params) {
        const sequence = this.events.length;
        const timestamp = params.timestamp || new Date().toISOString();
        const auditId = `audit:${params.claimId}:${sequence}:${Date.now()}`;
        const prevHash = sequence === 0 ? 'GENESIS_ROOT' : this.events[sequence - 1].record_hash;
        const baseEvent = {
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
        (0, schemas_js_1.validateAuditEvent)(baseEvent);
        const recordHash = (0, node_crypto_1.createHash)('sha256')
            .update(JSON.stringify({
            sequence,
            prevHash,
            baseEvent
        }))
            .digest('hex');
        const chainedEvent = Object.freeze({
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
    getHistoryForClaim(claimId) {
        const indices = this.claimEventsIndex.get(claimId) || [];
        return Object.freeze(indices.map((idx) => this.events[idx]));
    }
    /**
     * Retrieve the complete audit trail. Returns an immutable copy.
     */
    getAllEvents() {
        return Object.freeze([...this.events]);
    }
    /**
     * Total number of audit records.
     */
    get count() {
        return this.events.length;
    }
    /**
     * Validates the cryptographic integrity of the entire audit chain.
     */
    verifyChainIntegrity() {
        for (let i = 0; i < this.events.length; i++) {
            const current = this.events[i];
            const expectedPrev = i === 0 ? 'GENESIS_ROOT' : this.events[i - 1].record_hash;
            if (current.prev_hash !== expectedPrev) {
                return false;
            }
            const { sequence, prev_hash, record_hash, ...baseEvent } = current;
            const computedHash = (0, node_crypto_1.createHash)('sha256')
                .update(JSON.stringify({
                sequence,
                prevHash: prev_hash,
                baseEvent
            }))
                .digest('hex');
            if (computedHash !== record_hash) {
                return false;
            }
        }
        return true;
    }
}
exports.AppendOnlyAuditLog = AppendOnlyAuditLog;
