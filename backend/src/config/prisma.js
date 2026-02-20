const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

/**
 * Prisma Client Singleton (Prisma 7 — driver adapter)
 * 
 * Prisma 7 requires a driver adapter for the "client" engine type.
 * PrismaPg wraps a native pg.Pool for connection management.
 */

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/coreops_dev';

let prisma;

function createClient(logLevel) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: logLevel });
}

if (process.env.NODE_ENV === 'production') {
    prisma = createClient(['error', 'warn']);
} else {
    if (!global.__prisma) {
        global.__prisma = createClient(['error', 'warn']);
    }
    prisma = global.__prisma;
}

module.exports = prisma;
