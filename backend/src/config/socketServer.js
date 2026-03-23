const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./prisma');
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
    const envOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
        : [];

    const allowedOrigins = Array.from(new Set([
        ...envOrigins,
        'http://localhost:5173',
        'http://localhost:3000',
        'https://coreops.tirthgoyani.in',
    ]));

    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin) || origin.endsWith('.tirthgoyani.in')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
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

        // Join office room — validate user belongs to the office
        socket.on('join-office', async (officeId) => {
            if (!officeId || typeof officeId !== 'string') return;
            try {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { officeId: true, role: true },
                });
                // Super admins can join any office; others only their own
                if (user && (user.role === 'SUPER_ADMIN' || user.officeId === officeId)) {
                    socket.join(`office:${officeId}`);
                    logger.info(`User ${userId} joined office room: ${officeId}`);
                } else {
                    logger.warn(`User ${userId} denied joining office ${officeId} (belongs to ${user?.officeId})`);
                }
            } catch (err) {
                logger.error(`Socket join-office error: ${err.message}`);
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
