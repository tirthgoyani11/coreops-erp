const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Socket.IO Server Configuration
 * 
 * Provides real-time bidirectional communication for:
 * - Instant notifications
 * - Live dashboard updates
 * - Real-time collaboration
 * 
 * Authentication: JWT token verified during handshake
 * Rooms: user:<id> for personal notifications, office:<id> for broadcasts
 */

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - The HTTP server instance
 */
function init(httpServer) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:5173'];

    io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
            methods: ['GET', 'POST'],
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // ── JWT Authentication Middleware ──
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error('Authentication error: Token required'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (err) {
            logger.warn(`Socket auth failed: ${err.message}`);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // ── Connection Handler ──
    io.on('connection', (socket) => {
        const userId = socket.userId;
        logger.info(`Socket connected: user=${userId} socket=${socket.id}`);

        // Join personal room for targeted notifications
        socket.join(`user:${userId}`);

        // Join office room when client provides officeId
        socket.on('join-office', (officeId) => {
            if (officeId) {
                socket.join(`office:${officeId}`);
                logger.info(`User ${userId} joined office room: ${officeId}`);
            }
        });

        // Leave office room
        socket.on('leave-office', (officeId) => {
            if (officeId) {
                socket.leave(`office:${officeId}`);
            }
        });

        socket.on('disconnect', (reason) => {
            logger.info(`Socket disconnected: user=${userId} reason=${reason}`);
        });

        socket.on('error', (err) => {
            logger.error(`Socket error: user=${userId}`, err.message);
        });
    });

    logger.info('Socket.IO server initialized');
    return io;
}

/**
 * Get the Socket.IO server instance
 * @returns {Server} Socket.IO server
 */
function getIO() {
    if (!io) {
        logger.warn('Socket.IO not initialized — calling getIO() before init()');
    }
    return io;
}

/**
 * Emit a notification to a specific user
 * @param {String} userId - Target user ID
 * @param {Object} notification - Notification data
 */
function notifyUser(userId, notification) {
    if (io) {
        io.to(`user:${userId}`).emit('notification', notification);
    }
}

/**
 * Broadcast to all users in an office
 * @param {String} officeId - Office ID
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
function broadcastToOffice(officeId, event, data) {
    if (io) {
        io.to(`office:${officeId}`).emit(event, data);
    }
}

module.exports = {
    init,
    getIO,
    notifyUser,
    broadcastToOffice,
};
