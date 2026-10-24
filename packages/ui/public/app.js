// ==========================================================================
// ChainTrace — Scientific Editorial Controller & Motion Engine
// Integrates GSAP scroll storytelling, interactive canvas evidence network,
// SVG dependency DAG, and Phase 3 Fastify REST APIs.
// ==========================================================================

// Inlined demo fixtures for immediate reproducible scenarios
const DEMO_FIXTURES = {
  'successful-trail': {
    isFixture: false,
    trail: {
      schemaVersion: '1.0',
      trailId: 'trail:11155111:0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      source: { chainId: 11155111, txHash: '0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d' },
      destination: { chainId: 80002, txHash: '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c' },
      status: 'VERIFIED',
      claims: [
        {
          claim_id: 'claim:event-inclusion:0x9a8f4c',
          claim_type: 'EVENT_INCLUDED',
          subject_refs: ['0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'],
          status: 'VERIFIED',
          policy_id: 'policy:event-inclusion',
          policy_version: '1.0.0',
          status_reason: { code: 'STATUS_CONFIRMED', message: 'Source transaction executed successfully with status 0x1' },
          version: 1,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:00:00Z',
          last_verified_at: '2026-10-25T11:00:00Z',
          prerequisites: [],
          evidenceIds: ['ev:src:receipt:0x9a8f4c']
        },
        {
          claim_id: 'claim:source-finality:0x9a8f4c',
          claim_type: 'SOURCE_FINALIZED',
          subject_refs: ['0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d'],
          status: 'VERIFIED',
          policy_id: 'policy:source-finality',
          policy_version: '1.0.0',
          status_reason: { code: 'FINALITY_CONFIRMED', message: '28 confirmations exceed Sepolia finality threshold of 12 blocks' },
          version: 1,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:00:00Z',
          last_verified_at: '2026-10-25T11:00:00Z',
          prerequisites: ['claim:event-inclusion:0x9a8f4c'],
          evidenceIds: ['ev:src:receipt:0x9a8f4c']
        },
        {
          claim_id: 'claim:message-match:guid01',
          claim_type: 'MESSAGE_MATCHED',
          subject_refs: ['0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff'],
          status: 'VERIFIED',
          policy_id: 'policy:message-match',
          policy_version: '1.0.0',
          status_reason: { code: 'GUID_MATCHED', message: 'Source PacketSent GUID matches destination PacketDelivered GUID' },
          version: 1,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:00:00Z',
          last_verified_at: '2026-10-25T11:00:00Z',
          prerequisites: ['claim:source-finality:0x9a8f4c'],
          evidenceIds: ['ev:src:receipt:0x9a8f4c', 'ev:dest:receipt:0x8b7c6d']
        },
        {
          claim_id: 'claim:dest-exec:0x8b7c6d',
          claim_type: 'DESTINATION_EXECUTED',
          subject_refs: ['0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c'],
          status: 'VERIFIED',
          policy_id: 'policy:destination-execution',
          policy_version: '1.0.0',
          status_reason: { code: 'DELIVERY_CONFIRMED', message: 'Destination receipt status 0x1 with PacketDelivered event confirmed' },
          version: 1,
          created_at: '2026-10-25T11:00:00Z',
          updated_at: '2026-10-25T11:00:00Z',
          last_verified_at: '2026-10-25T11:00:00Z',
          prerequisites: ['claim:message-match:guid01'],
          evidenceIds: ['ev:dest:receipt:0x8b7c6d']
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
        audit_id: 'audit:live:001',
        sequence: 0,
        claim_id: 'claim:event-inclusion:0x9a8f4c',
        previous_status: 'UNVERIFIED',
        new_status: 'VERIFIED',
        reason_code: 'STATUS_CONFIRMED',
        policy_version: '1.0.0',
        prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        record_hash: '62e92cbf3df6a1f0a1c676d1e4e2a89309874cb54942cfcbba5be12267885b54',
        details: 'Initial verification on Sepolia block 5420052',
        timestamp: '2026-10-25T11:00:00Z'
      }
    ]
  },
  'message-mismatch': {
    isFixture: true,
    trail: {
      schemaVersion: '1.0',
      trailId: 'trail:11155111:0x1111112e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      source: { chainId: 11155111, txHash: '0x1111112e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d' },
      destination: { chainId: 80002, txHash: '0x2222225e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c' },
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
          updated_at: '2026-10-25T11:10:00Z',
          prerequisites: [],
          evidenceIds: ['ev:src:receipt:0x111111']
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
          updated_at: '2026-10-25T11:10:00Z',
          prerequisites: ['claim:event-inclusion:0x111111'],
          evidenceIds: ['ev:mismatch:logs']
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
      trustAssumptions: ['Contradictory identifier proof was validated directly from event topics'],
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
  'evidence-unavailable': {
    isFixture: true,
    trail: {
      schemaVersion: '1.0',
      trailId: 'trail:11155111:0x3333332e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      source: { chainId: 11155111, txHash: '0x3333332e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d' },
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
          updated_at: '2026-10-25T11:20:00Z',
          prerequisites: [],
          evidenceIds: ['ev:src:receipt:0x333333']
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
          updated_at: '2026-10-25T11:20:00Z',
          prerequisites: ['claim:event-inclusion:0x333333'],
          evidenceIds: ['ev:dest:notfound']
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
      trustAssumptions: ['Inconclusive state does not imply message failure or censorship'],
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
  'dependency-change': {
    isFixture: true,
    trail: {
      schemaVersion: '1.0',
      trailId: 'trail:11155111:0x4444442e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      source: { chainId: 11155111, txHash: '0x4444442e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d' },
      destination: { chainId: 80002, txHash: '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c' },
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
          prerequisites: [],
          evidenceIds: ['ev:reorg:blockcheck']
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
          updated_at: '2026-10-25T11:30:00Z',
          prerequisites: ['claim:source-finality:0x444444'],
          evidenceIds: []
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
          last_verified_at: '2026-10-25T11:00:00Z',
          prerequisites: [],
          evidenceIds: ['ev:dest:receipt:0x8b7c6d']
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
      trustAssumptions: ['Dependency DAG isolates invalidation strictly to downstream dependents'],
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
};

// Application State
let currentTrail = null;
let currentAuditEvents = [];
let selectedClaimId = null;
let selectedEvidenceId = null;
let isCurrentFixture = false;

// DOM Elements
const txInput = document.getElementById('txInput');
const inspectBtn = document.getElementById('inspectBtn');
const clearTxBtn = document.getElementById('clearTxBtn');
const txValidationMsg = document.getElementById('txValidationMsg');
const alertBanner = document.getElementById('alertBanner');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const alertCloseBtn = document.getElementById('alertCloseBtn');
const fixtureBanner = document.getElementById('fixtureBanner');

// Overview Elements
const trailIdDisplay = document.getElementById('trailIdDisplay');
const copyTrailIdBtn = document.getElementById('copyTrailIdBtn');
const overallStatusBadge = document.getElementById('overallStatusBadge');
const overallStatusText = document.getElementById('overallStatusText');
const stepSrcHash = document.getElementById('stepSrcHash');
const stepDestHash = document.getElementById('stepDestHash');
const trustCaveatsText = document.getElementById('trustCaveatsText');
const lastEvaluatedDisplay = document.getElementById('lastEvaluatedDisplay');
const storageSourceDisplay = document.getElementById('storageSourceDisplay');

// Graph Elements
const dagSvg = document.getElementById('dagSvg');
const dagEdges = document.getElementById('dagEdges');
const dagNodes = document.getElementById('dagNodes');
const dagContainer = document.getElementById('dagContainer');
const accessibleListContainer = document.getElementById('accessibleListContainer');
const claimsListFallback = document.getElementById('claimsListFallback');
const viewDagBtn = document.getElementById('viewDagBtn');
const viewListBtn = document.getElementById('viewListBtn');
const claimCountBadge = document.getElementById('claimCountBadge');
const edgeDetailCard = document.getElementById('edgeDetailCard');
const edgeTypeBadge = document.getElementById('edgeTypeBadge');
const edgeExplanation = document.getElementById('edgeExplanation');
const revalidationImpactCard = document.getElementById('revalidationImpactCard');
const affectedClaimsList = document.getElementById('affectedClaimsList');
const unaffectedClaimsList = document.getElementById('unaffectedClaimsList');

// Inspector Elements
const tabClaimBtn = document.getElementById('tabClaimBtn');
const tabEvidenceBtn = document.getElementById('tabEvidenceBtn');
const tabAuditBtn = document.getElementById('tabAuditBtn');
const claimTabPanel = document.getElementById('claimTabPanel');
const evidenceTabPanel = document.getElementById('evidenceTabPanel');
const auditTabPanel = document.getElementById('auditTabPanel');
const evCountBadge = document.getElementById('evCountBadge');
const auditCountBadge = document.getElementById('auditCountBadge');

// Claim Inspector Fields
const claimNameDisplay = document.getElementById('claimNameDisplay');
const claimStatusBadge = document.getElementById('claimStatusBadge');
const claimIdDisplay = document.getElementById('claimIdDisplay');
const copyClaimIdBtn = document.getElementById('copyClaimIdBtn');
const claimReasonCode = document.getElementById('claimReasonCode');
const claimReasonMsg = document.getElementById('claimReasonMsg');
const claimPolicyId = document.getElementById('claimPolicyId');
const claimPolicyVer = document.getElementById('claimPolicyVer');
const claimVersion = document.getElementById('claimVersion');
const claimVerifiedAt = document.getElementById('claimVerifiedAt');
const claimEvidenceRefs = document.getElementById('claimEvidenceRefs');

// Evidence Inspector Fields
const evidenceSelectorList = document.getElementById('evidenceSelectorList');
const evTypeDisplay = document.getElementById('evTypeDisplay');
const evResultBadge = document.getElementById('evResultBadge');
const evMethodDisplay = document.getElementById('evMethodDisplay');
const evTimestampDisplay = document.getElementById('evTimestampDisplay');
const evProviderDisplay = document.getElementById('evProviderDisplay');
const evHashDisplay = document.getElementById('evHashDisplay');
const copyEvHashBtn = document.getElementById('copyEvHashBtn');
const evPayloadDisplay = document.getElementById('evPayloadDisplay');
const toggleRawPayloadBtn = document.getElementById('toggleRawPayloadBtn');

// Audit Timeline Fields
const auditTimelineList = document.getElementById('auditTimelineList');
const auditPrevBtn = document.getElementById('auditPrevBtn');
const auditNextBtn = document.getElementById('auditNextBtn');
const auditPageDisplay = document.getElementById('auditPageDisplay');

// Modal Elements
const refreshModal = document.getElementById('refreshModal');
const refreshBtn = document.getElementById('refreshBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelRefreshBtn = document.getElementById('cancelRefreshBtn');
const confirmRefreshBtn = document.getElementById('confirmRefreshBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const checkReorgBox = document.getElementById('checkReorgBox');

// --------------------------------------------------------------------------
// Abstract Scientific Hero Canvas: Luminous Evidence Lattice
// --------------------------------------------------------------------------
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let animationFrameId;
  let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };

  const resize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight * 0.9;
  };
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.targetX = e.clientX - rect.left;
    mouse.targetY = e.clientY - rect.top;
  });

  // Nodes representing protocol participants and checkpoints
  const nodeCount = 38;
  const nodes = [];
  const palette = ['#00f2fe', '#38bdf8', '#818cf8', '#22d3ee'];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      baseRadius: Math.random() * 2.2 + 1.2,
      color: palette[Math.floor(Math.random() * palette.length)],
      pulseOffset: Math.random() * Math.PI * 2,
      orbitSpeed: 0.008 + Math.random() * 0.015
    });
  }

  // Floating packets travelling between nodes
  const packets = [];
  for (let p = 0; p < 7; p++) {
    packets.push({
      sourceIdx: Math.floor(Math.random() * nodeCount),
      targetIdx: Math.floor(Math.random() * nodeCount),
      progress: Math.random(),
      speed: 0.004 + Math.random() * 0.006
    });
  }

  let time = 0;
  const render = () => {
    time += 0.02;
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    ctx.clearRect(0, 0, width, height);

    // Update & draw nodes
    nodes.forEach((n, idx) => {
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      // Restrained pointer parallax
      const dx = mouse.x - n.x;
      const dy = mouse.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180) {
        const force = (180 - dist) / 180;
        n.x -= (dx / dist) * force * 1.5;
        n.y -= (dy / dist) * force * 1.5;
      }

      // Draw connective edges
      for (let j = idx + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dist2 = Math.hypot(n.x - n2.x, n.y - n2.y);
        if (dist2 < 140) {
          const alpha = (1 - dist2 / 140) * 0.28;
          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }

      // Draw node
      const pulse = Math.sin(time + n.pulseOffset) * 0.5 + 1;
      ctx.fillStyle = n.color;
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.baseRadius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw flowing cross-chain packets
    packets.forEach((pkt) => {
      pkt.progress += pkt.speed;
      if (pkt.progress >= 1) {
        pkt.progress = 0;
        pkt.sourceIdx = pkt.targetIdx;
        pkt.targetIdx = Math.floor(Math.random() * nodes.length);
      }

      const p1 = nodes[pkt.sourceIdx];
      const p2 = nodes[pkt.targetIdx];
      if (p1 && p2) {
        const px = p1.x + (p2.x - p1.x) * pkt.progress;
        const py = p1.y + (p2.y - p1.y) * pkt.progress;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    animationFrameId = requestAnimationFrame(render);
  };

  render();
}

// --------------------------------------------------------------------------
// GSAP Choreographed Reveals
// --------------------------------------------------------------------------
function initGsapAnimations() {
  if (typeof gsap === 'undefined') return;

  // Reduced motion check
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // Hero Initial Load Timeline
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTl
    .from('.gsap-reveal', {
      y: 30,
      opacity: 0,
      duration: 0.9,
      stagger: 0.14,
      delay: 0.15
    });

  // Scroll-Triggered Section Fade-Ins
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll('.gsap-scroll-fade').forEach((elem) => {
      gsap.from(elem, {
        scrollTrigger: {
          trigger: elem,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        y: 35,
        opacity: 0,
        duration: 0.85,
        ease: 'power2.out'
      });
    });
  }
}

// --------------------------------------------------------------------------
// Explorer State & Event Binding
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initHeroCanvas();
  initGsapAnimations();

  // Scenario Buttons
  document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const scId = btn.getAttribute('data-scenario');
      loadScenario(scId);
    });
  });

  // Lookup Button
  inspectBtn.addEventListener('click', () => executeLookup());
  txInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeLookup();
  });
  clearTxBtn.addEventListener('click', () => {
    txInput.value = '';
    txInput.focus();
  });

  // View Mode Toggles (DAG vs List)
  viewDagBtn.addEventListener('click', () => setViewMode('dag'));
  viewListBtn.addEventListener('click', () => setViewMode('list'));

  // Tab Navigation
  tabClaimBtn.addEventListener('click', () => setInspectorTab('claim'));
  tabEvidenceBtn.addEventListener('click', () => setInspectorTab('evidence'));
  tabAuditBtn.addEventListener('click', () => setInspectorTab('audit'));

  // Modals
  refreshBtn.addEventListener('click', () => refreshModal.showModal());
  closeModalBtn.addEventListener('click', () => refreshModal.close());
  cancelRefreshBtn.addEventListener('click', () => refreshModal.close());
  confirmRefreshBtn.addEventListener('click', () => executeRefresh());

  // Copy Buttons
  copyTrailIdBtn.addEventListener('click', () => copyToClipboard(trailIdDisplay.textContent, 'Trail ID copied'));
  copyClaimIdBtn.addEventListener('click', () => copyToClipboard(claimIdDisplay.textContent, 'Claim ID copied'));
  copyEvHashBtn.addEventListener('click', () => copyToClipboard(evHashDisplay.textContent, 'Evidence hash copied'));

  alertCloseBtn.addEventListener('click', () => alertBanner.style.display = 'none');

  // Load default verified trail on start
  loadScenario('successful-trail');
});

