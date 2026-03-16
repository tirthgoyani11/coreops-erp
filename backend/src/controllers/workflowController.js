const prisma = require('../config/prisma');

// @desc    Get all workflow rules
// @route   GET /api/workflows
// @access  Private (Admin only)
exports.getRules = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const rules = await prisma.workflowRule.findMany({
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, count: rules.length, data: rules });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get specific workflow rule
// @route   GET /api/workflows/:id
// @access  Private (Admin only)
exports.getRule = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const rule = await prisma.workflowRule.findUnique({
            where: { id: req.params.id }
        });

        if (!rule) {
            return res.status(404).json({ success: false, message: 'Workflow rule not found' });
        }

        res.status(200).json({ success: true, data: rule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Create new workflow rule
// @route   POST /api/workflows
// @access  Private (Admin only)
exports.createRule = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { entityType, triggerEvent, condition, actionType, actionValue, isActive } = req.body;

        if (!entityType || !triggerEvent || !condition || !actionType || !actionValue) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        const rule = await prisma.workflowRule.create({
            data: {
                entityType,
                triggerEvent,
                condition,
                actionType,
                actionValue,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        res.status(201).json({ success: true, data: rule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update a workflow rule
// @route   PUT /api/workflows/:id
// @access  Private (Admin only)
exports.updateRule = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        let rule = await prisma.workflowRule.findUnique({ where: { id: req.params.id } });
        if (!rule) return res.status(404).json({ success: false, message: 'Workflow rule not found' });

        rule = await prisma.workflowRule.update({
            where: { id: req.params.id },
            data: req.body
        });

        res.status(200).json({ success: true, data: rule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Delete a workflow rule
// @route   DELETE /api/workflows/:id
// @access  Private (Admin only)
exports.deleteRule = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const rule = await prisma.workflowRule.findUnique({ where: { id: req.params.id } });
        if (!rule) return res.status(404).json({ success: false, message: 'Workflow rule not found' });

        await prisma.workflowRule.delete({ where: { id: req.params.id } });

        res.status(200).json({ success: true, message: 'Workflow rule deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
