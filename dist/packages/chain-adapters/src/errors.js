"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageMismatchError = exports.EventDecodeError = exports.ReceiptNotSuccessfulError = exports.TransactionNotFoundError = exports.RpcRateLimitError = exports.RpcTimeoutError = exports.ChainIdMismatchError = exports.RpcClientError = void 0;
class RpcClientError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'RpcClientError';
        this.code = code;
    }
}
exports.RpcClientError = RpcClientError;
class ChainIdMismatchError extends RpcClientError {
    constructor(expected, actual) {
        super('CHAIN_ID_MISMATCH', `Configured chain ID ${expected} does not match returned RPC chain ID ${actual}`);
        this.name = 'ChainIdMismatchError';
    }
}
exports.ChainIdMismatchError = ChainIdMismatchError;
class RpcTimeoutError extends RpcClientError {
    constructor(method, timeoutMs) {
        super('RPC_TIMEOUT', `RPC request to ${method} timed out after ${timeoutMs}ms`);
        this.name = 'RpcTimeoutError';
    }
}
exports.RpcTimeoutError = RpcTimeoutError;
class RpcRateLimitError extends RpcClientError {
    constructor(providerUrl) {
        super('RATE_LIMITED', `RPC provider rate limit exceeded (HTTP 429) on ${providerUrl}`);
        this.name = 'RpcRateLimitError';
    }
}
exports.RpcRateLimitError = RpcRateLimitError;
class TransactionNotFoundError extends RpcClientError {
    constructor(txHash) {
        super('TX_NOT_FOUND', `Transaction not found on chain: ${txHash}`);
        this.name = 'TransactionNotFoundError';
    }
}
exports.TransactionNotFoundError = TransactionNotFoundError;
class ReceiptNotSuccessfulError extends RpcClientError {
    constructor(txHash, status) {
        super('RECEIPT_NOT_SUCCESSFUL', `Transaction ${txHash} reverted or failed with receipt status: ${status}`);
        this.name = 'ReceiptNotSuccessfulError';
    }
}
exports.ReceiptNotSuccessfulError = ReceiptNotSuccessfulError;
class EventDecodeError extends RpcClientError {
    constructor(reason) {
        super('EVENT_DECODE_FAILED', `Failed to decode protocol event: ${reason}`);
        this.name = 'EventDecodeError';
    }
}
exports.EventDecodeError = EventDecodeError;
class MessageMismatchError extends RpcClientError {
    constructor(srcId, dstId) {
        super('MESSAGE_ID_MISMATCH', `Source message identifier ${srcId} does not match destination identifier ${dstId}`);
        this.name = 'MessageMismatchError';
    }
}
exports.MessageMismatchError = MessageMismatchError;