// --------------------------------------------------------------------------
// Core Actions: Lookup & Scenarios
// --------------------------------------------------------------------------
async function executeLookup() {
  const txHash = txInput.value.trim();
  const hexRegex = /^0x[a-fA-F0-9]{64}$/;

  if (!hexRegex.test(txHash)) {
    showError('Invalid Transaction Hash', 'Please enter a valid 32-byte hexadecimal hash starting with 0x (66 characters total).');
    txInput.focus();
    return;
  }

  hideError();
  setLoading(true);

  const chainId = 11155111;

  try {
    const res = await fetch(`/v1/trails/${chainId}/${txHash.toLowerCase()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Server returned HTTP ${res.status}`);
    }

    const trailData = await res.json();
    isCurrentFixture = false;
    fixtureBanner.style.display = 'none';
    currentTrail = trailData;

    const auditRes = await fetch(`/v1/trails/${encodeURIComponent(trailData.trailId)}/audit?limit=20&offset=0`);
    if (auditRes.ok) {
      const auditData = await auditRes.json();
      currentAuditEvents = auditData.events || [];
    } else {
      currentAuditEvents = [];
    }

    renderTrail(trailData);
    showToast('Live trail loaded from SQLite store');
  } catch (err) {
    console.warn('Live API query not matched, falling back to scenario fixture:', err);
    const matched = Object.values(DEMO_FIXTURES).find(f => f.trail.source.txHash.toLowerCase() === txHash.toLowerCase());

    if (matched) {
      isCurrentFixture = matched.isFixture;
      fixtureBanner.style.display = isCurrentFixture ? 'flex' : 'none';
      currentTrail = matched.trail;
      currentAuditEvents = matched.auditTrail;
      renderTrail(matched.trail);
      showToast('Loaded matching demo scenario fixture');
    } else {
      showError('Trail Not Found', `No trail was found for transaction ${txHash} on chain ${chainId}. Ensure the transaction was indexed by EndpointV2.`);
    }
  } finally {
    setLoading(false);
  }
}

