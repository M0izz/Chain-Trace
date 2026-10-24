import { ChainedAuditEvent, ClaimRecord, DependencyEdge, EventRecord, EvidenceRecord, PolicyEvaluationInput, PolicyEvaluationResult } from '../../domain/src/index.js';
export { CycleDetectedError, DuplicateEdgeError } from './dag.js';
export interface PropagationResult {
    dependencyId: string;
    changeReason: string;
    affectedClaimIds: string[];
    affectedCount: number;
    durationMs: number;
    auditEventsCreated: number;
    isDuplicateTrigger: boolean;
}
export type PolicyEvaluatorFn = (input: PolicyEvaluationInput) => PolicyEvaluationResult | Promise<PolicyEvaluationResult>;
export declare class DependencyEngine {
    private readonly events;
    private readonly evidence;
    private readonly claims;
    private readonly dependencies;
    private readonly claimDependencies;
    private readonly dag;
    private readonly auditLog;
    private readonly evaluators;
    private readonly processedChangeTriggers;
    /**
     * Register an observed event record idempotently.
     * If already registered with the same event_id, returns existing record.
     */
    registerEvent(event: EventRecord): EventRecord;
    /**
     * Register or update an evidence record.
     */
    registerEvidence(evidence: EvidenceRecord): EvidenceRecord;
    /**
     * Register a new typed claim.
     */
    registerClaim(claim: ClaimRecord): ClaimRecord;
    /**
     * Save / update a claim with optimistic concurrency control.
     */
    saveClaim(claim: ClaimRecord, expectedVersion?: number): ClaimRecord;
    /**
     * Register a dependency edge between a parent (Evidence, Claim, Policy) and a dependent Claim.
     * Cycle detection is strictly enforced; throwing CycleDetectedError on violation.
     */
    addDependency(edge: DependencyEdge, options?: {
        rejectDuplicate?: boolean;
    }): DependencyEdge;
    /**
     * Propagates a dependency change to all direct and transitive downstream claims.
     * Marks affected claims as REVALIDATION_REQUIRED without blindly invalidating them.
     * Idempotent: repeated identical events produce no inconsistent duplicate transitions.
     */
    onDependencyChanged(dependencyId: string, changeReason: string): PropagationResult;
    /**
     * Registers a named policy evaluation function.
     */
    registerPolicyEvaluator(policyId: string, evaluator: PolicyEvaluatorFn): void;
    /**
     * Evaluates/revalidates a specific claim against its dependencies and versioned policy.
     * Safe fault isolation: evaluator exceptions or timeouts NEVER leave a claim falsely VERIFIED.
     */
    evaluateClaim(claimId: string): Promise<ClaimRecord>;
    /**
     * Revalidates an entire subgraph of claims in topological order.
     */
    revalidateSubtree(startDependencyOrClaimId: string): Promise<ClaimRecord[]>;
    /**
     * Read-only getters
     */
    getClaim(id: string): ClaimRecord | undefined;
    getEvent(id: string): EventRecord | undefined;
    getEvidence(id: string): EvidenceRecord | undefined;
    getDependency(id: string): DependencyEdge | undefined;
    getAuditHistory(claimId: string): readonly ChainedAuditEvent[];
    getAllAuditEvents(): readonly ChainedAuditEvent[];
    getDirectDependents(id: string): string[];
    getTransitiveDependents(id: string): string[];
    /**
     * Retrieves a full trail query response for a transaction hash or event ID.
     */
    getTrail(identifier: string): {
        events: EventRecord[];
        claims: ClaimRecord[];
        evidence: EvidenceRecord[];
        dependencies: DependencyEdge[];
        auditHistory: ChainedAuditEvent[];
    };
    getGraphStats(): {
        totalEvents: number;
        totalEvidence: number;
        totalClaims: number;
        totalEdges: number;
        auditLogCount: number;
    };
}
