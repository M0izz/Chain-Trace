import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SqliteStore } from '../../packages/persistence/src/sqlite-store.js';
import { LayerZeroV2Adapter, LAYERZERO_V2_SEPOLIA_AMOY_PROFILE, ReadOnlyRpcClient } from '../../packages/chain-adapters/src/index.js';
import { DurableTrailService } from '../../packages/service/src/durable-trail-service.js';
import { buildApiServer } from '../../packages/api/src/server.js';
import { ChainTraceClient } from '../../packages/ui/src/client.js';
import { DEMO_SCENARIOS } from '../../packages/ui/src/demo-scenarios.js';
describe('Phase 4 — UI Client, Static Explorer & Demo Scenarios', () => {
    const testDbDir = path.resolve(process.cwd(), 'tests', 'fixtures', 'temp');
    const testDbPath = path.join(testDbDir, 'test_ui.db');
    const apiKey = 'test-secret-key-123';
    const guid = '0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
    const sourceTxHash = '0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d';
    const destTxHash = '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c';
    let store;
    let service;
    let app;
    let client;
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
        // Custom fetchFn for the typed client using app.inject()
        const customFetch = async (url, init) => {
            const urlStr = url.toString();
            const pathnameAndQuery = urlStr.replace(/^https?:\/\/[^/]+/, '');
            const method = (init?.method || 'GET');
            const headers = init?.headers || {};
            const payload = init?.body ? String(init.body) : undefined;
            const injectRes = await app.inject({
                method,
                url: pathnameAndQuery,
                headers,
                payload
            });
            return new Response(injectRes.body, {
                status: injectRes.statusCode,
                headers: injectRes.headers
            });
        };
        client = new ChainTraceClient({
            baseUrl: 'http://localhost:3000',
            fetchFn: customFetch
        });
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
    it('serves the static Phase 4 single-page HTML, styles, and script from Fastify', async () => {
        // 1. GET / -> HTML
        const htmlRes = await app.inject({ method: 'GET', url: '/' });
        expect(htmlRes.statusCode).toBe(200);
        expect(htmlRes.headers['content-type']).toContain('text/html');
        expect(htmlRes.body).toContain('ChainTrace');
        expect(htmlRes.body).toContain('Claim Dependency Graph');
        // 2. GET /assets/styles.css -> CSS
        const cssRes = await app.inject({ method: 'GET', url: '/assets/styles.css' });
        expect(cssRes.statusCode).toBe(200);
        expect(cssRes.headers['content-type']).toContain('text/css');
        expect(cssRes.body).toContain('--bg-app');
        // 3. GET /assets/app.js -> JS
        const jsRes = await app.inject({ method: 'GET', url: '/assets/app.js' });
        expect(jsRes.statusCode).toBe(200);
        expect(jsRes.headers['content-type']).toContain('application/javascript');
        expect(jsRes.body).toContain('DEMO_FIXTURES');
    });
    it('typed client fetches and inspects live trails, claims, evidence, and audit logs', async () => {
        // 1. Fetch trail via typed client
        const trail = await client.getTrail(11155111, sourceTxHash);
        expect(trail.schemaVersion).toBe('1.0');
        expect(trail.status).toBe('VERIFIED');
        expect(trail.claims.length).toBeGreaterThan(0);
        expect(trail.evidence.length).toBeGreaterThan(0);
        // 2. Fetch specific claim
        const firstClaim = await client.getClaim(trail.claims[0].claim_id);
        expect(firstClaim.claim_id).toBe(trail.claims[0].claim_id);
        expect(firstClaim.status).toBe('VERIFIED');
        // 3. Fetch specific evidence
        const firstEvidence = await client.getEvidence(trail.evidence[0].evidence_id);
        expect(firstEvidence.evidence_id).toBe(trail.evidence[0].evidence_id);
        expect(firstEvidence.result).toBe('PASS');
        // 4. Fetch audit page
        const auditPage = await client.getAuditPage(trail.trailId, 10, 0);
        expect(auditPage.trailId).toBe(trail.trailId);
        expect(auditPage.total).toBeGreaterThan(0);
        expect(auditPage.events.length).toBeGreaterThan(0);
        // 5. Authorized refresh
        const refreshRes = await client.refreshTrail(trail.trailId, {
            apiKey,
            idempotencyKey: 'idem-test-ui-001'
        });
        expect(refreshRes.trailId).toBe(trail.trailId);
        expect(refreshRes.newStatus).toBe('VERIFIED');
    });
    it('contains all 4 required Phase 4 demo scenarios with truthful status labels and fixtures', () => {
        expect(DEMO_SCENARIOS.length).toBe(4);
        // Scenario 1: Live verified trail
        const s1 = DEMO_SCENARIOS.find(s => s.id === 'successful-trail');
        expect(s1).toBeDefined();
        expect(s1?.badge).toBe('VERIFIED');
        expect(s1?.isFixture).toBe(false);
        expect(s1?.trail.status).toBe('VERIFIED');
        // Scenario 2: Message mismatch fixture
        const s2 = DEMO_SCENARIOS.find(s => s.id === 'message-mismatch');
        expect(s2).toBeDefined();
        expect(s2?.badge).toBe('INVALID');
        expect(s2?.isFixture).toBe(true);
        expect(s2?.trail.status).toBe('INVALID');
        expect(s2?.trail.claims.some(c => c.status_reason.code === 'MESSAGE_ID_MISMATCH')).toBe(true);
        // Scenario 3: Evidence unavailable / inflight
        const s3 = DEMO_SCENARIOS.find(s => s.id === 'evidence-unavailable');
        expect(s3).toBeDefined();
        expect(s3?.badge).toBe('INCONCLUSIVE');
        expect(s3?.isFixture).toBe(true);
        expect(s3?.trail.status).toBe('INCONCLUSIVE');
        expect(s3?.trail.claims.some(c => c.status_reason.code === 'DESTINATION_NOT_YET_INDEXED')).toBe(true);
        // Scenario 4: Upstream Reorganization & Revalidation
        const s4 = DEMO_SCENARIOS.find(s => s.id === 'dependency-change');
        expect(s4).toBeDefined();
        expect(s4?.badge).toBe('REVALIDATION');
        expect(s4?.isFixture).toBe(true);
        expect(s4?.trail.status).toBe('REVALIDATION_REQUIRED');
        // Source finality requires revalidation
        expect(s4?.trail.claims.find(c => c.claim_type === 'SOURCE_FINALIZED')?.status).toBe('REVALIDATION_REQUIRED');
        // Message match also requires revalidation because it depends on finality
        expect(s4?.trail.claims.find(c => c.claim_type === 'MESSAGE_MATCHED')?.status).toBe('REVALIDATION_REQUIRED');
        // Independent destination execution remains verified!
        expect(s4?.trail.claims.find(c => c.claim_type === 'DESTINATION_EXECUTED')?.status).toBe('VERIFIED');
    });
    it('rejects invalid transaction inputs with clear error message', async () => {
        await expect(client.getTrail(11155111, '0xnot-a-valid-tx-hash')).rejects.toThrow('Invalid sourceTxHash');
    });
});