function loadScenario(scenarioId) {
  const fixture = DEMO_FIXTURES[scenarioId];
  if (!fixture) return;

  hideError();
  isCurrentFixture = fixture.isFixture;
  fixtureBanner.style.display = isCurrentFixture ? 'flex' : 'none';

  txInput.value = fixture.trail.source.txHash;
  currentTrail = fixture.trail;
  currentAuditEvents = fixture.auditTrail;

  renderTrail(currentTrail);

  // If Upstream Reorg scenario, trigger visual propagation effect
  if (scenarioId === 'dependency-change') {
    triggerReorgPropagationAnimation();
  }
}

function triggerReorgPropagationAnimation() {
  const dagSvgEl = document.getElementById('dagSvg');
  if (!dagSvgEl) return;

  // Pulse edge connecting finality to message match
  const edges = document.querySelectorAll('.edge-line');
  edges.forEach(e => {
    e.style.stroke = '#c084fc';
    e.style.strokeWidth = '4';
    setTimeout(() => {
      e.style.stroke = '';
      e.style.strokeWidth = '';
    }, 1500);
  });
}

async function executeRefresh() {
  refreshModal.close();
  if (!currentTrail) return;

  const apiKey = apiKeyInput.value.trim();
  const checkReorg = checkReorgBox.checked;

  setLoading(true);
  try {
    const res = await fetch(`/v1/trails/${encodeURIComponent(currentTrail.trailId)}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'idempotency-key': `ui-refresh-${Date.now()}`
      },
      body: JSON.stringify({ checkReorg })
    });

    if (res.status === 401) {
      throw new Error('Unauthorized: Valid x-api-key required for state-changing refresh operations.');
    }
    if (res.status === 429) {
      throw new Error('Rate limit exceeded: Refreshes are bound to a maximum of 5 requests/minute per trail.');
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Refresh failed with status ${res.status}`);
    }

    const refreshResult = await res.json();
    showToast(`Revalidation complete: ${refreshResult.affectedClaimsCount} claims evaluated`);

    await executeLookup();
  } catch (err) {
    showError('Revalidation Failed', err.message || 'An error occurred during revalidation.');
  } finally {
    setLoading(false);
  }
}

