import type { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import {
  ChainedAuditEvent,
  ClaimRecord,
  DependencyEdge,
  EvidenceRecord,
  VersionConflictError
} from '../../domain/src/index.js';
import { SchemaMigrator } from './migrator.js';

const require = createRequire(import.meta.url);
const NodeDatabaseSync = require('node:sqlite').DatabaseSync;

export interface PersistedTrail {
  trail_id: string;
  source_chain_id: number;
  source_tx_hash: string;
  destination_chain_id?: number;
  destination_tx_hash?: string;
  adapter_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SqliteStoreOptions {
  dbPath?: string; // ':memory:' or file path
  db?: DatabaseSync;
}

/**
 * SQLite Relational Database Store for ChainTrace
 * Implements durable persistence with migrations, transactions, and foreign keys.
 */
export class SqliteStore {
  public readonly db: DatabaseSync;
  public readonly migrator: SchemaMigrator;

  constructor(options?: SqliteStoreOptions) {
    if (options?.db) {
      this.db = options.db;
    } else {
      this.db = new NodeDatabaseSync(options?.dbPath || ':memory:');
    }

    this.migrator = new SchemaMigrator(this.db);
    this.migrator.runMigrations();
  }

  /**
   * Run a function within an explicit database transaction.
   */
  public transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // Trails
  // --------------------------------------------------------------------------
  public saveTrail(trail: PersistedTrail): void {
    const stmt = this.db.prepare(`
      INSERT INTO trails (
        trail_id, source_chain_id, source_tx_hash, destination_chain_id,
        destination_tx_hash, adapter_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(trail_id) DO UPDATE SET
        destination_chain_id = excluded.destination_chain_id,
        destination_tx_hash = excluded.destination_tx_hash,
        status = excluded.status,
        updated_at = excluded.updated_at
      ON CONFLICT(source_chain_id, source_tx_hash) DO UPDATE SET
        destination_chain_id = excluded.destination_chain_id,
        destination_tx_hash = excluded.destination_tx_hash,
        status = excluded.status,
        updated_at = excluded.updated_at;
    `);

    stmt.run(
      trail.trail_id,
      trail.source_chain_id,
      trail.source_tx_hash.toLowerCase(),
      trail.destination_chain_id ?? null,
      trail.destination_tx_hash?.toLowerCase() ?? null,
      trail.adapter_id,
      trail.status,
      trail.created_at,
      trail.updated_at
    );
  }

  public getTrail(sourceChainId: number, sourceTxHash: string): PersistedTrail | undefined {
    const row = this.db
      .prepare('SELECT * FROM trails WHERE source_chain_id = ? AND source_tx_hash = ?')
      .get(sourceChainId, sourceTxHash.toLowerCase()) as unknown as PersistedTrail | undefined;
    return row;
  }

  public getTrailById(trailId: string): PersistedTrail | undefined {
    const row = this.db
      .prepare('SELECT * FROM trails WHERE trail_id = ?')
      .get(trailId) as unknown as PersistedTrail | undefined;
    return row;
  }

  // --------------------------------------------------------------------------
  // Evidence
  // --------------------------------------------------------------------------
  public saveEvidence(evidence: EvidenceRecord, trailId?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO evidence (
        evidence_id, trail_id, chain_id, kind, subject_ref, content_hash,
        source_reference, verification_method, policy_version, result,
        reason, checked_at, raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(evidence_id) DO UPDATE SET
        result = excluded.result,
        reason = excluded.reason,
        checked_at = excluded.checked_at,
        content_hash = excluded.content_hash;
    `);

    stmt.run(
      evidence.evidence_id,
      trailId ?? null,
      (evidence as any).chain_id ?? 0,
      evidence.evidence_type,
      evidence.subject_ref,
      evidence.content_hash,
      evidence.source_reference,
      evidence.verification_method,
      evidence.policy_version,
      evidence.result,
      evidence.reason ?? null,
      evidence.checked_at,
      evidence.raw_data ? JSON.stringify(evidence.raw_data) : null
    );
  }

  public getEvidenceById(id: string): EvidenceRecord | undefined {
    const row = this.db
      .prepare('SELECT * FROM evidence WHERE evidence_id = ?')
      .get(id) as any;

    if (!row) return undefined;

    return {
      evidence_id: row.evidence_id,
      evidence_type: row.kind,
      subject_ref: row.subject_ref,
      content_hash: row.content_hash,
      source_reference: row.source_reference,
      verification_method: row.verification_method,
      policy_version: row.policy_version,
      result: row.result,
      checked_at: row.checked_at,
      reason: row.reason,
      raw_data: row.raw_payload ? JSON.parse(row.raw_payload) : undefined
    };
  }

  public listEvidenceByTrail(trailId: string): EvidenceRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM evidence WHERE trail_id = ?')
      .all(trailId) as any[];

    return rows.map((row) => ({
      evidence_id: row.evidence_id,
      evidence_type: row.kind,
      subject_ref: row.subject_ref,
      content_hash: row.content_hash,
      source_reference: row.source_reference,
      verification_method: row.verification_method,
      policy_version: row.policy_version,
      result: row.result,
      checked_at: row.checked_at,
      reason: row.reason,
      raw_data: row.raw_payload ? JSON.parse(row.raw_payload) : undefined
    }));
  }

  // --------------------------------------------------------------------------
  // Claims
  // --------------------------------------------------------------------------
  public saveClaim(claim: ClaimRecord, trailId?: string, expectedVersion?: number): void {
    const existing = this.db
      .prepare('SELECT version FROM claims WHERE claim_id = ?')
      .get(claim.claim_id) as { version: number } | undefined;

    const curVer = existing ? existing.version : 1;

    if (existing && expectedVersion !== undefined && curVer !== expectedVersion) {
      throw new VersionConflictError(claim.claim_id, curVer, expectedVersion);
    }

    const nextVer = existing ? curVer + 1 : (claim.version ?? 1);

    const stmt = this.db.prepare(`
      INSERT INTO claims (
        claim_id, trail_id, claim_type, status, policy_id, policy_version,
        reason_code, reason_message, version, created_at, updated_at, last_verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(claim_id) DO UPDATE SET
        status = excluded.status,
        reason_code = excluded.reason_code,
        reason_message = excluded.reason_message,
        version = excluded.version,
        updated_at = excluded.updated_at,
        last_verified_at = excluded.last_verified_at;
    `);

    stmt.run(
      claim.claim_id,
      trailId ?? null,
      claim.claim_type,
      claim.status,
      claim.policy_id,
      claim.policy_version,
      claim.status_reason.code,
      claim.status_reason.message,
      nextVer,
      claim.created_at,
      claim.updated_at,
      claim.last_verified_at ?? null
    );
  }

  public getClaimById(id: string): ClaimRecord | undefined {
    const row = this.db
      .prepare('SELECT * FROM claims WHERE claim_id = ?')
      .get(id) as any;

    if (!row) return undefined;

    return {
      claim_id: row.claim_id,
      claim_type: row.claim_type,
      subject_refs: [],
      status: row.status,
      policy_id: row.policy_id,
      policy_version: row.policy_version,
      status_reason: {
        code: row.reason_code,
        message: row.reason_message
      },
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_verified_at: row.last_verified_at ?? undefined
    };
  }

  public listClaimsByTrail(trailId: string): ClaimRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM claims WHERE trail_id = ? ORDER BY version ASC')
      .all(trailId) as any[];

    return rows.map((row) => ({
      claim_id: row.claim_id,
      claim_type: row.claim_type,
      subject_refs: [],
      status: row.status,
      policy_id: row.policy_id,
      policy_version: row.policy_version,
      status_reason: {
        code: row.reason_code,
        message: row.reason_message
      },
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_verified_at: row.last_verified_at ?? undefined
    }));
  }

  // --------------------------------------------------------------------------
  // Dependencies
  // --------------------------------------------------------------------------
  public saveDependency(edge: DependencyEdge): void {
    const stmt = this.db.prepare(`
      INSERT INTO dependencies (
        dependency_id, parent_id, parent_type, dependent_claim_id, dependency_type, required
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(parent_id, dependent_claim_id) DO NOTHING;
    `);

    stmt.run(
      edge.dependency_id,
      edge.parent_id,
      edge.parent_type,
      edge.dependent_claim_id,
      edge.dependency_type,
      edge.required ? 1 : 0
    );
  }

  public listDependenciesByTrail(trailId: string): DependencyEdge[] {
    const rows = this.db
      .prepare(`
        SELECT d.* FROM dependencies d
        JOIN claims c ON d.dependent_claim_id = c.claim_id
        WHERE c.trail_id = ?
      `)
      .all(trailId) as any[];

    return rows.map((r) => ({
      dependency_id: r.dependency_id,
      parent_id: r.parent_id,
      parent_type: r.parent_type,
      dependent_claim_id: r.dependent_claim_id,
      dependency_type: r.dependency_type,
      required: Boolean(r.required)
    }));
  }

  // --------------------------------------------------------------------------
  // Audit Events
  // --------------------------------------------------------------------------
  public appendAuditEvent(event: ChainedAuditEvent, trailId?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_events (
        audit_id, sequence, trail_id, claim_id, previous_status, new_status,
        reason_code, policy_version, triggering_dependency, prev_hash,
        record_hash, details, actor_identity, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(audit_id) DO NOTHING;
    `);

    stmt.run(
      event.audit_id,
      event.sequence,
      trailId ?? null,
      event.claim_id,
      event.previous_status,
      event.new_status,
      event.reason_code,
      event.policy_version,
      event.triggering_dependency ?? null,
      event.prev_hash,
      event.record_hash,
      event.details ?? null,
      (event as any).actor_identity ?? 'SYSTEM',
      event.timestamp
    );
  }

  public listAuditEvents(params: {
    trailId?: string;
    claimId?: string;
    limit?: number;
    offset?: number;
  }): { events: ChainedAuditEvent[]; total: number } {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);

    let whereClause = '';
    const queryParams: any[] = [];

    if (params.trailId) {
      whereClause = 'WHERE trail_id = ?';
      queryParams.push(params.trailId);
    } else if (params.claimId) {
      whereClause = 'WHERE claim_id = ?';
      queryParams.push(params.claimId);
    }

    const countRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM audit_events ${whereClause}`)
      .get(...queryParams) as { count: number };

    const rows = this.db
      .prepare(
        `SELECT * FROM audit_events ${whereClause} ORDER BY sequence ASC, timestamp ASC LIMIT ? OFFSET ?`
      )
      .all(...queryParams, limit, offset) as any[];

    const events: ChainedAuditEvent[] = rows.map((r) => ({
      audit_id: r.audit_id,
      sequence: r.sequence,
      claim_id: r.claim_id,
      previous_status: r.previous_status,
      new_status: r.new_status,
      reason_code: r.reason_code,
      policy_version: r.policy_version,
      triggering_dependency: r.triggering_dependency ?? undefined,
      prev_hash: r.prev_hash,
      record_hash: r.record_hash,
      details: r.details ?? undefined,
      timestamp: r.timestamp
    }));

    return {
      events,
      total: countRow.count
    };
  }

  // --------------------------------------------------------------------------
  // Idempotency Keys
  // --------------------------------------------------------------------------
  public saveIdempotency(
    key: string,
    operation: string,
    responseBody: string,
    ttlSeconds = 300
  ): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO idempotency_keys (key, operation, response_body, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        response_body = excluded.response_body,
        expires_at = excluded.expires_at;
    `);

    stmt.run(key, operation, responseBody, now.toISOString(), expiresAt);
  }

  public getIdempotency(key: string): string | undefined {
    const row = this.db
      .prepare('SELECT response_body, expires_at FROM idempotency_keys WHERE key = ?')
      .get(key) as { response_body: string; expires_at: string } | undefined;

    if (!row) return undefined;

    // Check expiry
    if (new Date(row.expires_at).getTime() < Date.now()) {
      this.db.prepare('DELETE FROM idempotency_keys WHERE key = ?').run(key);
      return undefined;
    }

    return row.response_body;
  }

  public close(): void {
    this.db.close();
  }
}
