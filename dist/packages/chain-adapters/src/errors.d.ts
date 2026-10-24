export declare class RpcClientError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export declare class ChainIdMismatchError extends RpcClientError {
    constructor(expected: number, actual: number);
}
export declare class RpcTimeoutError extends RpcClientError {
    constructor(method: string, timeoutMs: number);
}
export declare class RpcRateLimitError extends RpcClientError {
    constructor(providerUrl: string);
}
export declare class TransactionNotFoundError extends RpcClientError {
    constructor(txHash: string);
}
export declare class ReceiptNotSuccessfulError extends RpcClientError {
    constructor(txHash: string, status: string | number);
}
export declare class EventDecodeError extends RpcClientError {
    constructor(reason: string);
}
export declare class MessageMismatchError extends RpcClientError {
    constructor(srcId: string, dstId: string);
}
