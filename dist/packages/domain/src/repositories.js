import { VersionConflictError } from './errors.js';
export class InMemoryClaimRepository {
    store = new Map();
    async getById(id) {
        const claim = this.store.get(id);
        return claim ? { ...claim } : undefined;
    }
    async save(claim, expectedVersion) {
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
    async listByIds(ids) {
        const results = [];
        for (const id of ids) {
            const claim = this.store.get(id);
            if (claim)
                results.push({ ...claim });
        }
        return results;
    }
    async listAll() {
        return Array.from(this.store.values()).map((c) => ({ ...c }));
    }
}
export class InMemoryDependencyRepository {
    store = new Map();
    async add(edge) {
        this.store.set(edge.dependency_id, { ...edge });
    }
    async remove(edgeId) {
        return this.store.delete(edgeId);
    }
    async listOutgoing(parentId) {
        const out = [];
        for (const edge of this.store.values()) {
            if (edge.parent_id === parentId) {
                out.push({ ...edge });
            }
        }
        return out;
    }
    async listIncoming(dependentId) {
        const inc = [];
        for (const edge of this.store.values()) {
            if (edge.dependent_claim_id === dependentId) {
                inc.push({ ...edge });
            }
        }
        return inc;
    }
    async listAll() {
        return Array.from(this.store.values()).map((e) => ({ ...e }));
    }
}
export class InMemoryAuditRepository {
    store = [];
    async append(event) {
        this.store.push(Object.freeze({ ...event }));
    }
    async listForAggregate(id) {
        return this.store
            .filter((ev) => ev.claim_id === id)
            .map((ev) => ({ ...ev }));
    }
    async listAll() {
        return this.store.map((ev) => ({ ...ev }));
    }
}
export class InMemoryEvidenceRepository {
    store = new Map();
    async getById(id) {
        const ev = this.store.get(id);
        return ev ? { ...ev } : undefined;
    }
    async save(evidence) {
        this.store.set(evidence.evidence_id, { ...evidence });
    }
    async listAll() {
        return Array.from(this.store.values()).map((e) => ({ ...e }));
    }
}
