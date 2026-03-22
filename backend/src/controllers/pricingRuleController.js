const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');

exports.createPricingRule = asyncHandler(async (req, res, next) => {
    const { name, type, value, applicableTo, referenceId, validUntil } = req.body;
    const officeId = req.user?.officeId || req.body.officeId;

    if (!officeId || !name || !type || value === undefined) {
        return next(new AppError('Missing required fields for Pricing Rule', 400));
    }

    const rule = await prisma.pricingRule.create({
        data: {
            name,
            type, // PERCENTAGE or FLAT
            value: parseFloat(value),
            applicableTo,
            referenceId,
            validUntil: validUntil ? new Date(validUntil) : null,
            officeId
        }
    });
    res.status(201).json({ success: true, data: rule });
});

exports.getPricingRules = asyncHandler(async (req, res, next) => {
    const officeId = req.user?.officeId || req.query.officeId;
    
    let whereClause = { isActive: true };
    if (officeId) whereClause.officeId = officeId;

    const rules = await prisma.pricingRule.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, count: rules.length, data: rules });
});
