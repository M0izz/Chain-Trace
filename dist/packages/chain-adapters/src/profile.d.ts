/**
 * Phase 2 Frozen Integration Profile: LayerZero v2 on Sepolia -> Polygon Amoy
 */
export interface ChainProfile {
    chainId: number;
    name: string;
    endpointId: number;
    endpointAddress: string;
    finalityBlocks: number;
    defaultRpcUrl?: string;
}
export interface LayerZeroV2Profile {
    version: string;
    sourceChain: ChainProfile;
    destinationChain: ChainProfile;
    events: {
        packetSentSignature: string;
        packetDeliveredSignature: string;
    };
    policyVersion: string;
    trustModel: {
        rpcHonestyRequired: boolean;
        dvnQuorumAssumed: boolean;
        independentChecks: string[];
        unsupportedChecks: string[];
    };
}
export declare const LAYERZERO_V2_SEPOLIA_AMOY_PROFILE: LayerZeroV2Profile;
/**
 * Calculates or formats a 32-byte GUID identifier
 */
export declare function formatGuid(guid: string): string;
/**
 * Computes deterministic canonical content hash of raw payload bytes
 */
export declare function computeContentHash(data: string | Uint8Array | Record<string, unknown>): string;
