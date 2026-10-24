export class DomainValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DomainValidationError';
    }
}
/**
 * Generate a deterministic event ID from canonical attributes.
 */
export function generateEventId(chainId, txHash, eventIndex) {
    const normTx = txHash.toLowerCase().trim();
    return `event:${chainId}:${normTx}:${eventIndex}`;
}
/**
 * Validates an EventRecord against mandatory constraints.
 */
export function validateEventRecord(event) {
    if (!event.event_id || typeof event.event_id !== 'string') {
        throw new DomainValidationError('event_id must be a non-empty string');
    }
    if (event.chain_id === undefined || event.chain_id === null || event.chain_id === '') {
        throw new DomainValidationError('chain_id is required');
    }
    if (!event.tx_hash || typeof event.tx_hash !== 'string') {
        throw new DomainValidationError('tx_hash must be a valid transaction hash string');
    }
    if (typeof event.block_number !== 'number' || event.block_number < 0) {
        throw new DomainValidationError('block_number must be a non-negative number');
    }
    if (!event.block_hash || typeof event.block_hash !== 'string') {
        throw new DomainValidationError('block_hash must be a non-empty string');
    }
    if (typeof event.event_index !== 'number' || event.event_index < 0) {
        throw new DomainValidationError('event_index must be a non-negative integer');
    }
    if (!event.observed_at || isNaN(Date.parse(event.observed_at))) {
        throw new DomainValidationError('observed_at must be a valid ISO timestamp');
    }
}
/**
 * Validates an EvidenceRecord.
 */
export function validateEvidenceRecord(evidence) {
    if (!evidence.evidence_id || typeof evidence.evidence_id !== 'string') {
        throw new DomainValidationError('evidence_id must be a non-empty string');
    }
    if (!evidence.evidence_type || typeof evidence.evidence_type !== 'string') {
        throw new DomainValidationError('evidence_type must be a non-empty string');
    }
    if (!evidence.subject_ref || typeof evidence.subject_ref !== 'string') {
        throw new DomainValidationError('subject_ref must be a non-empty string referencing an event or claim');
    }
    if (!evidence.content_hash || typeof evidence.content_hash !== 'string') {
        throw new DomainValidationError('content_hash must be provided');
    }
    if (!['PASS', 'FAIL', 'INCONCLUSIVE', 'NOT_CHECKED'].includes(evidence.result)) {
        throw new DomainValidationError(`Invalid evidence result: ${evidence.result}`);
    }
    if (!evidence.checked_at || isNaN(Date.parse(evidence.checked_at))) {
        throw new DomainValidationError('checked_at must be a valid ISO timestamp');
    }
}
/**
 * Validates a ClaimRecord and required invariants.
 */
export function validateClaimRecord(claim) {
    if (!claim.claim_id || typeof claim.claim_id !== 'string') {
        throw new DomainValidationError('claim_id must be a non-empty string');
    }
    if (!claim.claim_type || typeof claim.claim_type !== 'string') {
        throw new DomainValidationError('claim_type must be a non-empty string');
    }
    if (!Array.isArray(claim.subject_refs)) {
        throw new DomainValidationError('subject_refs must be an array of strings');
    }
    const validStatuses = [
        'UNVERIFIED',
        'VERIFIED',
        'REVALIDATION_REQUIRED',
        'INVALID',
        'INCONCLUSIVE'
    ];
    if (!validStatuses.includes(claim.status)) {
        throw new DomainValidationError(`Invalid claim status: ${claim.status}`);
    }
    if (!claim.policy_id || typeof claim.policy_id !== 'string') {
        throw new DomainValidationError('policy_id is required');
    }
    if (!claim.policy_version || typeof claim.policy_version !== 'string') {
        throw new DomainValidationError('policy_version is required');
    }
    if (!claim.status_reason || !claim.status_reason.code) {
        throw new DomainValidationError('status_reason with code and message is required');
    }
}
/**
 * Validates a DependencyEdge.
 */
export function validateDependencyEdge(edge) {
    if (!edge.dependency_id || typeof edge.dependency_id !== 'string') {
        throw new DomainValidationError('dependency_id must be a non-empty string');
    }
    if (!['EVIDENCE', 'CLAIM', 'POLICY'].includes(edge.parent_type)) {
        throw new DomainValidationError(`Invalid parent_type: ${edge.parent_type}`);
    }
    if (!edge.parent_id || typeof edge.parent_id !== 'string') {
        throw new DomainValidationError('parent_id must be a non-empty string');
    }
    if (!edge.dependent_claim_id || typeof edge.dependent_claim_id !== 'string') {
        throw new DomainValidationError('dependent_claim_id must be a non-empty string');
    }
    const validDepTypes = [
        'SUPPORTS',
        'AUTHENTICATES',
        'MATCHES',
        'FINALITY_GUARD',
        'POLICY_DEPENDENCY'
    ];
    if (!validDepTypes.includes(edge.dependency_type)) {
        throw new DomainValidationError(`Invalid dependency_type: ${edge.dependency_type}`);
    }
}
/**
 * Validates allowed status transitions according to the state machine in Section 6.
 */
export function isValidStatusTransition(prev, next) {
    if (prev === next) {
        return true; // Idempotent same-status is allowed
    }
    switch (prev) {
        case 'UNVERIFIED':
            return next === 'VERIFIED' || next === 'INCONCLUSIVE' || next === 'INVALID';
        case 'VERIFIED':
            return (next === 'REVALIDATION_REQUIRED' ||
                next === 'INVALID' ||
                next === 'INCONCLUSIVE');
        case 'REVALIDATION_REQUIRED':
            return next === 'VERIFIED' || next === 'INVALID' || next === 'INCONCLUSIVE';
        case 'INVALID':
            return next === 'REVALIDATION_REQUIRED' || next === 'INCONCLUSIVE' || next === 'VERIFIED';
        case 'INCONCLUSIVE':
            return (next === 'VERIFIED' ||
                next === 'INVALID' ||
                next === 'REVALIDATION_REQUIRED');
        default:
            return false;
    }
}
/**
 * Validates an AuditEvent.
 */
export function validateAuditEvent(event) {
    if (!event.audit_id || typeof event.audit_id !== 'string') {
        throw new DomainValidationError('audit_id must be a non-empty string');
    }
    if (!event.claim_id || typeof event.claim_id !== 'string') {
        throw new DomainValidationError('claim_id is required');
    }
    if (!event.reason_code || typeof event.reason_code !== 'string') {
        throw new DomainValidationError('reason_code is required');
    }
    if (!event.timestamp || isNaN(Date.parse(event.timestamp))) {
        throw new DomainValidationError('timestamp must be a valid ISO date');
    }
}
