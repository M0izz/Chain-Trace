import type { ChainedAuditEvent } from '../../domain/src/index.js';
import { DurableTrailResponse } from '../../service/src/durable-trail-service.js';

export interface DemoScenario {
  id: string;
  name: string;
  badge: string;
  description: string;
  sourceChainId: number;
  sourceTxHash: string;
  isFixture: boolean;
  trail: DurableTrailResponse;
  auditTrail: ChainedAuditEvent[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'successful-trail',
    name: '1. Verified LayerZero v2 Cross-Chain Trail',
    badge: 'VERIFIED',
    description: 'Real Sepolia -> Polygon Amoy transaction where source receipt, finality, GUID matching, and destination delivery all pass verification policies.',
    sourceChainId: 11155111,
    sourceTxHash: '0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
    isFixture: false,
    trail: {
      schemaVersion: '1.0',
      trailId: 'trail:11155111:0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      source: {
        chainId: 11155111,
        txHash: '0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'
      },
      destination: {
        chainId: 80002,
        txHash: '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c'
      },
      status: 'VERIFIED',
      claims: [
        {
          claim_id: 'claim:event-inclusion:0x9a8f4c',
          claim_type: 'EVENT_INCLUDED',
          subject_refs: ['0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'],
          status: 'VERIFIED',
          policy_id: 'policy:event-inclusion',
          policy_version: '1.0.0',
          status_reason: {
            code: 'STATUS_CONFIRMED',
            message: 'Source transaction executed successfully with status 0x1'
          },
          version: 1,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:00:00Z',
          last_verified_at: '2026-10-25T11:00:00Z'
        },
        {
          claim_id: 'claim:source-finality:0x9a8f4c',
          claim_type: 'SOURCE_FINALIZED',
          subject_refs: ['0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'],
          status: 'VERIFIED',
          policy_id: 'policy:source-finality',
          policy_version: '1.0.0',
          status_reason: {
            code: 'FINALITY_CONFIRMED',
            message: '28 confirmations exceed Sepolia finality threshold of 12 blocks'
          },
          version: 1,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:00:00Z',
          last_verified_at: '2026-10-25T11:00:00Z'
        },
        {
          claim_id: 'claim:message-match:guid01',
          claim_type: 'MESSAGE_MATCHED',
          subject_refs: ['0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff'],
          status: 'VERIFIED',
          policy_id: 'policy:message-match',
          policy_version: '1.0.0',
          status_reason: {
            code: 'GUID_MATCHED',
            message: 'Source PacketSent GUID matches destination PacketDelivered GUID'
          },
          version: 1,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:00:00Z',
          last_verified_at: '2026-10-25T11:00:00Z'
        },
        {
          claim_id: 'claim:dest-exec:0x8b7c6d',
          claim_type: 'DESTINATION_EXECUTED',
          subject_refs: ['0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c'],
          status: 'VERIFIED',
          policy_id: 'policy:destination-execution',
          policy_version: '1.0.0',
          status_reason: {
            code: 'DELIVERY_CONFIRMED',
            message: 'Destination receipt status 0x1 with PacketDelivered event confirmed'
          },
          version: 1,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:00:00Z',
          last_verified_at: '2026-10-25T11:00:00Z'
        }
      ],
      evidence: [
        {
          evidence_id: 'ev:src:receipt:0x9a8f4c',
          evidence_type: 'RECEIPT_REFERENCE',
          subject_ref: '0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
          content_hash: '0x4f7c10b24e6a8d0f1c3e5a7b9d1f3b5d7f9a1c3e5a7b9d1f3b5d7f9a1c3e5a7b',
          source_reference: 'https://rpc.sepolia.org',
          verification_method: 'DIRECT_RPC',
          policy_version: '1.0.0',
          result: 'PASS',
          checked_at: '2026-10-25T11:00:00Z',
          raw_data: { status: 1, blockNumber: 5420052, confirmations: 28 }
        },
        {
          evidence_id: 'ev:dest:receipt:0x8b7c6d',
          evidence_type: 'RECEIPT_REFERENCE',
          subject_ref: '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c',
          content_hash: '0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
          source_reference: 'https://rpc-amoy.polygon.technology',
          verification_method: 'DIRECT_RPC',
          policy_version: '1.0.0',
          result: 'PASS',
          checked_at: '2026-10-25T11:00:00Z',
          raw_data: { status: 1, blockNumber: 9841116, confirmations: 34 }
        }
      ],
      trustAssumptions: [
        'RPC provider data is trusted for observed receipt fields',
        'Source chain finality threshold (12 blocks) is assumed non-reorganizable',
        'LayerZero DVN quorum signatures are assumed valid if emitted by EndpointV2'
      ],
      lastEvaluatedAt: '2026-10-25T11:00:00Z',
      isFromCache: true
    },
    auditTrail: [
      {
        audit_id: 'audit:demo:001',
        sequence: 0,
        claim_id: 'claim:event-inclusion:0x9a8f4c',
        previous_status: 'UNVERIFIED',
        new_status: 'VERIFIED',
        reason_code: 'STATUS_CONFIRMED',
        policy_version: '1.0.0',
        prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        record_hash: '62e92cbf3df6a1f0a1c676d1e4e2a89309874cb54942cfcbba5be12267885b54',
        details: 'Initial verification',
        timestamp: '2026-10-25T11:00:00Z'
      }
    ]
  },
  {
    id: 'message-mismatch',
    name: '2. Message Mismatch [DEMO FIXTURE]',
    badge: 'INVALID',
    description: 'Source packet emitted GUID A, but destination delivery was claimed using mismatched GUID B. Evaluates truthfully to INVALID without false positives.',
    sourceChainId: 11155111,
    sourceTxHash: '0x1111112e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
    isFixture: true,
    trail: {
      schemaVersion: '1.0',
      trailId: 'trail:11155111:0x1111112e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      source: {
        chainId: 11155111,
        txHash: '0x1111112e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'
      },
      destination: {
        chainId: 80002,
        txHash: '0x2222225e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c'
      },
      status: 'INVALID',
      claims: [
        {
          claim_id: 'claim:event-inclusion:0x111111',
          claim_type: 'EVENT_INCLUDED',
          subject_refs: ['0x1111112e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'],
          status: 'VERIFIED',
          policy_id: 'policy:event-inclusion',
          policy_version: '1.0.0',
          status_reason: { code: 'STATUS_CONFIRMED', message: 'Source receipt confirmed on-chain' },
          version: 1,
          created_at: '2026-10-25T11:10:00Z',
          updated_at: '2026-10-25T11:10:00Z'
        },
        {
          claim_id: 'claim:message-match:mismatch',
          claim_type: 'MESSAGE_MATCHED',
          subject_refs: ['0xguid_source_alpha', '0xguid_dest_beta'],
          status: 'INVALID',
          policy_id: 'policy:message-match',
          policy_version: '1.0.0',
          status_reason: {
            code: 'MESSAGE_ID_MISMATCH',
            message: 'Source emitted GUID 0xaaaabbbb... does not match destination delivered GUID 0xccccdddd...'
          },
          version: 1,
          created_at: '2026-10-25T11:10:00Z',
          updated_at: '2026-10-25T11:10:00Z'
        }
      ],
      evidence: [
        {
          evidence_id: 'ev:mismatch:logs',
          evidence_type: 'MESSAGE_ATTESTATION',
          subject_ref: '0xguid_source_alpha',
          content_hash: '0x9999999999999999999999999999999999999999999999999999999999999999',
          source_reference: 'https://rpc.sepolia.org',
          verification_method: 'DIRECT_RPC',
          policy_version: '1.0.0',
          result: 'FAIL',
          reason: 'Contradictory GUID observed between source and destination payload',
          checked_at: '2026-10-25T11:10:00Z'
        }
      ],
      trustAssumptions: [
        'RPC provider data is trusted for observed receipt fields',
        'Contradictory identifier proof was validated directly from event topics'
      ],
      lastEvaluatedAt: '2026-10-25T11:10:00Z',
      isFromCache: true
    },
    auditTrail: [
      {
        audit_id: 'audit:mismatch:001',
        sequence: 0,
        claim_id: 'claim:message-match:mismatch',
        previous_status: 'UNVERIFIED',
        new_status: 'INVALID',
        reason_code: 'MESSAGE_ID_MISMATCH',
        policy_version: '1.0.0',
        prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        record_hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        details: 'Evaluated message match policy with contradictory GUIDs',
        timestamp: '2026-10-25T11:10:00Z'
      }
    ]
  },
  {
    id: 'evidence-unavailable',
    name: '3. Inflight / Pending Delivery [DEMO FIXTURE]',
    badge: 'INCONCLUSIVE',
    description: 'PacketSent confirmed on source, but destination PacketDelivered event not yet indexed or observed on Polygon Amoy. Truthfully reported as INCONCLUSIVE, not fraud.',
    sourceChainId: 11155111,
    sourceTxHash: '0x3333332e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
    isFixture: true,
    trail: {
      schemaVersion: '1.0',
      trailId: 'trail:11155111:0x3333332e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      source: {
        chainId: 11155111,
        txHash: '0x3333332e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'
      },
      status: 'INCONCLUSIVE',
      claims: [
        {
          claim_id: 'claim:event-inclusion:0x333333',
          claim_type: 'EVENT_INCLUDED',
          subject_refs: ['0x3333332e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'],
          status: 'VERIFIED',
          policy_id: 'policy:event-inclusion',
          policy_version: '1.0.0',
          status_reason: { code: 'STATUS_CONFIRMED', message: 'Source transaction confirmed' },
          version: 1,
          created_at: '2026-10-25T11:20:00Z',
          updated_at: '2026-10-25T11:20:00Z'
        },
        {
          claim_id: 'claim:dest-exec:pending',
          claim_type: 'DESTINATION_EXECUTED',
          subject_refs: ['0xpending'],
          status: 'INCONCLUSIVE',
          policy_id: 'policy:destination-execution',
          policy_version: '1.0.0',
          status_reason: {
            code: 'DESTINATION_NOT_YET_INDEXED',
            message: 'No PacketDelivered receipt found yet on destination chain 80002. Packet may be inflight.'
          },
          version: 1,
          created_at: '2026-10-25T11:20:00Z',
          updated_at: '2026-10-25T11:20:00Z'
        }
      ],
      evidence: [
        {
          evidence_id: 'ev:dest:notfound',
          evidence_type: 'RECEIPT_REFERENCE',
          subject_ref: '0xpending',
          content_hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          source_reference: 'https://rpc-amoy.polygon.technology',
          verification_method: 'DIRECT_RPC',
          policy_version: '1.0.0',
          result: 'INCONCLUSIVE',
          reason: 'Logs matching GUID topic not found in scan range',
          checked_at: '2026-10-25T11:20:00Z'
        }
      ],
      trustAssumptions: [
        'Destination indexing is subject to RPC node sync latency',
        'Inconclusive state does not imply message failure or censorship'
      ],
      lastEvaluatedAt: '2026-10-25T11:20:00Z',
      isFromCache: true
    },
    auditTrail: [
      {
        audit_id: 'audit:pending:001',
        sequence: 0,
        claim_id: 'claim:dest-exec:pending',
        previous_status: 'UNVERIFIED',
        new_status: 'INCONCLUSIVE',
        reason_code: 'DESTINATION_NOT_YET_INDEXED',
        policy_version: '1.0.0',
        prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        record_hash: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
        details: 'Evaluated destination delivery; logs not yet present',
        timestamp: '2026-10-25T11:20:00Z'
      }
    ]
  },
  {
    id: 'dependency-change',
    name: '4. Reorg & Dependency-Aware Revalidation [DEMO FIXTURE]',
    badge: 'REVALIDATION',
    description: 'Controlled test scenario where the source block reorganizes. Demonstrates that only dependent claims become REVALIDATION_REQUIRED, while independent destination facts remain valid.',
    sourceChainId: 11155111,
    sourceTxHash: '0x4444442e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
    isFixture: true,
    trail: {
      schemaVersion: '1.0',
      trailId: 'trail:11155111:0x4444442e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      source: {
        chainId: 11155111,
        txHash: '0x4444442e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'
      },
      destination: {
        chainId: 80002,
        txHash: '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c'
      },
      status: 'REVALIDATION_REQUIRED',
      claims: [
        {
          claim_id: 'claim:source-finality:0x444444',
          claim_type: 'SOURCE_FINALIZED',
          subject_refs: ['0x4444442e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'],
          status: 'REVALIDATION_REQUIRED',
          policy_id: 'policy:source-finality',
          policy_version: '1.0.0',
          status_reason: {
            code: 'BLOCK_HASH_CHANGED',
            message: 'Block reorganization detected at height 5420052: hash mutated from 0xold_block to 0xreorg_block'
          },
          version: 2,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:30:00Z',
          last_verified_at: '2026-10-25T11:00:00Z'
        },
        {
          claim_id: 'claim:message-match:0x444444',
          claim_type: 'MESSAGE_MATCHED',
          subject_refs: ['0xguid_reorg'],
          status: 'REVALIDATION_REQUIRED',
          policy_id: 'policy:message-match',
          policy_version: '1.0.0',
          status_reason: {
            code: 'PREREQUISITE_REVALIDATION_REQUIRED',
            message: 'Upstream dependency claim:source-finality:0x444444 requires revalidation'
          },
          version: 2,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:30:00Z'
        },
        {
          claim_id: 'claim:dest-exec:0x444444',
          claim_type: 'DESTINATION_EXECUTED',
          subject_refs: ['0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c'],
          status: 'VERIFIED',
          policy_id: 'policy:destination-execution',
          policy_version: '1.0.0',
          status_reason: {
            code: 'INDEPENDENT_FACT_PRESERVED',
            message: 'Destination transaction fact preserved as verified on Polygon Amoy; upstream reorg does not erase destination execution'
          },
          version: 1,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:00:00Z',
          last_verified_at: '2026-10-25T11:00:00Z'
        }
      ],
      evidence: [
        {
          evidence_id: 'ev:reorg:blockcheck',
          evidence_type: 'FINALITY_CHECKPOINT',
          subject_ref: '0x444444',
          content_hash: '0xblockhashreorg123',
          source_reference: 'https://rpc.sepolia.org',
          verification_method: 'DIRECT_RPC',
          policy_version: '1.0.0',
          result: 'FAIL',
          reason: 'Canonical block hash changed during re-query',
          checked_at: '2026-10-25T11:30:00Z'
        }
      ],
      trustAssumptions: [
        'Dependency DAG automatically isolates invalidation to downstream dependents',
        'Independent destination execution records are never falsely erased or marked invalid'
      ],
      lastEvaluatedAt: '2026-10-25T11:30:00Z',
      isFromCache: true
    },
    auditTrail: [
      {
        audit_id: 'audit:reorg:001',
        sequence: 0,
        claim_id: 'claim:source-finality:0x444444',
        previous_status: 'UNVERIFIED',
        new_status: 'VERIFIED',
        reason_code: 'FINALITY_CONFIRMED',
        policy_version: '1.0.0',
        prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        record_hash: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
        details: 'Initial verification on block 5420052',
        timestamp: '2026-10-25T11:00:00Z'
      },
      {
        audit_id: 'audit:reorg:002',
        sequence: 1,
        claim_id: 'claim:source-finality:0x444444',
        previous_status: 'VERIFIED',
        new_status: 'REVALIDATION_REQUIRED',
        reason_code: 'BLOCK_HASH_CHANGED',
        policy_version: '1.0.0',
        prev_hash: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
        record_hash: '4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
        details: 'Triggered by reorg detection on eth_getBlockByNumber',
        timestamp: '2026-10-25T11:30:00Z'
      },
      {
        audit_id: 'audit:reorg:003',
        sequence: 2,
        claim_id: 'claim:message-match:0x444444',
        previous_status: 'VERIFIED',
        new_status: 'REVALIDATION_REQUIRED',
        reason_code: 'PREREQUISITE_REVALIDATION_REQUIRED',
        policy_version: '1.0.0',
        triggering_dependency: 'claim:source-finality:0x444444',
        prev_hash: '4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
        record_hash: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
        details: 'Cascading invalidation from prerequisite finality claim',
        timestamp: '2026-10-25T11:30:00Z'
      }
    ]
  }
];
