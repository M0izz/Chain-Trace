import { createHash } from 'node:crypto';
export const LAYERZERO_V2_SEPOLIA_AMOY_PROFILE = {
    version: '1.0.0',
    sourceChain: {
        chainId: 11155111,
        name: 'Ethereum Sepolia',
        endpointId: 40161,
        endpointAddress: '0x6edce65403992e310a62460808c4b910d972f10f',
        finalityBlocks: 12,
        defaultRpcUrl: 'https://rpc.sepolia.org'
    },
    destinationChain: {
        chainId: 80002,
        name: 'Polygon Amoy',
        endpointId: 40267,
        endpointAddress: '0x6edce65403992e310a62460808c4b910d972f10f',
        finalityBlocks: 16,
        defaultRpcUrl: 'https://rpc-amoy.polygon.technology'
    },
    events: {
        packetSentSignature: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
        packetDeliveredSignature: '0x3e18a03f443b0d2d3a0889f8990176ef95779ecba4313fa5c052ca2e646fb886'
    },
    policyVersion: '1.0.0',
    trustModel: {
        rpcHonestyRequired: true,
        dvnQuorumAssumed: true,
        independentChecks: [
            'Transaction receipt status == 1',
            'Log contract address matches authorized EndpointV2',
            'Event topic0 signature matches protocol definition',
            'Packet GUID matches exactly across source and destination',
            'Source EID and Destination EID domain separation verified',
            'Confirmation/finality block count threshold checked'
        ],
        unsupportedChecks: [
            'Pure off-chain consensus light-client verification',
            'Physical DVN private key hardware security validation',
            'Arbitrary application-level smart contract state invariants'
        ]
    }
};
/**
 * Calculates or formats a 32-byte GUID identifier
 */
export function formatGuid(guid) {
    const clean = guid.toLowerCase().trim();
    if (clean.startsWith('0x')) {
        return clean;
    }
    return `0x${clean}`;
}
/**
 * Computes deterministic canonical content hash of raw payload bytes
 */
export function computeContentHash(data) {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return '0x' + createHash('sha256').update(content).digest('hex');
}
