const prisma = require('../config/prisma');

// @desc    Create new vendor
// @route   POST /api/vendors
// @access  Private (Admin/Manager)
exports.createVendor = async (req, res) => {
    try {
        const { name, vendorCode, contactPerson, email, phone, address, gstNumber, panNumber, bankDetails, notes } = req.body;

        const vendor = await prisma.vendor.create({
            data: {
                name,
                vendorCode: vendorCode?.toUpperCase()?.trim(),
                contactPerson,
                email: email?.toLowerCase()?.trim(),
                phone,
                address,
                gstNumber,
                panNumber,
                bankDetails: bankDetails || undefined,
                notes,
            },
        });

        res.status(201).json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get all vendors
// @route   GET /api/vendors
// @access  Private
exports.getVendors = async (req, res) => {
    try {
        const { search } = req.query;
        const where = { isBlacklisted: false };

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        const vendors = await prisma.vendor.findMany({
            where,
            orderBy: { name: 'asc' },
            include: { purchaseOrders: { include: { items: true } } }
        });

        const vendorsWithMetrics = vendors.map(vendor => {
            let onTimeCount = 0;
            let totalValuatedPos = 0;
            let fulfillmentSum = 0;
            let totalItems = 0;

            const relevantPos = vendor.purchaseOrders.filter(po => ['RECEIVED', 'PARTIALLY_RECEIVED'].includes(po.status));

            for (const po of relevantPos) {
                if (po.expectedDeliveryDate && po.deliveryDate) {
                    totalValuatedPos++;
                    if (new Date(po.deliveryDate) <= new Date(po.expectedDeliveryDate)) onTimeCount++;
                }

                for (const item of po.items) {
                    totalItems++;
                    fulfillmentSum += Math.min(1, (item.receivedQuantity || 0) / (item.quantity || 1));
                }
            }

            const deliveryScore = totalValuatedPos > 0 ? (onTimeCount / totalValuatedPos) * 100 : 100;
            const fulfillmentScore = totalItems > 0 ? (fulfillmentSum / totalItems) * 100 : 100;
            const overallScore = Math.round((deliveryScore * 0.4) + (fulfillmentScore * 0.6));

            const { purchaseOrders, ...vendorData } = vendor;

            return {
                ...vendorData,
                reliabilityMetrics: {
                    deliveryScore: Math.round(deliveryScore),
                    fulfillmentScore: Math.round(fulfillmentScore),
                    overallScore,
                },
                performanceMetrics: {
                    totalOrders: vendor.purchaseOrders.length,
                    completedOrders: vendor.purchaseOrders.filter(po => po.status === 'COMPLETED' || po.status === 'RECEIVED').length,
                }
            };
        });

        res.status(200).json({ success: true, count: vendorsWithMetrics.length, data: vendorsWithMetrics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get single vendor
// @route   GET /api/vendors/:id
// @access  Private
exports.getVendor = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({
            where: { id: req.params.id },
            include: { purchaseOrders: { take: 10, orderBy: { createdAt: 'desc' } } },
        });

        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        // Calculate Vendor Reliability Score dynamically
        const allPos = await prisma.purchaseOrder.findMany({
            where: { vendorId: vendor.id, status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] } },
            include: { items: true },
        });

        let onTimeCount = 0;
        let totalValuatedPos = 0;
        let fulfillmentSum = 0;
        let totalItems = 0;

        for (const po of allPos) {
            if (po.expectedDeliveryDate && po.deliveryDate) {
                totalValuatedPos++;
                if (new Date(po.deliveryDate) <= new Date(po.expectedDeliveryDate)) onTimeCount++;
            }

            for (const item of po.items) {
                totalItems++;
                fulfillmentSum += Math.min(1, (item.receivedQuantity || 0) / (item.quantity || 1));
            }
        }

        const deliveryScore = totalValuatedPos > 0 ? (onTimeCount / totalValuatedPos) * 100 : 100;
        const fulfillmentScore = totalItems > 0 ? (fulfillmentSum / totalItems) * 100 : 100;
        const reliabilityScore = Math.round((deliveryScore * 0.4) + (fulfillmentScore * 0.6));

        res.status(200).json({
            success: true,
            data: {
                ...vendor,
                reliabilityMetrics: {
                    deliveryScore: Math.round(deliveryScore),
                    fulfillmentScore: Math.round(fulfillmentScore),
                    overallScore: reliabilityScore,
                    totalOrdersValuated: allPos.length
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update vendor
// @route   PUT /api/vendors/:id
// @access  Private (Admin/Manager)
exports.updateVendor = async (req, res) => {
    try {
        const exists = await prisma.vendor.findUnique({ where: { id: req.params.id } });
        if (!exists) return res.status(404).json({ success: false, message: 'Vendor not found' });

        const { name, vendorCode, contactPerson, email, phone, address, gstNumber, panNumber, bankDetails, notes } = req.body;

        const vendor = await prisma.vendor.update({
            where: { id: req.params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(vendorCode !== undefined && { vendorCode: vendorCode?.toUpperCase()?.trim() }),
                ...(contactPerson !== undefined && { contactPerson }),
                ...(email !== undefined && { email: email?.toLowerCase()?.trim() }),
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address }),
                ...(gstNumber !== undefined && { gstNumber }),
                ...(panNumber !== undefined && { panNumber }),
                ...(bankDetails !== undefined && { bankDetails }),
                ...(notes !== undefined && { notes }),
            },
        });

        res.status(200).json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Delete vendor (soft delete)
// @route   DELETE /api/vendors/:id
// @access  Private (Admin)
exports.deleteVendor = async (req, res) => {
    try {
        const exists = await prisma.vendor.findUnique({ where: { id: req.params.id } });
        if (!exists) return res.status(404).json({ success: false, message: 'Vendor not found' });

        await prisma.vendor.update({
            where: { id: req.params.id },
            data: { isBlacklisted: true },
        });

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
