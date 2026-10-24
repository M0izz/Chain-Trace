import { EventDecodeError } from './errors.js';
import { LAYERZERO_V2_SEPOLIA_AMOY_PROFILE } from './profile.js';
/**
 * Strips 0x and standardizes hex strings
 */
function cleanHex(h) {
    return h.startsWith('0x') ? h.slice(2) : h;
}
/**
 * Decodes a LayerZero v2 PacketSent log event.
 * ABI: event PacketSent(bytes encodedPayload, bytes options, address sendLibrary)
 */
export function decodePacketSent(log) {
    const expectedSig = LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetSentSignature.toLowerCase();
    if (!log.topics || log.topics.length === 0 || log.topics[0].toLowerCase() !== expectedSig) {
        throw new EventDecodeError(`Topic 0 does not match PacketSent signature`);
    }
    const rawData = cleanHex(log.data || '');
    if (rawData.length < 128) {
        throw new EventDecodeError(`Log data too short for ABI encoded PacketSent: ${rawData.length} chars`);
    }
    // In standard ABI encoding for (bytes, bytes, address):
    // word 0 (0..64): offset to encodedPayload
    // word 1 (64..128): offset to options
    // word 2 (128..192): sendLibrary address
    // Then at payload offset: length of bytes, followed by packed header
    try {
        const payloadOffsetBytes = parseInt(rawData.slice(0, 64), 16);
        const payloadOffsetChars = payloadOffsetBytes * 2;
        if (rawData.length < payloadOffsetChars + 64) {
            throw new EventDecodeError(`Offset points outside log data bounds`);
        }
        const payloadLengthBytes = parseInt(rawData.slice(payloadOffsetChars, payloadOffsetChars + 64), 16);
        const payloadStartChars = payloadOffsetChars + 64;
        const payloadEndChars = payloadStartChars + payloadLengthBytes * 2;
        const payloadHex = rawData.slice(payloadStartChars, payloadEndChars);
        // LayerZero v2 Packet Header layout:
        // nonce: uint64 (8 bytes = 16 hex chars)
        // srcEid: uint32 (4 bytes = 8 hex chars)
        // sender: bytes32 (32 bytes = 64 hex chars)
        // dstEid: uint32 (4 bytes = 8 hex chars)
        // receiver: bytes32 (32 bytes = 64 hex chars)
        // guid: bytes32 (32 bytes = 64 hex chars)
        if (payloadHex.length < 16 + 8 + 64 + 8 + 64 + 64) {
            throw new EventDecodeError(`Packet payload too short for LayerZero v2 header: ${payloadHex.length} chars`);
        }
        let cursor = 0;
        const nonceHex = payloadHex.slice(cursor, cursor + 16);
        cursor += 16;
        const srcEidHex = payloadHex.slice(cursor, cursor + 8);
        cursor += 8;
        const senderHex = payloadHex.slice(cursor, cursor + 64);
        cursor += 64;
        const dstEidHex = payloadHex.slice(cursor, cursor + 8);
        cursor += 8;
        const receiverHex = payloadHex.slice(cursor, cursor + 64);
        cursor += 64;
        const guidHex = payloadHex.slice(cursor, cursor + 64);
        return {
            guid: `0x${guidHex.toLowerCase()}`,
            nonce: parseInt(nonceHex, 16),
            srcEid: parseInt(srcEidHex, 16),
            sender: `0x${senderHex.toLowerCase()}`,
            dstEid: parseInt(dstEidHex, 16),
            receiver: `0x${receiverHex.toLowerCase()}`,
            rawPayload: `0x${payloadHex}`,
            logIndex: log.logIndex,
            contractAddress: log.address.toLowerCase()
        };
    }
    catch (err) {
        if (err instanceof EventDecodeError)
            throw err;
        throw new EventDecodeError(err instanceof Error ? err.message : String(err));
    }
}
/**
 * Decodes a LayerZero v2 PacketDelivered log event.
 * ABI: event PacketDelivered(bytes32 indexed guid, address indexed origin, address indexed receiver)
 */
export function decodePacketDelivered(log) {
    const expectedSig = LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.events.packetDeliveredSignature.toLowerCase();
    if (!log.topics || log.topics.length < 2 || log.topics[0].toLowerCase() !== expectedSig) {
        throw new EventDecodeError(`Topic 0 does not match PacketDelivered signature`);
    }
    const guid = `0x${cleanHex(log.topics[1]).toLowerCase()}`;
    const origin = log.topics[2] ? `0x${cleanHex(log.topics[2]).slice(24).toLowerCase()}` : '';
    const receiver = log.topics[3] ? `0x${cleanHex(log.topics[3]).slice(24).toLowerCase()}` : '';
    return {
        guid,
        origin,
        receiver,
        logIndex: log.logIndex,
        contractAddress: log.address.toLowerCase()
    };
}
