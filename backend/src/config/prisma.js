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

const rawConnectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/coreops_dev';
const isProduction = process.env.NODE_ENV === 'production';

function normalizeConnectionString(input) {
    try {
        const url = new URL(input);
        const isPg = url.protocol === 'postgresql:' || url.protocol === 'postgres:';
        if (!isPg) return input;

        const sslMode = (url.searchParams.get('sslmode') || '').toLowerCase();
        const hasLibpqCompat = (url.searchParams.get('uselibpqcompat') || '').toLowerCase() === 'true';
        const isCloudPg = url.hostname.includes('neon') || url.hostname.includes('render') || url.hostname.includes('supabase');

        // Keep stronger semantics explicit ahead of pg@9 changes.
        if (!sslMode && (isCloudPg || isProduction)) {
            url.searchParams.set('sslmode', 'verify-full');
        } else if (sslMode === 'require' && !hasLibpqCompat) {
            url.searchParams.set('sslmode', 'verify-full');
        }

        return url.toString();
    } catch (_err) {
        // Fallback to the original string if URL parsing fails.
        return input;
    }
}

const connectionString = normalizeConnectionString(rawConnectionString);
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

    // Leave TLS behavior to the explicit connection string (sslmode).
    // This avoids weak defaults and aligns with upcoming pg/libpq behavior.

    const pool = new Pool(poolConfig);

    // Log pool errors instead of crashing the process
    pool.on('error', (err) => {
        console.error('[pg-pool] Unexpected idle client error:', err.message);
    });

    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: logLevel });
}

if (process.env.NODE_ENV === 'production') {
    prisma = applyGuards(createClient(['error', 'warn']));
} else {
    if (!global.__prisma) {
        global.__prisma = applyGuards(createClient(['error', 'warn']));
    }
    prisma = global.__prisma;
}

function applyGuards(client) {
    // ─── Safety Guard: Block mass deletes without a WHERE clause ───
    // OpsPilot can read, update, and create anything.
    // It CANNOT wipe entire tables (deleteMany with no filter).
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const BLOCKED_OPS = ['deleteMany', 'delete'];
                    if (BLOCKED_OPS.includes(operation)) {
                        const where = args?.where;
                        const isEmpty = !where || Object.keys(where).length === 0;
                        if (isEmpty) {
                            throw new Error(
                                `[Safety Guard] Blocked ${operation} on "${model}" with no WHERE clause. ` +
                                `Full-table deletes are not allowed via OpsPilot.`
                            );
                        }
                    }

                    // ─── Field Level Diff Tracking for Audits ───
                    if (operation === 'update' && model !== 'AuditLog' && model !== 'Notification') {
                        const { asyncLocalStorage } = require('../middleware/context');
                        const store = asyncLocalStorage ? asyncLocalStorage.getStore() : null;
                        
                        if (store) {
                            let currentRecord = null;
                            try {
                                if (args.where) {
                                    // Use raw query to avoid recursive hook loops
                                    // But client isn't fully defined initially. We can use the parent client
                                    currentRecord = await client[model].findUnique({ where: args.where });
                                }
                            } catch (e) {
                                console.error(`[Audit] Failed to fetch current record for ${model} update diff:`, e.message);
                            }

                            const result = await query(args);

                            if (currentRecord && result && args.data) {
                                const changes = [];
                                for (const key of Object.keys(args.data)) {
                                    // Ignore relations and special objects
                                    if (args.data[key] !== undefined && typeof args.data[key] !== 'object') {
                                        // Compare values, converting dates to strings for safe comparison
                                        const oldVal = currentRecord[key] instanceof Date ? currentRecord[key].toISOString() : String(currentRecord[key]);
                                        const newVal = result[key] instanceof Date ? result[key].toISOString() : String(result[key]);
                                        
                                        if (currentRecord[key] !== result[key] && oldVal !== newVal) {
                                            changes.push({
                                                field: key,
                                                old: currentRecord[key],
                                                new: result[key]
                                            });
                                        }
                                    }
                                }

                                if (changes.length > 0) {
                                    const existingChanges = store.get('changes') || [];
                                    existingChanges.push(...changes);
                                    store.set('changes', existingChanges);
                                    
                                    if (!store.has('resourceId') && result.id) {
                                        store.set('resourceId', result.id);
                                    }
                                }
                            }
                            return result;
                        }
                    }

                    return query(args);
                }
            }
        }
    });
}

module.exports = prisma;

