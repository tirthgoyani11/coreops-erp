const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// ── Constants ──────────────────────────────────────────
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_DAYS = 7;
const BCRYPT_ROUNDS = 12;

// ── Role-based default permissions ────────────────────
const ROLE_PERMISSIONS = {
    SUPER_ADMIN: { canApproveTickets: true, canManageAssets: true, canManageInventory: true, canViewFinancials: true, canManageUsers: true, canManageVendors: true, approvalLimit: -1 },
    ADMIN: { canApproveTickets: true, canManageAssets: true, canManageInventory: true, canViewFinancials: true, canManageUsers: true, canManageVendors: true, approvalLimit: -1 },
    MANAGER: { canApproveTickets: true, canManageAssets: true, canManageInventory: true, canViewFinancials: true, canManageUsers: false, canManageVendors: true, approvalLimit: 50000 },
    STAFF: { canApproveTickets: false, canManageAssets: true, canManageInventory: true, canViewFinancials: false, canManageUsers: false, canManageVendors: false, approvalLimit: 0 },
    TECHNICIAN: { canApproveTickets: false, canManageAssets: false, canManageInventory: false, canViewFinancials: false, canManageUsers: false, canManageVendors: false, approvalLimit: 0 },
    VIEWER: { canApproveTickets: false, canManageAssets: false, canManageInventory: false, canViewFinancials: false, canManageUsers: false, canManageVendors: false, approvalLimit: 0 },
};

// ── Token Helpers ──────────────────────────────────────

function generateAccessToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
}

function generateToken() {
    return crypto.randomBytes(40).toString('hex');
}

function generateFamily() {
    return crypto.randomBytes(16).toString('hex');
}

function setRefreshCookie(res, token) {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        path: '/api/auth',
    });
}

function clearRefreshCookie(res) {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
    });
}

// ── Helpers ────────────────────────────────────────────

function sanitizeUser(user) {
    const { password, passwordResetToken, passwordResetExpires, inviteToken, inviteTokenExpires, ...safe } = user;
    return safe;
}

// ── Controllers ────────────────────────────────────────

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  SUPER_ADMIN only
 */
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role, officeId } = req.body;

    if (role !== 'SUPER_ADMIN' && !officeId) {
        return next(new AppError('Office is required for non-admin users', 400));
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const permissions = ROLE_PERMISSIONS[role || 'STAFF'] || ROLE_PERMISSIONS.STAFF;

    const user = await prisma.user.create({
        data: {
            name,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: role || 'STAFF',
            officeId: role === 'SUPER_ADMIN' ? null : officeId,
            ...permissions,
        },
    });

    res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: sanitizeUser(user),
    });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
    }

    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { office: true },
    });

    if (!user) {
        return next(new AppError('Invalid credentials', 401));
    }

    if (!user.isActive) {
        return next(new AppError('Account has been deactivated', 401));
    }

    // Check lock
    if (user.lockUntil && user.lockUntil > new Date()) {
        return next(new AppError('Account is locked. Try again later.', 423));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        // Increment failed attempts
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const update = { failedLoginAttempts: failedAttempts };
        if (failedAttempts >= 5) {
            update.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        }
        await prisma.user.update({ where: { id: user.id }, data: update });
        return next(new AppError('Invalid credentials', 401));
    }

    // Reset failed attempts, update last login
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date(), failedLoginAttempts: 0, lockUntil: null },
    });

    const accessToken = generateAccessToken(user.id);
    const family = generateFamily();
    const refreshTokenValue = generateToken();

    await prisma.refreshToken.create({
        data: {
            token: refreshTokenValue,
            userId: user.id,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
        },
    });

    setRefreshCookie(res, refreshTokenValue);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        token: accessToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            officeId: user.officeId,
            office: user.office,
        },
    });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public (cookie required)
 */
exports.refreshToken = asyncHandler(async (req, res, next) => {
    const incomingToken = req.cookies?.refreshToken;

    if (!incomingToken) {
        return next(new AppError('Refresh token required', 401));
    }

    const storedToken = await prisma.refreshToken.findUnique({
        where: { token: incomingToken },
    });

    if (!storedToken) {
        clearRefreshCookie(res);
        return next(new AppError('Invalid refresh token', 401));
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        clearRefreshCookie(res);
        return next(new AppError('Refresh token expired', 401));
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
        where: { id: storedToken.userId },
        include: { office: true },
    });

    if (!user || !user.isActive) {
        await prisma.refreshToken.deleteMany({ where: { userId: storedToken.userId } });
        clearRefreshCookie(res);
        return next(new AppError('User not found or deactivated', 401));
    }

    // Rotate: delete old, create new
    const newTokenValue = generateToken();

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    await prisma.refreshToken.create({
        data: {
            token: newTokenValue,
            userId: user.id,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
        },
    });

    const accessToken = generateAccessToken(user.id);
    setRefreshCookie(res, newTokenValue);

    res.status(200).json({
        success: true,
        token: accessToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            officeId: user.officeId,
            office: user.office,
        },
    });
});

/**
 * @desc    Logout
 * @route   POST /api/auth/logout
 * @access  Public (cookie-based)
 */