// --------------------------------------------------------------------------
// View Rendering
// --------------------------------------------------------------------------
function renderTrail(trail) {
  trailIdDisplay.textContent = trail.trailId;
  renderStatusBadge(overallStatusBadge, overallStatusText, trail.status);

  stepSrcHash.textContent = truncateHash(trail.source.txHash);
  stepDestHash.textContent = trail.destination?.txHash ? truncateHash(trail.destination.txHash) : 'Pending Indexing';
  lastEvaluatedDisplay.textContent = new Date(trail.lastEvaluatedAt).toLocaleTimeString();
  storageSourceDisplay.textContent = trail.isFromCache ? 'SQLite DB (Cached)' : 'Live Node Query';

  claimCountBadge.textContent = `${trail.claims.length} claims`;
  evCountBadge.textContent = trail.evidence.length;
  auditCountBadge.textContent = currentAuditEvents.length;

  if (trail.trustAssumptions && trail.trustAssumptions.length > 0) {
    trustCaveatsText.textContent = trail.trustAssumptions[0];
  }

  // Render DAG & Accessible List
  renderDag(trail.claims);
  renderClaimsListFallback(trail.claims);

  // Render Evidence Selectors
  renderEvidenceSelectors(trail.evidence);

  // Render Audit Timeline
  renderAuditTimeline(currentAuditEvents);

  // Revalidation Impact Card
  renderRevalidationImpact(trail.claims);

  // Default select first claim
  if (trail.claims.length > 0) {
    selectClaim(trail.claims[0].claim_id);
  }
}

