import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SqliteStore } from '../../packages/persistence/src/sqlite-store.js';
import { LayerZeroV2Adapter, LAYERZERO_V2_SEPOLIA_AMOY_PROFILE, ReadOnlyRpcClient } from '../../packages/chain-adapters/src/index.js';
import { DurableTrailService } from '../../packages/service/src/durable-trail-service.js';
import { buildApiServer } from '../../packages/api/src/server.js';
describe('Fastify REST API (Phase 3)', () => {
    const testDbDir = path.resolve(process.cwd(), 'tests', 'fixtures', 'temp');
    const testDbPath = path.join(testDbDir, 'test_api.db');
    const apiKey = 'test-secret-key-123';
    const guid = '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
    const sourceTxHash = '0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d';
    const destTxHash = '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c';
    let store;
    let service;
    let app;
    function createMockSourceRpc() {
        const rawData = '0x0000000000000000000000000000000000000000000000000000000000000060' +
            '0000000000000000000000000000000000000000000000000000000000000120' +
            '0000000000000000000000001111111111111111111111111111111111111111' +
            '0000000000000000000000000000000000000000000000000000000000000094' +
            '0000000000000001' +
            '00009ce1' +
            '00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8' +
            '00009d4b' +
            '0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc' +
            guid.replace(/^0x/, '') +
            '0000000000000000000000000000000000000000000000000000000000000000';
        const mockFetch = async (_url, opts) => {
            const body = JSON.parse(opts.body);
            const m = body.method;
            if (m === 'eth_chainId')
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0xaa36a7' }), { status: 200 });
            if (m === 'eth_getTransactionByHash') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: { hash: sourceTxHash, blockNumber: '0x52b414', blockHash: '0xsource-block', transactionIndex: '0x1' }
                }), { status: 200 });
            }
            if (m === 'eth_getTransactionReceipt') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: {
                        transactionHash: sourceTxHash,
                        status: '0x1',
                        blockNumber: '0x52b414',
                        blockHash: '0xsource-block',
                        transactionIndex: '0x1',
                        logs: [
                            {
                                address: LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.sourceChain.endpointAddress,
                                topics: [LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetSentSignature],
                                data: rawData,
                                logIndex: '0x2',
                                transactionHash: sourceTxHash,
                                blockNumber: '0x52b414'
                            }
                        ]
                    }
                }), { status: 200 });
            }
            if (m === 'eth_getBlockByNumber' && body.params[0] === 'latest') {
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { number: '0x52b430', hash: '0xlatest-block' } }), { status: 200 });
            }
            if (m === 'eth_getBlockByHash') {
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { number: '0x52b414', hash: '0xsource-block', timestamp: '0x671a3000' } }), { status: 200 });
            }
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }), { status: 200 });
        };
        return new ReadOnlyRpcClient({
            rpcUrl: 'http://mock-sepolia.test',
            expectedChainId: 11155111,
            fetchFn: mockFetch
        });
    }
    function createMockDestRpc() {
        const mockFetch = async (_url, opts) => {
            const body = JSON.parse(opts.body);
            const m = body.method;
            if (m === 'eth_chainId')
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x13882' }), { status: 200 });
            if (m === 'eth_getTransactionByHash') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: { hash: destTxHash, blockNumber: '0x9626dc', blockHash: '0xdest-block', transactionIndex: '0x2' }
                }), { status: 200 });
            }
            if (m === 'eth_getTransactionReceipt') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: {
                        transactionHash: destTxHash,
                        status: '0x1',
                        blockNumber: '0x9626dc',
                        blockHash: '0xdest-block',
                        transactionIndex: '0x1',
                        logs: [
                            {
                                address: LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.destinationChain.endpointAddress,
                                topics: [
                                    LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetDeliveredSignature,
                                    guid,
                                    '0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8',
                                    '0x0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc'
                                ],
                                data: '0x',
                                logIndex: '0x1',
                                transactionHash: destTxHash,
                                blockNumber: '0x9626dc'
                            }
                        ]
                    }
                }), { status: 200 });
            }
            if (m === 'eth_getLogs') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: [
                        {
                            address: LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.destinationChain.endpointAddress,
                            topics: [
                                LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetDeliveredSignature,
                                guid,
                                '0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8',
                                '0x0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc'
                            ],
                            data: '0x',
                            blockNumber: '0x9626dc',
                            blockHash: '0xdest-block',
                            transactionHash: destTxHash,
                            transactionIndex: '0x1',
                            logIndex: '0x1'
                        }
                    ]
                }), { status: 200 });
            }
            if (m === 'eth_getBlockByNumber' && body.params[0] === 'latest') {
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { number: '0x9626ee', hash: '0xdest-latest' } }), { status: 200 });
            }
            if (m === 'eth_getBlockByHash') {
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { number: '0x9626dc', hash: '0xdest-block', timestamp: '0x671a3100' } }), { status: 200 });
            }
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }), { status: 200 });
        };
        return new ReadOnlyRpcClient({
            rpcUrl: 'http://mock-amoy.test',
            expectedChainId: 80002,
            fetchFn: mockFetch
        });
    }
    beforeEach(() => {
        if (!fs.existsSync(testDbDir)) {
            fs.mkdirSync(testDbDir, { recursive: true });
        }
        if (fs.existsSync(testDbPath)) {
            try {
                fs.unlinkSync(testDbPath);
            }
            catch {
                // ignore
            }
        }
        store = new SqliteStore({ dbPath: testDbPath });
        const adapter = new LayerZeroV2Adapter({
            profile: LAYERZERO_V2_SEPOLIA_AMOY_PROFILE,
            sourceRpc: createMockSourceRpc(),
            destinationRpc: createMockDestRpc()
        });
        service = new DurableTrailService(adapter, store);
        app = buildApiServer({ service, apiKey });
    });
    afterEach(async () => {
        await app.close();
        store.close();
        if (fs.existsSync(testDbPath)) {
            try {
                fs.unlinkSync(testDbPath);
            }
            catch {
                // ignore
            }
        }
    });
    it('GET /health returns 200 and healthy status', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/health'
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.status).toBe('healthy');
        expect(body.timestamp).toBeDefined();
    });
    it('GET /ready returns 200 and ready status', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/ready'
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.status).toBe('ready');
        expect(body.database).toBe('connected');
    });
    it('rejects malformed chainId and txHash with 400 Bad Request', async () => {
        const res1 = await app.inject({
            method: 'GET',
            url: `/v1/trails/invalid-chain/${sourceTxHash}`
        });
        expect(res1.statusCode).toBe(400);
        expect(JSON.parse(res1.body).error).toBe('BAD_REQUEST');
        const res2 = await app.inject({
            method: 'GET',
            url: '/v1/trails/11155111/not-a-valid-tx-hash'
        });
        expect(res2.statusCode).toBe(400);
        expect(JSON.parse(res2.body).error).toBe('BAD_REQUEST');
    });
    it('GET /v1/trails/:sourceChainId/:sourceTxHash fetches, evaluates, persists and caches trail', async () => {
        // 1st request: Ingests live and persists
        const res1 = await app.inject({
            method: 'GET',
            url: `/v1/trails/11155111/${sourceTxHash}`
        });
        expect(res1.statusCode).toBe(200);
        const body1 = JSON.parse(res1.body);
        expect(body1.schemaVersion).toBe('1.0');
        expect(body1.trailId).toBe(`trail:11155111:${sourceTxHash.toLowerCase()}`);
        expect(body1.source.chainId).toBe(11155111);
        expect(body1.source.txHash).toBe(sourceTxHash.toLowerCase());
        expect(body1.status).toBe('VERIFIED');
        expect(body1.claims.length).toBeGreaterThan(0);
        expect(body1.evidence.length).toBeGreaterThan(0);
        expect(body1.isFromCache).toBe(false);
        // 2nd request: Served directly from relational SQLite database
        const res2 = await app.inject({
            method: 'GET',
            url: `/v1/trails/11155111/${sourceTxHash}`
        });
        expect(res2.statusCode).toBe(200);
        const body2 = JSON.parse(res2.body);
        expect(body2.trailId).toBe(body1.trailId);
        expect(body2.isFromCache).toBe(true);
    });
    it('GET /v1/claims/:claimId retrieves persisted claim or 404', async () => {
        // First ingest trail
        await app.inject({
            method: 'GET',
            url: `/v1/trails/11155111/${sourceTxHash}`
        });
        const trail = store.getTrail(11155111, sourceTxHash);
        const claims = store.listClaimsByTrail(trail.trail_id);
        expect(claims.length).toBeGreaterThan(0);
        const firstClaimId = claims[0].claim_id;
        // Existing claim
        const res1 = await app.inject({
            method: 'GET',
            url: `/v1/claims/${firstClaimId}`
        });
        expect(res1.statusCode).toBe(200);
        const claimBody = JSON.parse(res1.body);
        expect(claimBody.claim_id).toBe(firstClaimId);
        // Non-existent claim
        const res2 = await app.inject({
            method: 'GET',
            url: '/v1/claims/non-existent-claim-id'
        });
        expect(res2.statusCode).toBe(404);
        expect(JSON.parse(res2.body).error).toBe('NOT_FOUND');
    });
    it('GET /v1/evidence/:evidenceId retrieves persisted evidence or 404', async () => {
        await app.inject({
            method: 'GET',
            url: `/v1/trails/11155111/${sourceTxHash}`
        });
        const trail = store.getTrail(11155111, sourceTxHash);
        const evidenceList = store.listEvidenceByTrail(trail.trail_id);
        expect(evidenceList.length).toBeGreaterThan(0);
        const firstEvId = evidenceList[0].evidence_id;
        // Existing evidence
        const res1 = await app.inject({
            method: 'GET',
            url: `/v1/evidence/${firstEvId}`
        });
        expect(res1.statusCode).toBe(200);
        const evBody = JSON.parse(res1.body);
        expect(evBody.evidence_id).toBe(firstEvId);
        // Non-existent evidence
        const res2 = await app.inject({
            method: 'GET',
            url: '/v1/evidence/non-existent-evidence-id'
        });
        expect(res2.statusCode).toBe(404);
        expect(JSON.parse(res2.body).error).toBe('NOT_FOUND');
    });
    it('GET /v1/trails/:trailId/audit returns paginated audit events', async () => {
        await app.inject({
            method: 'GET',
            url: `/v1/trails/11155111/${sourceTxHash}`
        });
        const trailId = `trail:11155111:${sourceTxHash.toLowerCase()}`;
        const res = await app.inject({
            method: 'GET',
            url: `/v1/trails/${trailId}/audit?limit=2&offset=0`
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.trailId).toBe(trailId);
        expect(body.limit).toBe(2);
        expect(body.offset).toBe(0);
        expect(body.total).toBeGreaterThan(0);
        expect(Array.isArray(body.events)).toBe(true);
        expect(body.events.length).toBeLessThanOrEqual(2);
    });
    it('POST /v1/trails/:trailId/refresh requires authentication and enforces rate limits & idempotency', async () => {
        await app.inject({
            method: 'GET',
            url: `/v1/trails/11155111/${sourceTxHash}`
        });
        const trailId = `trail:11155111:${sourceTxHash.toLowerCase()}`;
        // 1. Unauthorized request (missing x-api-key)
        const unauthRes = await app.inject({
            method: 'POST',
            url: `/v1/trails/${trailId}/refresh`
        });
        expect(unauthRes.statusCode).toBe(401);
        expect(JSON.parse(unauthRes.body).error).toBe('UNAUTHORIZED');
        // 2. Unauthorized request (invalid x-api-key)
        const badKeyRes = await app.inject({
            method: 'POST',
            url: `/v1/trails/${trailId}/refresh`,
            headers: { 'x-api-key': 'wrong-key' }
        });
        expect(badKeyRes.statusCode).toBe(401);
        // 3. Authorized request with idempotency key
        const idemKey = 'idem-refresh-abc-001';
        const authRes = await app.inject({
            method: 'POST',
            url: `/v1/trails/${trailId}/refresh`,
            headers: {
                'x-api-key': apiKey,
                'idempotency-key': idemKey
            }
        });
        expect(authRes.statusCode).toBe(200);
        const authBody = JSON.parse(authRes.body);
        expect(authBody.trailId).toBe(trailId);
        expect(authBody.newStatus).toBe('VERIFIED');
        // 4. Repeated request with identical idempotency key returns cached result
        const idemRes = await app.inject({
            method: 'POST',
            url: `/v1/trails/${trailId}/refresh`,
            headers: {
                'x-api-key': apiKey,
                'idempotency-key': idemKey
            }
        });
        expect(idemRes.statusCode).toBe(200);
        expect(JSON.parse(idemRes.body)).toEqual(authBody);
        // 5. Rate limit test: trigger multiple requests without idempotency key to trip the limiter
        for (let i = 0; i < 4; i++) {
            await app.inject({
                method: 'POST',
                url: `/v1/trails/${trailId}/refresh`,
                headers: {
                    'x-api-key': apiKey
                }
            });
        }
        // 6th request should trip the 5 req/min rate limit
        const rateLimitRes = await app.inject({
            method: 'POST',
            url: `/v1/trails/${trailId}/refresh`,
            headers: {
                'x-api-key': apiKey
            }
        });
        expect(rateLimitRes.statusCode).toBe(429);
        expect(JSON.parse(rateLimitRes.body).error).toBe('RATE_LIMIT_EXCEEDED');
    });
});
