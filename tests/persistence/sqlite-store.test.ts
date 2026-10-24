import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SqliteStore, PersistedTrail } from '../../packages/persistence/src/sqlite-store.js';
import { SchemaMigrator } from '../../packages/persistence/src/migrator.js';
import {
  VersionConflictError,
  type ClaimRecord,
  type EvidenceRecord,
  type ChainedAuditEvent
} from '../../packages/domain/src/index.js';

describe('SqliteStore & Migrations (Phase 3)', () => {
  const testDbDir = path.resolve(process.cwd(), 'tests', 'fixtures', 'temp');
  const testDbPath = path.join(testDbDir, 'test_persistence.db');

  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore
      }
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore
      }
    }
  });

  it('runs schema migrations successfully on fresh database', () => {
    const store = new SqliteStore({ dbPath: testDbPath });
    const db = store.db;
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('trails');
    expect(tableNames).toContain('claims');
    expect(tableNames).toContain('evidence');
    expect(tableNames).toContain('dependencies');
    expect(tableNames).toContain('evaluations');
    expect(tableNames).toContain('audit_events');
    expect(tableNames).toContain('policy_versions');
    expect(tableNames).toContain('idempotency_keys');
    expect(tableNames).toContain('schema_migrations');

    store.close();
  });

  it('is idempotent on subsequent migration runs', () => {
    const store = new SqliteStore({ dbPath: testDbPath });
    const migrator = new SchemaMigrator(store.db);
    expect(() => migrator.runMigrations()).not.toThrow();
    store.close();
  });

  it('persists a complete verification trail and survives restart', () => {
    // Session 1: create and persist trail, claims, evidence, audit
    const store1 = new SqliteStore({ dbPath: testDbPath });
    const trailId = 'trail_eth_poly_001';
    const sourceChainId = 11155111;
    const sourceTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    const trail: PersistedTrail = {
      trail_id: trailId,
      source_chain_id: sourceChainId,
      source_tx_hash: sourceTxHash,
      destination_chain_id: 80002,
      destination_tx_hash: '0x9999967890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      adapter_id: 'layerzero-v2',
      status: 'VERIFIED',
      created_at: '2026-10-25T10:00:00Z',
      updated_at: '2026-10-25T10:05:00Z'
    };
    store1.saveTrail(trail);

    const claim1Id = 'claim_src_init';
    const claim1: ClaimRecord = {
      claim_id: claim1Id,
      claim_type: 'SOURCE_FINALIZED',
      subject_refs: [sourceTxHash],
      status: 'VERIFIED',
      policy_id: 'POL-SOURCE-INITIATION',
      policy_version: '1.0.0',
      status_reason: {
        code: 'EVIDENCE_SATISFIED',
        message: 'Finality confirmed with 24 blocks'
      },
      version: 1,
      created_at: '2026-10-25T10:00:00Z',
      updated_at: '2026-10-25T10:05:00Z',
      last_verified_at: '2026-10-25T10:05:00Z'
    };
    store1.saveClaim(claim1, trailId);

    const ev1: EvidenceRecord = {
      evidence_id: 'ev_src_receipt',
      evidence_type: 'RECEIPT_REFERENCE',
      subject_ref: sourceTxHash,
      content_hash: '0xhash123',
      source_reference: 'https://rpc.sepolia.org',
      verification_method: 'DIRECT_RPC',
      policy_version: '1.0.0',
      result: 'PASS',
      checked_at: '2026-10-25T10:01:00Z',
      reason: 'Receipt verified successfully',
      raw_data: { status: 1, confirmations: 24 }
    };
    store1.saveEvidence(ev1, trailId);

    const audit1: ChainedAuditEvent = {
      audit_id: 'audit_001',
      sequence: 1,
      claim_id: claim1Id,
      previous_status: 'UNVERIFIED',
      new_status: 'VERIFIED',
      reason_code: 'EVIDENCE_SATISFIED',
      policy_version: '1.0.0',
      prev_hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      record_hash: '0xabc123',
      details: 'Initial verification',
      timestamp: '2026-10-25T10:05:00Z'
    };
    store1.appendAuditEvent(audit1, trailId);

    // Close session 1
    store1.close();

    // Session 2: reopen same file and assert everything is preserved
    const store2 = new SqliteStore({ dbPath: testDbPath });

    const loadedTrail = store2.getTrailById(trailId);
    expect(loadedTrail).toBeDefined();
    expect(loadedTrail?.source_chain_id).toBe(sourceChainId);
    expect(loadedTrail?.source_tx_hash).toBe(sourceTxHash.toLowerCase());
    expect(loadedTrail?.status).toBe('VERIFIED');

    const loadedTrailByTx = store2.getTrail(sourceChainId, sourceTxHash);
    expect(loadedTrailByTx?.trail_id).toBe(trailId);

    const loadedClaim = store2.getClaimById(claim1Id);
    expect(loadedClaim).toBeDefined();
    expect(loadedClaim?.status).toBe('VERIFIED');
    expect(loadedClaim?.policy_version).toBe('1.0.0');

    const loadedEvidence = store2.getEvidenceById('ev_src_receipt');
    expect(loadedEvidence).toBeDefined();
    expect(loadedEvidence?.result).toBe('PASS');
    expect(loadedEvidence?.raw_data).toEqual({ status: 1, confirmations: 24 });

    const auditResult = store2.listAuditEvents({ trailId });
    expect(auditResult.total).toBe(1);
    expect(auditResult.events[0].audit_id).toBe('audit_001');
    expect(auditResult.events[0].new_status).toBe('VERIFIED');

    store2.close();
  });

  it('enforces optimistic concurrency control on claim updates', () => {
    const store = new SqliteStore({ dbPath: testDbPath });
    const trailId = 'trail_occ_001';

    store.saveTrail({
      trail_id: trailId,
      source_chain_id: 11155111,
      source_tx_hash: '0xocc111',
      adapter_id: 'layerzero-v2',
      status: 'INCONCLUSIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const claim: ClaimRecord = {
      claim_id: 'claim_occ_001',
      claim_type: 'SOURCE_FINALIZED',
      subject_refs: ['0xocc111'],
      status: 'INCONCLUSIVE',
      policy_id: 'POL-SOURCE-INITIATION',
      policy_version: '1.0.0',
      status_reason: {
        code: 'DOWNSTREAM_DEPENDENCY_INCONCLUSIVE',
        message: 'Pending finality'
      },
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.saveClaim(claim, trailId);

    // Save with matching expectedVersion 1 -> succeeds, version increments to 2
    store.saveClaim(
      {
        ...claim,
        status: 'VERIFIED'
      },
      trailId,
      1
    );

    const updated = store.getClaimById('claim_occ_001');
    expect(updated?.version).toBe(2);
    expect(updated?.status).toBe('VERIFIED');

    // Stale update: trying to update with expectedVersion 1 again should throw VersionConflictError
    expect(() => {
      store.saveClaim(
        {
          ...claim,
          status: 'INVALID'
        },
        trailId,
        1
      );
    }).toThrow(VersionConflictError);

    store.close();
  });

  it('paginates audit events deterministically with limit and offset', () => {
    const store = new SqliteStore({ dbPath: testDbPath });
    const trailId = 'trail_audit_page_001';

    store.saveTrail({
      trail_id: trailId,
      source_chain_id: 1,
      source_tx_hash: '0xabc',
      adapter_id: 'test-adapter',
      status: 'VERIFIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    for (let i = 1; i <= 5; i++) {
      const evt: ChainedAuditEvent = {
        audit_id: `audit_evt_${i.toString().padStart(3, '0')}`,
        sequence: i,
        claim_id: 'claim_any',
        previous_status: 'UNVERIFIED',
        new_status: 'VERIFIED',
        reason_code: 'EVIDENCE_SATISFIED',
        policy_version: '1.0.0',
        prev_hash: '0x00',
        record_hash: `0xhash${i}`,
        details: `Step ${i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString()
      };
      store.appendAuditEvent(evt, trailId);
    }

    const page1 = store.listAuditEvents({ trailId, limit: 2, offset: 0 });
    expect(page1.events.length).toBe(2);
    expect(page1.total).toBe(5);
    expect(page1.events[0].audit_id).toBe('audit_evt_001');
    expect(page1.events[1].audit_id).toBe('audit_evt_002');

    const page2 = store.listAuditEvents({ trailId, limit: 2, offset: 2 });
    expect(page2.events.length).toBe(2);
    expect(page2.events[0].audit_id).toBe('audit_evt_003');
    expect(page2.events[1].audit_id).toBe('audit_evt_004');

    const page3 = store.listAuditEvents({ trailId, limit: 2, offset: 4 });
    expect(page3.events.length).toBe(1);
    expect(page3.events[0].audit_id).toBe('audit_evt_005');

    store.close();
  });

  it('manages idempotency keys with payload caching', () => {
    const store = new SqliteStore({ dbPath: testDbPath });
    const key = 'idem_key_12345';
    const operation = 'refresh_trail';
    const payload = JSON.stringify({ result: 'REFRESHED', claimsCount: 4 });

    // Initially not existing
    expect(store.getIdempotency(key)).toBeUndefined();

    // Save key
    store.saveIdempotency(key, operation, payload, 3600);

    const cached = store.getIdempotency(key);
    expect(cached).toBeDefined();
    expect(JSON.parse(cached!)).toEqual({ result: 'REFRESHED', claimsCount: 4 });

    store.close();
  });
});
