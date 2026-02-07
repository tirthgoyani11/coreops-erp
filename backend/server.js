require('dotenv').config();
const app = require('./app');
// Restart Triggered
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
    const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'ALLOWED_ORIGINS'];
    const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

    if (missing.length > 0) {
        logger.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }

    // Warn about weak JWT secret
    if (process.env.JWT_SECRET.length < 32) {
        logger.warn('JWT_SECRET should be at least 32 characters for production security');
    }
}

// Connect to database and start server
const startServer = async () => {
    try {
        await connectDB();

        const server = app.listen(PORT, () => {
            logger.info(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚀 CoreOps ERP Backend Server                   ║
║                                                    ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}      ║
║   Port:        ${String(PORT).padEnd(20)}          ║
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

                // Close database connection (Mongoose 9+ - no callback)
                try {
                    const mongoose = require('mongoose');
                    await mongoose.connection.close();
                    logger.info('MongoDB connection closed');
                    process.exit(0);
                } catch (closeErr) {
                    logger.error('Error closing MongoDB connection:', closeErr);
                    process.exit(1);
                }
            });

            // Force close after 30 seconds
            setTimeout(() => {
                logger.error('Could not close connections in time, forcing shutdown');
                process.exit(1);
            }, 30000);
        };

        // Listen for termination signals
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
