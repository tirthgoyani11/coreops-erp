require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const socketServer = require('./src/config/socketServer');
const prisma = require('./src/config/prisma');

const PORT = process.env.PORT || 5000;

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'ALLOWED_ORIGINS'];
    const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

    if (missing.length > 0) {
        logger.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }

    if (process.env.JWT_SECRET.length < 32) {
        logger.warn('JWT_SECRET should be at least 32 characters for production security');
    }
}

// Connect to database and start server
const startServer = async () => {
    try {
        await connectDB();

        const server = http.createServer(app);

        // Initialize Socket.IO
        socketServer.init(server);

        server.listen(PORT, () => {
            logger.info(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚀 CoreOps ERP Backend Server                   ║
║                                                    ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}      ║
║   Port:        ${String(PORT).padEnd(20)}          ║
║   Database:    PostgreSQL (Prisma)                 ║
║   Socket.IO:   Enabled                             ║
║   Status:      Running                             ║
║                                                    ║
╚════════════════════════════════════════════════════╝
            `);
        });

        // Graceful shutdown handler
        const gracefulShutdown = (signal) => {
            logger.info(`${signal} received. Starting graceful shutdown...`);

            server.close(async (err) => {
                if (err) {
                    logger.error('Error during server close:', err);
                    process.exit(1);
                }

                logger.info('HTTP server closed');

                try {
                    await prisma.$disconnect();
                    logger.info('Prisma connection closed');
                    process.exit(0);
                } catch (closeErr) {
                    logger.error('Error closing Prisma connection:', closeErr);
                    process.exit(1);
                }
            });

            // Force close after 30 seconds
            setTimeout(() => {
                logger.error('Could not close connections in time, forcing shutdown');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION!', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION!', err);
    process.exit(1);
});