exports.logout = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies?.refreshToken;

    if (incomingToken) {
        // Delete this specific token (or all for this user if we want)
        await prisma.refreshToken.deleteMany({
            where: { token: incomingToken },
        });
    }

    clearRefreshCookie(res);

    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        data: req.user,
    });
});

/**
 * @desc    Seed initial SUPER_ADMIN
 * @route   POST /api/auth/seed
 * @access  Public (only works if no users exist)
 */
exports.seedAdmin = asyncHandler(async (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
        return next(new AppError('Seed endpoint is disabled in production', 403));
    }

    const count = await prisma.user.count();
    if (count > 0) {
        return next(new AppError('Seed not allowed. Users already exist.', 400));
    }

    const seedEmail = process.env.SEED_ADMIN_EMAIL ||
        (process.env.NODE_ENV !== 'production' ? 'admin@coreops.io' : null);
    const seedPassword = process.env.SEED_ADMIN_PASSWORD ||
        (process.env.NODE_ENV !== 'production' ? 'Admin@123' : null);

    if (!seedEmail || !seedPassword) {
        return next(new AppError('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables are required', 400));
    }

    const hashedPassword = await bcrypt.hash(seedPassword, BCRYPT_ROUNDS);
    const permissions = ROLE_PERMISSIONS.SUPER_ADMIN;

    const admin = await prisma.user.create({
        data: {
            name: process.env.SEED_ADMIN_NAME || 'Super Admin',
            email: seedEmail.toLowerCase().trim(),
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            officeId: null,
            ...permissions,
        },
    });

    logger.info(`Initial admin created: ${admin.email}`);

    res.status(201).json({
        success: true,
        message: 'Initial admin created. Please login with configured credentials and change password immediately.',
        data: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
        },
    });
});

/**
 * @desc    Request password reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError('Please provide an email address', 400));
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user) {
        return res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a reset link has been sent.',
        });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: resetTokenHash,
            passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
        },
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    try {
        await emailService.sendPasswordResetEmail(user.email, resetUrl);
        logger.info(`Password reset email sent to: ${email}`);
    } catch (error) {
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordResetToken: null, passwordResetExpires: null },
        });
        return next(new AppError('There was an error sending the email. Try again later!', 500));
    }

    res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
        ...(process.env.NODE_ENV !== 'production' && { devToken: resetToken }),
    });
});

/**
 * @desc    Validate password reset token
 * @route   POST /api/auth/validate-reset-token
 * @access  Public
 */
exports.validateResetToken = asyncHandler(async (req, res, next) => {
    const { token } = req.body;
    if (!token) return next(new AppError('Token is required', 400));

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
        where: {
            passwordResetToken: tokenHash,
            passwordResetExpires: { gt: new Date() },
        },
    });

    if (!user) return next(new AppError('Invalid or expired token', 400));

    res.status(200).json({ success: true, message: 'Token is valid' });
});

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return next(new AppError('Token and password are required', 400));
    }

    if (password.length < 8) {
        return next(new AppError('Password must be at least 8 characters', 400));
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
        where: {
            passwordResetToken: tokenHash,
            passwordResetExpires: { gt: new Date() },
        },
    });

    if (!user) return next(new AppError('Invalid or expired token', 400));

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpires: null,
            passwordChangedAt: new Date(),
        },
    });

    logger.info(`Password reset completed for: ${user.email}`);

    res.status(200).json({ success: true, message: 'Password has been reset successfully' });
});

/**
 * @desc    Validate invitation token
 * @route   GET /api/auth/validate-invite/:token
 * @access  Public
 */
exports.validateInvite = asyncHandler(async (req, res, next) => {
    const { token } = req.params;
    if (!token) return next(new AppError('Invitation token is required', 400));

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
        where: {
            inviteToken: tokenHash,
            inviteTokenExpires: { gt: new Date() },
            isActive: false,
        },
    });

    if (!user) return next(new AppError('Invalid or expired invitation', 400));

    res.status(200).json({
        success: true,
        data: {
            email: user.email,
            role: user.role,
            invitedBy: 'Administrator',
            expiresAt: user.inviteTokenExpires,
        },
    });
});

/**
 * @desc    Complete registration with invitation
 * @route   POST /api/auth/register-invite
 * @access  Public
 */
exports.registerWithInvite = asyncHandler(async (req, res, next) => {
    const { token, firstName, lastName, phone, password } = req.body;

    if (!token || !firstName || !lastName || !password) {
        return next(new AppError('All required fields must be provided', 400));
    }

    if (password.length < 8) {
        return next(new AppError('Password must be at least 8 characters', 400));
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
        where: {
            inviteToken: tokenHash,
            inviteTokenExpires: { gt: new Date() },
        },
    });

    if (!user) return next(new AppError('Invalid or expired invitation', 400));

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            name: `${firstName} ${lastName}`,
            firstName,
            lastName,
            password: hashedPassword,
            phone: phone || null,
            isActive: true,
            inviteToken: null,
            inviteTokenExpires: null,
            passwordChangedAt: new Date(),
        },
    });

    logger.info(`User registered via invite: ${user.email}`);

    res.status(201).json({ success: true, message: 'Account created successfully' });
});
