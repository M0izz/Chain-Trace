/**
 * ChainTrace Structured Domain Errors (Section 1.7)
 * Codes: NOT_FOUND, DUPLICATE_EDGE, CYCLE_DETECTED, INVALID_TRANSITION, VERSION_CONFLICT, POLICY_NOT_FOUND.
 */
export declare class DomainError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export declare class NotFoundError extends DomainError {
    constructor(entityType: string, id: string);
}
export declare class DuplicateEdgeError extends DomainError {
    constructor(parentId: string, dependentId: string);
}
export declare class CycleDetectedError extends DomainError {
    readonly path: string[];
    constructor(path: string[]);
}
export declare class InvalidTransitionError extends DomainError {
    constructor(prevStatus: string, nextStatus: string, reason?: string);
}
export declare class VersionConflictError extends DomainError {
    readonly currentVersion: number;
    readonly expectedVersion: number;
    constructor(claimId: string, currentVersion: number, expectedVersion: number);
}
export declare class PolicyNotFoundError extends DomainError {
    constructor(policyId: string);
}
