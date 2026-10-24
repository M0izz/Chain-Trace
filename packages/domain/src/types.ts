/**
 * ChainTrace Phase 1 Domain Types
 * Defines typed Event, Evidence, Claim, DependencyEdge, AuditEvent, and Repository schemas.
 */

export interface EventRecord {
  event_id: string; // Deterministic internal ID
  chain_id: number | string; // Canonical chain identifier
  tx_hash: string; // Transaction hash
  block_number: number; // Block height at observation
  block_hash: string; // Observed block hash
  event_index: number; // Receipt log index or protocol-specific index
  contract_address?: string; // Emitting contract, when applicable
  event_signature?: string; // Event topic/signature, when applicable
  observed_at: string; // ISO 8601 timestamp of observation
  payload?: Record<string, unknown>; // Protocol event data/parameters
}

export type EvidenceType =
  | 'RECEIPT_REFERENCE'
  | 'INCLUSION_PROOF'
  | 'AUTHENTICATED_HEADER'
  | 'FINALITY_CHECKPOINT'
  | 'MESSAGE_ATTESTATION'
  | (string & {});

export type EvidenceResult =
  | 'PASS'
  | 'FAIL'
  | 'INCONCLUSIVE'
  | 'NOT_CHECKED'
  | 'NOT_EVALUATED';

export interface EvidenceRecord {
  evidence_id: string; // Stable identifier
  evidence_type: EvidenceType;
  subject_ref: string; // Event or claim the evidence concerns
  content_hash: string; // Hash of canonical evidence bytes/representation
  source_reference: string; // URI or locator for retrieving evidence
  verification_method: string; // Named verifier/policy family
  policy_version: string; // Exact version used for evaluation
  result: EvidenceResult;
  checked_at: string; // Evaluation timestamp (ISO 8601)
  raw_data?: unknown; // Optional raw evidence payload
  reason?: string; // Explanation for failure or inconclusive cases
}

export type ClaimType =
  | 'EVENT_INCLUDED'
  | 'SOURCE_FINALIZED'
  | 'MESSAGE_MATCHED'
  | 'ATTESTATION_VALID'
  | 'DESTINATION_EXECUTED'
  | 'PATH_SUPPORTED'
  | (string & {});

export type ClaimStatus =
  | 'UNVERIFIED'
  | 'VERIFIED'
  | 'REVALIDATION_REQUIRED'
  | 'INVALID'
  | 'INCONCLUSIVE';

export interface ClaimStatusReason {
  code: string;
  message: string;
}

export interface ClaimRecord {
  claim_id: string; // Stable claim identifier
  claim_type: ClaimType;
  subject_refs: string[]; // Events/evidence referenced by the proposition
  status: ClaimStatus;
  policy_id: string;
  policy_version: string; // Rule set that evaluated the claim
  created_at: string;
  updated_at: string;
  status_reason: ClaimStatusReason;
  last_verified_at?: string;
  metadata?: Record<string, unknown>;
  evidence_ids?: string[]; // Supporting or contradictory evidence IDs
  prerequisite_claim_ids?: string[]; // Direct prerequisite claims
  version?: number; // Monotonic record version for optimistic concurrency & stale-write protection
}

export type ParentType = 'EVIDENCE' | 'CLAIM' | 'POLICY';

export type DependencyType =
  | 'SUPPORTS'
  | 'AUTHENTICATES'
  | 'MATCHES'
  | 'FINALITY_GUARD'
  | 'POLICY_DEPENDENCY';

export interface DependencyEdge {
  dependency_id: string; // Stable ID
  parent_type: ParentType;
  parent_id: string; // Evidence, claim, or policy identifier
  dependent_claim_id: string; // Claim that relies on the parent
  dependency_type: DependencyType;
  required: boolean; // Whether satisfaction is required for dependent verification
}

export type AuditAggregateType = 'CLAIM' | 'EVIDENCE' | 'DEPENDENCY' | 'POLICY';

export type AuditEventType =
  | 'CLAIM_CREATED'
  | 'STATUS_CHANGED'
  | 'DEPENDENCY_ADDED'
  | 'DEPENDENCY_REMOVED'
  | 'POLICY_VERSION_CHANGED'
  | 'REVALIDATION_STARTED'
  | 'REVALIDATION_COMPLETED'
  | 'EVIDENCE_UPDATED';

export interface AuditEvent {
  audit_id: string; // Unique transition ID (auditEventId)
  claim_id: string; // aggregateId when aggregateType === 'CLAIM'
  previous_status: ClaimStatus;
  new_status: ClaimStatus;
  triggering_dependency?: string; // triggerEventId
  reason_code: string;
  policy_version: string;
  timestamp: string; // ISO 8601 UTC timestamp
  inputs_hash?: string; // Digest of evaluation inputs
  details?: string; // reasonText
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