function renderStatusBadge(badgeEl, textEl, status) {
  badgeEl.className = 'status-badge-lg';
  let label = status;

  switch (status) {
    case 'VERIFIED':
      badgeEl.classList.add('status-verified');
      break;
    case 'INCONCLUSIVE':
      badgeEl.classList.add('status-inconclusive');
      break;
    case 'REVALIDATION_REQUIRED':
      badgeEl.classList.add('status-revalidation');
      label = 'REVALIDATION REQ';
      break;
    case 'INVALID':
      badgeEl.classList.add('status-invalid');
      break;
    default:
      badgeEl.classList.add('status-unverified');
      label = 'UNVERIFIED';
  }

  textEl.textContent = label;
}

// --------------------------------------------------------------------------
// Interactive DAG Graph Rendering (SVG)
// --------------------------------------------------------------------------
function renderDag(claims) {
  dagEdges.innerHTML = '';
  dagNodes.innerHTML = '';

  const nodeWidth = 220;
  const nodeHeight = 64;
  const startX = 30;
  const startY = 30;
  const gapY = 90;

  const nodePositions = new Map();
  claims.forEach((claim, idx) => {
    nodePositions.set(claim.claim_id, {
      x: startX + (idx % 2 === 1 ? 55 : 0),
      y: startY + idx * gapY,
      claim
    });
  });

  // Render Edges
  claims.forEach((claim) => {
    const targetPos = nodePositions.get(claim.claim_id);
    if (!targetPos) return;

    const prereqs = claim.prerequisites || [];
    prereqs.forEach((prereqId) => {
      const srcPos = nodePositions.get(prereqId);
      if (!srcPos) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const startPointX = srcPos.x + nodeWidth / 2;
      const startPointY = srcPos.y + nodeHeight;
      const endPointX = targetPos.x + nodeWidth / 2;
      const endPointY = targetPos.y;

      const cY1 = startPointY + (endPointY - startPointY) / 2;
      const cY2 = endPointY - (endPointY - startPointY) / 2;
      const d = `M ${startPointX} ${startPointY} C ${startPointX} ${cY1}, ${endPointX} ${cY2}, ${endPointX} ${endPointY}`;

      path.setAttribute('d', d);
      path.setAttribute('class', 'edge-line');
      path.setAttribute('marker-end', 'url(#arrow)');
      path.setAttribute('data-src', prereqId);
      path.setAttribute('data-target', claim.claim_id);

      path.addEventListener('click', (e) => {
        e.stopPropagation();
        selectEdge(prereqId, claim.claim_id);
      });

      dagEdges.appendChild(path);
    });
  });

  // Render Nodes
  claims.forEach((claim) => {
    const pos = nodePositions.get(claim.claim_id);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'node-card-group');
    g.setAttribute('data-id', claim.claim_id);
    g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', nodeWidth);
    rect.setAttribute('height', nodeHeight);
    rect.setAttribute('rx', 8);
    rect.setAttribute('fill', '#0d121c');
    rect.setAttribute('stroke', getStatusBorderColor(claim.status));
    rect.setAttribute('stroke-width', 1.6);

    const textTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textTitle.setAttribute('x', 14);
    textTitle.setAttribute('y', 26);
    textTitle.setAttribute('fill', '#f8fafc');
    textTitle.setAttribute('font-size', '13');
    textTitle.setAttribute('font-weight', '700');
    textTitle.textContent = formatClaimType(claim.claim_type);

    const textSub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textSub.setAttribute('x', 14);
    textSub.setAttribute('y', 48);
    textSub.setAttribute('fill', getStatusTextColor(claim.status));
    textSub.setAttribute('font-size', '11');
    textSub.setAttribute('font-weight', '600');
    textSub.setAttribute('class', 'mono');
    textSub.textContent = `● ${claim.status}`;

    g.appendChild(rect);
    g.appendChild(textTitle);
    g.appendChild(textSub);

    g.addEventListener('click', () => selectClaim(claim.claim_id));
    dagNodes.appendChild(g);
  });
}

