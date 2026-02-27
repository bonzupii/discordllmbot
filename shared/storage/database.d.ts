/**
 * Database Module Type Declarations
 */

import pg from 'pg';

export type DatabasePool = pg.Pool;

export function connect(): Promise<DatabasePool>;
export function initializeDatabase(): Promise<void>;
export function getPool(): Promise<DatabasePool>;
export function setupSchema(): Promise<void>;
