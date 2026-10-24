import {
  ClaimRecord,
  EvidenceRecord,
  ChainedAuditEvent
} from '../../domain/src/index.js';
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
export class ChainTraceClient {
  public readonly baseUrl: string;
  private readonly fetch: typeof fetch;

  constructor(options?: ChainTraceClientOptions) {
    this.baseUrl = (options?.baseUrl || '').replace(/\/$/, '');
    this.fetch = options?.fetchFn || globalThis.fetch.bind(globalThis);
  }

  public getSupportedProfiles(): SupportedProfileInfo[] {
    return [
      {
        id: 'layerzero-v2-sepolia-amoy',
        name: 'LayerZero v2 EndpointV2',
        sourceChainId: 11155111,
        sourceChainName: 'Ethereum Sepolia',
        destinationChainId: 80002,
        destinationChainName: 'Polygon Amoy',
        protocol: 'LayerZero v2 (EndpointV2)'
      }
    ];
  }

  /**
   * Retrieves or ingests a cross-chain verification trail.
   */
  public async getTrail(sourceChainId: number, sourceTxHash: string): Promise<DurableTrailResponse> {
    const url = `${this.baseUrl}/v1/trails/${sourceChainId}/${sourceTxHash.toLowerCase()}`;
    const res = await this.fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Failed to fetch trail: HTTP ${res.status}`);
    }

    return (await res.json()) as DurableTrailResponse;
  }

  /**
   * Retrieves a specific claim by ID.
   */
  public async getClaim(claimId: string): Promise<ClaimRecord> {
    const url = `${this.baseUrl}/v1/claims/${encodeURIComponent(claimId)}`;
    const res = await this.fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Claim not found: HTTP ${res.status}`);
    }

    return (await res.json()) as ClaimRecord;
  }

  /**
   * Retrieves a specific evidence record by ID.
   */
  public async getEvidence(evidenceId: string): Promise<EvidenceRecord> {
    const url = `${this.baseUrl}/v1/evidence/${encodeURIComponent(evidenceId)}`;
    const res = await this.fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Evidence not found: HTTP ${res.status}`);
    }

    return (await res.json()) as EvidenceRecord;
  }

  /**
   * Retrieves paginated audit history for a trail.
   */
  public async getAuditPage(trailId: string, limit = 10, offset = 0): Promise<AuditPageResult> {
    const url = `${this.baseUrl}/v1/trails/${encodeURIComponent(trailId)}/audit?limit=${limit}&offset=${offset}`;
    const res = await this.fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Failed to fetch audit history: HTTP ${res.status}`);
    }

    return (await res.json()) as AuditPageResult;
  }

  /**
   * Triggers an authorized bounded refresh/re-evaluation on the trail.
   */
  public async refreshTrail(
    trailId: string,
    options?: {
      apiKey?: string;
      idempotencyKey?: string;
      checkReorg?: boolean;
    }
  ): Promise<RefreshResult> {
    const url = `${this.baseUrl}/v1/trails/${encodeURIComponent(trailId)}/refresh`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (options?.apiKey) {
      headers['x-api-key'] = options.apiKey;
    }
    if (options?.idempotencyKey) {
      headers['idempotency-key'] = options.idempotencyKey;
    }

    const res = await this.fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ checkReorg: options?.checkReorg ?? true })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Refresh failed: HTTP ${res.status}`);
    }

    return (await res.json()) as RefreshResult;
  }
}
