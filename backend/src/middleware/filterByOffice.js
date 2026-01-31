/**
 * Office Isolation Middleware
 * Automatically filters queries by user's office
 * SUPER_ADMIN bypasses this filter
 */
const filterByOffice = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    // SUPER_ADMIN can access all offices
    if (req.user.role === 'SUPER_ADMIN') {
        req.officeFilter = {}; // No filter
        return next();
    }

    // Other roles are restricted to their office
    if (!req.user.officeId) {
        return res.status(403).json({
            success: false,
            message: 'User not assigned to any office.',
        });
    }

    // Set filter for database queries
    req.officeFilter = { officeId: req.user.officeId._id || req.user.officeId };

    next();
};

module.exports = filterByOffice;
