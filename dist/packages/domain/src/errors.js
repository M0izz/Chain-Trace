"use strict";
/**
 * ChainTrace Structured Domain Errors (Section 1.7)
 * Codes: NOT_FOUND, DUPLICATE_EDGE, CYCLE_DETECTED, INVALID_TRANSITION, VERSION_CONFLICT, POLICY_NOT_FOUND.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyNotFoundError = exports.VersionConflictError = exports.InvalidTransitionError = exports.CycleDetectedError = exports.DuplicateEdgeError = exports.NotFoundError = exports.DomainError = void 0;
class DomainError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'DomainError';
        this.code = code;
    }
}
exports.DomainError = DomainError;
class NotFoundError extends DomainError {
    constructor(entityType, id) {
        super('NOT_FOUND', `${entityType} not found with id: ${id}`);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class DuplicateEdgeError extends DomainError {
    constructor(parentId, dependentId) {
        super('DUPLICATE_EDGE', `Dependency edge already exists from ${parentId} to ${dependentId}`);
        this.name = 'DuplicateEdgeError';
    }
}
exports.DuplicateEdgeError = DuplicateEdgeError;
class CycleDetectedError extends DomainError {
    path;
    constructor(path) {
        super('CYCLE_DETECTED', `Dependency cycle detected: ${path.join(' -> ')}`);
        this.name = 'CycleDetectedError';
        this.path = path;
    }
}
exports.CycleDetectedError = CycleDetectedError;
class InvalidTransitionError extends DomainError {
    constructor(prevStatus, nextStatus, reason) {
        super('INVALID_TRANSITION', `Invalid status transition from ${prevStatus} to ${nextStatus}${reason ? `: ${reason}` : ''}`);
        this.name = 'InvalidTransitionError';
    }
}
exports.InvalidTransitionError = InvalidTransitionError;
class VersionConflictError extends DomainError {
    currentVersion;
    expectedVersion;
    constructor(claimId, currentVersion, expectedVersion) {
        super('VERSION_CONFLICT', `Optimistic concurrency violation on claim ${claimId}: expected version ${expectedVersion}, but current version is ${currentVersion}`);
        this.name = 'VersionConflictError';
        this.currentVersion = currentVersion;
        this.expectedVersion = expectedVersion;
    }
}
exports.VersionConflictError = VersionConflictError;
class PolicyNotFoundError extends DomainError {
    constructor(policyId) {
        super('POLICY_NOT_FOUND', `No evaluation rule registered for policy: ${policyId}`);
        this.name = 'PolicyNotFoundError';
    }
}
exports.PolicyNotFoundError = PolicyNotFoundError;
