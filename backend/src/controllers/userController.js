const prisma = require('../config/prisma');

/**
 * @desc    Get all users (Admin/Manager only)
 * @route   GET /api/users
 * @access  Private
 */
exports.getUsers = async (req, res, next) => {
    try {
        const query = {};

        // If not SUPER_ADMIN, only show users from the same office
        if (req.user.role !== 'SUPER_ADMIN') {
            query.officeId = req.user.officeId;
        }

        const users = await prisma.user.findMany({
            where: query,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                office: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Map office -> officeId to match what frontend expects
        const formatted = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            officeId: u.office
        }));

        res.json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
exports.getUserById = async (req, res, next) => {
    try {
        const userId = req.params.id || req.user.id;

        // Fetch user basic info + relations
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
                phone: true,
                avatar: true,
                language: true,
                timezone: true,
                emailNotifications: true,
                inAppNotifications: true,
                createdAt: true,
                lastLogin: true,
                office: {
                    select: { id: true, name: true, code: true }
                },
                _count: {
                    select: {
                        assignedAssets: true,
                        requestedTickets: true,
                        assignedTickets: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Add RBAC check to ensure managers don't view cross-office users
        if (req.user.role !== 'SUPER_ADMIN' && user.office?.id !== req.user.officeId && req.user.id !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized to view this profile' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update user details
 * @route   PUT /api/users/:id
 * @access  Private
 */
exports.updateUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const updates = req.body;

        // Prevent protected fields from being updated directly
        delete updates.password;
        delete updates.id;
        delete updates.createdAt;
        delete updates.updatedAt;

        // Fetch existing user to verify permissions
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // RBAC Checks for updating
        if (req.user.id !== userId) { // If not updating self
            if (req.user.role === 'SUPER_ADMIN') {
                // Super Admins can update anyone
            } else if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
                // Managers can update users in their own office, but cannot elevate roles
                if (existingUser.officeId !== req.user.officeId) {
                    return res.status(403).json({ success: false, message: 'Unauthorized: User is not in your office' });
                }
                if (updates.role && updates.role === 'SUPER_ADMIN') {
                    return res.status(403).json({ success: false, message: 'Unauthorized: Cannot grant SUPER_ADMIN role' });
                }
            } else {
                return res.status(403).json({ success: false, message: 'Unauthorized to edit this profile' });
            }
        } else {
            // Updating self: cannot change own role or office
            delete updates.role;
            delete updates.officeId;
            delete updates.isActive;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updates,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                phone: true,
                avatar: true,
                office: { select: { id: true, name: true } }
            }
        });

        res.json({ success: true, data: updatedUser, message: 'User updated successfully' });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// DASHBOARD PERSONALIZATION
// ==========================================

// @desc    Update current user's dashboard preferences
// @route   PUT /api/users/me/dashboard
// @access  Private (Self)
exports.updateDashboardPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { preferences } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { preferences }
        });

        res.status(200).json({ success: true, data: updatedUser.preferences });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get current user's KPI alerts
// @route   GET /api/users/me/alerts
// @access  Private (Self)
exports.getAlerts = async (req, res) => {
    try {
        const userId = req.user.id;
        const alerts = await prisma.kpiAlert.findMany({
            where: { userId }
        });

        res.status(200).json({ success: true, count: alerts.length, data: alerts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Create a KPI alert for current user
// @route   POST /api/users/me/alerts
// @access  Private (Self)
exports.createAlert = async (req, res) => {
    try {
        const userId = req.user.id;
        const { metricName, condition, threshold, isActive } = req.body;

        if (!metricName || !condition || threshold === undefined) {
             return res.status(400).json({ success: false, message: 'Please provide metricName, condition, and threshold' });
        }

        const alert = await prisma.kpiAlert.create({
            data: {
                userId,
                metricName,
                condition,
                threshold,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        res.status(201).json({ success: true, data: alert });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update a KPI alert for current user
// @route   PUT /api/users/me/alerts/:id
// @access  Private (Self)
exports.updateAlert = async (req, res) => {
    try {
        const userId = req.user.id;
        const alertId = req.params.id;

        const alert = await prisma.kpiAlert.findUnique({ where: { id: alertId } });
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        if (alert.userId !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });

        const updated = await prisma.kpiAlert.update({
            where: { id: alertId },
            data: req.body
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Delete a KPI alert for current user
// @route   DELETE /api/users/me/alerts/:id
// @access  Private (Self)
exports.deleteAlert = async (req, res) => {
    try {
        const userId = req.user.id;
        const alertId = req.params.id;

        const alert = await prisma.kpiAlert.findUnique({ where: { id: alertId } });
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        if (alert.userId !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });

        await prisma.kpiAlert.delete({ where: { id: alertId } });

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
