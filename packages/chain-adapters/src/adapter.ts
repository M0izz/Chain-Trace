import {
  EventRecord,
  EvidenceRecord
} from '../../domain/src/index.js';
import {
  DecodedPacketDelivered,
  DecodedPacketSent,
  decodePacketDelivered,
  decodePacketSent
} from './decoder.js';
import {
  ReceiptNotSuccessfulError,
  TransactionNotFoundError
} from './errors.js';
import {
  computeContentHash,
  LAYERZERO_V2_SEPOLIA_AMOY_PROFILE,
  LayerZeroV2Profile
} from './profile.js';
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
export class LayerZeroV2Adapter {
  public readonly sourceRpc: ReadOnlyRpcClient;
  public readonly destinationRpc: ReadOnlyRpcClient;
  public readonly profile: LayerZeroV2Profile;

  constructor(options: CrossChainAdapterOptions) {
    this.sourceRpc = options.sourceRpc;
    this.destinationRpc = options.destinationRpc;
    this.profile = options.profile ?? LAYERZERO_V2_SEPOLIA_AMOY_PROFILE;
  }

  /**
   * Fetches, validates, and decodes source chain evidence from a transaction hash.
   */
  public async getSourceEvidence(sourceTxHash: string): Promise<SourceEvidenceResult> {
    const tx = await this.sourceRpc.getTransactionByHash(sourceTxHash);
    if (!tx) {
      throw new TransactionNotFoundError(sourceTxHash);
    }

    const receipt = await this.sourceRpc.getTransactionReceipt(sourceTxHash);
    if (!receipt) {
      throw new TransactionNotFoundError(sourceTxHash);
    }

    if (receipt.status !== 1) {
      throw new ReceiptNotSuccessfulError(sourceTxHash, receipt.status);
    }

    const block = await this.sourceRpc.getBlockByHash(receipt.blockHash);
    if (!block) {
      throw new Error(`Containing block not found for hash: ${receipt.blockHash}`);
    }

    // Locate PacketSent log emitted by EndpointV2
    const expectedEndpoint = this.profile.sourceChain.endpointAddress.toLowerCase();
    const packetSentSig = this.profile.events.packetSentSignature.toLowerCase();

    const matchingLog = receipt.logs.find(
      (l) =>
        l.address.toLowerCase() === expectedEndpoint &&
        l.topics[0]?.toLowerCase() === packetSentSig
    );

    if (!matchingLog) {
      throw new Error(
        `Transaction ${sourceTxHash} did not emit PacketSent event on EndpointV2 (${expectedEndpoint})`
      );
    }

    const decodedPacket = decodePacketSent(matchingLog);

    // Compute confirmations
    const latestBlock = await this.sourceRpc.getBlockByNumber('latest');
    const confirmationCount = latestBlock ? latestBlock.number - block.number : 0;
    const isFinalized = confirmationCount >= this.profile.sourceChain.finalityBlocks;

    const sourceEventId = `event:${this.profile.sourceChain.chainId}:${sourceTxHash.toLowerCase()}:${matchingLog.logIndex}`;

    const sourceEvent: EventRecord = {
      event_id: sourceEventId,
      chain_id: this.profile.sourceChain.chainId,
      tx_hash: sourceTxHash.toLowerCase(),
      block_number: block.number,
      block_hash: block.hash,
      event_index: matchingLog.logIndex,
      contract_address: expectedEndpoint,
      event_signature: packetSentSig,
      observed_at: new Date(block.timestamp * 1000).toISOString(),
      payload: {
        guid: decodedPacket.guid,
        nonce: decodedPacket.nonce,
        srcEid: decodedPacket.srcEid,
        sender: decodedPacket.sender,
        dstEid: decodedPacket.dstEid,
        receiver: decodedPacket.receiver
      }
    };

    const receiptEvidence: EvidenceRecord = {
      evidence_id: `evidence:${this.profile.sourceChain.chainId}:receipt:${sourceTxHash.toLowerCase()}`,
      evidence_type: 'RECEIPT_REFERENCE',
      subject_ref: sourceEventId,
      content_hash: computeContentHash({
        txHash: sourceTxHash,
        blockHash: block.hash,
        status: receipt.status,
        receiptsRoot: block.receiptsRoot
      }),
      source_reference: `rpc://${this.profile.sourceChain.name}/receipt/${sourceTxHash}`,
      verification_method: 'TransactionReceiptVerification',
      policy_version: this.profile.policyVersion,
      result: 'PASS',
      checked_at: new Date().toISOString(),
      raw_data: {
        blockNumber: block.number,
        blockHash: block.hash,
        status: receipt.status
      }
    };

    const finalityEvidence: EvidenceRecord = {
      evidence_id: `evidence:${this.profile.sourceChain.chainId}:finality:${block.hash}`,
      evidence_type: 'AUTHENTICATED_HEADER',
      subject_ref: sourceEventId,
      content_hash: computeContentHash({
        blockHash: block.hash,
        confirmationCount,
        threshold: this.profile.sourceChain.finalityBlocks
      }),
      source_reference: `rpc://${this.profile.sourceChain.name}/finality/${block.number}`,
      verification_method: 'BlockConfirmationThreshold',
      policy_version: this.profile.policyVersion,
      result: isFinalized ? 'PASS' : 'INCONCLUSIVE',
      checked_at: new Date().toISOString(),
      raw_data: {
        blockNumber: block.number,
        confirmations: confirmationCount,
        requiredConfirmations: this.profile.sourceChain.finalityBlocks
      },
      reason: isFinalized
        ? 'Finality threshold satisfied'
        : `Pending finality: ${confirmationCount}/${this.profile.sourceChain.finalityBlocks} confirmations`
    };

    return {
      sourceEvent,
      receiptEvidence,
      finalityEvidence,
      decodedPacket,
      confirmationCount,
      block
    };
  }

