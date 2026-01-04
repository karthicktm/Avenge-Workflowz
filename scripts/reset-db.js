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

// eslint-disable-next-line @typescript-eslint/no-require-imports
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
    // First, terminate any active connections to the database
    console.log('⏳ Terminating active connections...');
    await pool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND state = 'idle';
    `);
    console.log('✓ Terminated idle connections');

    // Wait a moment for connections to close
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Drop and recreate the public schema
    console.log('⏳ Dropping public schema...');
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE;');
    console.log('✓ Dropped public schema');

    console.log('⏳ Creating public schema...');
    await pool.query('CREATE SCHEMA public;');
    console.log('✓ Created public schema');

    console.log('⏳ Granting permissions...');
    await pool.query('GRANT ALL ON SCHEMA public TO postgres;');
    await pool.query('GRANT ALL ON SCHEMA public TO public;');
    console.log('✓ Granted permissions');

    // Clean up drizzle migration tracking (if it exists in a different schema)
    console.log('⏳ Cleaning up migration tracking...');
    await pool.query('DROP TABLE IF EXISTS __drizzle_migrations CASCADE;');
    console.log('✓ Cleaned migration tracking');

    // Verify the schema is clean
    const result = await pool.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `);

    if (result.rows[0].table_count === '0') {
      console.log('✅ Database reset complete - schema is clean');
    } else {
      console.warn(`⚠️  Warning: Found ${result.rows[0].table_count} tables still in schema`);

      // List the remaining tables for debugging
      const tables = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public';
      `);
      console.warn('Remaining tables:', tables.rows.map(r => r.table_name).join(', '));
    }
  } catch (error) {
    console.error('❌ Failed to reset database:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();
