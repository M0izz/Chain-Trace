import { ClaimRecord } from '../../domain/src/index.js';
import { DependencyEngine } from '../../dependency-engine/src/index.js';
import { LayerZeroV2Adapter, SourceEvidenceResult } from './adapter.js';
export interface IngestTrailRequest {
    sourceTxHash: string;
    destTxHash?: string;
}
export interface IngestTrailResult {
    sourceEvidence: SourceEvidenceResult;
    trail: ReturnType<DependencyEngine['getTrail']>;
    claims: ClaimRecord[];
    isComplete: boolean;
    statusSummary: {
        sourceIncluded: string;
        sourceFinalized: string;
        messageMatched: string;
        destinationExecuted: string;
        pathSupported: string;
    };
}
/**
 * Cross-Chain Trail Service
 * Connects protocol adapter evidence to the Phase 1 DependencyEngine.
 */
export declare class CrossChainTrailService {
    readonly adapter: LayerZeroV2Adapter;
    readonly engine: DependencyEngine;
    private readonly observedBlockHashes;
    constructor(adapter: LayerZeroV2Adapter, engine?: DependencyEngine);
    /**
     * Ingests, normalizes, and verifies a cross-chain execution trail from a source transaction hash.
     */
    ingestAndVerifyTrail(request: IngestTrailRequest): Promise<IngestTrailResult>;
    /**
     * Checks whether an observed source block height has experienced a reorg.
     * If a reorg is detected, marks affected claims as REVALIDATION_REQUIRED.
     */
    checkSourceReorg(blockNumber: number): Promise<boolean>;
}