  /**
   * Resolves destination execution evidence either by explicit destTxHash or by GUID topic search.
   */
  public async getDestinationEvidence(params: {
    guid: string;
    destTxHash?: string;
    searchRange?: { fromBlock: number; toBlock: number };
  }): Promise<DestinationEvidenceResult> {
    const expectedEndpoint = this.profile.destinationChain.endpointAddress.toLowerCase();
    const packetDeliveredSig = this.profile.events.packetDeliveredSignature.toLowerCase();

    if (params.destTxHash) {
      const receipt = await this.destinationRpc.getTransactionReceipt(params.destTxHash);
      if (!receipt) {
        return {
          status: 'NOT_FOUND',
          reason: `Destination transaction ${params.destTxHash} not found`
        };
      }

      if (receipt.status !== 1) {
        return {
          status: 'NOT_FOUND',
          reason: `Destination transaction ${params.destTxHash} reverted with status ${receipt.status}`
        };
      }

      const block = await this.destinationRpc.getBlockByHash(receipt.blockHash);

      const matchingLog = receipt.logs.find(
        (l) =>
          l.address.toLowerCase() === expectedEndpoint &&
          l.topics[0]?.toLowerCase() === packetDeliveredSig &&
          l.topics[1]?.toLowerCase() === params.guid.toLowerCase()
      );

      if (!matchingLog) {
        const otherDeliveredLog = receipt.logs.find(
          (l) =>
            l.address.toLowerCase() === expectedEndpoint &&
            l.topics[0]?.toLowerCase() === packetDeliveredSig
        );
        if (otherDeliveredLog) {
          const otherDecoded = decodePacketDelivered(otherDeliveredLog);
          return {
            status: 'MISMATCH',
            decodedPacket: otherDecoded,
            reason: `Destination transaction delivered different GUID: ${otherDecoded.guid} (expected: ${params.guid})`
          };
        }

        return {
          status: 'NOT_FOUND',
          reason: `Destination transaction did not deliver packet with GUID ${params.guid}`
        };
      }

      const decoded = decodePacketDelivered(matchingLog);
      const destEventId = `event:${this.profile.destinationChain.chainId}:${params.destTxHash.toLowerCase()}:${matchingLog.logIndex}`;

      const destEvent: EventRecord = {
        event_id: destEventId,
        chain_id: this.profile.destinationChain.chainId,
        tx_hash: params.destTxHash.toLowerCase(),
        block_number: receipt.blockNumber,
        block_hash: receipt.blockHash,
        event_index: matchingLog.logIndex,
        contract_address: expectedEndpoint,
        event_signature: packetDeliveredSig,
        observed_at: block ? new Date(block.timestamp * 1000).toISOString() : new Date().toISOString(),
        payload: {
          guid: decoded.guid,
          origin: decoded.origin,
          receiver: decoded.receiver
        }
      };

      const receiptEvidence: EvidenceRecord = {
        evidence_id: `evidence:${this.profile.destinationChain.chainId}:receipt:${params.destTxHash.toLowerCase()}`,
        evidence_type: 'RECEIPT_REFERENCE',
        subject_ref: destEventId,
        content_hash: computeContentHash({
          txHash: params.destTxHash,
          blockHash: receipt.blockHash,
          status: receipt.status
        }),
        source_reference: `rpc://${this.profile.destinationChain.name}/receipt/${params.destTxHash}`,
        verification_method: 'TransactionReceiptVerification',
        policy_version: this.profile.policyVersion,
        result: 'PASS',
        checked_at: new Date().toISOString(),
        raw_data: {
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          guid: decoded.guid
        }
      };

      return {
        status: 'FOUND',
        destinationEvent: destEvent,
        receiptEvidence,
        decodedPacket: decoded,
        block: block ?? undefined
      };
    }

    // Query logs by GUID topic
    const logs = await this.destinationRpc.getLogs({
      address: expectedEndpoint,
      topics: [packetDeliveredSig, params.guid.toLowerCase()],
      fromBlock: params.searchRange?.fromBlock,
      toBlock: params.searchRange?.toBlock
    });

    if (logs.length === 0) {
      return {
        status: 'NOT_FOUND',
        reason: `No PacketDelivered log observed for GUID ${params.guid} (inflight or unexecuted)`
      };
    }

    if (logs.length > 1) {
      return {
        status: 'AMBIGUOUS',
        reason: `Multiple PacketDelivered logs (${logs.length}) found for identical GUID: ambiguous delivery`
      };
    }

    const log = logs[0];
    return this.getDestinationEvidence({
      guid: params.guid,
      destTxHash: log.transactionHash
    });
  }
}
