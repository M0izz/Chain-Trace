export class RpcClientError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RpcClientError';
    this.code = code;
  }
}

export class ChainIdMismatchError extends RpcClientError {
  constructor(expected: number, actual: number) {
    super(
      'CHAIN_ID_MISMATCH',
      `Configured chain ID ${expected} does not match returned RPC chain ID ${actual}`
    );
    this.name = 'ChainIdMismatchError';
  }
}

export class RpcTimeoutError extends RpcClientError {
  constructor(method: string, timeoutMs: number) {
    super(
      'RPC_TIMEOUT',
      `RPC request to ${method} timed out after ${timeoutMs}ms`
    );
    this.name = 'RpcTimeoutError';
  }
}

export class RpcRateLimitError extends RpcClientError {
  constructor(providerUrl: string) {
    super(
      'RATE_LIMITED',
      `RPC provider rate limit exceeded (HTTP 429) on ${providerUrl}`
    );
    this.name = 'RpcRateLimitError';
  }
}

export class TransactionNotFoundError extends RpcClientError {
  constructor(txHash: string) {
    super('TX_NOT_FOUND', `Transaction not found on chain: ${txHash}`);
    this.name = 'TransactionNotFoundError';
  }
}

export class ReceiptNotSuccessfulError extends RpcClientError {
  constructor(txHash: string, status: string | number) {
    super(
      'RECEIPT_NOT_SUCCESSFUL',
      `Transaction ${txHash} reverted or failed with receipt status: ${status}`
    );
    this.name = 'ReceiptNotSuccessfulError';
  }
}

export class EventDecodeError extends RpcClientError {
  constructor(reason: string) {
    super('EVENT_DECODE_FAILED', `Failed to decode protocol event: ${reason}`);
    this.name = 'EventDecodeError';
  }
}

export class MessageMismatchError extends RpcClientError {
  constructor(srcId: string, dstId: string) {
    super(
      'MESSAGE_ID_MISMATCH',
      `Source message identifier ${srcId} does not match destination identifier ${dstId}`
    );
    this.name = 'MessageMismatchError';
  }
}
