// ==========================================================================
// ChainTrace — Premium Editorial Controller & Motion Engine (Prism-Inspired)
// Integrates GSAP scroll storytelling, interactive canvas evidence lattice,
// SVG dependency DAG, and Fastify REST API integration.
// ==========================================================================

// Standardized Demo Scenarios
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
          title: 'Source Transaction Included',
          status: 'VERIFIED',
          policy_id: 'policy:event-inclusion',
          policy_version: '1.0.0',
          status_reason: { code: 'STATUS_CONFIRMED', message: 'Source transaction executed successfully with status 0x1 on Sepolia' },
          prerequisites: [],
          evidenceIds: ['ev:src:receipt:0x9a8f4c']
        },
        {
          claim_id: 'claim:source-finality:0x9a8f4c',
          claim_type: 'SOURCE_FINALIZED',
          title: 'Source Finality Confirmed',
          status: 'VERIFIED',
          policy_id: 'policy:source-finality',
          policy_version: '1.0.0',
          status_reason: { code: 'FINALITY_CONFIRMED', message: '28 confirmations exceed Sepolia finality threshold of 12 blocks' },
          prerequisites: ['claim:event-inclusion:0x9a8f4c'],
          evidenceIds: ['ev:src:receipt:0x9a8f4c']
        },
        {
          claim_id: 'claim:message-match:guid01',
          claim_type: 'MESSAGE_MATCHED',
          title: 'Message Identity Matched',
          status: 'VERIFIED',
          policy_id: 'policy:message-match',
          policy_version: '1.0.0',
          status_reason: { code: 'GUID_MATCHED', message: 'Source PacketSent GUID cryptographically matches destination PacketDelivered GUID' },
          prerequisites: ['claim:source-finality:0x9a8f4c'],
          evidenceIds: ['ev:src:receipt:0x9a8f4c', 'ev:dest:receipt:0x8b7c6d']
        },
        {
          claim_id: 'claim:dest-exec:0x8b7c6d',
          claim_type: 'DESTINATION_EXECUTED',
          title: 'Destination Execution Proven',
          status: 'VERIFIED',
          policy_id: 'policy:destination-execution',
          policy_version: '1.0.0',
          status_reason: { code: 'DELIVERY_CONFIRMED', message: 'Destination receipt status 0x1 with verified PacketDelivered emission' },
          prerequisites: ['claim:message-match:guid01'],
          evidenceIds: ['ev:dest:receipt:0x8b7c6d']
        }
      ],
      evidence: [
        {
          evidence_id: 'ev:src:receipt:0x9a8f4c',
          verification_method: 'DIRECT_RPC',
          source_reference: 'https://rpc.sepolia.org',
          content_hash: '0x4f7c10b24e6a8d0f1c3e5a7b9d1f3b5d7f9a1c3e5a7b9d1f3b5d7f9a1c3e5a7b',
          raw_data: { status: 1, blockNumber: 5420052, confirmations: 28, event: 'PacketSent' }
        },
        {
          evidence_id: 'ev:dest:receipt:0x8b7c6d',
          verification_method: 'DIRECT_RPC',
          source_reference: 'https://rpc-amoy.polygon.technology',
          content_hash: '0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
          raw_data: { status: 1, blockNumber: 9841116, confirmations: 34, event: 'PacketDelivered' }
        }
      ],
      auditTrail: [
        {
          audit_id: 'audit:001',
          sequence: 0,
          previous_status: 'UNVERIFIED',
          new_status: 'VERIFIED',
          reason_code: 'STATUS_CONFIRMED',
          details: 'Initial verification on Sepolia block 5420052',
          timestamp: '2026-10-25T11:00:00Z',
          prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
          record_hash: '62e92cbf3df6a1f0a1c676d1e4e2a89309874cb54942cfcbba5be12267885b54'
        },
        {
          audit_id: 'audit:002',
          sequence: 1,
          previous_status: 'UNVERIFIED',
          new_status: 'VERIFIED',
          reason_code: 'FINALITY_CONFIRMED',
          details: 'Confirmation count verified (28 >= 12)',
          timestamp: '2026-10-25T11:00:02Z',
          prev_hash: '62e92cbf3df6a1f0a1c676d1e4e2a89309874cb54942cfcbba5be12267885b54',
          record_hash: '8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a'
        }
      ]
    }
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
          title: 'Source Transaction Included',
          status: 'VERIFIED',
          policy_id: 'policy:event-inclusion',
          policy_version: '1.0.0',
          status_reason: { code: 'STATUS_CONFIRMED', message: 'Source receipt confirmed on-chain' },
          prerequisites: [],
          evidenceIds: ['ev:src:receipt:0x111111']
        },
        {
          claim_id: 'claim:message-match:mismatch',
          claim_type: 'MESSAGE_MATCHED',
          title: 'Message Identity Matched',
          status: 'INVALID',
          policy_id: 'policy:message-match',
          policy_version: '1.0.0',
          status_reason: {
            code: 'MESSAGE_ID_MISMATCH',
            message: 'Source GUID (0xaa11) does not match destination executed GUID (0xbb22)'
          },
          prerequisites: ['claim:event-inclusion:0x111111'],
          evidenceIds: ['ev:src:receipt:0x111111', 'ev:dest:receipt:0x222222']
        }
      ],
      evidence: [
        {
          evidence_id: 'ev:src:receipt:0x111111',
          verification_method: 'DIRECT_RPC',
          source_reference: 'https://rpc.sepolia.org',
          content_hash: '0x111111b24e6a8d0f1c3e5a7b9d1f3b5d7f9a1c3e5a7b9d1f3b5d7f9a1c3e5a7b',
          raw_data: { guid: '0xaa11...packet' }
        },
        {
          evidence_id: 'ev:dest:receipt:0x222222',
          verification_method: 'DIRECT_RPC',
          source_reference: 'https://rpc-amoy.polygon.technology',
          content_hash: '0x2222221d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
          raw_data: { guid: '0xbb22...different_packet' }
        }
      ],
      auditTrail: [
        {
          audit_id: 'audit:mismatch:001',
          sequence: 0,
          previous_status: 'UNVERIFIED',
          new_status: 'INVALID',
          reason_code: 'MESSAGE_ID_MISMATCH',
          details: 'Evaluation failed: GUID mismatch detected',
          timestamp: '2026-10-25T11:10:00Z',
          prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
          record_hash: '444444bf3df6a1f0a1c676d1e4e2a89309874cb54942cfcbba5be12267885b54'
        }
      ]
    }
  },

  'evidence-unavailable': {
    isFixture: true,
    trail: {
      schemaVersion: '1.0',
      trailId: 'trail:11155111:0x3333332e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      source: { chainId: 11155111, txHash: '0x3333332e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d' },
      destination: { chainId: 80002, txHash: '' },
      status: 'INCONCLUSIVE',
      claims: [
        {
          claim_id: 'claim:event-inclusion:0x333333',
          claim_type: 'EVENT_INCLUDED',
          title: 'Source Transaction Included',
          status: 'VERIFIED',
          policy_id: 'policy:event-inclusion',
          policy_version: '1.0.0',
          status_reason: { code: 'STATUS_CONFIRMED', message: 'Source event confirmed on Sepolia' },
          prerequisites: [],
          evidenceIds: ['ev:src:receipt:0x333333']
        },
        {
          claim_id: 'claim:dest-exec:pending',
          claim_type: 'DESTINATION_EXECUTED',
          title: 'Destination Delivery Indexed',
          status: 'INCONCLUSIVE',
          policy_id: 'policy:destination-execution',
          policy_version: '1.0.0',
          status_reason: {
            code: 'DESTINATION_NOT_YET_INDEXED',
            message: 'Inflight message: Destination transaction has not yet been observed on Polygon Amoy'
          },
          prerequisites: ['claim:event-inclusion:0x333333'],
          evidenceIds: []
        }
      ],
      evidence: [
        {
          evidence_id: 'ev:src:receipt:0x333333',
          verification_method: 'DIRECT_RPC',
          source_reference: 'https://rpc.sepolia.org',
          content_hash: '0x333333b24e6a8d0f1c3e5a7b9d1f3b5d7f9a1c3e5a7b9d1f3b5d7f9a1c3e5a7b',
          raw_data: { status: 1, blockNumber: 5420090, confirmations: 14 }
        }
      ],
      auditTrail: [
        {
          audit_id: 'audit:pending:001',
          sequence: 0,
          previous_status: 'UNVERIFIED',
          new_status: 'INCONCLUSIVE',
          reason_code: 'DESTINATION_NOT_YET_INDEXED',
          details: 'Evaluation incomplete: Pending destination confirmation',
          timestamp: '2026-10-25T11:20:00Z',
          prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
          record_hash: '777777bf3df6a1f0a1c676d1e4e2a89309874cb54942cfcbba5be12267885b54'
        }
      ]
    }
  },

  'dependency-change': {
    isFixture: true,
    trail: {
      schemaVersion: '1.0',
      trailId: 'trail:11155111:0x4444442e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      source: { chainId: 11155111, txHash: '0x4444442e6d1a8b3c5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d' },
      destination: { chainId: 80002, txHash: '0x5555555e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c' },
      status: 'REVALIDATION_REQUIRED',
      claims: [
        {
          claim_id: 'claim:event-inclusion:0x444444',
          claim_type: 'EVENT_INCLUDED',
          title: 'Source Transaction Included',
          status: 'REVALIDATION_REQUIRED',
          policy_id: 'policy:event-inclusion',
          policy_version: '1.0.0',
          status_reason: { code: 'BLOCK_HASH_CHANGED', message: 'Reorg detected at height 5420052: Block hash mutated' },
          prerequisites: [],
          evidenceIds: ['ev:src:receipt:0x444444']
        },
        {
          claim_id: 'claim:source-finality:0x444444',
          claim_type: 'SOURCE_FINALIZED',
          title: 'Source Finality Confirmed',
          status: 'REVALIDATION_REQUIRED',
          policy_id: 'policy:source-finality',
          policy_version: '1.0.0',
          status_reason: { code: 'DEPENDENCY_CHANGED', message: 'Prerequisite event-inclusion requires revalidation' },
          prerequisites: ['claim:event-inclusion:0x444444'],
          evidenceIds: ['ev:src:receipt:0x444444']
        },
        {
          claim_id: 'claim:message-match:reval',
          claim_type: 'MESSAGE_MATCHED',
          title: 'Message Identity Matched',
          status: 'REVALIDATION_REQUIRED',
          policy_id: 'policy:message-match',
          policy_version: '1.0.0',
          status_reason: { code: 'DEPENDENCY_CHANGED', message: 'Prerequisite source finality changed' },
          prerequisites: ['claim:source-finality:0x444444'],
          evidenceIds: ['ev:src:receipt:0x444444', 'ev:dest:receipt:0x555555']
        },
        {
          claim_id: 'claim:dest-exec:0x555555',
          claim_type: 'DESTINATION_EXECUTED',
          title: 'Destination Execution Proven',
          status: 'VERIFIED',
          policy_id: 'policy:destination-execution',
          policy_version: '1.0.0',
          status_reason: { code: 'DELIVERY_CONFIRMED', message: 'Independent fact on Polygon Amoy remains unaffected' },
          prerequisites: ['claim:message-match:reval'],
          evidenceIds: ['ev:dest:receipt:0x555555']
        }
      ],
      evidence: [
        {
          evidence_id: 'ev:src:receipt:0x444444',
          verification_method: 'DIRECT_RPC',
          source_reference: 'https://rpc.sepolia.org',
          content_hash: '0xmutated_hash_5420052',
          raw_data: { blockHash: '0x9999_mutated', status: 1 }
        },
        {
          evidence_id: 'ev:dest:receipt:0x555555',
          verification_method: 'DIRECT_RPC',
          source_reference: 'https://rpc-amoy.polygon.technology',
          content_hash: '0xpolygon_stable_receipt',
          raw_data: { status: 1, blockNumber: 9841116 }
        }
      ],
      auditTrail: [
        {
          audit_id: 'audit:reorg:001',
          sequence: 0,
          previous_status: 'VERIFIED',
          new_status: 'REVALIDATION_REQUIRED',
          reason_code: 'BLOCK_HASH_CHANGED',
          details: 'Upstream reorg detected: triggered topological revalidation',
          timestamp: '2026-10-25T11:30:00Z',
          prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
          record_hash: '999999bf3df6a1f0a1c676d1e4e2a89309874cb54942cfcbba5be12267885b54'
        }
      ]
    }
  }
};

