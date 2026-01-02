#!/usr/bin/env tsx
/**
 * Database Creation Script
 *
 * Creates the b0t_dev database if it doesn't exist.
 * Safe to run multiple times (idempotent).
 *
 * Usage: tsx scripts/create-database.ts
 */

import pg from 'pg';
import { logger } from '../src/lib/logger';

const { Client } = pg;

async function createDatabase() {
  // Parse DATABASE_URL to get connection details
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Parse the connection URL
  const url = new URL(databaseUrl);
  const targetDatabase = url.pathname.slice(1); // Remove leading /

  // Connect to the default 'postgres' database first
  url.pathname = '/postgres';
  const adminUrl = url.toString();

  const client = new Client({
    connectionString: adminUrl,
  });

  try {
    await client.connect();
    logger.info('Connected to PostgreSQL server');

    // Check if database exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDatabase]
    );

    if (checkResult.rows.length > 0) {
      logger.info({ database: targetDatabase }, 'Database already exists');
    } else {
      // Create the database
      logger.info({ database: targetDatabase }, 'Creating database...');
      await client.query(`CREATE DATABASE ${targetDatabase}`);
      logger.info({ database: targetDatabase }, 'Database created successfully');
    }

    await client.end();
    logger.info('Database initialization complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Failed to create database');
    await client.end().catch(() => {});
    process.exit(1);
  }
}

createDatabase();
