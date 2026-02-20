const prisma = require('./prisma');
const logger = require('../utils/logger');

/**
 * Database Connection (Prisma)
 * Verifies connectivity by running a lightweight query.
 */
const connectDB = async () => {
  try {
    // Verify Prisma connection by running a simple query
    await prisma.$queryRaw`SELECT 1`;
    logger.info('PostgreSQL Connected via Prisma');
  } catch (error) {
    logger.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
