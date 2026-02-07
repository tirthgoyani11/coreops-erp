const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * User Schema (Enhanced per README Section 3.2)
 * User accounts, authentication, roles, and permissions
 * 
 * PRODUCTION NOTES:
 * - Password hashing uses bcrypt with 12 rounds
 * - Email is unique and indexed
 * - Role-based permissions are auto-set on role change
 * - Infinity approval limit is stored as -1 (MongoDB doesn't support Infinity)
 */

// Constants for configuration
const BCRYPT_ROUNDS = 12;
const MAX_APPROVAL_LIMIT = -1; // -1 represents unlimited
const DEFAULT_MANAGER_LIMIT = 50000; // 50,000 INR

const UserSchema = new mongoose.Schema(
    {
        // Split name into first/last per README
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        firstName: {
            type: String,
            trim: true,
            maxlength: [50, 'First name cannot exceed 50 characters'],
        },
        lastName: {
            type: String,
            trim: true,
            maxlength: [50, 'Last name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Don't return password in queries by default
        },
        role: {
            type: String,
            enum: {
                values: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER'],
                message: '{VALUE} is not a valid role',
            },
            default: 'STAFF',
        },
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            default: null, // Null for SUPER_ADMIN (global access)
        },
        // Enhanced permissions per README
        // Note: approvalLimit of -1 means unlimited
        permissions: {
            canApproveTickets: { type: Boolean, default: false },
            canManageAssets: { type: Boolean, default: false },
            canManageInventory: { type: Boolean, default: false },
            canViewFinancials: { type: Boolean, default: false },
            canManageUsers: { type: Boolean, default: false },
            canManageVendors: { type: Boolean, default: false },
            approvalLimit: { type: Number, default: 0 }, // -1 = unlimited
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
        },
        failedLoginAttempts: {
            type: Number,
            default: 0,
        },
        lockUntil: {
            type: Date,
        },
        // Security
        passwordChangedAt: {
            type: Date,
        },
        passwordResetToken: {
            type: String,
            select: false,
        },
        passwordResetExpires: {
            type: Date,
            select: false,
        },
        // Invitation tokens for user registration
        inviteToken: {
            type: String,
            select: false,
        },
        inviteTokenExpires: {
            type: Date,
            select: false,
        },
        // Profile settings
        phone: {
            type: String,
            trim: true,
            maxlength: [20, 'Phone cannot exceed 20 characters'],
        },
        avatar: {
            type: String,
            maxlength: [500, 'Avatar URL cannot exceed 500 characters'],
        },
        preferences: {
            language: { type: String, default: 'en', maxlength: 10 },
            timezone: { type: String, default: 'Asia/Kolkata', maxlength: 50 },
            notifications: {
                email: { type: Boolean, default: true },
                inApp: { type: Boolean, default: true },
            },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes (Note: unique fields already have indexes, don't duplicate)
UserSchema.index({ role: 1, officeId: 1 });
UserSchema.index({ officeId: 1 });
UserSchema.index({ isActive: 1 });

// Virtual: Full name from firstName + lastName
UserSchema.virtual('fullName').get(function () {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
    }
    return this.name;
});

// Virtual: Is account locked
UserSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    try {
        const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
        this.password = await bcrypt.hash(this.password, salt);
        this.passwordChangedAt = new Date();
    } catch (error) {
        throw new Error('Password hashing failed');
    }
});

// Set default permissions based on role
UserSchema.pre('save', function () {
    if (!this.isModified('role')) return;

    const rolePermissions = {
        SUPER_ADMIN: {
            canApproveTickets: true,
            canManageAssets: true,
            canManageInventory: true,
            canViewFinancials: true,
            canManageUsers: true,
            canManageVendors: true,
            approvalLimit: MAX_APPROVAL_LIMIT, // -1 = unlimited
        },
        MANAGER: {
            canApproveTickets: true,
            canManageAssets: true,
            canManageInventory: true,
            canViewFinancials: true,
            canManageUsers: false,
            canManageVendors: true,
            approvalLimit: DEFAULT_MANAGER_LIMIT,
        },
        STAFF: {
            canApproveTickets: false,
            canManageAssets: true,
            canManageInventory: true,
            canViewFinancials: false,
            canManageUsers: false,
            canManageVendors: false,
            approvalLimit: 0,
        },
        TECHNICIAN: {
            canApproveTickets: false,
            canManageAssets: false,
            canManageInventory: false,
            canViewFinancials: false,
            canManageUsers: false,
            canManageVendors: false,
            approvalLimit: 0,
        },
        VIEWER: {
            canApproveTickets: false,
            canManageAssets: false,
            canManageInventory: false,
            canViewFinancials: false,
            canManageUsers: false,
            canManageVendors: false,
            approvalLimit: 0,
        },
    };

    this.permissions = rolePermissions[this.role] || rolePermissions.VIEWER;
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!candidatePassword) return false;
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        return false;
    }
};

// Check if user can approve a specific amount
UserSchema.methods.canApproveAmount = function (amount) {
    if (!this.permissions.canApproveTickets) return false;
    if (this.permissions.approvalLimit === MAX_APPROVAL_LIMIT) return true; // Unlimited
    return amount <= this.permissions.approvalLimit;
};

// Update last login safely
UserSchema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    this.failedLoginAttempts = 0;
    this.lockUntil = undefined;
    return this.save({ validateBeforeSave: false });
};

// Increment failed login attempts
UserSchema.methods.incFailedLogin = async function () {
    this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (this.failedLoginAttempts >= 5) {
        this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    return this.save({ validateBeforeSave: false });
};

// Check if password was changed after a JWT was issued
UserSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return jwtTimestamp < changedTimestamp;
    }
    return false;
};

// Remove password from JSON output
UserSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.passwordResetToken;
    delete user.passwordResetExpires;
    return user;
};

module.exports = mongoose.model('User', UserSchema);
