import { ClaimRecord, EvidenceRecord } from '../../domain/src/index.js';
import { DependencyEngine } from '../../dependency-engine/src/index.js';
import { LayerZeroV2Adapter } from '../../chain-adapters/src/index.js';
import { SqliteStore } from '../../persistence/src/index.js';
export interface DurableTrailResponse {
    schemaVersion: string;
    trailId: string;
    source: {
        chainId: number;
        txHash: string;
    };
    destination?: {
        chainId: number;
        txHash?: string;
    };
    status: string;
    claims: ClaimRecord[];
    evidence: EvidenceRecord[];
    trustAssumptions: string[];
    lastEvaluatedAt: string;
    isFromCache: boolean;
}
export interface RefreshResult {
    trailId: string;
    previousStatus: string;
    newStatus: string;
    refreshedAt: string;
    affectedClaimsCount: number;
    auditEventsAppended: number;
}
/**
 * Service orchestrating LayerZero v2 adapter, Phase 1 dependency engine,
 * and durable relational database persistence.
 */
export declare class DurableTrailService {
    readonly adapter: LayerZeroV2Adapter;
    readonly store: SqliteStore;
    readonly engine: DependencyEngine;
    private readonly refreshTimestamps;
    private readonly MAX_REFRESHES_PER_MINUTE;
    constructor(adapter: LayerZeroV2Adapter, store: SqliteStore, engine?: DependencyEngine);
    /**
     * Retrieves an existing trail from persistent storage, or ingests it live if not present.
     */
    getOrIngestTrail(sourceChainId: number, sourceTxHash: string): Promise<DurableTrailResponse>;
    /**
     * Refreshes a trail with idempotency and rate limiting.
     */
    refreshTrail(trailId: string, options?: {
        idempotencyKey?: string;
        checkReorg?: boolean;
    }): Promise<RefreshResult>;
    /**
     * Derive the composite trail status according to Section 5 rules:
     * - If ANY claim is INVALID -> INVALID
     * - If ANY claim is REVALIDATION_REQUIRED -> REVALIDATION_REQUIRED
     * - If ANY claim is INCONCLUSIVE or UNVERIFIED -> INCONCLUSIVE
     * - If ALL claims are VERIFIED -> VERIFIED
     */
    deriveAggregateStatus(claims: ClaimRecord[]): string;
    private enforceRateLimit;
}
