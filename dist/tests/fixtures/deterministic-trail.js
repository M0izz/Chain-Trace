"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIXTURE_DEPENDENCY_EDGES = exports.FIXTURE_CLAIM_PATH_SUPPORTED = exports.FIXTURE_CLAIM_DEST_EXECUTED = exports.FIXTURE_CLAIM_MESSAGE_MATCH = exports.FIXTURE_CLAIM_SOURCE_FINALIZED = exports.FIXTURE_CLAIM_SOURCE_INCLUDED = exports.FIXTURE_EVIDENCE_DEST_EXEC = exports.FIXTURE_EVIDENCE_ATTESTATION = exports.FIXTURE_EVIDENCE_FINALITY = exports.FIXTURE_EVIDENCE_INCLUSION = exports.FIXTURE_DEST_EVENT = exports.FIXTURE_SOURCE_EVENT = void 0;
const index_js_1 = require("../../packages/verification/src/index.js");
exports.FIXTURE_SOURCE_EVENT = {
    event_id: 'event:11155111:0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d:2',
    chain_id: 11155111,
    tx_hash: '0x9a8f4c2e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
    block_number: 5420100,
    block_hash: '0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000',
    event_index: 2,
    contract_address: '0x1111111111111111111111111111111111111111',
    event_signature: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
    observed_at: '2026-10-24T12:00:00.000Z',
    payload: {
        messageId: '0xmsg-eth-pol-001',
        sender: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        recipient: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        amount: '1000000000000000000'
    }
};
exports.FIXTURE_DEST_EVENT = {
    event_id: 'event:80002:0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c:1',
    chain_id: 80002,
    tx_hash: '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c',
    block_number: 9840220,
    block_hash: '0xaaaa5555bbbb6666cccc7777dddd8888eeee9999ffff00001111222233334444',
    event_index: 1,
    contract_address: '0x2222222222222222222222222222222222222222',
    event_signature: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    observed_at: '2026-10-24T12:05:00.000Z',
    payload: {
        messageId: '0xmsg-eth-pol-001',
        recipient: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        amount: '1000000000000000000'
    }
};
exports.FIXTURE_EVIDENCE_INCLUSION = {
    evidence_id: 'evidence:eth:inclusion:001',
    evidence_type: 'INCLUSION_PROOF',
    subject_ref: exports.FIXTURE_SOURCE_EVENT.event_id,
    content_hash: '0xabc123789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
    source_reference: 'rpc://sepolia.infura.io/v3/proof',
    verification_method: 'MerkleReceiptProof',
    policy_version: '1.0.0',
    result: 'PASS',
    checked_at: '2026-10-24T12:01:00.000Z'
};
exports.FIXTURE_EVIDENCE_FINALITY = {
    evidence_id: 'evidence:eth:finality:001',
    evidence_type: 'AUTHENTICATED_HEADER',
    subject_ref: exports.FIXTURE_SOURCE_EVENT.event_id,
    content_hash: '0xbbb123789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
    source_reference: 'rpc://sepolia.beacon-api/finalized_header',
    verification_method: 'CasperFFGFinality',
    policy_version: '1.0.0',
    result: 'PASS',
    checked_at: '2026-10-24T12:02:00.000Z'
};
exports.FIXTURE_EVIDENCE_ATTESTATION = {
    evidence_id: 'evidence:bridge:attestation:001',
    evidence_type: 'MESSAGE_ATTESTATION',
    subject_ref: 'claim:message-match:001',
    content_hash: '0xccc123789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
    source_reference: 'https://bridge-attestation.network/api/v1/attest/0xmsg-eth-pol-001',
    verification_method: 'MultiSigAttestation',
    policy_version: '1.0.0',
    result: 'PASS',
    checked_at: '2026-10-24T12:03:00.000Z'
};
exports.FIXTURE_EVIDENCE_DEST_EXEC = {
    evidence_id: 'evidence:polygon:exec:001',
    evidence_type: 'RECEIPT_REFERENCE',
    subject_ref: exports.FIXTURE_DEST_EVENT.event_id,
    content_hash: '0xddd123789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
    source_reference: 'rpc://amoy.polygon.technology/receipt',
    verification_method: 'ReceiptStatusCheck',
    policy_version: '1.0.0',
    result: 'PASS',
    checked_at: '2026-10-24T12:06:00.000Z'
};
exports.FIXTURE_CLAIM_SOURCE_INCLUDED = {
    claim_id: 'claim:source-included:001',
    claim_type: 'EVENT_INCLUDED',
    subject_refs: [exports.FIXTURE_SOURCE_EVENT.event_id],
    status: 'UNVERIFIED',
    policy_id: index_js_1.POLICY_IDS.EVENT_INCLUSION,
    policy_version: '1.0.0',
    created_at: '2026-10-24T12:01:30.000Z',
    updated_at: '2026-10-24T12:01:30.000Z',
    status_reason: {
        code: 'AWAITING_VERIFICATION',
        message: 'Claim registered and awaiting initial evaluation'
    }
};
exports.FIXTURE_CLAIM_SOURCE_FINALIZED = {
    claim_id: 'claim:source-finalized:001',
    claim_type: 'SOURCE_FINALIZED',
    subject_refs: [exports.FIXTURE_SOURCE_EVENT.event_id],
    status: 'UNVERIFIED',
    policy_id: index_js_1.POLICY_IDS.SOURCE_FINALITY,
    policy_version: '1.0.0',
    created_at: '2026-10-24T12:02:30.000Z',
    updated_at: '2026-10-24T12:02:30.000Z',
    status_reason: {
        code: 'AWAITING_VERIFICATION',
        message: 'Claim registered and awaiting source finality evaluation'
    }
};
exports.FIXTURE_CLAIM_MESSAGE_MATCH = {
    claim_id: 'claim:message-match:001',
    claim_type: 'MESSAGE_MATCHED',
    subject_refs: [exports.FIXTURE_SOURCE_EVENT.event_id, exports.FIXTURE_DEST_EVENT.event_id],
    status: 'UNVERIFIED',
    policy_id: index_js_1.POLICY_IDS.MESSAGE_MATCH,
    policy_version: '1.0.0',
    created_at: '2026-10-24T12:03:30.000Z',
    updated_at: '2026-10-24T12:03:30.000Z',
    status_reason: {
        code: 'AWAITING_VERIFICATION',
        message: 'Claim registered for cross-chain message matching'
    },
    metadata: {
        source_message_id: '0xmsg-eth-pol-001',
        destination_message_id: '0xmsg-eth-pol-001'
    }
};
exports.FIXTURE_CLAIM_DEST_EXECUTED = {
    claim_id: 'claim:dest-executed:001',
    claim_type: 'DESTINATION_EXECUTED',
    subject_refs: [exports.FIXTURE_DEST_EVENT.event_id],
    status: 'UNVERIFIED',
    policy_id: index_js_1.POLICY_IDS.DESTINATION_EXECUTION,
    policy_version: '1.0.0',
    created_at: '2026-10-24T12:06:30.000Z',
    updated_at: '2026-10-24T12:06:30.000Z',
    status_reason: {
        code: 'AWAITING_VERIFICATION',
        message: 'Destination execution observation awaiting verification'
    }
};
exports.FIXTURE_CLAIM_PATH_SUPPORTED = {
    claim_id: 'claim:path-supported:001',
    claim_type: 'PATH_SUPPORTED',
    subject_refs: [
        exports.FIXTURE_SOURCE_EVENT.event_id,
        exports.FIXTURE_DEST_EVENT.event_id
    ],
    status: 'UNVERIFIED',
    policy_id: index_js_1.POLICY_IDS.PATH_SUPPORT,
    policy_version: '1.0.0',
    created_at: '2026-10-24T12:07:00.000Z',
    updated_at: '2026-10-24T12:07:00.000Z',
    status_reason: {
        code: 'AWAITING_VERIFICATION',
        message: 'Full path claim registered and awaiting evaluation'
    }
};
exports.FIXTURE_DEPENDENCY_EDGES = [
    // Inclusion proof -> Source included claim
    {
        dependency_id: 'dep:inc-proof->src-inc',
        parent_type: 'EVIDENCE',
        parent_id: exports.FIXTURE_EVIDENCE_INCLUSION.evidence_id,
        dependent_claim_id: exports.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id,
        dependency_type: 'SUPPORTS',
        required: true
    },
    // Source included claim -> Source finalized claim
    {
        dependency_id: 'dep:src-inc->src-fin',
        parent_type: 'CLAIM',
        parent_id: exports.FIXTURE_CLAIM_SOURCE_INCLUDED.claim_id,
        dependent_claim_id: exports.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id,
        dependency_type: 'SUPPORTS',
        required: true
    },
    // Finality header evidence -> Source finalized claim
    {
        dependency_id: 'dep:fin-ev->src-fin',
        parent_type: 'EVIDENCE',
        parent_id: exports.FIXTURE_EVIDENCE_FINALITY.evidence_id,
        dependent_claim_id: exports.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id,
        dependency_type: 'FINALITY_GUARD',
        required: true
    },
    // Source finalized claim -> Message match claim
    {
        dependency_id: 'dep:src-fin->msg-match',
        parent_type: 'CLAIM',
        parent_id: exports.FIXTURE_CLAIM_SOURCE_FINALIZED.claim_id,
        dependent_claim_id: exports.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id,
        dependency_type: 'SUPPORTS',
        required: true
    },
    // Attestation evidence -> Message match claim
    {
        dependency_id: 'dep:attest->msg-match',
        parent_type: 'EVIDENCE',
        parent_id: exports.FIXTURE_EVIDENCE_ATTESTATION.evidence_id,
        dependent_claim_id: exports.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id,
        dependency_type: 'AUTHENTICATES',
        required: true
    },
    // Destination execution evidence -> Destination executed claim
    {
        dependency_id: 'dep:dest-ev->dest-exec',
        parent_type: 'EVIDENCE',
        parent_id: exports.FIXTURE_EVIDENCE_DEST_EXEC.evidence_id,
        dependent_claim_id: exports.FIXTURE_CLAIM_DEST_EXECUTED.claim_id,
        dependency_type: 'SUPPORTS',
        required: true
    },
    // Message match claim -> Path supported claim
    {
        dependency_id: 'dep:msg-match->path',
        parent_type: 'CLAIM',
        parent_id: exports.FIXTURE_CLAIM_MESSAGE_MATCH.claim_id,
        dependent_claim_id: exports.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id,
        dependency_type: 'MATCHES',
        required: true
    },
    // Destination executed claim -> Path supported claim
    {
        dependency_id: 'dep:dest-exec->path',
        parent_type: 'CLAIM',
        parent_id: exports.FIXTURE_CLAIM_DEST_EXECUTED.claim_id,
        dependent_claim_id: exports.FIXTURE_CLAIM_PATH_SUPPORTED.claim_id,
        dependency_type: 'SUPPORTS',
        required: true
    }
];
