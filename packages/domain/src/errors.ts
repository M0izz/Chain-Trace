/**
 * ChainTrace Structured Domain Errors (Section 1.7)
 * Codes: NOT_FOUND, DUPLICATE_EDGE, CYCLE_DETECTED, INVALID_TRANSITION, VERSION_CONFLICT, POLICY_NOT_FOUND.
 */

export class DomainError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export class NotFoundError extends DomainError {
  constructor(entityType: string, id: string) {
    super('NOT_FOUND', `${entityType} not found with id: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class DuplicateEdgeError extends DomainError {
  constructor(parentId: string, dependentId: string) {
    super(
      'DUPLICATE_EDGE',
      `Dependency edge already exists from ${parentId} to ${dependentId}`
    );
    this.name = 'DuplicateEdgeError';
  }
}

export class CycleDetectedError extends DomainError {
  public readonly path: string[];

  constructor(path: string[]) {
    super('CYCLE_DETECTED', `Dependency cycle detected: ${path.join(' -> ')}`);
    this.name = 'CycleDetectedError';
    this.path = path;
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(prevStatus: string, nextStatus: string, reason?: string) {
    super(
      'INVALID_TRANSITION',
      `Invalid status transition from ${prevStatus} to ${nextStatus}${reason ? `: ${reason}` : ''}`
    );
    this.name = 'InvalidTransitionError';
  }
}

export class VersionConflictError extends DomainError {
  public readonly currentVersion: number;
  public readonly expectedVersion: number;

  constructor(claimId: string, currentVersion: number, expectedVersion: number) {
    super(
      'VERSION_CONFLICT',
      `Optimistic concurrency violation on claim ${claimId}: expected version ${expectedVersion}, but current version is ${currentVersion}`
    );
    this.name = 'VersionConflictError';
    this.currentVersion = currentVersion;
    this.expectedVersion = expectedVersion;
  }
}

export class PolicyNotFoundError extends DomainError {
  constructor(policyId: string) {
    super('POLICY_NOT_FOUND', `No evaluation rule registered for policy: ${policyId}`);
    this.name = 'PolicyNotFoundError';
  }
}
