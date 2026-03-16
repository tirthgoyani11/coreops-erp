const prisma = require('../config/prisma');
const { getIO } = require('../config/socketServer');
const logger = require('../utils/logger');

/**
 * Middleware to strictly log audit actions only when the request completes successfully.
 * Emits real-time socket events for live dashboard updates.
 *
 * @param {string} action - The AuditAction enum value (e.g. 'CREATE_ASSET')
 * @param {string} resourceType - The AuditResourceType enum value (e.g. 'ASSET_RESOURCE')
 */
const audit = (action, resourceType) => {
    return (req, res, next) => {
        // Hook into the finish event so we only log if the request was successful
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                try {
                    // Fallbacks for user info in case route is public or token missing
                    const userId = req.user?.id || null;
                    const userName = req.user?.name || req.user?.firstName || 'System';

                    // Optional: Get resourceId from response locals if controllers set it
                    let resourceId = res.locals.resourceId || req.params?.id || null;
                    
                    // Field diff changes from Prisma interceptor
                    const { asyncLocalStorage } = require('./context');
                    const store = asyncLocalStorage ? asyncLocalStorage.getStore() : null;
                    let changes = null;
                    
                    if (store) {
                        changes = store.get('changes') || null;
                        if (!resourceId && store.has('resourceId')) {
                            resourceId = store.get('resourceId');
                        }
                    }

                    const auditLog = await prisma.auditLog.create({
                        data: {
                            userId,
                            action,
                            resourceType,
                            resourceId,
                            changes,
                            status: 'SUCCESS',
                            ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.connection?.remoteAddress,
                            userAgent: req.headers['user-agent'],
                        },
                        include: {
                            user: {
                                select: { id: true, name: true, email: true, role: true }
                            }
                        }
                    });

                    logger.debug(`[Audit] ${userName} performed ${action}`);

                    // Broadcast to connected socket clients (like AdminDashboard)
                    const io = getIO();
                    if (io) {
                        io.emit('new_activity', auditLog);
                    }

                } catch (error) {
                    logger.error(`[Audit] Failed to create audit log for ${action}:`, error);
                }
            }
        });

        next();
    };
};

module.exports = audit;
