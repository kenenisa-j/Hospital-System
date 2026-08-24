import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './db';

async function runMigrations() {
    console.log('Running PostgreSQL migrations via Drizzle...');
    try {
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('Migrations completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();