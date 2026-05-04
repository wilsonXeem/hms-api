import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from '../src/config/app.config';

const runMigrations = async () => {
  const client = postgres(config.database.url, { max: 1 });
  const db = drizzle(client);

  console.log('🔄 Running database migrations...');
  
  try {
    await migrate(db, { migrationsFolder: './src/drizzle/migrations' });
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

runMigrations();