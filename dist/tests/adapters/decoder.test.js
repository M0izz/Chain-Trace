"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../../packages/chain-adapters/src/index.js");
(0, vitest_1.describe)('Phase 2 — LayerZero v2 Event Decoder (Section 2.3 & 2.4)', () => {
    // Helper to build realistic ABI-encoded PacketSent data
    function buildPacketSentLogData(params) {
        // Layout in ABI encoding:
        // head word 0: offset to encodedPayload (0x60 = 96 bytes)
        // head word 1: offset to options (0x120)
        // head word 2: sendLibrary address (32 bytes)
        const word0 = '0000000000000000000000000000000000000000000000000000000000000060';
        const word1 = '0000000000000000000000000000000000000000000000000000000000000120';
        const word2 = '0000000000000000000000001111111111111111111111111111111111111111';
        // Packet header:
        // nonce: 8 bytes (16 hex chars)
        const nonceHex = params.nonce.toString(16).padStart(16, '0');
        // srcEid: 4 bytes (8 hex chars)
        const srcEidHex = params.srcEid.toString(16).padStart(8, '0');
        // sender: 32 bytes (64 hex chars)
        const senderHex = params.sender.replace(/^0x/, '').padStart(64, '0');
        // dstEid: 4 bytes (8 hex chars)
        const dstEidHex = params.dstEid.toString(16).padStart(8, '0');
        // receiver: 32 bytes (64 hex chars)
        const receiverHex = params.receiver.replace(/^0x/, '').padStart(64, '0');
        // guid: 32 bytes (64 hex chars)
        const guidHex = params.guid.replace(/^0x/, '').padEnd(64, '0');
        const payloadBytes = nonceHex + srcEidHex + senderHex + dstEidHex + receiverHex + guidHex;
        const payloadLength = (payloadBytes.length / 2).toString(16).padStart(64, '0');
        // Options length 0
        const optionsLen = '0000000000000000000000000000000000000000000000000000000000000000';
        return '0x' + word0 + word1 + word2 + payloadLength + payloadBytes + optionsLen;
    }
    (0, vitest_1.it)('correctly decodes LayerZero v2 PacketSent event fields', () => {
        const rawData = buildPacketSentLogData({
            nonce: 42,
            srcEid: 40161,
            sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
            dstEid: 40267,
            receiver: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
            guid: '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899'
        });
        const log = {
            address: index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.sourceChain.endpointAddress,
            topics: [index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetSentSignature],
            data: rawData,
            blockNumber: 5420100,
            transactionHash: '0xsource-tx',
            transactionIndex: 1,
            blockHash: '0xsource-block',
            logIndex: 3
        };
        const decoded = (0, index_js_1.decodePacketSent)(log);
        (0, vitest_1.expect)(decoded.guid).toBe('0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899');
        (0, vitest_1.expect)(decoded.nonce).toBe(42);
        (0, vitest_1.expect)(decoded.srcEid).toBe(40161);
        (0, vitest_1.expect)(decoded.dstEid).toBe(40267);
        (0, vitest_1.expect)(decoded.sender).toContain('70997970c51812dc3a010c7d01b50e0d17dc79c8');
        (0, vitest_1.expect)(decoded.receiver).toContain('3c44cdddb6a900fa2b585dd299e03d12fa4293bc');
        (0, vitest_1.expect)(decoded.logIndex).toBe(3);
    });
    (0, vitest_1.it)('correctly decodes LayerZero v2 PacketDelivered event fields', () => {
        const guid = '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
        const origin = '0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8';
        const receiver = '0x0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc';
        const log = {
            address: index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.destinationChain.endpointAddress,
            topics: [
                index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetDeliveredSignature,
                guid,
                origin,
                receiver
            ],
            data: '0x',
            blockNumber: 9840220,
            transactionHash: '0xdest-tx',
            transactionIndex: 2,
            blockHash: '0xdest-block',
            logIndex: 1
        };
        const decoded = (0, index_js_1.decodePacketDelivered)(log);
        (0, vitest_1.expect)(decoded.guid).toBe(guid);
        (0, vitest_1.expect)(decoded.origin).toBe('0x70997970c51812dc3a010c7d01b50e0d17dc79c8');
        (0, vitest_1.expect)(decoded.receiver).toBe('0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc');
        (0, vitest_1.expect)(decoded.logIndex).toBe(1);
    });
    (0, vitest_1.it)('rejects log with invalid topic0 signature with EventDecodeError', () => {
        const log = {
            address: '0xendpoint',
            topics: ['0xINVALID_TOPIC_SIGNATURE'],
            data: '0x00',
            blockNumber: 100,
            transactionHash: '0xtx',
            transactionIndex: 0,
            blockHash: '0xblock',
            logIndex: 0
        };
        (0, vitest_1.expect)(() => (0, index_js_1.decodePacketSent)(log)).toThrow(index_js_1.EventDecodeError);
        (0, vitest_1.expect)(() => (0, index_js_1.decodePacketDelivered)(log)).toThrow(index_js_1.EventDecodeError);
    });
    (0, vitest_1.it)('rejects truncated log data with EventDecodeError', () => {
        const log = {
            address: index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.sourceChain.endpointAddress,
            topics: [index_js_1.LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetSentSignature],
            data: '0x1234', // Truncated
            blockNumber: 100,
            transactionHash: '0xtx',
            transactionIndex: 0,
            blockHash: '0xblock',
            logIndex: 0
        };
        (0, vitest_1.expect)(() => (0, index_js_1.decodePacketSent)(log)).toThrow(index_js_1.EventDecodeError);
    });
});
