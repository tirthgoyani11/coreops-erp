const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../utils/errorHandler');

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

    // Generate token
    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
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
