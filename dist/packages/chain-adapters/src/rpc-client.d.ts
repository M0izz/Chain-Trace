export interface RpcBlock {
    number: number;
    hash: string;
    parentHash: string;
    timestamp: number;
    receiptsRoot?: string;
    stateRoot?: string;
}
export interface RpcTransaction {
    hash: string;
    from: string;
    to: string | null;
    value: string;
    blockNumber: number;
    blockHash: string;
    transactionIndex: number;
    input: string;
}
export interface RpcLog {
    address: string;
    topics: string[];
    data: string;
    blockNumber: number;
    transactionHash: string;
    transactionIndex: number;
    blockHash: string;
    logIndex: number;
    removed?: boolean;
}
export interface RpcReceipt {
    transactionHash: string;
    transactionIndex: number;
    blockHash: string;
    blockNumber: number;
    from: string;
    to: string | null;
    status: number;
    logs: RpcLog[];
    contractAddress?: string | null;
}
export interface RpcLogFilter {
    fromBlock?: number | string;
    toBlock?: number | string;
    address?: string;
    topics?: (string | string[] | null)[];
}
export interface RpcClientOptions {
    rpcUrl: string;
    expectedChainId: number;
    timeoutMs?: number;
    maxRetries?: number;
    backoffBaseMs?: number;
    fetchFn?: typeof fetch;
}
/**
 * Read-Only JSON-RPC 2.0 Client with validation, retries, and timeout controls.
 */
export declare class ReadOnlyRpcClient {
    private readonly rpcUrl;
    readonly expectedChainId: number;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly backoffBaseMs;
    private readonly fetchFn;
    private verifiedChainId;
    constructor(options: RpcClientOptions);
    /**
     * Internal JSON-RPC call with timeout and exponential backoff
     */
    call<T>(method: string, params?: unknown[]): Promise<T>;
    /**
     * Validates that the connected RPC matches the configured chain ID.
     */
    validateChainId(): Promise<number>;
    getChainId(): Promise<number>;
    getBlockByNumber(blockNumber: number | 'latest' | 'finalized' | 'safe', includeTxs?: boolean): Promise<RpcBlock | null>;
    getBlockByHash(blockHash: string, includeTxs?: boolean): Promise<RpcBlock | null>;
    getTransactionByHash(txHash: string): Promise<RpcTransaction | null>;
    getTransactionReceipt(txHash: string): Promise<RpcReceipt | null>;
    getLogs(filter: RpcLogFilter): Promise<RpcLog[]>;
    private ensureChainIdVerified;
    private normalizeBlock;
    private normalizeTx;
    private normalizeReceipt;
    private normalizeLog;
    private sleep;
}
