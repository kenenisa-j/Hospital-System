import type { Config } from 'drizzle-kit';

export default {
    schema: './src/schema/index.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/abay_hms',
    },
} satisfies Config;