function selectClaim(claimId) {
  selectedClaimId = claimId;
  const claim = currentTrail.claims.find(c => c.claim_id === claimId);
  if (!claim) return;

  document.querySelectorAll('.node-card-group').forEach(el => {
    el.classList.remove('selected', 'highlighted');
    if (el.getAttribute('data-id') === claimId) {
      el.classList.add('selected');
    }
  });

  const prereqs = claim.prerequisites || [];
  document.querySelectorAll('.edge-line').forEach(el => {
    el.classList.remove('active');
    el.setAttribute('marker-end', 'url(#arrow)');
    const target = el.getAttribute('data-target');
    const src = el.getAttribute('data-src');

    if (target === claimId) {
      el.classList.add('active');
      el.setAttribute('marker-end', 'url(#arrow-active)');
      const srcNode = document.querySelector(`.node-card-group[data-id="${src}"]`);
      if (srcNode) srcNode.classList.add('highlighted');
    }
  });

  document.querySelectorAll('.list-claim-item').forEach(el => {
    el.classList.toggle('selected', el.getAttribute('data-id') === claimId);
  });

  claimNameDisplay.textContent = formatClaimType(claim.claim_type);
  claimIdDisplay.textContent = claim.claim_id;
  claimReasonCode.textContent = claim.status_reason.code;
  claimReasonMsg.textContent = claim.status_reason.message;
  claimPolicyId.textContent = claim.policy_id;
  claimPolicyVer.textContent = claim.policy_version;
  claimVersion.textContent = `v${claim.version}`;
  claimVerifiedAt.textContent = claim.last_verified_at ? new Date(claim.last_verified_at).toLocaleTimeString() : 'Pending';

  renderStatusBadge(claimStatusBadge, claimStatusBadge, claim.status);

  claimEvidenceRefs.innerHTML = '';
  const evIds = claim.evidenceIds || [];
  if (evIds.length === 0) {
    claimEvidenceRefs.innerHTML = '<span class="text-muted text-sm">No evidence directly referenced.</span>';
  } else {
    evIds.forEach(id => {
      const pill = document.createElement('span');
      pill.className = 'ref-pill mono';
      pill.textContent = id;
      pill.title = 'Click to inspect this evidence record';
      pill.addEventListener('click', () => {
        setInspectorTab('evidence');
        selectEvidence(id);
      });
      claimEvidenceRefs.appendChild(pill);
    });
  }

  setInspectorTab('claim');
}

