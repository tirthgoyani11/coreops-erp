const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client Singleton
 * 
 * Single instance reused across the application.
 * Prevents connection pool exhaustion in development
 * when nodemon restarts the server.
 */

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
        log: ['error', 'warn'],
    });
} else {
    // In development, reuse the client across hot reloads
    if (!global.__prisma) {
        global.__prisma = new PrismaClient({
            log: ['query', 'error', 'warn'],
        });
    }
    prisma = global.__prisma;
}

module.exports = prisma;
