const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

/**
 * Prisma Client Singleton (Prisma 7 — driver adapter)
 * 
 * Prisma 7 requires a driver adapter for the "client" engine type.
 * PrismaPg wraps a native pg.Pool for connection management.
 * 
 * Pool is configured for Neon serverless PostgreSQL:
 *  - SSL required for cloud connections
 *  - Limited pool size (Neon free tier caps at ~20)
 *  - Idle timeout to release stale connections before Neon kills them
 *  - keepAlive to prevent TCP socket drops during TLS handshake
 *  - Connection timeout to fail fast instead of hanging 20+ seconds
 */

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/coreops_dev';
const isProduction = process.env.NODE_ENV === 'production';
const isNeon = connectionString.includes('neon.tech') || connectionString.includes('neon.');

let prisma;

function createClient(logLevel) {
    const poolConfig = {
        connectionString,
        max: parseInt(process.env.DB_POOL_MAX, 10) || 15,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 30_000, // Increased to 30s to survive Neon cold-start delays
        keepAlive: true,
        keepAliveInitialDelayMillis: 10_000,
    };

    // Neon cloud requires SSL
    if (isNeon || isProduction) {
        poolConfig.ssl = { rejectUnauthorized: false };
    }

    const pool = new Pool(poolConfig);

    // Log pool errors instead of crashing the process
    pool.on('error', (err) => {
        console.error('[pg-pool] Unexpected idle client error:', err.message);
    });

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