// ==========================================================================
// 01. Canvas Lattice Animation on Hero (Light Editorial Aesthetic)
// ==========================================================================
class HeroLatticeAnimation {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.mouse = { x: null, y: null, targetX: 0, targetY: 0 };
    this.numNodes = 42;
    this.maxDistance = 150;
    this.animationFrameId = null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Create initial nodes
    this.nodes = [];
    for (let i = 0; i < this.numNodes; i++) {
      this.nodes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2.5 + 1.5,
        baseColor: Math.random() > 0.4 ? 'rgba(120, 74, 255, 0.7)' : 'rgba(101, 99, 113, 0.5)'
      });
    }

    this.animate();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 20;
    this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 20;
  }

  animate() {
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    this.ctx.clearRect(0, 0, w, h);

    // Subtle pointer parallax offset
    const offsetX = this.mouse.targetX || 0;
    const offsetY = this.mouse.targetY || 0;

    // Draw connecting edges
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = (this.nodes[i].x + offsetX) - (this.nodes[j].x + offsetX);
        const dy = (this.nodes[i].y + offsetY) - (this.nodes[j].y + offsetY);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.maxDistance) {
          const alpha = (1 - dist / this.maxDistance) * 0.22;
          this.ctx.beginPath();
          this.ctx.moveTo(this.nodes[i].x + offsetX, this.nodes[i].y + offsetY);
          this.ctx.lineTo(this.nodes[j].x + offsetX, this.nodes[j].y + offsetY);
          this.ctx.strokeStyle = `rgba(120, 74, 255, ${alpha})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }
    }

    // Update and draw nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0 || node.x > w) node.vx *= -1;
      if (node.y < 0 || node.y > h) node.vy *= -1;

      // Draw soft halo
      this.ctx.beginPath();
      this.ctx.arc(node.x + offsetX, node.y + offsetY, node.radius * 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(120, 74, 255, 0.08)';
      this.ctx.fill();

      // Draw node center
      this.ctx.beginPath();
      this.ctx.arc(node.x + offsetX, node.y + offsetY, node.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = node.baseColor;
      this.ctx.fill();
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
}

// ==========================================================================
// 02. Interactive Revalidation Simulation
// ==========================================================================
class RevalidationSimulation {
  constructor() {
    this.btnTrigger = document.getElementById('btnTriggerReval');
    this.statusText = document.getElementById('revalStatusText');
    this.nodeInclusion = document.getElementById('demoNodeInclusion');
    this.nodeFinality = document.getElementById('demoNodeFinality');
    this.nodeMatch = document.getElementById('demoNodeMatch');
    this.nodeDest = document.getElementById('demoNodeDest');
    this.isReorged = false;

    if (this.btnTrigger) {
      this.btnTrigger.addEventListener('click', () => this.toggleReorg());
    }
  }

  toggleReorg() {
    this.isReorged = !this.isReorged;

    if (this.isReorged) {
      // Transition affected nodes
      this.nodeInclusion.querySelector('.node-status-pill').textContent = 'REVALIDATION REQ';
      this.nodeInclusion.querySelector('.node-status-pill').className = 'node-status-pill revalidation';
      this.nodeInclusion.classList.add('reval-affected');

      this.nodeFinality.querySelector('.node-status-pill').textContent = 'REVALIDATION REQ';
      this.nodeFinality.querySelector('.node-status-pill').className = 'node-status-pill revalidation';
      this.nodeFinality.classList.add('reval-affected');

      this.nodeMatch.querySelector('.node-status-pill').textContent = 'REVALIDATION REQ';
      this.nodeMatch.querySelector('.node-status-pill').className = 'node-status-pill revalidation';
      this.nodeMatch.classList.add('reval-affected');

      // Preserve independent destination fact
      this.nodeDest.querySelector('.node-status-pill').textContent = 'VERIFIED';
      this.nodeDest.querySelector('.node-status-pill').className = 'node-status-pill verified';
      this.nodeDest.classList.remove('reval-affected');

      this.btnTrigger.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
        <span>Reset Reorg State</span>
      `;

      this.statusText.innerHTML = `
        <span style="color: var(--color-reval-text); font-weight: 600;">REORGANIZATION OBSERVED:</span>
        Block hash mutated at height 5,420,052. Dependent claims [1, 2, 3] flagged as <code>REVALIDATION_REQUIRED</code>. Independent fact [4] on Polygon remains <code>VERIFIED</code>.
      `;
    } else {
      // Reset all to verified
      [this.nodeInclusion, this.nodeFinality, this.nodeMatch, this.nodeDest].forEach(node => {
        if (!node) return;
        const pill = node.querySelector('.node-status-pill');
        pill.textContent = 'VERIFIED';
        pill.className = 'node-status-pill verified';
        node.classList.remove('reval-affected');
      });

      this.btnTrigger.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
        <span>Simulate Upstream Block Reorg</span>
      `;

      this.statusText.innerHTML = `
        Initial State: All 4 claims verified under stated policies. Click "Simulate Upstream Block Reorg" above.
      `;
    }
  }
}

// ==========================================================================
// 03. Trail Explorer Controller (Live API + Deterministic Scenarios)
// ==========================================================================
class TrailExplorer {
  constructor() {
    this.currentTrail = DEMO_FIXTURES['successful-trail'].trail;
    this.selectedClaimId = null;

    // DOM Elements
    this.searchForm = document.getElementById('searchForm');
    this.txHashInput = document.getElementById('txHashInput');
    this.chainSelect = document.getElementById('chainSelect');
    this.inspectBtn = document.getElementById('inspectBtn');
    this.fixtureBanner = document.getElementById('fixtureBanner');
    this.trailIdEl = document.getElementById('trailIdEl');
    this.aggregateBadgeEl = document.getElementById('aggregateBadgeEl');
    this.scenarioPills = document.querySelectorAll('.scenario-pill');

    // DAG & List Elements
    this.svgDag = document.getElementById('svgDag');
    this.claimListView = document.getElementById('claimListView');
    this.btnViewGraph = document.getElementById('btnViewGraph');
    this.btnViewList = document.getElementById('btnViewList');
    this.edgeExplanationText = document.getElementById('edgeExplanationText');

    // Inspector Tabs & Panels
    this.tabClaim = document.getElementById('tabClaim');
    this.tabEvidence = document.getElementById('tabEvidence');
    this.tabAudit = document.getElementById('tabAudit');
    this.panelClaim = document.getElementById('panelClaim');
    this.panelEvidence = document.getElementById('panelEvidence');
    this.panelAudit = document.getElementById('panelAudit');

    // Inspector Content Fields
    this.claimTitleEl = document.getElementById('claimTitleEl');
    this.claimIdEl = document.getElementById('claimIdEl');
    this.claimReasonEl = document.getElementById('claimReasonEl');
    this.claimPolicyEl = document.getElementById('claimPolicyEl');
    this.evidenceMethodEl = document.getElementById('evidenceMethodEl');
    this.evidenceHashEl = document.getElementById('evidenceHashEl');
    this.evidenceRawEl = document.getElementById('evidenceRawEl');
    this.auditTimelineContainer = document.getElementById('auditTimelineContainer');

    this.init();
  }

  init() {
    // Attach scenario pill click handlers
    this.scenarioPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        this.scenarioPills.forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const scenarioKey = e.currentTarget.getAttribute('data-scenario');
        this.loadScenario(scenarioKey);
      });
    });

    // Attach search form submit
    if (this.searchForm) {
      this.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.queryLiveTrail();
      });
    }

    // Attach View toggles (Graph vs Accessible List)
    if (this.btnViewGraph && this.btnViewList) {
      this.btnViewGraph.addEventListener('click', () => {
        this.btnViewGraph.classList.add('active');
        this.btnViewList.classList.remove('active');
        this.svgDag.parentElement.style.display = 'block';
        this.claimListView.classList.remove('active');
      });

      this.btnViewList.addEventListener('click', () => {
        this.btnViewList.classList.add('active');
        this.btnViewGraph.classList.remove('active');
        this.svgDag.parentElement.style.display = 'none';
        this.claimListView.classList.add('active');
      });
    }

    // Tab switching
    this.setupTabs();

    // Initial render
    this.renderCurrentTrail();
  }

  setupTabs() {
    const tabs = [
      { btn: this.tabClaim, panel: this.panelClaim },
      { btn: this.tabEvidence, panel: this.panelEvidence },
      { btn: this.tabAudit, panel: this.panelAudit }
    ];

    tabs.forEach(({ btn, panel }) => {
      if (!btn || !panel) return;
      btn.addEventListener('click', () => {
        tabs.forEach(t => {
          t.btn.classList.remove('active');
          t.btn.setAttribute('aria-selected', 'false');
          t.panel.classList.remove('active');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        panel.classList.add('active');
      });
    });
  }

  loadScenario(scenarioKey) {
    const fixture = DEMO_FIXTURES[scenarioKey];
    if (!fixture) return;

    this.currentTrail = fixture.trail;
    this.txHashInput.value = fixture.trail.source.txHash;

    if (fixture.isFixture) {
      this.fixtureBanner.classList.add('visible');
    } else {
      this.fixtureBanner.classList.remove('visible');
    }

    this.renderCurrentTrail();
  }

  async queryLiveTrail() {
    const txHash = this.txHashInput.value.trim();
    const chainId = this.chainSelect.value;

    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      alert('Please enter a valid 32-byte hexadecimal transaction hash (0x...)');
      return;
    }

    this.inspectBtn.textContent = 'Querying...';
    this.inspectBtn.disabled = true;

    try {
      const res = await fetch(`/v1/trails/${chainId}/${txHash}`);
      if (res.ok) {
        const data = await res.json();
        this.currentTrail = data;
        this.fixtureBanner.classList.remove('visible');
        this.renderCurrentTrail();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`API Query Status: ${res.status}\nMessage: ${err.message || 'Transaction not yet recorded in local node state.'}`);
      }
    } catch (e) {
      console.warn('Live API request failed, falling back to simulated scenario:', e);
      alert('Note: Server connection error or offline endpoint. Displaying cached verification state.');
    } finally {
      this.inspectBtn.textContent = 'Inspect Trail';
      this.inspectBtn.disabled = false;
    }
  }

  renderCurrentTrail() {
    const trail = this.currentTrail;
    if (!trail) return;

    // Header metadata
    this.trailIdEl.textContent = trail.trailId;
    this.renderStatusBadge(this.aggregateBadgeEl, trail.status);

    // Render DAG & List
    this.renderSvgDag(trail.claims);
    this.renderListView(trail.claims);

    // Render Audit Trail
    this.renderAuditTimeline(trail.auditTrail || []);

    // Select first claim
    if (trail.claims.length > 0) {
      this.selectClaim(trail.claims[0].claim_id);
    }
  }

  renderStatusBadge(el, status) {
    el.className = 'status-badge-lg';
    switch (status) {
      case 'VERIFIED':
        el.classList.add('verified');
        el.textContent = 'VERIFIED';
        break;
      case 'INVALID':
        el.classList.add('invalid');
        el.textContent = 'INVALID';
        break;
      case 'INCONCLUSIVE':
        el.classList.add('inconclusive');
        el.textContent = 'INCONCLUSIVE';
        break;
      case 'REVALIDATION_REQUIRED':
        el.classList.add('revalidation');
        el.textContent = 'REVALIDATION REQ';
        break;
      default:
        el.textContent = status;
    }
  }

  renderSvgDag(claims) {
    if (!this.svgDag) return;
    this.svgDag.innerHTML = '';

    const nodeWidth = 240;
    const nodeHeight = 60;
    const gapY = 82;
    const startX = 60;
    const startY = 30;

    // Positions map
    const positions = new Map();
    claims.forEach((claim, idx) => {
      positions.set(claim.claim_id, {
        x: startX + (idx % 2 === 1 ? 50 : 0),
        y: startY + idx * gapY,
        claim
      });
    });

    // Draw Connective Edges
    claims.forEach(claim => {
      if (claim.prerequisites && claim.prerequisites.length > 0) {
        const toPos = positions.get(claim.claim_id);
        claim.prerequisites.forEach(prereqId => {
          const fromPos = positions.get(prereqId);
          if (fromPos && toPos) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${fromPos.x + nodeWidth / 2} ${fromPos.y + nodeHeight} C ${fromPos.x + nodeWidth / 2} ${fromPos.y + nodeHeight + 30}, ${toPos.x + nodeWidth / 2} ${toPos.y - 30}, ${toPos.x + nodeWidth / 2} ${toPos.y}`;
            line.setAttribute('d', d);
            line.setAttribute('fill', 'none');
            line.setAttribute('stroke', '#DDD9E8');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('marker-end', 'url(#arrowhead)');
            this.svgDag.appendChild(line);
          }
        });
      }
    });

    // Draw Arrowhead Marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#DDD9E8" />
      </marker>
    `;
    this.svgDag.appendChild(defs);

    // Draw Node Rectangles
    claims.forEach(claim => {
      const pos = positions.get(claim.claim_id);
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'dag-node-group');
      group.setAttribute('style', 'cursor: pointer;');
      group.addEventListener('click', () => this.selectClaim(claim.claim_id));

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', pos.x);
      rect.setAttribute('y', pos.y);
      rect.setAttribute('width', nodeWidth);
      rect.setAttribute('height', nodeHeight);
      rect.setAttribute('rx', '10');
      rect.setAttribute('fill', '#FFFFFF');
      rect.setAttribute('stroke', this.selectedClaimId === claim.claim_id ? '#784AFF' : '#DDD9E8');
      rect.setAttribute('stroke-width', this.selectedClaimId === claim.claim_id ? '2' : '1');

      // Title Text
      const textTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textTitle.setAttribute('x', pos.x + 14);
      textTitle.setAttribute('y', pos.y + 26);
      textTitle.setAttribute('fill', '#191A25');
      textTitle.setAttribute('font-family', 'Inter, sans-serif');
      textTitle.setAttribute('font-size', '13');
      textTitle.setAttribute('font-weight', '500');
      textTitle.textContent = claim.title || claim.claim_type;

      // Status Pill Text
      const textStatus = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textStatus.setAttribute('x', pos.x + 14);
      textStatus.setAttribute('y', pos.y + 46);
      textStatus.setAttribute('font-family', 'JetBrains Mono, monospace');
      textStatus.setAttribute('font-size', '11');
      textStatus.setAttribute('font-weight', '600');

      let statusColor = '#0D8C58';
      if (claim.status === 'INVALID') statusColor = '#D92D20';
      if (claim.status === 'INCONCLUSIVE') statusColor = '#B45309';
      if (claim.status === 'REVALIDATION_REQUIRED') statusColor = '#784AFF';
      textStatus.setAttribute('fill', statusColor);
      textStatus.textContent = `● ${claim.status}`;

      group.appendChild(rect);
      group.appendChild(textTitle);
      group.appendChild(textStatus);
      this.svgDag.appendChild(group);
    });
  }

  renderListView(claims) {
    if (!this.claimListView) return;
    this.claimListView.innerHTML = '';

    claims.forEach(claim => {
      const li = document.createElement('li');
      li.className = `claim-list-item ${this.selectedClaimId === claim.claim_id ? 'selected' : ''}`;
      li.tabIndex = 0;
      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <span style="font-weight: 500; font-size: 0.875rem;">${claim.title || claim.claim_type}</span>
          <span class="mono" style="font-size: 0.75rem; font-weight: 600; color: var(--accent-violet);">${claim.status}</span>
        </div>
        <div class="mono" style="font-size: 0.72rem; color: var(--text-muted);">${claim.claim_id}</div>
      `;

      li.addEventListener('click', () => this.selectClaim(claim.claim_id));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectClaim(claim.claim_id);
        }
      });

      this.claimListView.appendChild(li);
    });
  }

  selectClaim(claimId) {
    this.selectedClaimId = claimId;
    const claim = this.currentTrail.claims.find(c => c.claim_id === claimId);
    if (!claim) return;

    // Update Claim Tab
    this.claimTitleEl.textContent = claim.title || claim.claim_type;
    this.claimIdEl.textContent = claim.claim_id;
    this.claimReasonEl.textContent = claim.status_reason?.message || 'No explicit reason recorded.';
    this.claimPolicyEl.textContent = `${claim.policy_id} (v${claim.policy_version || '1.0.0'})`;

    // Update Evidence Tab
    if (claim.evidenceIds && claim.evidenceIds.length > 0) {
      const ev = this.currentTrail.evidence?.find(e => e.evidence_id === claim.evidenceIds[0]);
      if (ev) {
        this.evidenceMethodEl.textContent = `${ev.verification_method} • ${ev.source_reference}`;
        this.evidenceHashEl.textContent = `Content Hash: ${ev.content_hash}`;
        this.evidenceRawEl.textContent = JSON.stringify(ev.raw_data, null, 2);
      }
    } else {
      this.evidenceMethodEl.textContent = 'Inflight Observation';
      this.evidenceHashEl.textContent = 'No evidence record index yet';
      this.evidenceRawEl.textContent = '{\n  "status": "pending_indexing"\n}';
    }

    // Update Edge Explanation Card
    if (claim.prerequisites && claim.prerequisites.length > 0) {
      this.edgeExplanationText.innerHTML = `
        <strong>Dependent on Prerequisite:</strong> <code>${claim.prerequisites[0]}</code><br>
        <strong>Typed Relationship:</strong> FINALITY_GUARD / MESSAGE_MATCH.<br>
        If the prerequisite claim reorganizes or fails policy re-evaluation, this claim is automatically scheduled for revalidation.
      `;
    } else {
      this.edgeExplanationText.innerHTML = `
        <strong>Root Claim:</strong> Contains no prerequisite dependencies. Verified directly against raw RPC receipt evidence.
      `;
    }

    // Refresh visuals to show active selection
    this.renderSvgDag(this.currentTrail.claims);
    this.renderListView(this.currentTrail.claims);
  }

  renderAuditTimeline(events) {
    if (!this.auditTimelineContainer) return;
    this.auditTimelineContainer.innerHTML = '';

    if (events.length === 0) {
      this.auditTimelineContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8125rem;">No status transitions recorded.</div>';
      return;
    }

    events.forEach(ev => {
      const item = document.createElement('div');
      item.className = 'detail-card';
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.35rem;">
          <span class="mono">SEQ #${ev.sequence}</span>
          <span class="mono">${new Date(ev.timestamp).toLocaleTimeString()}</span>
        </div>
        <div style="font-weight: 500; font-size: 0.875rem; margin-bottom: 0.25rem;">
          ${ev.previous_status} ➔ <span style="color: var(--accent-violet);">${ev.new_status}</span>
        </div>
        <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 0.45rem;">
          ${ev.details} (${ev.reason_code})
        </div>
        <div class="mono" style="font-size: 0.6875rem; color: var(--text-muted); word-break: break-all;">
          Hash: ${ev.record_hash.substring(0, 24)}...
        </div>
      `;
      this.auditTimelineContainer.appendChild(item);
    });
  }
}

// ==========================================================================
// 04. Initialize Everything on DOMContentLoaded
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Canvas Lattice on Hero
  new HeroLatticeAnimation('heroCanvas');

  // Initialize Revalidation Simulation in Section 3
  new RevalidationSimulation();

  // Initialize Trail Explorer Controller
  new TrailExplorer();

  // GSAP Entrance & ScrollTrigger Animations
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.gsap-reveal').forEach((el) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 28,
        duration: 0.7,
        ease: 'power3.out'
      });
    });
  }
});
