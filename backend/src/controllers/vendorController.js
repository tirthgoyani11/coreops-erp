const Vendor = require('../models/Vendor');
const AuditLog = require('../models/AuditLog');

/**
 * Vendor Controller
 * 
 * Provides CRUD operations for vendor management with reliability scoring.
 */

/**
 * Get all vendors with pagination and filters
 * GET /api/vendors
 */
exports.getVendors = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            type,
            isActive,
            blacklisted,
            sortBy = 'name',
            sortOrder = 'asc',
            minScore,
        } = req.query;

        // Build query
        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { vendorCode: { $regex: search, $options: 'i' } },
                { 'contactInfo.email': { $regex: search, $options: 'i' } },
            ];
        }

        if (type) query.type = type;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (blacklisted !== undefined) query.blacklisted = blacklisted === 'true';
        if (minScore) query['reliabilityScore.overallScore'] = { $gte: parseFloat(minScore) };

        // Build sort
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [vendors, total] = await Promise.all([
            Vendor.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Vendor.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: vendors,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendors',
            error: error.message,
        });
    }
};

/**
 * Get single vendor by ID
 * GET /api/vendors/:id
 */
exports.getVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }

        res.json({
            success: true,
            data: vendor,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor',
            error: error.message,
        });
    }
};

/**
 * Create new vendor
 * POST /api/vendors
 */
exports.createVendor = async (req, res) => {
    try {
        const vendor = new Vendor(req.body);
        await vendor.save();

        // Log audit
        await AuditLog.create({
            user: req.user._id,
            action: 'create_vendor',
            resourceType: 'Vendor',
            resourceId: vendor._id,
            changes: { after: vendor.toObject() },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        res.status(201).json({
            success: true,
            message: 'Vendor created successfully',
            data: vendor,
        });
    } catch (error) {
        console.error('Vendor creation error:', error.message, error.stack);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Vendor with this email or code already exists',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create vendor',
            error: error.message,
        });
    }
};

/**
 * Update vendor
 * PUT /api/vendors/:id
 */
exports.updateVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }

        const previousValues = vendor.toObject();

        // Update allowed fields
        const allowedUpdates = [
            'name', 'type', 'contactInfo', 'address', 'businessInfo',
            'paymentTerms', 'certifications', 'documents', 'notes',
            'isActive', 'blacklisted',
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                vendor[field] = req.body[field];
            }
        });

        await vendor.save();

        // Log audit
        await AuditLog.create({
            user: req.user._id,
            action: 'update_vendor',
            resourceType: 'Vendor',
            resourceId: vendor._id,
            changes: { before: previousValues, after: vendor.toObject() },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        res.json({
            success: true,
            message: 'Vendor updated successfully',
            data: vendor,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update vendor',
            error: error.message,
        });
    }
};

/**
 * Delete vendor (soft delete by deactivating)
 * DELETE /api/vendors/:id
 */
exports.deleteVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }

        // Soft delete
        vendor.isActive = false;
        await vendor.save();

        // Log audit
        await AuditLog.create({
            user: req.user._id,
            action: 'delete_vendor',
            resourceType: 'Vendor',
            resourceId: vendor._id,
            changes: { before: { isActive: true }, after: { isActive: false } },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        res.json({
            success: true,
            message: 'Vendor deactivated successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete vendor',
            error: error.message,
        });
    }
};

/**
 * Calculate and update vendor reliability score
 * POST /api/vendors/:id/calculate-reliability
 */
exports.calculateReliability = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }

        vendor.calculateReliabilityScore();
        await vendor.save();

        res.json({
            success: true,
            message: 'Reliability score calculated',
            data: {
                vendorCode: vendor.vendorCode,
                name: vendor.name,
                reliabilityScore: vendor.reliabilityScore,
                performanceMetrics: vendor.performanceMetrics,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to calculate reliability',
            error: error.message,
        });
    }
};

/**
 * Get vendor rankings by reliability score
 * GET /api/vendors/rankings
 */
exports.getVendorRankings = async (req, res) => {
    try {
        const { type, limit = 10 } = req.query;

        const query = { isActive: true, blacklisted: false };
        if (type) query.type = type;

        const vendors = await Vendor.find(query)
            .select('vendorCode name type reliabilityScore performanceMetrics')
            .sort({ 'reliabilityScore.overallScore': -1 })
            .limit(parseInt(limit))
            .lean();

        // Add rank
        const rankedVendors = vendors.map((vendor, index) => ({
            rank: index + 1,
            ...vendor,
        }));

        res.json({
            success: true,
            data: rankedVendors,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor rankings',
            error: error.message,
        });
    }
};

/**
 * Update vendor performance metrics (for order completion)
 * POST /api/vendors/:id/record-order
 */
exports.recordOrder = async (req, res) => {
    try {
        const { wasOnTime, hasDefects, orderValue } = req.body;

        const vendor = await Vendor.findById(req.params.id);

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }

        // Update performance metrics
        vendor.performanceMetrics.totalOrders += 1;
        vendor.performanceMetrics.completedOrders += 1;

        if (wasOnTime) {
            vendor.performanceMetrics.onTimeDeliveries += 1;
        }

        if (hasDefects) {
            vendor.performanceMetrics.defectiveOrders += 1;
        }

        if (orderValue) {
            vendor.performanceMetrics.averageOrderValue =
                ((vendor.performanceMetrics.averageOrderValue * (vendor.performanceMetrics.totalOrders - 1)) + orderValue) /
                vendor.performanceMetrics.totalOrders;
        }

        // Recalculate reliability score
        vendor.calculateReliabilityScore();
        await vendor.save();

        res.json({
            success: true,
            message: 'Order recorded and scores updated',
            data: {
                performanceMetrics: vendor.performanceMetrics,
                reliabilityScore: vendor.reliabilityScore,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to record order',
            error: error.message,
        });
    }
};

/**
 * Get vendors by type (for dropdowns)
 * GET /api/vendors/by-type/:type
 */
exports.getVendorsByType = async (req, res) => {
    try {
        const vendors = await Vendor.find({
            type: req.params.type,
            isActive: true,
            blacklisted: false,
        })
            .select('vendorCode name reliabilityScore.overallScore')
            .sort({ 'reliabilityScore.overallScore': -1 })
            .lean();

        res.json({
            success: true,
            data: vendors,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendors',
            error: error.message,
        });
    }
};
