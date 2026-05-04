import type { Config } from 'drizzle-kit';
import { config } from './src/config/app.config';

export default {
  schema: './src/drizzle/schema.ts',
  out: './src/drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: config.database.url,
  },
} satisfies Config;