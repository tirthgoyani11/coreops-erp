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
        });

        res.status(200).json({ success: true, count: vendors.length, data: vendors });
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

        res.status(200).json({ success: true, data: vendor });
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

        const vendor = await prisma.vendor.update({
            where: { id: req.params.id },
            data: req.body,
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
