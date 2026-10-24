/**
 * ChainTrace Phase 1 Domain Types
 * Defines typed Event, Evidence, Claim, DependencyEdge, AuditEvent, and Repository schemas.
 */
export interface EventRecord {
    event_id: string;
    chain_id: number | string;
    tx_hash: string;
    block_number: number;
    block_hash: string;
    event_index: number;
    contract_address?: string;
    event_signature?: string;
    observed_at: string;
    payload?: Record<string, unknown>;
}
export type EvidenceType = 'RECEIPT_REFERENCE' | 'INCLUSION_PROOF' | 'AUTHENTICATED_HEADER' | 'FINALITY_CHECKPOINT' | 'MESSAGE_ATTESTATION' | (string & {});
export type EvidenceResult = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'NOT_CHECKED' | 'NOT_EVALUATED';
export interface EvidenceRecord {
    evidence_id: string;
    evidence_type: EvidenceType;
    subject_ref: string;
    content_hash: string;
    source_reference: string;
    verification_method: string;
    policy_version: string;
    result: EvidenceResult;
    checked_at: string;
    raw_data?: unknown;
    reason?: string;
}
export type ClaimType = 'EVENT_INCLUDED' | 'SOURCE_FINALIZED' | 'MESSAGE_MATCHED' | 'ATTESTATION_VALID' | 'DESTINATION_EXECUTED' | 'PATH_SUPPORTED' | (string & {});
export type ClaimStatus = 'UNVERIFIED' | 'VERIFIED' | 'REVALIDATION_REQUIRED' | 'INVALID' | 'INCONCLUSIVE';
export interface ClaimStatusReason {
    code: string;
    message: string;
}
export interface ClaimRecord {
    claim_id: string;
    claim_type: ClaimType;
    subject_refs: string[];
    status: ClaimStatus;
    policy_id: string;
    policy_version: string;
    created_at: string;
    updated_at: string;
    status_reason: ClaimStatusReason;
    last_verified_at?: string;
    metadata?: Record<string, unknown>;
    evidence_ids?: string[];
    prerequisite_claim_ids?: string[];
    version?: number;
}
export type ParentType = 'EVIDENCE' | 'CLAIM' | 'POLICY';
export type DependencyType = 'SUPPORTS' | 'AUTHENTICATES' | 'MATCHES' | 'FINALITY_GUARD' | 'POLICY_DEPENDENCY';
export interface DependencyEdge {
    dependency_id: string;
    parent_type: ParentType;
    parent_id: string;
    dependent_claim_id: string;
    dependency_type: DependencyType;
    required: boolean;
}
export type AuditAggregateType = 'CLAIM' | 'EVIDENCE' | 'DEPENDENCY' | 'POLICY';
export type AuditEventType = 'CLAIM_CREATED' | 'STATUS_CHANGED' | 'DEPENDENCY_ADDED' | 'DEPENDENCY_REMOVED' | 'POLICY_VERSION_CHANGED' | 'REVALIDATION_STARTED' | 'REVALIDATION_COMPLETED' | 'EVIDENCE_UPDATED';
export interface AuditEvent {
    audit_id: string;
    claim_id: string;
    previous_status: ClaimStatus;
    new_status: ClaimStatus;
    triggering_dependency?: string;
    reason_code: string;
    policy_version: string;
    timestamp: string;
    inputs_hash?: string;
    details?: string;
    aggregate_type?: AuditAggregateType;
    event_type?: AuditEventType;
    correlation_id?: string;
}
export interface VerificationPolicy {
    policy_id: string;
    policy_version: string;
    name: string;
    description: string;
}
export interface PolicyEvaluationInput {
    claim: ClaimRecord;
    dependencies: {
        edges: DependencyEdge[];
        parentClaims: Map<string, ClaimRecord>;
        parentEvidence: Map<string, EvidenceRecord>;
    };
    policyVersion: string;
}
export interface PolicyEvaluationResult {
    status: ClaimStatus;
    reason: ClaimStatusReason;
    inputsHash?: string;
}
/**
 * Repository Interfaces for Persistence Boundary (Section 1.7)
 */
export interface ClaimRepository {
    getById(id: string): Promise<ClaimRecord | undefined>;
    save(claim: ClaimRecord, expectedVersion?: number): Promise<void>;
    listByIds(ids: string[]): Promise<ClaimRecord[]>;
    listAll(): Promise<ClaimRecord[]>;
}
export interface DependencyRepository {
    add(edge: DependencyEdge): Promise<void>;
    remove(edgeId: string): Promise<boolean>;
    listOutgoing(parentId: string): Promise<DependencyEdge[]>;
    listIncoming(dependentId: string): Promise<DependencyEdge[]>;
    listAll(): Promise<DependencyEdge[]>;
}
export interface AuditRepository {
    append(event: AuditEvent): Promise<void>;
    listForAggregate(id: string): Promise<AuditEvent[]>;
    listAll(): Promise<AuditEvent[]>;
}
export interface EvidenceRepository {
    getById(id: string): Promise<EvidenceRecord | undefined>;
    save(evidence: EvidenceRecord): Promise<void>;
    listAll(): Promise<EvidenceRecord[]>;
}
