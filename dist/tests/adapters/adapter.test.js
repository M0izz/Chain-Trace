import { describe, expect, it } from 'vitest';
import { LAYERZERO_V2_SEPOLIA_AMOY_PROFILE, LayerZeroV2Adapter, ReceiptNotSuccessfulError, ReadOnlyRpcClient } from '../../packages/chain-adapters/src/index.js';
describe('Phase 2 — LayerZeroV2Adapter (Section 2.3 & 2.4)', () => {
    const guid = '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
    const sourceTxHash = '0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d';
    const destTxHash = '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c';
    function createMockSourceRpc(overrides) {
        const rawData = '0x0000000000000000000000000000000000000000000000000000000000000060' +
            '0000000000000000000000000000000000000000000000000000000000000120' +
            '0000000000000000000000001111111111111111111111111111111111111111' +
            '0000000000000000000000000000000000000000000000000000000000000094' + // 148 bytes payload length
            '0000000000000001' + // nonce 1 (8 bytes)
            '00009ce1' + // srcEid 40161 (4 bytes)
            '00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8' + // sender (32 bytes)
            '00009d4b' + // dstEid 40267 (4 bytes)
            '0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc' + // receiver (32 bytes)
            guid.replace(/^0x/, '') + // guid (32 bytes)
            '0000000000000000000000000000000000000000000000000000000000000000'; // options
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
                        status: overrides?.status !== undefined ? `0x${overrides.status.toString(16)}` : '0x1',
                        blockNumber: '0x52b414',
                        blockHash: '0xsource-block',
                        transactionIndex: '0x1',
                        logs: overrides?.omitLogs ? [] : [
                            {
                                address: LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.sourceChain.endpointAddress,
                                topics: [LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetSentSignature],
                                data: rawData,
                                blockNumber: '0x52b414',
                                blockHash: '0xsource-block',
                                transactionHash: sourceTxHash,
                                transactionIndex: '0x1',
                                logIndex: '0x2'
                            }
                        ]
                    }
                }), { status: 200 });
            }
            if (m === 'eth_getBlockByHash') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: {
                        number: '0x52b414', // block 5420052
                        hash: '0xsource-block',
                        parentHash: '0xprev',
                        timestamp: '0x671a3000',
                        receiptsRoot: '0xreceipts-root'
                    }
                }), { status: 200 });
            }
            if (m === 'eth_getBlockByNumber') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: {
                        number: '0x52b430', // block 5420080 (+28 confirmations >= 12)
                        hash: '0xsource-head',
                        parentHash: '0xprev',
                        timestamp: '0x671a3050'
                    }
                }), { status: 200 });
            }
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }), { status: 200 });
        };
        return new ReadOnlyRpcClient({
            rpcUrl: 'https://sepolia-mock',
            expectedChainId: 11155111,
            fetchFn: mockFetch
        });
    }
    function createMockDestRpc(overrides) {
        const mockFetch = async (_url, opts) => {
            const body = JSON.parse(opts.body);
            const m = body.method;
            if (m === 'eth_chainId')
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x13882' }), { status: 200 });
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
                                blockNumber: '0x9626dc',
                                blockHash: '0xdest-block',
                                transactionHash: destTxHash,
                                transactionIndex: '0x1',
                                logIndex: '0x1'
                            }
                        ]
                    }
                }), { status: 200 });
            }
            if (m === 'eth_getBlockByHash' || m === 'eth_getBlockByNumber') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: { number: '0x9626dc', hash: '0xdest-block', parentHash: '0xprev', timestamp: '0x671a3100' }
                }), { status: 200 });
            }
            if (m === 'eth_getLogs') {
                if (overrides?.delivered === false) {
                    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: [] }), { status: 200 });
                }
                if (overrides?.ambiguous) {
                    return new Response(JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        result: [
                            { address: LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.destinationChain.endpointAddress, transactionHash: destTxHash, logIndex: '0x1', topics: [LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetDeliveredSignature, guid] },
                            { address: LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.destinationChain.endpointAddress, transactionHash: '0xdup-tx', logIndex: '0x2', topics: [LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetDeliveredSignature, guid] }
                        ]
                    }), { status: 200 });
                }
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
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }), { status: 200 });
        };
        return new ReadOnlyRpcClient({
            rpcUrl: 'https://amoy-mock',
            expectedChainId: 80002,
            fetchFn: mockFetch
        });
    }
    it('fetches and decodes real-world source evidence with finality confirmation', async () => {
        const adapter = new LayerZeroV2Adapter({
            sourceRpc: createMockSourceRpc(),
            destinationRpc: createMockDestRpc()
        });
        const src = await adapter.getSourceEvidence(sourceTxHash);
        expect(src.sourceEvent).toBeDefined();
        expect(src.sourceEvent.chain_id).toBe(11155111);
        expect(src.decodedPacket.guid).toBe(guid);
        expect(src.receiptEvidence.result).toBe('PASS');
        expect(src.finalityEvidence.result).toBe('PASS');
        expect(src.confirmationCount).toBeGreaterThanOrEqual(12);
    });
    it('rejects reverted transaction with ReceiptNotSuccessfulError', async () => {
        const adapter = new LayerZeroV2Adapter({
            sourceRpc: createMockSourceRpc({ status: 0 }),
            destinationRpc: createMockDestRpc()
        });
        await expect(adapter.getSourceEvidence(sourceTxHash)).rejects.toThrow(ReceiptNotSuccessfulError);
    });
    it('handles missing destination execution as NOT_FOUND (never falsely invalid)', async () => {
        const adapter = new LayerZeroV2Adapter({
            sourceRpc: createMockSourceRpc(),
            destinationRpc: createMockDestRpc({ delivered: false })
        });
        const dest = await adapter.getDestinationEvidence({ guid });
        expect(dest.status).toBe('NOT_FOUND');
        expect(dest.destinationEvent).toBeUndefined();
        expect(dest.reason).toContain('No PacketDelivered log observed');
    });
    it('handles duplicate/ambiguous logs as AMBIGUOUS', async () => {
        const adapter = new LayerZeroV2Adapter({
            sourceRpc: createMockSourceRpc(),
            destinationRpc: createMockDestRpc({ ambiguous: true })
        });
        const dest = await adapter.getDestinationEvidence({ guid });
        expect(dest.status).toBe('AMBIGUOUS');
        expect(dest.reason).toContain('Multiple PacketDelivered logs');
    });
});
