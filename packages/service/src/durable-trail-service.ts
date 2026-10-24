import {
  ClaimRecord,
  EvidenceRecord
} from '../../domain/src/index.js';
import {
  DependencyEngine
} from '../../dependency-engine/src/index.js';
import {
  IngestTrailResult,
  LayerZeroV2Adapter,
  CrossChainTrailService
} from '../../chain-adapters/src/index.js';
import {
  PersistedTrail,
  SqliteStore
} from '../../persistence/src/index.js';
import {
  evaluateDestinationExecutionPolicy,
  evaluateEventInclusionPolicy,
  evaluateMessageMatchPolicy,
  evaluatePathSupportPolicy,
  evaluateSourceFinalityPolicy,
  POLICY_IDS
} from '../../verification/src/index.js';

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
  status: string; // Aggregate status: VERIFIED | REVALIDATION_REQUIRED | INCONCLUSIVE | INVALID
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
export class DurableTrailService {
  public readonly adapter: LayerZeroV2Adapter;
  public readonly store: SqliteStore;
  public readonly engine: DependencyEngine;

  // Simple in-memory sliding window rate-limiter per trail ID
  private readonly refreshTimestamps: Map<string, number[]> = new Map();
  private readonly MAX_REFRESHES_PER_MINUTE = 5;

  constructor(
    adapter: LayerZeroV2Adapter,
    store: SqliteStore,
    engine?: DependencyEngine
  ) {
    this.adapter = adapter;
    this.store = store;
    if (engine) {
      this.engine = engine;
    } else {
      this.engine = new DependencyEngine();
      this.engine.registerPolicyEvaluator(POLICY_IDS.EVENT_INCLUSION, evaluateEventInclusionPolicy);
      this.engine.registerPolicyEvaluator(POLICY_IDS.SOURCE_FINALITY, evaluateSourceFinalityPolicy);
      this.engine.registerPolicyEvaluator(POLICY_IDS.MESSAGE_MATCH, evaluateMessageMatchPolicy);
      this.engine.registerPolicyEvaluator(POLICY_IDS.DESTINATION_EXECUTION, evaluateDestinationExecutionPolicy);
      this.engine.registerPolicyEvaluator(POLICY_IDS.PATH_SUPPORT, evaluatePathSupportPolicy);
    }
  }

  /**
   * Retrieves an existing trail from persistent storage, or ingests it live if not present.
   */
  public async getOrIngestTrail(
    sourceChainId: number,
    sourceTxHash: string
  ): Promise<DurableTrailResponse> {
    const existing = this.store.getTrail(sourceChainId, sourceTxHash);

    if (existing) {
      const claims = this.store.listClaimsByTrail(existing.trail_id);
      const evidence = this.store.listEvidenceByTrail(existing.trail_id);

      return {
        schemaVersion: '1.0',
        trailId: existing.trail_id,
        source: {
          chainId: existing.source_chain_id,
          txHash: existing.source_tx_hash
        },
        destination: existing.destination_chain_id
          ? {
              chainId: existing.destination_chain_id,
              txHash: existing.destination_tx_hash
            }
          : undefined,
        status: existing.status,
        claims,
        evidence,
        trustAssumptions: this.adapter.profile.trustModel.independentChecks,
        lastEvaluatedAt: existing.updated_at,
        isFromCache: true
      };
    }

    // Ingest live trail using Phase 2 CrossChainTrailService logic
    const liveService = new CrossChainTrailService(this.adapter, this.engine);

    const liveResult: IngestTrailResult = await liveService.ingestAndVerifyTrail({
      sourceTxHash
    });

    const trailId = `trail:${sourceChainId}:${sourceTxHash.toLowerCase()}`;
    const destTxHash = liveResult.trail.events.find(
      (e: any) => e.chain_id === this.adapter.profile.destinationChain.chainId
    )?.tx_hash;

    const overallStatus = this.deriveAggregateStatus(liveResult.claims);

    const now = new Date().toISOString();
    const persistedTrail: PersistedTrail = {
      trail_id: trailId,
      source_chain_id: sourceChainId,
      source_tx_hash: sourceTxHash.toLowerCase(),
      destination_chain_id: this.adapter.profile.destinationChain.chainId,
      destination_tx_hash: destTxHash,
      adapter_id: 'layerzero-v2-sepolia-amoy',
      status: overallStatus,
      created_at: now,
      updated_at: now
    };

    // Atomically persist entire trail graph in one transaction
    this.store.transaction(() => {
      this.store.saveTrail(persistedTrail);

      for (const ev of liveResult.trail.evidence) {
        this.store.saveEvidence(ev, trailId);
      }

      for (const cl of liveResult.claims) {
        this.store.saveClaim(cl, trailId);
      }

      for (const edge of liveResult.trail.dependencies) {
        this.store.saveDependency(edge);
      }

      for (const audit of liveResult.trail.auditHistory) {
        this.store.appendAuditEvent(audit, trailId);
      }
    });

    return {
      schemaVersion: '1.0',
      trailId,
      source: {
        chainId: sourceChainId,
        txHash: sourceTxHash.toLowerCase()
      },
      destination: {
        chainId: this.adapter.profile.destinationChain.chainId,
        txHash: destTxHash
      },
      status: overallStatus,
      claims: liveResult.claims,
      evidence: liveResult.trail.evidence,
      trustAssumptions: this.adapter.profile.trustModel.independentChecks,
      lastEvaluatedAt: now,
      isFromCache: false
    };
  }

