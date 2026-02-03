const mongoose = require('mongoose');

/**
 * Maintenance Schema (Enhanced per README Section 3.2)
 * Track maintenance requests, approvals, repairs, and algorithmic decisions
 */
const MaintenanceSchema = new mongoose.Schema(
    {
        // Auto-generated ticket number: MT-YYYYMMDD-XXXX
        ticketNumber: {
            type: String,
            unique: true,
            uppercase: true,
        },
        assetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Asset',
            required: [true, 'Asset is required'],
        },
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            required: [true, 'Office is required'],
        },
        issueDescription: {
            type: String,
            required: [true, 'Issue description is required'],
            trim: true,
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        issueType: {
            type: String,
            enum: ['hardware_failure', 'software_issue', 'preventive', 'upgrade', 'other'],
            default: 'other',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
        },
        // Cost estimation
        estimatedCost: {
            type: Number,
            min: [0, 'Cost cannot be negative'],
        },
        actualCost: {
            type: Number,
            min: [0, 'Cost cannot be negative'],
        },
        currency: {
            type: String,
            default: 'INR',
            uppercase: true,
        },
        // Legacy field for backwards compatibility
        repairCost: {
            type: Number,
            min: [0, 'Cost cannot be negative'],
        },
        decision: {
            type: String,
            enum: ['REPAIR', 'REPLACE'],
        },
        /**
         * Algorithm Decision Tracking (Per README)
         * Repair-vs-Replace algorithm with book value calculation
         */
        algorithmDecision: {
            currentBookValue: { type: Number },
            totalPriorRepairCost: { type: Number },
            estimatedRepairCost: { type: Number },
            cumulativeRepairCost: { type: Number }, // prior + estimated
            repairToValueRatio: { type: Number }, // cumulative / book value
            recommendation: {
                type: String,
                enum: ['approve', 'reject', 'escalate'],
            },
            reasoning: { type: String },
            calculatedAt: { type: Date },
        },
        // Approval workflow
        approvalStatus: {
            type: String,
            enum: ['pending', 'auto_approved', 'approved', 'rejected', 'escalated'],
            default: 'pending',
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approvalDate: { type: Date },
        approvalNotes: { type: String, trim: true },
        // Technician assignment
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedDate: { type: Date },
        // Parts used from spare inventory
        sparePartsUsed: [
            {
                inventoryId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Inventory',
                },
                partNumber: { type: String },
                name: { type: String },
                quantity: { type: Number, required: true, min: 1 },
                costPerUnit: { type: Number },
            },
        ],
        // Work log for technicians
        workLog: [
            {
                technician: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                startTime: { type: Date },
                endTime: { type: Date },
                hoursWorked: { type: Number },
                notes: { type: String },
                timestamp: { type: Date, default: Date.now },
            },
        ],
        // Ticket status
        status: {
            type: String,
            enum: ['REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED', 'REJECTED', 'COMPLETED', 'CLOSED', 'CANCELLED'],
            default: 'REQUESTED',
        },
        resolution: {
            type: String,
            trim: true,
            maxlength: [2000, 'Resolution cannot exceed 2000 characters'],
        },
        completedDate: { type: Date },
        // Who requested
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Requester is required'],
        },
        reportedDate: {
            type: Date,
            default: Date.now,
        },
        attachments: [String], // URLs or file paths
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes (Note: unique fields already have indexes, don't duplicate)
MaintenanceSchema.index({ assetId: 1, status: 1 });
MaintenanceSchema.index({ requestedBy: 1, reportedDate: -1 });
MaintenanceSchema.index({ status: 1, priority: 1 });
MaintenanceSchema.index({ approvalStatus: 1 });
MaintenanceSchema.index({ assignedTo: 1, status: 1 });
MaintenanceSchema.index({ officeId: 1, status: 1 });

// Virtual: Total parts cost
MaintenanceSchema.virtual('totalPartsCost').get(function () {
    if (!this.sparePartsUsed || this.sparePartsUsed.length === 0) return 0;
    return this.sparePartsUsed.reduce(
        (sum, part) => sum + (part.quantity * (part.costPerUnit || 0)),
        0
    );
});

// Virtual: Total labor hours
MaintenanceSchema.virtual('totalLaborHours').get(function () {
    if (!this.workLog || this.workLog.length === 0) return 0;
    return this.workLog.reduce((sum, log) => sum + (log.hoursWorked || 0), 0);
});

// Virtual: Days open
MaintenanceSchema.virtual('daysOpen').get(function () {
    const endDate = this.completedDate || new Date();
    const startDate = this.reportedDate || this.createdAt;
    const diffMs = endDate - startDate;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

// Pre-save hook to generate ticket number using atomic counter
MaintenanceSchema.pre('save', async function () {
    if (this.ticketNumber) return;

    const Counter = require('./Counter');
    this.ticketNumber = await Counter.generateTicketNumber();
});

/**
 * Method: Run Repair-vs-Replace Algorithm
 * Per README Section 4.2 - Repair-vs-Replace Algorithm Logic
 * 
 * Decision Rules:
 * - Ratio < 0.3: Auto-Approve
 * - Ratio 0.3-0.7: Escalate to Manager
 * - Ratio > 0.7: Recommend Rejection
 */
MaintenanceSchema.methods.runAlgorithm = async function () {
    const Asset = mongoose.model('Asset');
    const asset = await Asset.findById(this.assetId);

    if (!asset) {
        throw new Error('Asset not found');
    }

    // Calculate current book value
    const depreciationResult = asset.calculateDepreciation();
    const currentBookValue = depreciationResult.currentBookValue;

    // Get total prior repair cost from asset's maintenance history
    const totalPriorRepairCost = asset.totalMaintenanceCost || 0;

    // Estimated repair cost from this ticket
    const estimatedRepairCost = this.estimatedCost || this.repairCost || 0;

    // Cumulative repair cost
    const cumulativeRepairCost = totalPriorRepairCost + estimatedRepairCost;

    // Calculate repair-to-value ratio
    const repairToValueRatio = currentBookValue > 0
        ? cumulativeRepairCost / currentBookValue
        : Infinity;

    // Generate recommendation based on ratio
    let recommendation = 'approve';
    let reasoning = '';

    if (repairToValueRatio < 0.3) {
        recommendation = 'approve';
        reasoning = `Repair cost ratio (${(repairToValueRatio * 100).toFixed(1)}%) is low. Repair is economically viable. Book value: ${currentBookValue.toFixed(2)}, Cumulative repairs: ${cumulativeRepairCost.toFixed(2)}.`;
    } else if (repairToValueRatio < 0.7) {
        recommendation = 'escalate';
        reasoning = `Repair cost ratio (${(repairToValueRatio * 100).toFixed(1)}%) is moderate. Manager review recommended. Consider asset age and strategic value. Book value: ${currentBookValue.toFixed(2)}, Cumulative repairs: ${cumulativeRepairCost.toFixed(2)}.`;
    } else {
        recommendation = 'reject';
        reasoning = `Repair cost ratio (${(repairToValueRatio * 100).toFixed(1)}%) exceeds threshold. Replacement recommended over repair. Book value: ${currentBookValue.toFixed(2)}, Cumulative repairs: ${cumulativeRepairCost.toFixed(2)}.`;
    }

    // Store algorithm decision
    this.algorithmDecision = {
        currentBookValue,
        totalPriorRepairCost,
        estimatedRepairCost,
        cumulativeRepairCost,
        repairToValueRatio: Math.round(repairToValueRatio * 1000) / 1000,
        recommendation,
        reasoning,
        calculatedAt: new Date(),
    };

    // Set decision field for backwards compatibility
    this.decision = recommendation === 'reject' ? 'REPLACE' : 'REPAIR';

    return this.algorithmDecision;
};

/**
 * Method: Add work log entry
 */
MaintenanceSchema.methods.addWorkLog = function (technicianId, startTime, endTime, notes) {
    const hoursWorked = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
    this.workLog.push({
        technician: technicianId,
        startTime,
        endTime,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        notes,
        timestamp: new Date(),
    });
    return this;
};

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
