import type { DatabaseSync } from 'node:sqlite';
import { ChainedAuditEvent, ClaimRecord, DependencyEdge, EvidenceRecord } from '../../domain/src/index.js';
import { SchemaMigrator } from './migrator.js';
export interface PersistedTrail {
    trail_id: string;
    source_chain_id: number;
    source_tx_hash: string;
    destination_chain_id?: number;
    destination_tx_hash?: string;
    adapter_id: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface SqliteStoreOptions {
    dbPath?: string;
    db?: DatabaseSync;
}
/**
 * SQLite Relational Database Store for ChainTrace
 * Implements durable persistence with migrations, transactions, and foreign keys.
 */
export declare class SqliteStore {
    readonly db: DatabaseSync;
    readonly migrator: SchemaMigrator;
    constructor(options?: SqliteStoreOptions);
    /**
     * Run a function within an explicit database transaction.
     */
    transaction<T>(fn: () => T): T;
    saveTrail(trail: PersistedTrail): void;
    getTrail(sourceChainId: number, sourceTxHash: string): PersistedTrail | undefined;
    getTrailById(trailId: string): PersistedTrail | undefined;
    saveEvidence(evidence: EvidenceRecord, trailId?: string): void;
    getEvidenceById(id: string): EvidenceRecord | undefined;
    listEvidenceByTrail(trailId: string): EvidenceRecord[];
    saveClaim(claim: ClaimRecord, trailId?: string, expectedVersion?: number): void;
    getClaimById(id: string): ClaimRecord | undefined;
    listClaimsByTrail(trailId: string): ClaimRecord[];
    saveDependency(edge: DependencyEdge): void;
    listDependenciesByTrail(trailId: string): DependencyEdge[];
    appendAuditEvent(event: ChainedAuditEvent, trailId?: string): void;
    listAuditEvents(params: {
        trailId?: string;
        claimId?: string;
        limit?: number;
        offset?: number;
    }): {
        events: ChainedAuditEvent[];
        total: number;
    };
    saveIdempotency(key: string, operation: string, responseBody: string, ttlSeconds?: number): void;
    getIdempotency(key: string): string | undefined;
    close(): void;
}
