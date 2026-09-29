import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('Error: Neither SUPABASE_DB_URL nor DATABASE_URL environment variable is set.');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' || dbUrl.includes('supabase')
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration file(s) in ${migrationsDir}`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Applying migration: ${file}...`);
      await client.query(sql);
      console.log(`Successfully applied migration: ${file}`);
    }

    console.log('All migrations executed successfully.');
  } catch (err) {
    console.error('Migration execution failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
