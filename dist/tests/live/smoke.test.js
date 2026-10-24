import { describe, expect, it } from 'vitest';
import { LAYERZERO_V2_SEPOLIA_AMOY_PROFILE, ReadOnlyRpcClient } from '../../packages/chain-adapters/src/index.js';
describe('Phase 2 — Read-Only Live Smoke Tests (Opt-In)', () => {
    const isEnabled = process.env.ENABLE_LIVE_SMOKE_TESTS === 'true';
    it.skipIf(!isEnabled)('queries live Sepolia RPC block number and chain ID', async () => {
        const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.sourceChain.defaultRpcUrl;
        const client = new ReadOnlyRpcClient({
            rpcUrl: sepoliaRpcUrl,
            expectedChainId: 11155111,
            timeoutMs: 8000
        });
        const chainId = await client.validateChainId();
        expect(chainId).toBe(11155111);
        const block = await client.getBlockByNumber('latest');
        expect(block).toBeDefined();
        expect(block?.number).toBeGreaterThan(0);
        expect(block?.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
    it.skipIf(!isEnabled)('queries live Polygon Amoy RPC block number and chain ID', async () => {
        const amoyRpcUrl = process.env.AMOY_RPC_URL || LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.destinationChain.defaultRpcUrl;
        const client = new ReadOnlyRpcClient({
            rpcUrl: amoyRpcUrl,
            expectedChainId: 80002,
            timeoutMs: 8000
        });
        const chainId = await client.validateChainId();
        expect(chainId).toBe(80002);
        const block = await client.getBlockByNumber('latest');
        expect(block).toBeDefined();
        expect(block?.number).toBeGreaterThan(0);
        expect(block?.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
});
