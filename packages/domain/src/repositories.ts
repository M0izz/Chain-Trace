import {
  AuditEvent,
  AuditRepository,
  ClaimRecord,
  ClaimRepository,
  DependencyEdge,
  DependencyRepository,
  EvidenceRecord,
  EvidenceRepository
} from './types.js';
import { VersionConflictError } from './errors.js';

export class InMemoryClaimRepository implements ClaimRepository {
  private readonly store: Map<string, ClaimRecord> = new Map();

  public async getById(id: string): Promise<ClaimRecord | undefined> {
    const claim = this.store.get(id);
    return claim ? { ...claim } : undefined;
  }

  public async save(claim: ClaimRecord, expectedVersion?: number): Promise<void> {
    const existing = this.store.get(claim.claim_id);
    const curVer = existing ? (existing.version ?? 1) : 1;
    if (existing && expectedVersion !== undefined && curVer !== expectedVersion) {
      throw new VersionConflictError(claim.claim_id, curVer, expectedVersion);
    }
    const nextVersion = existing ? curVer + 1 : (claim.version ?? 1);
    this.store.set(claim.claim_id, {
      ...claim,
      version: nextVersion,
      updated_at: new Date().toISOString()
    });
  }

  public async listByIds(ids: string[]): Promise<ClaimRecord[]> {
    const results: ClaimRecord[] = [];
    for (const id of ids) {
      const claim = this.store.get(id);
      if (claim) results.push({ ...claim });
    }
    return results;
  }

  public async listAll(): Promise<ClaimRecord[]> {
    return Array.from(this.store.values()).map((c) => ({ ...c }));
  }
}

export class InMemoryDependencyRepository implements DependencyRepository {
  private readonly store: Map<string, DependencyEdge> = new Map();

  public async add(edge: DependencyEdge): Promise<void> {
    this.store.set(edge.dependency_id, { ...edge });
  }

  public async remove(edgeId: string): Promise<boolean> {
    return this.store.delete(edgeId);
  }

  public async listOutgoing(parentId: string): Promise<DependencyEdge[]> {
    const out: DependencyEdge[] = [];
    for (const edge of this.store.values()) {
      if (edge.parent_id === parentId) {
        out.push({ ...edge });
      }
    }
    return out;
  }

  public async listIncoming(dependentId: string): Promise<DependencyEdge[]> {
    const inc: DependencyEdge[] = [];
    for (const edge of this.store.values()) {
      if (edge.dependent_claim_id === dependentId) {
        inc.push({ ...edge });
      }
    }
    return inc;
  }

  public async listAll(): Promise<DependencyEdge[]> {
    return Array.from(this.store.values()).map((e) => ({ ...e }));
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly store: AuditEvent[] = [];

  public async append(event: AuditEvent): Promise<void> {
    this.store.push(Object.freeze({ ...event }));
  }

  public async listForAggregate(id: string): Promise<AuditEvent[]> {
    return this.store
      .filter((ev) => ev.claim_id === id)
      .map((ev) => ({ ...ev }));
  }

  public async listAll(): Promise<AuditEvent[]> {
    return this.store.map((ev) => ({ ...ev }));
  }
}

export class InMemoryEvidenceRepository implements EvidenceRepository {
  private readonly store: Map<string, EvidenceRecord> = new Map();

  public async getById(id: string): Promise<EvidenceRecord | undefined> {
    const ev = this.store.get(id);
    return ev ? { ...ev } : undefined;
  }

  public async save(evidence: EvidenceRecord): Promise<void> {
    this.store.set(evidence.evidence_id, { ...evidence });
  }

  public async listAll(): Promise<EvidenceRecord[]> {
    return Array.from(this.store.values()).map((e) => ({ ...e }));
  }
}
