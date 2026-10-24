import type { DatabaseSync } from 'node:sqlite';
export interface MigrationRecord {
    version: number;
    name: string;
    applied_at: string;
}
/**
 * Executes relational schema migrations on a SQLite database.
 */
export declare class SchemaMigrator {
    private readonly db;
    constructor(db: DatabaseSync);
    runMigrations(): MigrationRecord[];
    getAppliedMigrations(): MigrationRecord[];
}
