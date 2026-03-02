const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

/**
 * Verify JWT Token Middleware (Prisma version)
 * Attaches user object to req.user if valid
 */
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { office: true },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found.',
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account has been deactivated.',
            });
        }

        // Remove password from user object
        const { password, passwordResetToken, passwordResetExpires, ...safeUser } = user;

        // Keep officeId as the raw UUID string for Prisma FK lookups
        // The full office object is accessible via req.user.office

        req.user = safeUser;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.',
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
        }

        return res.status(500).json({
            success: false,
            message: 'Server error during authentication.',
        });
    }
};

module.exports = verifyToken;
