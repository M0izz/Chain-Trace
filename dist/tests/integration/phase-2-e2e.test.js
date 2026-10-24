"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../../packages/chain-adapters/src/index.js");
const index_js_2 = require("../../packages/dependency-engine/src/index.js");
const index_js_3 = require("../../packages/verification/src/index.js");
(0, vitest_1.describe)('Phase 2 — End-to-End Real Chain Integration (Section 2.5 & 2.6)', () => {
    const guid = '0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
    const sourceTxHash = '0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d';
    const destTxHash = '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c';
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new index_js_2.DependencyEngine();
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.EVENT_INCLUSION, index_js_3.evaluateEventInclusionPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.SOURCE_FINALITY, index_js_3.evaluateSourceFinalityPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.MESSAGE_MATCH, index_js_3.evaluateMessageMatchPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.DESTINATION_EXECUTION, index_js_3.evaluateDestinationExecutionPolicy);
        engine.registerPolicyEvaluator(index_js_3.POLICY_IDS.PATH_SUPPORT, index_js_3.evaluatePathSupportPolicy);
    });
    function buildMockClients(options) {
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
        const sourceFetch = async (_url, opts) => {
            const body = JSON.parse(opts.body);
            const m = body.method;
            if (m === 'eth_chainId')
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0xaa36a7' }), { status: 200 });
            if (m === 'eth_getTransactionByHash') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: { hash: sourceTxHash, blockNumber: '0x52b414', blockHash: '0xsource-block-hash-1' }
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
                        blockHash: '0xsource-block-hash-1',
                        logs: [
                            {
                                address: index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.sourceChain.endpointAddress,
                                topics: [index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetSentSignature],
                                data: rawData,
                                blockNumber: '0x52b414',
                                blockHash: '0xsource-block-hash-1',
                                transactionHash: sourceTxHash,
                                transactionIndex: '0x1',
                                logIndex: '0x0'
                            }
                        ]
                    }
                }), { status: 200 });
            }
            if (m === 'eth_getBlockByHash') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: { number: '0x52b414', hash: '0xsource-block-hash-1', timestamp: '0x671a3000' }
                }), { status: 200 });
            }
            if (m === 'eth_getBlockByNumber') {
                if (body.params[0] === '0x52b414' && options?.reorgNewHash) {
                    // Simulated reorg: new canonical block hash!
                    return new Response(JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        result: { number: '0x52b414', hash: options.reorgNewHash, timestamp: '0x671a3000' }
                    }), { status: 200 });
                }
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: { number: '0x52b430', hash: '0xsource-head', timestamp: '0x671a3050' } // 28 confirmations
                }), { status: 200 });
            }
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }), { status: 200 });
        };
        const destFetch = async (_url, opts) => {
            const body = JSON.parse(opts.body);
            const m = body.method;
            if (m === 'eth_chainId')
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x13882' }), { status: 200 });
            const effectiveGuid = options?.mismatchGuid ?? guid;
            if (m === 'eth_getTransactionReceipt') {
                if (options?.delivered === false) {
                    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }), { status: 200 });
                }
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: {
                        transactionHash: destTxHash,
                        status: '0x1',
                        blockNumber: '0x9626dc',
                        blockHash: '0xdest-block-hash',
                        logs: [
                            {
                                address: index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.destinationChain.endpointAddress,
                                topics: [
                                    index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetDeliveredSignature,
                                    effectiveGuid,
                                    '0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8',
                                    '0x0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc'
                                ],
                                data: '0x',
                                blockNumber: '0x9626dc',
                                blockHash: '0xdest-block-hash',
                                transactionHash: destTxHash,
                                transactionIndex: '0x1',
                                logIndex: '0x1'
                            }
                        ]
                    }
                }), { status: 200 });
            }
            if (m === 'eth_getBlockByHash') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: { number: '0x9626dc', hash: '0xdest-block-hash', timestamp: '0x671a3100' }
                }), { status: 200 });
            }
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }), { status: 200 });
        };
        const sourceRpc = new index_js_1.ReadOnlyRpcClient({ rpcUrl: 'https://sepolia-mock', expectedChainId: 11155111, fetchFn: sourceFetch });
        const destinationRpc = new index_js_1.ReadOnlyRpcClient({ rpcUrl: 'https://amoy-mock', expectedChainId: 80002, fetchFn: destFetch });
        return new index_js_1.LayerZeroV2Adapter({ sourceRpc, destinationRpc });
    }
    (0, vitest_1.it)('completes end-to-end trail where all 5 claims become VERIFIED', async () => {
        const adapter = buildMockClients();
        const service = new index_js_1.CrossChainTrailService(adapter, engine);
        const result = await service.ingestAndVerifyTrail({
            sourceTxHash,
            destTxHash
        });
        (0, vitest_1.expect)(result.isComplete).toBe(true);
        (0, vitest_1.expect)(result.statusSummary.sourceIncluded).toBe('VERIFIED');
        (0, vitest_1.expect)(result.statusSummary.sourceFinalized).toBe('VERIFIED');
        (0, vitest_1.expect)(result.statusSummary.messageMatched).toBe('VERIFIED');
        (0, vitest_1.expect)(result.statusSummary.destinationExecuted).toBe('VERIFIED');
        (0, vitest_1.expect)(result.statusSummary.pathSupported).toBe('VERIFIED');
        // Confirm full trail query returns all components
        (0, vitest_1.expect)(result.trail.events.length).toBe(2);
        (0, vitest_1.expect)(result.trail.claims.length).toBe(5);
        (0, vitest_1.expect)(result.trail.evidence.length).toBeGreaterThanOrEqual(3);
    });
    (0, vitest_1.it)('handles inflight/unexecuted destination transaction with INCONCLUSIVE (never falsely invalid)', async () => {
        const adapter = buildMockClients({ delivered: false });
        const service = new index_js_1.CrossChainTrailService(adapter, engine);
        const result = await service.ingestAndVerifyTrail({ sourceTxHash });
        (0, vitest_1.expect)(result.isComplete).toBe(false);
        (0, vitest_1.expect)(result.statusSummary.sourceIncluded).toBe('VERIFIED');
        (0, vitest_1.expect)(result.statusSummary.sourceFinalized).toBe('VERIFIED');
        // Destination execution is INCONCLUSIVE because it is inflight or not indexed yet
        (0, vitest_1.expect)(result.statusSummary.destinationExecuted).toBe('INCONCLUSIVE');
        (0, vitest_1.expect)(result.statusSummary.pathSupported).toBe('INCONCLUSIVE');
    });
    (0, vitest_1.it)('detects source block reorg and marks affected claims REVALIDATION_REQUIRED while preserving destination fact', async () => {
        const reorgNewHash = '0xNEW_CANONICAL_BLOCK_HASH_AFTER_REORG';
        const adapter = buildMockClients({ reorgNewHash });
        const service = new index_js_1.CrossChainTrailService(adapter, engine);
        // Initial happy path
        await service.ingestAndVerifyTrail({ sourceTxHash, destTxHash });
        const destExecClaimBefore = engine.getClaim(`claim:80002:dest-exec:${guid}`);
        (0, vitest_1.expect)(destExecClaimBefore.status).toBe('VERIFIED');
        // Check source reorg at block 5420100 (0x52b414)
        const reorgDetected = await service.checkSourceReorg(0x52b414);
        (0, vitest_1.expect)(reorgDetected).toBe(true);
        // Dependent claims must be marked REVALIDATION_REQUIRED
        const srcFinalized = engine.getClaim(`claim:11155111:finalized:${sourceTxHash.toLowerCase()}`);
        const msgMatch = engine.getClaim(`claim:lz2:match:${guid}`);
        const pathClaim = engine.getClaim(`claim:lz2:path:${guid}`);
        (0, vitest_1.expect)(srcFinalized.status).toBe('REVALIDATION_REQUIRED');
        (0, vitest_1.expect)(msgMatch.status).toBe('REVALIDATION_REQUIRED');
        (0, vitest_1.expect)(pathClaim.status).toBe('REVALIDATION_REQUIRED');
        // Independent destination execution fact remains PRESERVED in status VERIFIED!
        const destExecClaimAfter = engine.getClaim(`claim:80002:dest-exec:${guid}`);
        (0, vitest_1.expect)(destExecClaimAfter.status).toBe('VERIFIED');
    });
    (0, vitest_1.it)('ensures ingestion is idempotent: repeated polling creates 0 duplicate claims or audit transitions', async () => {
        const adapter = buildMockClients();
        const service = new index_js_1.CrossChainTrailService(adapter, engine);
        const initial = await service.ingestAndVerifyTrail({ sourceTxHash, destTxHash });
        const initialStats = engine.getGraphStats();
        // Re-ingest exact same transaction trail
        const second = await service.ingestAndVerifyTrail({ sourceTxHash, destTxHash });
        const afterStats = engine.getGraphStats();
        (0, vitest_1.expect)(initial.isComplete).toBe(true);
        (0, vitest_1.expect)(second.isComplete).toBe(true);
        (0, vitest_1.expect)(afterStats.totalClaims).toBe(initialStats.totalClaims);
        (0, vitest_1.expect)(afterStats.totalEdges).toBe(initialStats.totalEdges);
        (0, vitest_1.expect)(afterStats.totalEvents).toBe(initialStats.totalEvents);
    });
    (0, vitest_1.it)('rejects mismatched message GUID with INVALID status and failure reason', async () => {
        const mismatchedGuid = '0x9999999999999999999999999999999999999999999999999999999999999999';
        const adapter = buildMockClients({ mismatchGuid: mismatchedGuid });
        const service = new index_js_1.CrossChainTrailService(adapter, engine);
        const result = await service.ingestAndVerifyTrail({ sourceTxHash, destTxHash });
        (0, vitest_1.expect)(result.statusSummary.messageMatched).toBe('INVALID');
        (0, vitest_1.expect)(result.statusSummary.pathSupported).toBe('INVALID');
        (0, vitest_1.expect)(result.isComplete).toBe(false);
        const msgClaim = engine.getClaim(`claim:lz2:match:${guid}`);
        (0, vitest_1.expect)(msgClaim.status_reason.code).toBe('MESSAGE_ID_MISMATCH');
    });
});
