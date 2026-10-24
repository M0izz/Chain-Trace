import { EventRecord, EvidenceRecord } from '../../domain/src/index.js';
import { DecodedPacketDelivered, DecodedPacketSent } from './decoder.js';
import { LayerZeroV2Profile } from './profile.js';
import { ReadOnlyRpcClient, RpcBlock } from './rpc-client.js';
export interface SourceEvidenceResult {
    sourceEvent: EventRecord;
    receiptEvidence: EvidenceRecord;
    finalityEvidence: EvidenceRecord;
    decodedPacket: DecodedPacketSent;
    confirmationCount: number;
    block: RpcBlock;
}
export interface DestinationEvidenceResult {
    destinationEvent?: EventRecord;
    receiptEvidence?: EvidenceRecord;
    decodedPacket?: DecodedPacketDelivered;
    status: 'FOUND' | 'NOT_FOUND' | 'AMBIGUOUS' | 'MISMATCH';
    block?: RpcBlock;
    reason?: string;
}
export interface CrossChainAdapterOptions {
    sourceRpc: ReadOnlyRpcClient;
    destinationRpc: ReadOnlyRpcClient;
    profile?: LayerZeroV2Profile;
}
/**
 * LayerZero v2 Cross-Chain Protocol Adapter (Sepolia -> Polygon Amoy)
 */
export declare class LayerZeroV2Adapter {
    readonly sourceRpc: ReadOnlyRpcClient;
    readonly destinationRpc: ReadOnlyRpcClient;
    readonly profile: LayerZeroV2Profile;
    constructor(options: CrossChainAdapterOptions);
    /**
     * Fetches, validates, and decodes source chain evidence from a transaction hash.
     */
    getSourceEvidence(sourceTxHash: string): Promise<SourceEvidenceResult>;
    /**
     * Resolves destination execution evidence either by explicit destTxHash or by GUID topic search.
     */
    getDestinationEvidence(params: {
        guid: string;
        destTxHash?: string;
        searchRange?: {
            fromBlock: number;
            toBlock: number;
        };
    }): Promise<DestinationEvidenceResult>;
}