function selectEdge(srcId, targetId) {
  edgeDetailCard.style.display = 'block';
  const srcClaim = currentTrail.claims.find(c => c.claim_id === srcId);
  const targetClaim = currentTrail.claims.find(c => c.claim_id === targetId);

  let edgeType = 'SUPPORTS';
  let explanation = `${formatClaimType(srcClaim?.claim_type)} satisfies the prerequisite constraints for ${formatClaimType(targetClaim?.claim_type)}.`;

  if (targetClaim?.claim_type === 'SOURCE_FINALIZED') {
    edgeType = 'FINALITY_GUARD';
    explanation = 'Prevents downstream message consumption until source transaction reaches the 12-block non-reorganizable threshold.';
  } else if (targetClaim?.claim_type === 'MESSAGE_MATCHED') {
    edgeType = 'MATCHES';
    explanation = 'Cross-chain protocol identity check binding source PacketSent event with destination PacketDelivered event.';
  } else if (targetClaim?.claim_type === 'DESTINATION_EXECUTED') {
    edgeType = 'AUTHENTICATES';
    explanation = 'Destination delivery verification proves message payload was faithfully executed on Polygon Amoy.';
  }

  edgeTypeBadge.textContent = edgeType;
  edgeExplanation.textContent = explanation;
}

function renderClaimsListFallback(claims) {
  claimsListFallback.innerHTML = '';
  claims.forEach((claim) => {
    const li = document.createElement('li');
    li.className = 'list-claim-item';
    li.setAttribute('data-id', claim.claim_id);
    li.tabIndex = 0;

    li.innerHTML = `
      <div>
        <strong>${formatClaimType(claim.claim_type)}</strong>
        <div class="text-xs text-muted mono">${claim.claim_id}</div>
      </div>
      <span class="badge ${getStatusBadgeClass(claim.status)}">${claim.status}</span>
    `;

    li.addEventListener('click', () => selectClaim(claim.claim_id));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectClaim(claim.claim_id);
      }
    });

    claimsListFallback.appendChild(li);
  });
}

function renderEvidenceSelectors(evidenceList) {
  evidenceSelectorList.innerHTML = '';
  if (!evidenceList || evidenceList.length === 0) {
    evidenceSelectorList.innerHTML = '<span class="text-muted text-sm">No evidence records available.</span>';
    return;
  }

  evidenceList.forEach((ev, idx) => {
    const btn = document.createElement('button');
    btn.className = `ev-select-pill ${idx === 0 ? 'active' : ''}`;
    btn.setAttribute('data-id', ev.evidence_id);
    btn.textContent = `${ev.evidence_type} (${ev.result})`;
    btn.addEventListener('click', () => selectEvidence(ev.evidence_id));
    evidenceSelectorList.appendChild(btn);
  });

  if (evidenceList.length > 0) {
    selectEvidence(evidenceList[0].evidence_id);
  }
}

function selectEvidence(evidenceId) {
  selectedEvidenceId = evidenceId;
  const ev = currentTrail.evidence.find(e => e.evidence_id === evidenceId);
  if (!ev) return;

  document.querySelectorAll('.ev-select-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-id') === evidenceId);
  });

  evTypeDisplay.textContent = ev.evidence_type;
  evResultBadge.className = `badge ${ev.result === 'PASS' ? 'badge-pass' : 'badge-subtle'}`;
  evResultBadge.textContent = ev.result;
  evMethodDisplay.textContent = `${ev.verification_method} (Policy: ${ev.policy_version})`;
  evTimestampDisplay.textContent = new Date(ev.checked_at).toLocaleTimeString();
  evProviderDisplay.textContent = ev.source_reference;
  evHashDisplay.textContent = ev.content_hash;
  evPayloadDisplay.textContent = JSON.stringify(ev.raw_data || { reason: ev.reason || 'N/A' }, null, 2);
}

