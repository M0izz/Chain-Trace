import { ChainIdMismatchError, RpcClientError, RpcRateLimitError, RpcTimeoutError } from './errors.js';
/**
 * Read-Only JSON-RPC 2.0 Client with validation, retries, and timeout controls.
 */
export class ReadOnlyRpcClient {
    rpcUrl;
    expectedChainId;
    timeoutMs;
    maxRetries;
    backoffBaseMs;
    fetchFn;
    verifiedChainId = false;
    constructor(options) {
        this.rpcUrl = options.rpcUrl;
        this.expectedChainId = options.expectedChainId;
        this.timeoutMs = options.timeoutMs ?? 5000;
        this.maxRetries = options.maxRetries ?? 3;
        this.backoffBaseMs = options.backoffBaseMs ?? 200;
        this.fetchFn = options.fetchFn ?? globalThis.fetch;
    }
    /**
     * Internal JSON-RPC call with timeout and exponential backoff
     */
    async call(method, params = []) {
        let attempt = 0;
        while (attempt <= this.maxRetries) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
            try {
                const response = await this.fetchFn(this.rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: Date.now() + attempt,
                        method,
                        params
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (response.status === 429) {
                    throw new RpcRateLimitError(this.rpcUrl);
                }
                if (!response.ok) {
                    if (response.status >= 500 && attempt < this.maxRetries) {
                        attempt++;
                        await this.sleep(this.backoffBaseMs * Math.pow(2, attempt));
                        continue;
                    }
                    throw new RpcClientError('HTTP_ERROR', `RPC server returned status ${response.status}: ${response.statusText}`);
                }
                const data = (await response.json());
                if (data.error) {
                    throw new RpcClientError('RPC_ERROR', data.error.message);
                }
                return data.result;
            }
            catch (err) {
                clearTimeout(timeoutId);
                if (err instanceof RpcClientError) {
                    // If rate limited or unrecoverable client error, don't spin endlessly
                    if (err instanceof RpcRateLimitError && attempt < this.maxRetries) {
                        attempt++;
                        await this.sleep(this.backoffBaseMs * Math.pow(2, attempt) * 2);
                        continue;
                    }
                    throw err;
                }
                if (err instanceof Error && err.name === 'AbortError') {
                    if (attempt < this.maxRetries) {
                        attempt++;
                        await this.sleep(this.backoffBaseMs * Math.pow(2, attempt));
                        continue;
                    }
                    throw new RpcTimeoutError(method, this.timeoutMs);
                }
                if (attempt < this.maxRetries) {
                    attempt++;
                    await this.sleep(this.backoffBaseMs * Math.pow(2, attempt));
                    continue;
                }
                throw new RpcClientError('NETWORK_FAILURE', err instanceof Error ? err.message : String(err));
            }
        }
        throw new RpcClientError('MAX_RETRIES_EXCEEDED', `Failed after ${this.maxRetries} retries`);
    }
    /**
     * Validates that the connected RPC matches the configured chain ID.
     */
    async validateChainId() {
        const hexChainId = await this.call('eth_chainId');
        const actualChainId = parseInt(hexChainId, 16);
        if (actualChainId !== this.expectedChainId) {
            throw new ChainIdMismatchError(this.expectedChainId, actualChainId);
        }
        this.verifiedChainId = true;
        return actualChainId;
    }
    async getChainId() {
        const hex = await this.call('eth_chainId');
        return parseInt(hex, 16);
    }
    async getBlockByNumber(blockNumber, includeTxs = false) {
        await this.ensureChainIdVerified();
        const tag = typeof blockNumber === 'number' ? `0x${blockNumber.toString(16)}` : blockNumber;
        const res = await this.call('eth_getBlockByNumber', [tag, includeTxs]);
        return res ? this.normalizeBlock(res) : null;
    }
    async getBlockByHash(blockHash, includeTxs = false) {
        await this.ensureChainIdVerified();
        const res = await this.call('eth_getBlockByHash', [blockHash, includeTxs]);
        return res ? this.normalizeBlock(res) : null;
    }
    async getTransactionByHash(txHash) {
        await this.ensureChainIdVerified();
        const res = await this.call('eth_getTransactionByHash', [txHash]);
        return res ? this.normalizeTx(res) : null;
    }
    async getTransactionReceipt(txHash) {
        await this.ensureChainIdVerified();
        const res = await this.call('eth_getTransactionReceipt', [txHash]);
        return res ? this.normalizeReceipt(res) : null;
    }
    async getLogs(filter) {
        await this.ensureChainIdVerified();
        const formattedFilter = {};
        if (filter.fromBlock !== undefined) {
            formattedFilter.fromBlock =
                typeof filter.fromBlock === 'number'
                    ? `0x${filter.fromBlock.toString(16)}`
                    : filter.fromBlock;
        }
        if (filter.toBlock !== undefined) {
            formattedFilter.toBlock =
                typeof filter.toBlock === 'number'
                    ? `0x${filter.toBlock.toString(16)}`
                    : filter.toBlock;
        }
        if (filter.address)
            formattedFilter.address = filter.address;
        if (filter.topics)
            formattedFilter.topics = filter.topics;
        const res = await this.call('eth_getLogs', [formattedFilter]);
        return (res || []).map((l) => this.normalizeLog(l));
    }
    async ensureChainIdVerified() {
        if (!this.verifiedChainId) {
            await this.validateChainId();
        }
    }
    normalizeBlock(b) {
        return {
            number: parseInt(b.number, 16),
            hash: b.hash,
            parentHash: b.parentHash,
            timestamp: parseInt(b.timestamp, 16),
            receiptsRoot: b.receiptsRoot,
            stateRoot: b.stateRoot
        };
    }
    normalizeTx(t) {
        return {
            hash: t.hash,
            from: t.from,
            to: t.to,
            value: t.value,
            blockNumber: parseInt(t.blockNumber, 16),
            blockHash: t.blockHash,
            transactionIndex: parseInt(t.transactionIndex, 16),
            input: t.input
        };
    }
    normalizeReceipt(r) {
        return {
            transactionHash: r.transactionHash,
            transactionIndex: parseInt(r.transactionIndex, 16),
            blockHash: r.blockHash,
            blockNumber: parseInt(r.blockNumber, 16),
            from: r.from,
            to: r.to,
            status: parseInt(r.status, 16),
            logs: (r.logs || []).map((l) => this.normalizeLog(l)),
            contractAddress: r.contractAddress
        };
    }
    normalizeLog(l) {
        return {
            address: (l.address || '').toLowerCase(),
            topics: l.topics || [],
            data: l.data || '0x',
            blockNumber: parseInt(l.blockNumber, 16),
            transactionHash: l.transactionHash,
            transactionIndex: parseInt(l.transactionIndex, 16),
            blockHash: l.blockHash,
            logIndex: parseInt(l.logIndex, 16),
            removed: l.removed
        };
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
