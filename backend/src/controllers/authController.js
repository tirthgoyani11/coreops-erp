const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// ── Token Helpers ──────────────────────────────────────────

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_DAYS = 7;

function generateAccessToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
}

function setRefreshCookie(res, token) {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000, // 7 days in ms
        path: '/api/auth', // Only sent to auth endpoints
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

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  SUPER_ADMIN only
 */
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role, officeId } = req.body;

    // Validate SUPER_ADMIN doesn't need officeId
    if (role !== 'SUPER_ADMIN' && !officeId) {
        return next(new AppError('Office is required for non-admin users', 400));
    }

    const user = await User.create({
        name,
        email,
        password,
        role: role || 'STAFF',
        officeId: role === 'SUPER_ADMIN' ? null : officeId,
    });

    res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
    });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Check for email and password
    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password').populate('officeId');

    if (!user) {
        return next(new AppError('Invalid credentials', 401));
    }

    if (!user.isActive) {
        return next(new AppError('Account has been deactivated', 401));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return next(new AppError('Invalid credentials', 401));
    }

    // Generate access token (short-lived, returned in body)
    const accessToken = generateAccessToken(user._id);

    // Generate refresh token (long-lived, set as httpOnly cookie)
    const family = RefreshToken.generateFamily();
    const refreshTokenValue = RefreshToken.generateToken();

    await RefreshToken.create({
        token: refreshTokenValue,
        userId: user._id,
        family,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    });

    setRefreshCookie(res, refreshTokenValue);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        token: accessToken,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            office: user.officeId,
        },
    });
});

/**
 * @desc    Refresh access token using httpOnly cookie
 * @route   POST /api/auth/refresh
 * @access  Public (cookie required)
 *
 * Security: Implements token rotation + reuse detection.
 * If a used token is presented, the entire family is revoked.
 */
exports.refreshToken = asyncHandler(async (req, res, next) => {
    const incomingToken = req.cookies?.refreshToken;

    if (!incomingToken) {
        return next(new AppError('Refresh token required', 401));
    }

    // Find the token in DB
    const storedToken = await RefreshToken.findOne({ token: incomingToken });

    if (!storedToken) {
        // Token not found — may have been revoked
        clearRefreshCookie(res);
        return next(new AppError('Invalid refresh token', 401));
    }

    // Reuse detection: if this token was already used, revoke entire family
    if (storedToken.isUsed) {
        logger.warn(`Refresh token reuse detected! Revoking family: ${storedToken.family} for user: ${storedToken.userId}`);
        await RefreshToken.revokeFamily(storedToken.family);
        clearRefreshCookie(res);
        return next(new AppError('Refresh token reuse detected. Please login again.', 401));
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
        await RefreshToken.deleteOne({ _id: storedToken._id });
        clearRefreshCookie(res);
        return next(new AppError('Refresh token expired', 401));
    }

    // Verify user still exists and is active
    const user = await User.findById(storedToken.userId).populate('officeId');
    if (!user || !user.isActive) {
        await RefreshToken.revokeFamily(storedToken.family);
        clearRefreshCookie(res);
        return next(new AppError('User not found or deactivated', 401));
    }

    // Rotate: mark current token as used, create new one in same family
    const newTokenValue = RefreshToken.generateToken();

    storedToken.isUsed = true;
    storedToken.replacedByToken = newTokenValue;
    await storedToken.save();

    await RefreshToken.create({
        token: newTokenValue,
        userId: user._id,
        family: storedToken.family,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    });

    // Issue new access token + cookie
    const accessToken = generateAccessToken(user._id);
    setRefreshCookie(res, newTokenValue);

    res.status(200).json({
        success: true,
        token: accessToken,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            office: user.officeId,
        },
    });
});

/**
 * @desc    Logout — clear refresh cookie and revoke token family
 * @route   POST /api/auth/logout
 * @access  Public (cookie-based)
 */
