import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from 'dotenv';
import path from 'path';

// Load .env from the backend folder (works when called by the backend server)
config({ path: path.resolve(__dirname, '../../backend/.env') });
// Fallback: also try local .env (used when running seed directly from database/ folder)
config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error(
        '[FATAL] DATABASE_URL environment variable is not set. ' +
        'The server cannot start without a valid database connection string.'
    );
}

// Disable prefetch for migration compatibility
const client = postgres(connectionString, { max: 1 });
export const db = drizzle(client, { schema });
