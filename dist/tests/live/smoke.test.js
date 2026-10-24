"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../../packages/chain-adapters/src/index.js");
(0, vitest_1.describe)('Phase 2 — Read-Only Live Smoke Tests (Opt-In)', () => {
    const isEnabled = process.env.ENABLE_LIVE_SMOKE_TESTS === 'true';
    vitest_1.it.skipIf(!isEnabled)('queries live Sepolia RPC block number and chain ID', async () => {
        const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.sourceChain.defaultRpcUrl;
        const client = new index_js_1.ReadOnlyRpcClient({
            rpcUrl: sepoliaRpcUrl,
            expectedChainId: 11155111,
            timeoutMs: 8000
        });
        const chainId = await client.validateChainId();
        (0, vitest_1.expect)(chainId).toBe(11155111);
        const block = await client.getBlockByNumber('latest');
        (0, vitest_1.expect)(block).toBeDefined();
        (0, vitest_1.expect)(block?.number).toBeGreaterThan(0);
        (0, vitest_1.expect)(block?.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
    vitest_1.it.skipIf(!isEnabled)('queries live Polygon Amoy RPC block number and chain ID', async () => {
        const amoyRpcUrl = process.env.AMOY_RPC_URL || index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.destinationChain.defaultRpcUrl;
        const client = new index_js_1.ReadOnlyRpcClient({
            rpcUrl: amoyRpcUrl,
            expectedChainId: 80002,
            timeoutMs: 8000
        });
        const chainId = await client.validateChainId();
        (0, vitest_1.expect)(chainId).toBe(80002);
        const block = await client.getBlockByNumber('latest');
        (0, vitest_1.expect)(block).toBeDefined();
        (0, vitest_1.expect)(block?.number).toBeGreaterThan(0);
        (0, vitest_1.expect)(block?.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
});
