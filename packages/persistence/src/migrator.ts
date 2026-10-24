import type { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

/**
 * Executes relational schema migrations on a SQLite database.
 */
export class SchemaMigrator {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  public runMigrations(): MigrationRecord[] {
    this.db.exec('PRAGMA foreign_keys = ON;');

    // Ensure migrations table exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const appliedRows = this.db
      .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
      .all() as unknown as { version: number }[];

    const appliedSet = new Set<number>(appliedRows.map((r) => r.version));
    const newlyApplied: MigrationRecord[] = [];

    // Migration 1: Initial Core Schema
    if (!appliedSet.has(1)) {
      const sqlPath = join(__dirname, 'schema.sql');
      const schemaSql = readFileSync(sqlPath, 'utf8');

      this.db.exec(schemaSql);

      const now = new Date().toISOString();
      this.db
        .prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(1, '001_initial_schema', now);

      newlyApplied.push({
        version: 1,
        name: '001_initial_schema',
        applied_at: now
      });
    }

    return newlyApplied;
  }

  public getAppliedMigrations(): MigrationRecord[] {
    return this.db
      .prepare('SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC')
      .all() as unknown as MigrationRecord[];
  }
}
