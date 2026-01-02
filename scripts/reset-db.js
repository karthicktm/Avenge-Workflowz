#!/usr/bin/env node
/**
 * Database Reset Script for Railway Deployments
 *
 * This script drops and recreates the public schema to ensure
 * a clean database state before running migrations.
 *
 * WARNING: This will delete all data in the database!
 * Only use in development/staging environments.
 */

const { Pool } = require('pg');

async function resetDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Resetting database schema...');

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    // Drop and recreate the public schema
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE;');
    console.log('✓ Dropped public schema');

    await pool.query('CREATE SCHEMA public;');
    console.log('✓ Created public schema');

    await pool.query('GRANT ALL ON SCHEMA public TO postgres;');
    await pool.query('GRANT ALL ON SCHEMA public TO public;');
    console.log('✓ Granted permissions');

    console.log('✅ Database reset complete');
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();
