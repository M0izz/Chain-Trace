import { describe, expect, it } from 'vitest';
import { ChainIdMismatchError, ReadOnlyRpcClient, RpcRateLimitError, RpcTimeoutError } from '../../packages/chain-adapters/src/index.js';
describe('Phase 2 — ReadOnlyRpcClient (Section 1.1 & 1.2)', () => {
    it('validates chain ID and throws ChainIdMismatchError on mismatch', async () => {
        const mockFetch = async () => new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: '0x1' // Ethereum Mainnet (1), but expected Sepolia (11155111)
        }), { status: 200 });
        const client = new ReadOnlyRpcClient({
            rpcUrl: 'https://fake-rpc.org',
            expectedChainId: 11155111,
            fetchFn: mockFetch
        });
        await expect(client.validateChainId()).rejects.toThrow(ChainIdMismatchError);
    });
    it('handles provider HTTP 429 rate limit with RpcRateLimitError', async () => {
        const mockFetch = async () => new Response('Too Many Requests', { status: 429 });
        const client = new ReadOnlyRpcClient({
            rpcUrl: 'https://rate-limited-rpc.org',
            expectedChainId: 11155111,
            maxRetries: 1,
            backoffBaseMs: 10,
            fetchFn: mockFetch
        });
        await expect(client.call('eth_blockNumber')).rejects.toThrow(RpcRateLimitError);
    });
    it('handles request timeout with RpcTimeoutError', async () => {
        const hangingFetch = async (_url, options) => {
            return new Promise((_, reject) => {
                options.signal.addEventListener('abort', () => {
                    const err = new Error('The operation was aborted');
                    err.name = 'AbortError';
                    reject(err);
                });
            });
        };
        const client = new ReadOnlyRpcClient({
            rpcUrl: 'https://hanging-rpc.org',
            expectedChainId: 11155111,
            timeoutMs: 50,
            maxRetries: 1,
            backoffBaseMs: 10,
            fetchFn: hangingFetch
        });
        await expect(client.call('eth_blockNumber')).rejects.toThrow(RpcTimeoutError);
    });
    it('retries on transient 500 error and recovers', async () => {
        let calls = 0;
        const transientFetch = async () => {
            calls++;
            if (calls === 1) {
                return new Response('Internal Server Error', { status: 500 });
            }
            return new Response(JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                result: '0xaa36a7' // 11155111
            }), { status: 200 });
        };
        const client = new ReadOnlyRpcClient({
            rpcUrl: 'https://transient-rpc.org',
            expectedChainId: 11155111,
            maxRetries: 2,
            backoffBaseMs: 10,
            fetchFn: transientFetch
        });
        const chainId = await client.getChainId();
        expect(chainId).toBe(11155111);
        expect(calls).toBe(2);
    });
    it('normalizes blocks, transactions, and receipts accurately', async () => {
        const mockFetch = async (_url, opts) => {
            const body = JSON.parse(opts.body);
            const method = body.method;
            if (method === 'eth_chainId') {
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0xaa36a7' }), { status: 200 });
            }
            if (method === 'eth_getTransactionReceipt') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    result: {
                        transactionHash: '0x123',
                        transactionIndex: '0x2',
                        blockHash: '0xabc',
                        blockNumber: '0x100',
                        from: '0xsender',
                        to: '0xreceiver',
                        status: '0x1',
                        logs: []
                    }
                }), { status: 200 });
            }
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }), { status: 200 });
        };
        const client = new ReadOnlyRpcClient({
            rpcUrl: 'https://test-rpc.org',
            expectedChainId: 11155111,
            fetchFn: mockFetch
        });
        const receipt = await client.getTransactionReceipt('0x123');
        expect(receipt).toBeDefined();
        expect(receipt?.blockNumber).toBe(256);
        expect(receipt?.status).toBe(1);
        expect(receipt?.transactionIndex).toBe(2);
    });
});