function renderAuditTimeline(events) {
  auditTimelineList.innerHTML = '';
  if (!events || events.length === 0) {
    auditTimelineList.innerHTML = '<p class="text-muted text-sm">No audit transitions recorded yet.</p>';
    return;
  }

  events.forEach((evt) => {
    const item = document.createElement('div');
    item.className = 'audit-entry';
    item.innerHTML = `
      <div class="audit-header-row">
        <span class="audit-status-transition">${evt.previous_status} ➔ ${evt.new_status}</span>
        <span class="audit-seq mono">Seq #${evt.sequence}</span>
      </div>
      <div class="text-xs text-muted mono">${evt.claim_id}</div>
      <div class="audit-details-text">${evt.details || evt.reason_code}</div>
      <div class="audit-hash-chain mono">
        <div>Prev: ${evt.prev_hash.substring(0, 24)}...</div>
        <div>Hash: ${evt.record_hash.substring(0, 24)}...</div>
      </div>
    `;
    auditTimelineList.appendChild(item);
  });
}

function renderRevalidationImpact(claims) {
  const hasReval = claims.some(c => c.status === 'REVALIDATION_REQUIRED');
  if (!hasReval) {
    revalidationImpactCard.style.display = 'none';
    return;
  }

  revalidationImpactCard.style.display = 'block';
  affectedClaimsList.innerHTML = '';
  unaffectedClaimsList.innerHTML = '';

  claims.forEach(c => {
    const li = document.createElement('li');
    li.textContent = `${formatClaimType(c.claim_type)} (${c.claim_id})`;
    if (c.status === 'REVALIDATION_REQUIRED') {
      affectedClaimsList.appendChild(li);
    } else {
      unaffectedClaimsList.appendChild(li);
    }
  });
}

// --------------------------------------------------------------------------
// UI Helpers
// --------------------------------------------------------------------------
function setInspectorTab(tab) {
  tabClaimBtn.classList.toggle('active', tab === 'claim');
  tabEvidenceBtn.classList.toggle('active', tab === 'evidence');
  tabAuditBtn.classList.toggle('active', tab === 'audit');

  claimTabPanel.style.display = tab === 'claim' ? 'block' : 'none';
  evidenceTabPanel.style.display = tab === 'evidence' ? 'block' : 'none';
  auditTabPanel.style.display = tab === 'audit' ? 'block' : 'none';
}

function setViewMode(mode) {
  viewDagBtn.classList.toggle('active', mode === 'dag');
  viewListBtn.classList.toggle('active', mode === 'list');
  dagContainer.style.display = mode === 'dag' ? 'block' : 'none';
  accessibleListContainer.style.display = mode === 'list' ? 'block' : 'none';
}

function setLoading(isLoading) {
  inspectBtn.disabled = isLoading;
  inspectBtn.querySelector('.btn-spinner').style.display = isLoading ? 'inline-block' : 'none';
}

function showError(title, message) {
  alertBanner.className = 'alert-banner error';
  alertTitle.textContent = title;
  alertMessage.textContent = message;
  alertBanner.style.display = 'flex';
}

function hideError() {
  alertBanner.style.display = 'none';
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast-notice';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function copyToClipboard(text, feedback) {
  if (!text || text === '-' || text === 'Loading...') return;
  navigator.clipboard.writeText(text).then(() => showToast(feedback)).catch(() => {});
}

function truncateHash(hash) {
  if (!hash || hash.length < 18) return hash || '';
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
}

function formatClaimType(type) {
  if (!type) return 'Unknown Claim';
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function getStatusBorderColor(status) {
  switch (status) {
    case 'VERIFIED': return '#10b981';
    case 'INCONCLUSIVE': return '#f59e0b';
    case 'REVALIDATION_REQUIRED': return '#c084fc';
    case 'INVALID': return '#f43f5e';
    default: return '#334155';
  }
}

function getStatusTextColor(status) {
  switch (status) {
    case 'VERIFIED': return '#34d399';
    case 'INCONCLUSIVE': return '#fbbf24';
    case 'REVALIDATION_REQUIRED': return '#d8b4fe';
    case 'INVALID': return '#fb7185';
    default: return '#94a3b8';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'VERIFIED': return 'badge-pass';
    case 'INVALID': return 'badge-fail';
    case 'REVALIDATION_REQUIRED': return 'badge-reval';
    case 'INCONCLUSIVE': return 'badge-inconcl';
    default: return 'badge-subtle';
  }
}
