require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const socketServer = require('./src/config/socketServer');
const prisma = require('./src/config/prisma');
const { startSchedulers, stopSchedulers } = require('./src/services/schedulerService');

const PORT = Number(process.env.PORT || 5000);
const MAX_PORT_RETRY = Number(process.env.MAX_PORT_RETRY || PORT + 5);

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

        let activePort = PORT;

        server.on('error', (err) => {
            if (err && err.code === 'EADDRINUSE' && process.env.NODE_ENV !== 'production') {
                if (activePort < MAX_PORT_RETRY) {
                    const nextPort = activePort + 1;
                    logger.warn(`Port ${activePort} is in use. Retrying on ${nextPort}...`);
                    activePort = nextPort;
                    setTimeout(() => server.listen(activePort), 100);
                    return;
                }

                logger.error(
                    `All ports from ${PORT} to ${MAX_PORT_RETRY} are in use. Set a free port explicitly (example: set PORT=5050&& npm run dev).`
                );
                process.exit(1);
            }

            if (err && err.code === 'EADDRINUSE') {
                logger.error(`Port ${activePort} is already in use.`);
                process.exit(1);
            }

            logger.error('HTTP server error:', err);
            process.exit(1);
        });

        server.listen(activePort, () => {
            logger.info(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚀 CoreOps ERP Backend Server                   ║
║                                                    ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}      ║
║   Port:        ${String(activePort).padEnd(20)}          ║
║   Database:    PostgreSQL (Prisma)                 ║
║   Socket.IO:   Enabled                             ║
║   Status:      Running                             ║
║                                                    ║
╚════════════════════════════════════════════════════╝
            `);

            // Start automated schedulers (preventive maintenance + SLA)
            startSchedulers();
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
                    stopSchedulers();
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

