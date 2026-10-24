import { ClaimRecord, EvidenceRecord, ChainedAuditEvent } from '../../domain/src/index.js';
import { DurableTrailResponse, RefreshResult } from '../../service/src/durable-trail-service.js';
export interface ChainTraceClientOptions {
    baseUrl?: string;
    fetchFn?: typeof fetch;
}
export interface AuditPageResult {
    trailId: string;
    limit: number;
    offset: number;
    total: number;
    events: ChainedAuditEvent[];
}
export interface SupportedProfileInfo {
    id: string;
    name: string;
    sourceChainId: number;
    sourceChainName: string;
    destinationChainId: number;
    destinationChainName: string;
    protocol: string;
}
/**
 * Typed Frontend API Client for ChainTrace Phase 3 REST endpoints.
 * Provides resilient access with typed error mapping and correlation ID extraction.
 */
export declare class ChainTraceClient {
    readonly baseUrl: string;
    private readonly fetch;
    constructor(options?: ChainTraceClientOptions);
    getSupportedProfiles(): SupportedProfileInfo[];
    /**
     * Retrieves or ingests a cross-chain verification trail.
     */
    getTrail(sourceChainId: number, sourceTxHash: string): Promise<DurableTrailResponse>;
    /**
     * Retrieves a specific claim by ID.
     */
    getClaim(claimId: string): Promise<ClaimRecord>;
    /**
     * Retrieves a specific evidence record by ID.
     */
    getEvidence(evidenceId: string): Promise<EvidenceRecord>;
    /**
     * Retrieves paginated audit history for a trail.
     */
    getAuditPage(trailId: string, limit?: number, offset?: number): Promise<AuditPageResult>;
    /**
     * Triggers an authorized bounded refresh/re-evaluation on the trail.
     */
    refreshTrail(trailId: string, options?: {
        apiKey?: string;
        idempotencyKey?: string;
        checkReorg?: boolean;
    }): Promise<RefreshResult>;
}