  /**
   * Refreshes a trail with idempotency and rate limiting.
   */
  public async refreshTrail(
    trailId: string,
    options?: { idempotencyKey?: string; checkReorg?: boolean }
  ): Promise<RefreshResult> {
    // 1. Idempotency Key check
    if (options?.idempotencyKey) {
      const cached = this.store.getIdempotency(options.idempotencyKey);
      if (cached) {
        return JSON.parse(cached) as RefreshResult;
      }
    }

    // 2. Rate-limiting check
    this.enforceRateLimit(trailId);

    // 3. Retrieve trail from DB
    const trail = this.store.getTrailById(trailId);
    if (!trail) {
      throw new Error(`Trail not found: ${trailId}`);
    }

    const previousStatus = trail.status;
    const auditBeforeCount = this.store.listAuditEvents({ trailId }).total;

    // 4. Re-check source evidence & canonicality
    const sourceEvidence = await this.adapter.getSourceEvidence(trail.source_tx_hash);

    let reorgTriggered = false;
    if (options?.checkReorg) {
      const latestBlock = await this.adapter.sourceRpc.getBlockByNumber(sourceEvidence.block.number);
      if (latestBlock && latestBlock.hash.toLowerCase() !== sourceEvidence.block.hash.toLowerCase()) {
        reorgTriggered = true;
        this.engine.onDependencyChanged(
          sourceEvidence.finalityEvidence.evidence_id,
          'REORG_DETECTED_ON_REFRESH'
        );
      }
    }

    // 5. Revalidate subgraph if needed
    let affectedClaimsCount = 0;
    if (reorgTriggered) {
      const reevaluated = await this.engine.revalidateSubtree(
        sourceEvidence.finalityEvidence.evidence_id
      );
      affectedClaimsCount = reevaluated.length;
    }

    // Refresh destination evidence
    const destEvidence = await this.adapter.getDestinationEvidence({
      guid: sourceEvidence.decodedPacket.guid,
      destTxHash: trail.destination_tx_hash
    });

    const claims = this.store.listClaimsByTrail(trailId);
    const newOverallStatus = this.deriveAggregateStatus(claims);

    const now = new Date().toISOString();

    // Commit state update transactionally
    this.store.transaction(() => {
      this.store.saveTrail({
        ...trail,
        status: newOverallStatus,
        updated_at: now
      });

      if (destEvidence.destinationEvent && destEvidence.receiptEvidence) {
        this.store.saveEvidence(destEvidence.receiptEvidence, trailId);
      }
    });

    const auditAfterCount = this.store.listAuditEvents({ trailId }).total;

    const result: RefreshResult = {
      trailId,
      previousStatus,
      newStatus: newOverallStatus,
      refreshedAt: now,
      affectedClaimsCount,
      auditEventsAppended: auditAfterCount - auditBeforeCount
    };

    if (options?.idempotencyKey) {
      this.store.saveIdempotency(options.idempotencyKey, 'refreshTrail', JSON.stringify(result));
    }

    return result;
  }

  /**
   * Derive the composite trail status according to Section 5 rules:
   * - If ANY claim is INVALID -> INVALID
   * - If ANY claim is REVALIDATION_REQUIRED -> REVALIDATION_REQUIRED
   * - If ANY claim is INCONCLUSIVE or UNVERIFIED -> INCONCLUSIVE
   * - If ALL claims are VERIFIED -> VERIFIED
   */
  public deriveAggregateStatus(claims: ClaimRecord[]): string {
    if (claims.length === 0) return 'UNVERIFIED';
    if (claims.some((c) => c.status === 'INVALID')) return 'INVALID';
    if (claims.some((c) => c.status === 'REVALIDATION_REQUIRED')) return 'REVALIDATION_REQUIRED';
    if (claims.some((c) => c.status === 'INCONCLUSIVE' || c.status === 'UNVERIFIED')) return 'INCONCLUSIVE';
    if (claims.every((c) => c.status === 'VERIFIED')) return 'VERIFIED';
    return 'INCONCLUSIVE';
  }

  private enforceRateLimit(trailId: string): void {
    const now = Date.now();
    const timestamps = this.refreshTimestamps.get(trailId) || [];
    const windowStart = now - 60000;

    const validTimestamps = timestamps.filter((t) => t > windowStart);
    if (validTimestamps.length >= this.MAX_REFRESHES_PER_MINUTE) {
      throw new Error(`Rate limit exceeded for trail refresh (${this.MAX_REFRESHES_PER_MINUTE} req/min)`);
    }

    validTimestamps.push(now);
    this.refreshTimestamps.set(trailId, validTimestamps);
  }
}
