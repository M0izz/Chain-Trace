import { AuditEvent, AuditRepository, ClaimRecord, ClaimRepository, DependencyEdge, DependencyRepository, EvidenceRecord, EvidenceRepository } from './types.js';
export declare class InMemoryClaimRepository implements ClaimRepository {
    private readonly store;
    getById(id: string): Promise<ClaimRecord | undefined>;
    save(claim: ClaimRecord, expectedVersion?: number): Promise<void>;
    listByIds(ids: string[]): Promise<ClaimRecord[]>;
    listAll(): Promise<ClaimRecord[]>;
}
export declare class InMemoryDependencyRepository implements DependencyRepository {
    private readonly store;
    add(edge: DependencyEdge): Promise<void>;
    remove(edgeId: string): Promise<boolean>;
    listOutgoing(parentId: string): Promise<DependencyEdge[]>;
    listIncoming(dependentId: string): Promise<DependencyEdge[]>;
    listAll(): Promise<DependencyEdge[]>;
}
export declare class InMemoryAuditRepository implements AuditRepository {
    private readonly store;
    append(event: AuditEvent): Promise<void>;
    listForAggregate(id: string): Promise<AuditEvent[]>;
    listAll(): Promise<AuditEvent[]>;
}
export declare class InMemoryEvidenceRepository implements EvidenceRepository {
    private readonly store;
    getById(id: string): Promise<EvidenceRecord | undefined>;
    save(evidence: EvidenceRecord): Promise<void>;
    listAll(): Promise<EvidenceRecord[]>;
}
