"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyEngine = exports.DuplicateEdgeError = exports.CycleDetectedError = void 0;
const index_js_1 = require("../../domain/src/index.js");
const dag_js_1 = require("./dag.js");
var dag_js_2 = require("./dag.js");
Object.defineProperty(exports, "CycleDetectedError", { enumerable: true, get: function () { return dag_js_2.CycleDetectedError; } });
Object.defineProperty(exports, "DuplicateEdgeError", { enumerable: true, get: function () { return dag_js_2.DuplicateEdgeError; } });
class DependencyEngine {
    events = new Map();
    evidence = new Map();
    claims = new Map();
    dependencies = new Map();
    claimDependencies = new Map(); // claimId -> dependencyIds
    dag = new dag_js_1.DependencyDAG();
    auditLog = new index_js_1.AppendOnlyAuditLog();
    // Registry for policy evaluators
    evaluators = new Map();
    // Deduplication cache for dependency change triggers: `dependencyId:changeReason`
    processedChangeTriggers = new Set();
    /**
     * Register an observed event record idempotently.
     * If already registered with the same event_id, returns existing record.
     */
    registerEvent(event) {
        (0, index_js_1.validateEventRecord)(event);
        const existing = this.events.get(event.event_id);
        if (existing) {
            return existing; // Idempotent return
        }
        const cloned = Object.freeze({ ...event });
        this.events.set(event.event_id, cloned);
        return cloned;
    }
    /**
     * Register or update an evidence record.
     */
    registerEvidence(evidence) {
        (0, index_js_1.validateEvidenceRecord)(evidence);
        const cloned = Object.freeze({ ...evidence });
        const existing = this.evidence.get(evidence.evidence_id);
        this.evidence.set(evidence.evidence_id, cloned);
        this.dag.addNode(evidence.evidence_id, 'EVIDENCE');
        // If this is updated evidence and its result or content changed, trigger revalidation of dependents
        if (existing &&
            (existing.result !== evidence.result ||
                existing.content_hash !== evidence.content_hash ||
                existing.policy_version !== evidence.policy_version)) {
            this.onDependencyChanged(evidence.evidence_id, `EVIDENCE_UPDATED:${evidence.evidence_id}:${evidence.result}`);
        }
        return cloned;
    }
    /**
     * Register a new typed claim.
     */
    registerClaim(claim) {
        (0, index_js_1.validateClaimRecord)(claim);
        if (this.claims.has(claim.claim_id)) {
            return this.claims.get(claim.claim_id); // Idempotent
        }
        const cloned = {
            ...claim,
            version: claim.version ?? 1,
            created_at: claim.created_at || new Date().toISOString(),
            updated_at: claim.updated_at || new Date().toISOString()
        };
        this.claims.set(claim.claim_id, cloned);
        this.dag.addNode(claim.claim_id, 'CLAIM');
        // Record creation in audit log
        this.auditLog.append({
            claimId: claim.claim_id,
            previousStatus: 'UNVERIFIED',
            newStatus: claim.status,
            reasonCode: claim.status_reason.code || 'CLAIM_REGISTERED',
            policyVersion: claim.policy_version,
            details: claim.status_reason.message,
            aggregateType: 'CLAIM',
            eventType: 'CLAIM_CREATED'
        });
        return cloned;
    }
    /**
     * Save / update a claim with optimistic concurrency control.
     */
    saveClaim(claim, expectedVersion) {
        (0, index_js_1.validateClaimRecord)(claim);
        const existing = this.claims.get(claim.claim_id);
        if (!existing) {
            return this.registerClaim(claim);
        }
        const curVer = existing.version ?? 1;
        if (expectedVersion !== undefined && curVer !== expectedVersion) {
            throw new index_js_1.VersionConflictError(claim.claim_id, curVer, expectedVersion);
        }
        const updated = {
            ...claim,
            version: curVer + 1,
            updated_at: new Date().toISOString()
        };
        this.claims.set(claim.claim_id, updated);
        return updated;
    }
    /**
     * Register a dependency edge between a parent (Evidence, Claim, Policy) and a dependent Claim.
     * Cycle detection is strictly enforced; throwing CycleDetectedError on violation.
     */
    addDependency(edge, options) {
        (0, index_js_1.validateDependencyEdge)(edge);
        if (this.dependencies.has(edge.dependency_id)) {
            if (options?.rejectDuplicate) {
                throw new index_js_1.DuplicateEdgeError(edge.parent_id, edge.dependent_claim_id);
            }
            return this.dependencies.get(edge.dependency_id); // Idempotent
        }
        if (options?.rejectDuplicate &&
            this.dag.hasEdge(edge.parent_id, edge.dependent_claim_id)) {
            throw new index_js_1.DuplicateEdgeError(edge.parent_id, edge.dependent_claim_id);
        }
        // Verify parent exists
        if (edge.parent_type === 'CLAIM' && !this.claims.has(edge.parent_id)) {
            throw new index_js_1.NotFoundError('Claim', edge.parent_id);
        }
        if (edge.parent_type === 'EVIDENCE' && !this.evidence.has(edge.parent_id)) {
            throw new index_js_1.NotFoundError('Evidence', edge.parent_id);
        }
        // Verify dependent claim exists
        if (!this.claims.has(edge.dependent_claim_id)) {
            throw new index_js_1.NotFoundError('Claim', edge.dependent_claim_id);
        }
        // Add to DAG - will throw CycleDetectedError if cycle introduced
        this.dag.addEdge(edge.parent_id, edge.parent_type, edge.dependent_claim_id, 'CLAIM');
        const cloned = Object.freeze({ ...edge });
        this.dependencies.set(edge.dependency_id, cloned);
        const claimDeps = this.claimDependencies.get(edge.dependent_claim_id) || [];
        claimDeps.push(edge.dependency_id);
        this.claimDependencies.set(edge.dependent_claim_id, claimDeps);
        // Update claim's direct dependency caches
        const depClaim = this.claims.get(edge.dependent_claim_id);
        if (depClaim) {
            if (edge.parent_type === 'CLAIM') {
                const parents = depClaim.prerequisite_claim_ids || [];
                if (!parents.includes(edge.parent_id)) {
                    parents.push(edge.parent_id);
                    depClaim.prerequisite_claim_ids = parents;
                }
            }
            else if (edge.parent_type === 'EVIDENCE') {
                const evs = depClaim.evidence_ids || [];
                if (!evs.includes(edge.parent_id)) {
                    evs.push(edge.parent_id);
                    depClaim.evidence_ids = evs;
                }
            }
        }
        return cloned;
    }
    /**
     * Propagates a dependency change to all direct and transitive downstream claims.
     * Marks affected claims as REVALIDATION_REQUIRED without blindly invalidating them.
     * Idempotent: repeated identical events produce no inconsistent duplicate transitions.
     */
    onDependencyChanged(dependencyId, changeReason) {
        const startTime = performance.now();
        // Deduplication check for duplicate triggers
        const triggerKey = `${dependencyId}:${changeReason}`;
        const isDuplicateTrigger = this.processedChangeTriggers.has(triggerKey);
        this.processedChangeTriggers.add(triggerKey);
        // 1. Traverse descendants in DAG
        const descendants = this.dag.getDescendants(dependencyId);
        // 2. Filter only CLAIM nodes (evidence/policy are root prerequisites)
        const descendantClaims = descendants.filter((id) => this.claims.has(id));
        if (descendantClaims.length === 0) {
            return {
                dependencyId,
                changeReason,
                affectedClaimIds: [],
                affectedCount: 0,
                durationMs: performance.now() - startTime,
                auditEventsCreated: 0,
                isDuplicateTrigger
            };
        }
        // 3. Topologically order affected claims deterministically
        const orderedClaims = this.dag.topologicalSort(descendantClaims);
        let auditEventsCreated = 0;
        for (const claimId of orderedClaims) {
            const claim = this.claims.get(claimId);
            if (!claim)
                continue;
            // Idempotency: if already REVALIDATION_REQUIRED with identical reason/trigger, skip duplicate audit event
            if (claim.status === 'REVALIDATION_REQUIRED' &&
                claim.status_reason.code === 'DEPENDENCY_CHANGED' &&
                claim.status_reason.message === changeReason) {
                continue;
            }
            const prevStatus = claim.status;
            claim.status = 'REVALIDATION_REQUIRED';
            claim.version = (claim.version ?? 1) + 1;
            claim.updated_at = new Date().toISOString();
            claim.status_reason = {
                code: 'DEPENDENCY_CHANGED',
                message: changeReason
            };
            this.auditLog.append({
                claimId,
                previousStatus: prevStatus,
                newStatus: 'REVALIDATION_REQUIRED',
                triggeringDependency: dependencyId,
                reasonCode: 'DEPENDENCY_CHANGED',
                policyVersion: claim.policy_version,
                details: `Dependency changed: ${changeReason}`,
                aggregateType: 'CLAIM',
                eventType: 'STATUS_CHANGED'
            });
            auditEventsCreated++;
        }
        const durationMs = performance.now() - startTime;
        return {
            dependencyId,
            changeReason,
            affectedClaimIds: orderedClaims,
            affectedCount: orderedClaims.length,
            durationMs,
            auditEventsCreated,
            isDuplicateTrigger
        };
    }
    /**
     * Registers a named policy evaluation function.
     */
    registerPolicyEvaluator(policyId, evaluator) {
        this.evaluators.set(policyId, evaluator);
    }
    /**
     * Evaluates/revalidates a specific claim against its dependencies and versioned policy.
     * Safe fault isolation: evaluator exceptions or timeouts NEVER leave a claim falsely VERIFIED.
     */
    async evaluateClaim(claimId) {
        const claim = this.claims.get(claimId);
        if (!claim) {
            throw new index_js_1.NotFoundError('Claim', claimId);
        }
        const evaluator = this.evaluators.get(claim.policy_id);
        if (!evaluator) {
            throw new index_js_1.PolicyNotFoundError(claim.policy_id);
        }
        // Gather dependencies
        const depIds = this.claimDependencies.get(claimId) || [];
        const edges = depIds.map((id) => this.dependencies.get(id));
        const parentClaims = new Map();
        const parentEvidence = new Map();
        for (const edge of edges) {
            if (edge.parent_type === 'CLAIM') {
                const parent = this.claims.get(edge.parent_id);
                if (parent)
                    parentClaims.set(edge.parent_id, parent);
            }
            else if (edge.parent_type === 'EVIDENCE') {
                const ev = this.evidence.get(edge.parent_id);
                if (ev)
                    parentEvidence.set(edge.parent_id, ev);
            }
        }
        const input = {
            claim,
            dependencies: {
                edges,
                parentClaims,
                parentEvidence
            },
            policyVersion: claim.policy_version
        };
        let result;
        try {
            result = await evaluator(input);
        }
        catch (err) {
            // P1-08: Verifier error/timeout cannot leave a claim falsely VERIFIED
            const errorMessage = err instanceof Error ? err.message : String(err);
            result = {
                status: 'INCONCLUSIVE',
                reason: {
                    code: 'VERIFIER_EXCEPTION',
                    message: `Evaluation failed with error: ${errorMessage}`
                }
            };
        }
        const prevStatus = claim.status;
        claim.status = result.status;
        claim.status_reason = result.reason;
        claim.version = (claim.version ?? 1) + 1;
        claim.updated_at = new Date().toISOString();
        if (result.status === 'VERIFIED') {
            claim.last_verified_at = claim.updated_at;
        }
        if (prevStatus !== result.status) {
            this.auditLog.append({
                claimId,
                previousStatus: prevStatus,
                newStatus: result.status,
                reasonCode: result.reason.code,
                policyVersion: claim.policy_version,
                inputsHash: result.inputsHash,
                details: result.reason.message,
                aggregateType: 'CLAIM',
                eventType: 'STATUS_CHANGED'
            });
        }
        return claim;
    }
    /**
     * Revalidates an entire subgraph of claims in topological order.
     */
    async revalidateSubtree(startDependencyOrClaimId) {
        const descendants = this.dag.getDescendants(startDependencyOrClaimId);
        const descendantClaims = descendants.filter((id) => this.claims.has(id));
        // If starting node is a claim itself, include it
        if (this.claims.has(startDependencyOrClaimId) && !descendantClaims.includes(startDependencyOrClaimId)) {
            descendantClaims.unshift(startDependencyOrClaimId);
        }
        if (descendantClaims.length === 0) {
            return [];
        }
        const ordered = this.dag.topologicalSort(descendantClaims);
        const evaluated = [];
        for (const claimId of ordered) {
            const claim = await this.evaluateClaim(claimId);
            evaluated.push(claim);
        }
        return evaluated;
    }
    /**
     * Read-only getters
     */
    getClaim(id) {
        return this.claims.get(id);
    }
    getEvent(id) {
        return this.events.get(id);
    }
    getEvidence(id) {
        return this.evidence.get(id);
    }
    getDependency(id) {
        return this.dependencies.get(id);
    }
    getAuditHistory(claimId) {
        return this.auditLog.getHistoryForClaim(claimId);
    }
    getAllAuditEvents() {
        return this.auditLog.getAllEvents();
    }
    getDirectDependents(id) {
        return this.dag.getDirectDependents(id);
    }
    getTransitiveDependents(id) {
        return this.dag.getDescendants(id);
    }
    /**
     * Retrieves a full trail query response for a transaction hash or event ID.
     */
    getTrail(identifier) {
        const matchedEvents = [];
        for (const ev of this.events.values()) {
            if (ev.tx_hash.toLowerCase() === identifier.toLowerCase() ||
                ev.event_id === identifier) {
                matchedEvents.push(ev);
            }
        }
        const relatedClaimIds = new Set();
        for (const ev of matchedEvents) {
            for (const claim of this.claims.values()) {
                if (claim.subject_refs.includes(ev.event_id) || claim.subject_refs.includes(ev.tx_hash)) {
                    relatedClaimIds.add(claim.claim_id);
                    // Include all descendants of related claim
                    for (const desc of this.dag.getDescendants(claim.claim_id)) {
                        if (this.claims.has(desc)) {
                            relatedClaimIds.add(desc);
                        }
                    }
                }
            }
        }
        const matchedClaims = Array.from(relatedClaimIds).map((id) => this.claims.get(id));
        const relatedEvidenceIds = new Set();
        const relatedDepEdges = [];
        for (const claimId of relatedClaimIds) {
            const depIds = this.claimDependencies.get(claimId) || [];
            for (const depId of depIds) {
                const edge = this.dependencies.get(depId);
                if (edge) {
                    relatedDepEdges.push(edge);
                    if (edge.parent_type === 'EVIDENCE') {
                        relatedEvidenceIds.add(edge.parent_id);
                    }
                }
            }
        }
        const matchedEvidence = Array.from(relatedEvidenceIds).map((id) => this.evidence.get(id));
        const matchedAudit = [];
        for (const claimId of relatedClaimIds) {
            matchedAudit.push(...this.auditLog.getHistoryForClaim(claimId));
        }
        return {
            events: matchedEvents,
            claims: matchedClaims,
            evidence: matchedEvidence,
            dependencies: relatedDepEdges,
            auditHistory: matchedAudit
        };
    }
    getGraphStats() {
        return {
            totalEvents: this.events.size,
            totalEvidence: this.evidence.size,
            totalClaims: this.claims.size,
            totalEdges: this.dag.edgeCount,
            auditLogCount: this.auditLog.count
        };
    }
}
exports.DependencyEngine = DependencyEngine;
