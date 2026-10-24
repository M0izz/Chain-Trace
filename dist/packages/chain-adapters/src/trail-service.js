"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossChainTrailService = void 0;
const index_js_1 = require("../../dependency-engine/src/index.js");
const profile_js_1 = require("./profile.js");
/**
 * Cross-Chain Trail Service
 * Connects protocol adapter evidence to the Phase 1 DependencyEngine.
 */
class CrossChainTrailService {
    adapter;
    engine;
    // Track observed block hashes at heights for reorg detection
    observedBlockHashes = new Map();
    constructor(adapter, engine) {
        this.adapter = adapter;
        this.engine = engine ?? new index_js_1.DependencyEngine();
    }
    /**
     * Ingests, normalizes, and verifies a cross-chain execution trail from a source transaction hash.
     */
    async ingestAndVerifyTrail(request) {
        // 1. Fetch & decode source evidence
        const sourceEvidence = await this.adapter.getSourceEvidence(request.sourceTxHash);
        const { sourceEvent, receiptEvidence, finalityEvidence, decodedPacket } = sourceEvidence;
        // Track observed source block hash for reorg detection
        this.observedBlockHashes.set(sourceEvent.block_number, sourceEvent.block_hash);
        // Register into Phase 1 Engine (idempotent)
        this.engine.registerEvent(sourceEvent);
        this.engine.registerEvidence(receiptEvidence);
        this.engine.registerEvidence(finalityEvidence);
        // 2. Build Source Inclusion Claim
        const srcIncludedClaimId = `claim:${sourceEvent.chain_id}:included:${sourceEvent.tx_hash}`;
        const srcIncludedClaim = {
            claim_id: srcIncludedClaimId,
            claim_type: 'EVENT_INCLUDED',
            subject_refs: [sourceEvent.event_id],
            status: 'UNVERIFIED',
            policy_id: 'policy:event-inclusion',
            policy_version: this.adapter.profile.policyVersion,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'AWAITING_VERIFICATION', message: 'Source event observed, awaiting evaluation' }
        };
        this.engine.registerClaim(srcIncludedClaim);
        this.engine.addDependency({
            dependency_id: `dep:${receiptEvidence.evidence_id}->${srcIncludedClaimId}`,
            parent_type: 'EVIDENCE',
            parent_id: receiptEvidence.evidence_id,
            dependent_claim_id: srcIncludedClaimId,
            dependency_type: 'SUPPORTS',
            required: true
        });
        // 3. Build Source Finalized Claim
        const srcFinalizedClaimId = `claim:${sourceEvent.chain_id}:finalized:${sourceEvent.tx_hash}`;
        const srcFinalizedClaim = {
            claim_id: srcFinalizedClaimId,
            claim_type: 'SOURCE_FINALIZED',
            subject_refs: [sourceEvent.event_id],
            status: 'UNVERIFIED',
            policy_id: 'policy:source-finality',
            policy_version: this.adapter.profile.policyVersion,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'AWAITING_VERIFICATION', message: 'Awaiting source finality check' }
        };
        this.engine.registerClaim(srcFinalizedClaim);
        this.engine.addDependency({
            dependency_id: `dep:${srcIncludedClaimId}->${srcFinalizedClaimId}`,
            parent_type: 'CLAIM',
            parent_id: srcIncludedClaimId,
            dependent_claim_id: srcFinalizedClaimId,
            dependency_type: 'SUPPORTS',
            required: true
        });
        this.engine.addDependency({
            dependency_id: `dep:${finalityEvidence.evidence_id}->${srcFinalizedClaimId}`,
            parent_type: 'EVIDENCE',
            parent_id: finalityEvidence.evidence_id,
            dependent_claim_id: srcFinalizedClaimId,
            dependency_type: 'FINALITY_GUARD',
            required: true
        });
        // 4. Resolve Destination Evidence
        const destResult = await this.adapter.getDestinationEvidence({
            guid: decodedPacket.guid,
            destTxHash: request.destTxHash
        });
        // Create Message Attestation Evidence
        const attestationEvidenceId = `evidence:lz2:attestation:${decodedPacket.guid}`;
        const attestationEvidence = {
            evidence_id: attestationEvidenceId,
            evidence_type: 'MESSAGE_ATTESTATION',
            subject_ref: decodedPacket.guid,
            content_hash: (0, profile_js_1.computeContentHash)(decodedPacket),
            source_reference: `layerzero://${decodedPacket.srcEid}->${decodedPacket.dstEid}/${decodedPacket.guid}`,
            verification_method: 'LayerZeroV2PacketHeaderVerification',
            policy_version: this.adapter.profile.policyVersion,
            result: destResult.status === 'FOUND'
                ? 'PASS'
                : destResult.status === 'MISMATCH'
                    ? 'FAIL'
                    : 'INCONCLUSIVE',
            checked_at: new Date().toISOString(),
            reason: destResult.reason
        };
        this.engine.registerEvidence(attestationEvidence);
        // 5. Build Message Matched Claim
        const msgMatchClaimId = `claim:lz2:match:${decodedPacket.guid}`;
        const destEventId = destResult.destinationEvent?.event_id;
        const msgMatchClaim = {
            claim_id: msgMatchClaimId,
            claim_type: 'MESSAGE_MATCHED',
            subject_refs: destEventId
                ? [sourceEvent.event_id, destEventId]
                : [sourceEvent.event_id],
            status: 'UNVERIFIED',
            policy_id: 'policy:message-match',
            policy_version: this.adapter.profile.policyVersion,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'AWAITING_VERIFICATION', message: 'Awaiting message match verification' },
            metadata: {
                source_message_id: decodedPacket.guid,
                destination_message_id: destResult.decodedPacket?.guid ??
                    (destResult.status === 'FOUND' ? decodedPacket.guid : undefined)
            }
        };
        this.engine.registerClaim(msgMatchClaim);
        this.engine.addDependency({
            dependency_id: `dep:${srcFinalizedClaimId}->${msgMatchClaimId}`,
            parent_type: 'CLAIM',
            parent_id: srcFinalizedClaimId,
            dependent_claim_id: msgMatchClaimId,
            dependency_type: 'SUPPORTS',
            required: true
        });
        this.engine.addDependency({
            dependency_id: `dep:${attestationEvidenceId}->${msgMatchClaimId}`,
            parent_type: 'EVIDENCE',
            parent_id: attestationEvidenceId,
            dependent_claim_id: msgMatchClaimId,
            dependency_type: 'AUTHENTICATES',
            required: true
        });
        // 6. Build Destination Executed Claim
        const destExecClaimId = `claim:${this.adapter.profile.destinationChain.chainId}:dest-exec:${decodedPacket.guid}`;
        const destExecClaim = {
            claim_id: destExecClaimId,
            claim_type: 'DESTINATION_EXECUTED',
            subject_refs: destEventId ? [destEventId] : [],
            status: destResult.status === 'FOUND' ? 'UNVERIFIED' : 'INCONCLUSIVE',
            policy_id: 'policy:destination-execution',
            policy_version: this.adapter.profile.policyVersion,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: {
                code: destResult.status === 'FOUND' ? 'AWAITING_VERIFICATION' : 'DESTINATION_NOT_FOUND',
                message: destResult.reason ?? 'Destination packet delivery observed'
            }
        };
        this.engine.registerClaim(destExecClaim);
        if (destResult.destinationEvent && destResult.receiptEvidence) {
            this.engine.registerEvent(destResult.destinationEvent);
            this.engine.registerEvidence(destResult.receiptEvidence);
            this.engine.addDependency({
                dependency_id: `dep:${destResult.receiptEvidence.evidence_id}->${destExecClaimId}`,
                parent_type: 'EVIDENCE',
                parent_id: destResult.receiptEvidence.evidence_id,
                dependent_claim_id: destExecClaimId,
                dependency_type: 'SUPPORTS',
                required: true
            });
        }
        // 7. Build End-to-End Path Supported Claim
        const pathClaimId = `claim:lz2:path:${decodedPacket.guid}`;
        const pathClaim = {
            claim_id: pathClaimId,
            claim_type: 'PATH_SUPPORTED',
            subject_refs: destEventId
                ? [sourceEvent.event_id, destEventId]
                : [sourceEvent.event_id],
            status: 'UNVERIFIED',
            policy_id: 'policy:path-support',
            policy_version: this.adapter.profile.policyVersion,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_reason: { code: 'AWAITING_VERIFICATION', message: 'Awaiting path evaluation' }
        };
        this.engine.registerClaim(pathClaim);
        this.engine.addDependency({
            dependency_id: `dep:${msgMatchClaimId}->${pathClaimId}`,
            parent_type: 'CLAIM',
            parent_id: msgMatchClaimId,
            dependent_claim_id: pathClaimId,
            dependency_type: 'MATCHES',
            required: true
        });
        this.engine.addDependency({
            dependency_id: `dep:${destExecClaimId}->${pathClaimId}`,
            parent_type: 'CLAIM',
            parent_id: destExecClaimId,
            dependent_claim_id: pathClaimId,
            dependency_type: 'SUPPORTS',
            required: true
        });
        // 8. Run Revalidation & Evaluation in Topological Order
        await this.engine.evaluateClaim(srcIncludedClaimId);
        await this.engine.evaluateClaim(srcFinalizedClaimId);
        await this.engine.evaluateClaim(msgMatchClaimId);
        if (destResult.status === 'FOUND') {
            await this.engine.evaluateClaim(destExecClaimId);
        }
        await this.engine.evaluateClaim(pathClaimId);
        const evaluatedClaims = [
            this.engine.getClaim(srcIncludedClaimId),
            this.engine.getClaim(srcFinalizedClaimId),
            this.engine.getClaim(msgMatchClaimId),
            this.engine.getClaim(destExecClaimId),
            this.engine.getClaim(pathClaimId)
        ];
        const trail = this.engine.getTrail(request.sourceTxHash);
        return {
            sourceEvidence,
            trail,
            claims: evaluatedClaims,
            isComplete: evaluatedClaims.every((c) => c.status === 'VERIFIED'),
            statusSummary: {
                sourceIncluded: evaluatedClaims[0].status,
                sourceFinalized: evaluatedClaims[1].status,
                messageMatched: evaluatedClaims[2].status,
                destinationExecuted: evaluatedClaims[3].status,
                pathSupported: evaluatedClaims[4].status
            }
        };
    }
    /**
     * Checks whether an observed source block height has experienced a reorg.
     * If a reorg is detected, marks affected claims as REVALIDATION_REQUIRED.
     */
    async checkSourceReorg(blockNumber) {
        const knownHash = this.observedBlockHashes.get(blockNumber);
        if (!knownHash)
            return false;
        const currentBlock = await this.adapter.sourceRpc.getBlockByNumber(blockNumber);
        if (!currentBlock)
            return false;
        if (currentBlock.hash.toLowerCase() !== knownHash.toLowerCase()) {
            // Reorg detected! Trigger dependency change on finality evidence
            const finalityEvId = `evidence:${this.adapter.profile.sourceChain.chainId}:finality:${knownHash}`;
            this.engine.onDependencyChanged(finalityEvId, `SOURCE_REORG_AT_HEIGHT_${blockNumber}:canonical_hash_changed_to_${currentBlock.hash}`);
            return true;
        }
        return false;
    }
}
exports.CrossChainTrailService = CrossChainTrailService;
