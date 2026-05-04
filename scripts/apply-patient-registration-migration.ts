import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { config } from '../src/config/app.config';

const migrationPath = path.resolve(__dirname, '../src/drizzle/migrations/add_patient_registration_fields.sql');

async function applyPatientRegistrationMigration() {
  const client = postgres(config.database.url, { prepare: false });

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.unsafe(sql);
    console.log('✅ Patient registration fields migration applied');
  } finally {
    await client.end();
  }
}

applyPatientRegistrationMigration().catch((error) => {
  console.error('❌ Patient registration migration failed:', error);
  process.exit(1);
});
