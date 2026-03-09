/**
 * Office/Scope Isolation Middleware
 * Automatically filters queries based on user role and scope
 * 
 * Scope Rules:
 * - SUPER_ADMIN: Global access (no filter)
 * - REGIONAL_MANAGER: Filter by region (multiple offices)
 * - BRANCH_MANAGER: Filter by single office
 * - TECHNICIAN: Filter by assigned tasks
 * - VIEWER: Filter by assigned scope
 */
const filterByOffice = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    const { role, officeId, regionId, assignedScope } = req.user;

    // SUPER_ADMIN and ADMIN can access all offices - no filter
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        req.officeFilter = {};
        req.scopeFilter = {};
        req.canViewAll = true;
        return next();
    }

    // MANAGER and STAFF restricted to their office
    if (role === 'MANAGER' || role === 'STAFF') {
        if (!officeId) {
            return res.status(403).json({
                success: false,
                message: `${role} not assigned to any office.`,
            });
        }
        const officeIdValue = typeof officeId === 'object' ? officeId.id : officeId;
        req.officeFilter = { officeId: officeIdValue };
        req.scopeFilter = { officeId: officeIdValue };
        req.canViewBranch = true;
        return next();
    }

    // TECHNICIAN can only see assigned items
    if (role === 'TECHNICIAN') {
        if (!officeId) {
            return res.status(403).json({
                success: false,
                message: 'Technician not assigned to any office.',
            });
        }
        const officeIdValue = typeof officeId === 'object' ? officeId.id : officeId;
        req.officeFilter = { officeId: officeIdValue };
        // For tickets, also filter by assignment
        req.assignedFilter = { assignedTo: req.user.id };
        req.scopeFilter = {
            officeId: officeIdValue,
            assignedTo: req.user.id
        };
        req.canViewAssigned = true;
        return next();
    }

    // VIEWER has read-only access to assigned scope
    if (role === 'VIEWER') {
        if (!officeId) {
            return res.status(403).json({
                success: false,
                message: 'Viewer not assigned to any office.',
            });
        }
        const officeIdValue = typeof officeId === 'object' ? officeId.id : officeId;
        req.officeFilter = { officeId: officeIdValue };
        req.scopeFilter = { officeId: officeIdValue };
        // Viewer has read-only flag
        req.isReadOnly = true;
        req.canViewAssigned = true;
        return next();
    }

    // Default: deny access for unknown roles
    return res.status(403).json({
        success: false,
        message: 'Unknown role. Access denied.',
    });
};

/**
 * Check if user can write (create/update/delete)
 * VIEWER role is read-only
 */
const checkWriteAccess = (req, res, next) => {
    if (req.isReadOnly) {
        return res.status(403).json({
            success: false,
            message: 'Viewer role has read-only access.',
        });
    }
    next();
};

/**
 * Check if user can approve within their limit
 * @param {number} amount - Amount to approve
 */
const checkApprovalLimit = (req, res, next) => {
    const amount = req.body.amount || req.body.estimatedCost || 0;
    const { role, approvalLimit } = req.user;

    // Role-based approval limits
    const limits = {
        SUPER_ADMIN: Infinity,
        ADMIN: 10000,
        MANAGER: 5000,
        STAFF: 500,
        TECHNICIAN: 0,
        VIEWER: 0
    };

    const userLimit = approvalLimit || limits[role] || 0;

    if (amount > userLimit) {
        return res.status(403).json({
            success: false,
            message: `Amount $${amount} exceeds your approval limit of $${userLimit}. Please escalate.`,
            requiresEscalation: true,
            escalateTo: role === 'MANAGER' ? 'Admin' : 'Super Admin'
        });
    }

    next();
};

module.exports = { filterByOffice, checkWriteAccess, checkApprovalLimit };
