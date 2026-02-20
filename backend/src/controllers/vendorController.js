const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');

// @desc    Create new vendor
// @route   POST /api/vendors
// @access  Private (Admin/Manager)
exports.createVendor = async (req, res) => {
    try {
        const vendor = await Vendor.create(req.body);
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
        const { type, search } = req.query;
        let query = { isActive: true };

        if (type) query.type = type;
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const vendors = await Vendor.find(query).sort({ name: 1 });
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
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        // Calculate reliability on the fly or fetch stored
        // For now return stored
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
        const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
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
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        vendor.isActive = false;
        await vendor.save();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
