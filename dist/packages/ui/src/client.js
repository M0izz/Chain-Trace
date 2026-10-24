/**
 * Typed Frontend API Client for ChainTrace Phase 3 REST endpoints.
 * Provides resilient access with typed error mapping and correlation ID extraction.
 */
export class ChainTraceClient {
    baseUrl;
    fetch;
    constructor(options) {
        this.baseUrl = (options?.baseUrl || '').replace(/\/$/, '');
        this.fetch = options?.fetchFn || globalThis.fetch.bind(globalThis);
    }
    getSupportedProfiles() {
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
    async getTrail(sourceChainId, sourceTxHash) {
        const url = `${this.baseUrl}/v1/trails/${sourceChainId}/${sourceTxHash.toLowerCase()}`;
        const res = await this.fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || `Failed to fetch trail: HTTP ${res.status}`);
        }
        return (await res.json());
    }
    /**
     * Retrieves a specific claim by ID.
     */
    async getClaim(claimId) {
        const url = `${this.baseUrl}/v1/claims/${encodeURIComponent(claimId)}`;
        const res = await this.fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || `Claim not found: HTTP ${res.status}`);
        }
        return (await res.json());
    }
    /**
     * Retrieves a specific evidence record by ID.
     */
    async getEvidence(evidenceId) {
        const url = `${this.baseUrl}/v1/evidence/${encodeURIComponent(evidenceId)}`;
        const res = await this.fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || `Evidence not found: HTTP ${res.status}`);
        }
        return (await res.json());
    }
    /**
     * Retrieves paginated audit history for a trail.
     */
    async getAuditPage(trailId, limit = 10, offset = 0) {
        const url = `${this.baseUrl}/v1/trails/${encodeURIComponent(trailId)}/audit?limit=${limit}&offset=${offset}`;
        const res = await this.fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || `Failed to fetch audit history: HTTP ${res.status}`);
        }
        return (await res.json());
    }
    /**
     * Triggers an authorized bounded refresh/re-evaluation on the trail.
     */
    async refreshTrail(trailId, options) {
        const url = `${this.baseUrl}/v1/trails/${encodeURIComponent(trailId)}/refresh`;
        const headers = {
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
        return (await res.json());
    }
}