exports.logout = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies?.refreshToken;

    if (incomingToken) {
        const storedToken = await RefreshToken.findOne({ token: incomingToken });
        if (storedToken) {
            await RefreshToken.revokeFamily(storedToken.family);
        }
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
exports.getMe = asyncHandler(async (req, res, next) => {
    res.status(200).json({
        success: true,
        data: req.user,
    });
});

/**
 * @desc    Seed initial SUPER_ADMIN (for setup only)
 * @route   POST /api/auth/seed
 * @access  Public (only works if no users exist)
 * 
 * SECURITY: In production, set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars
 */
exports.seedAdmin = asyncHandler(async (req, res, next) => {
    // Disable seed in production unless explicitly allowed
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
        return next(new AppError('Seed endpoint is disabled in production', 403));
    }

    const existingUsers = await User.countDocuments();

    if (existingUsers > 0) {
        return next(new AppError('Seed not allowed. Users already exist.', 400));
    }

    // Use environment variables for credentials (with secure defaults for dev only)
    const seedEmail = process.env.SEED_ADMIN_EMAIL ||
        (process.env.NODE_ENV !== 'production' ? 'admin@coreops.io' : null);
    const seedPassword = process.env.SEED_ADMIN_PASSWORD ||
        (process.env.NODE_ENV !== 'production' ? 'Admin@123' : null);

    if (!seedEmail || !seedPassword) {
        return next(new AppError('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables are required', 400));
    }

    const admin = await User.create({
        name: process.env.SEED_ADMIN_NAME || 'Super Admin',
        email: seedEmail,
        password: seedPassword,
        role: 'SUPER_ADMIN',
        officeId: null,
    });

    // Log admin creation (without password)
    const logger = require('../utils/logger');
    logger.info(`Initial admin created: ${admin.email}`);

    res.status(201).json({
        success: true,
        message: 'Initial admin created. Please login with configured credentials and change password immediately.',
        data: {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            // SECURITY: Never expose password in response
        },
    });
});

/**
 * @desc    Request password reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError('Please provide an email address', 400));
    }

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
        return res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a reset link has been sent.',
        });
    }

    // Generate reset token (valid for 1 hour)
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // Send email via service
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    try {
        await emailService.sendPasswordResetEmail(user.email, resetUrl);
        const logger = require('../utils/logger');
        logger.info(`Password reset email sent to: ${email}`);
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new AppError('There was an error sending the email. Try again later!', 500));
    }

    res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
        // DEV ONLY - remove in production
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

    if (!token) {
        return next(new AppError('Token is required', 400));
    }

    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: tokenHash,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        return next(new AppError('Invalid or expired token', 400));
    }

    res.status(200).json({
        success: true,
        message: 'Token is valid',
    });
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

    // Validate password strength
    if (password.length < 8) {
        return next(new AppError('Password must be at least 8 characters', 400));
    }

    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: tokenHash,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        return next(new AppError('Invalid or expired token', 400));
    }

    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const logger = require('../utils/logger');
    logger.info(`Password reset completed for: ${user.email}`);

    res.status(200).json({
        success: true,
        message: 'Password has been reset successfully',
    });
});

/**
 * @desc    Validate invitation token
 * @route   GET /api/auth/validate-invite/:token
 * @access  Public
 */
exports.validateInvite = asyncHandler(async (req, res, next) => {
    const { token } = req.params;

    if (!token) {
        return next(new AppError('Invitation token is required', 400));
    }

    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        inviteToken: tokenHash,
        inviteTokenExpires: { $gt: Date.now() },
        isActive: false, // Not yet activated
    });

    if (!user) {
        return next(new AppError('Invalid or expired invitation', 400));
    }

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

    // Validate password strength
    if (password.length < 8) {
        return next(new AppError('Password must be at least 8 characters', 400));
    }

    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        inviteToken: tokenHash,
        inviteTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
        return next(new AppError('Invalid or expired invitation', 400));
    }

    // Complete user registration
    user.name = `${firstName} ${lastName}`;
    user.password = password;
    user.phone = phone || undefined;
    user.isActive = true;
    user.inviteToken = undefined;
    user.inviteTokenExpires = undefined;
    await user.save();

    const logger = require('../utils/logger');
    logger.info(`User registered via invite: ${user.email}`);

    res.status(201).json({
        success: true,
        message: 'Account created successfully',
    });
});

