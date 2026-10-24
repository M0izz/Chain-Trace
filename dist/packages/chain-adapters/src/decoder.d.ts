import { RpcLog } from './rpc-client.js';
export interface DecodedPacketSent {
    guid: string;
    nonce: number;
    srcEid: number;
    sender: string;
    dstEid: number;
    receiver: string;
    rawPayload: string;
    logIndex: number;
    contractAddress: string;
}
export interface DecodedPacketDelivered {
    guid: string;
    origin: string;
    receiver: string;
    logIndex: number;
    contractAddress: string;
}
/**
 * Decodes a LayerZero v2 PacketSent log event.
 * ABI: event PacketSent(bytes encodedPayload, bytes options, address sendLibrary)
 */
export declare function decodePacketSent(log: RpcLog): DecodedPacketSent;
/**
 * Decodes a LayerZero v2 PacketDelivered log event.
 * ABI: event PacketDelivered(bytes32 indexed guid, address indexed origin, address indexed receiver)
 */
export declare function decodePacketDelivered(log: RpcLog): DecodedPacketDelivered;
