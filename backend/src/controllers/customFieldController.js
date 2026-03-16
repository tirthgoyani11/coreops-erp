const prisma = require('../config/prisma');

// @desc    Get all custom field definitions
// @route   GET /api/custom-fields/defs
// @access  Private
exports.getDefs = async (req, res) => {
    try {
        const { entityType } = req.query;
        const where = { isActive: true };
        if (entityType) where.entityType = entityType;

        const defs = await prisma.customFieldDef.findMany({ where });
        res.status(200).json({ success: true, data: defs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Create a custom field definition 
// @route   POST /api/custom-fields/defs
// @access  Private (Admin only)
exports.createDef = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { entityType, name, type, isRequired, options } = req.body;
        if (!entityType || !name || !type) {
            return res.status(400).json({ success: false, message: 'entityType, name, and type are required' });
        }

        const def = await prisma.customFieldDef.create({
            data: { entityType, name, type, isRequired, options }
        });

        res.status(201).json({ success: true, data: def });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'A field with this name already exists for this entity' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update a custom field definition
// @route   PUT /api/custom-fields/defs/:id
// @access  Private (Admin only)
exports.updateDef = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const def = await prisma.customFieldDef.update({
            where: { id: req.params.id },
            data: req.body
        });

        res.status(200).json({ success: true, data: def });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get custom field values for a specific entity
// @route   GET /api/custom-fields/values/:entityId
// @access  Private
exports.getValues = async (req, res) => {
    try {
        const values = await prisma.customFieldValue.findMany({
            where: { entityId: req.params.entityId },
            include: { fieldDef: true }
        });
        res.status(200).json({ success: true, data: values });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Set custom field values for a specific entity
// @route   POST /api/custom-fields/values/:entityId
// @access  Private
exports.setValues = async (req, res) => {
    try {
        const { values } = req.body; // Array of { fieldDefId, value }
        const entityId = req.params.entityId;

        if (!Array.isArray(values)) {
            return res.status(400).json({ success: false, message: 'values must be an array' });
        }

        // Upsert all values within a transaction
        const results = await prisma.$transaction(
            values.map(val => prisma.customFieldValue.upsert({
                where: {
                    fieldDefId_entityId: { fieldDefId: val.fieldDefId, entityId }
                },
                update: { value: String(val.value) },
                create: { fieldDefId: val.fieldDefId, entityId, value: String(val.value) }
            }))
        );

        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
