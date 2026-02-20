const mongoose = require('mongoose');

/**
 * AiOperation Schema — Explainability & Audit Trail
 * 
 * Every AI-assisted operation writes a record here.
 * This is the foundation for:
 *   - Demo explainability JSON output
 *   - Natural language audit queries (Phase 3)
 *   - Confidence recalibration feedback loop (Phase 6)
 */
const AiOperationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        sessionId: {
            type: String,
            trim: true,
        },
        // What the AI was asked to do
        intent: {
            type: String,
            required: true,
            enum: [
                'CLOSE_MAINTENANCE',
                'PROCESS_BILL',
                'APPROVE_PURCHASE',
                'REJECT_PURCHASE',
                'GENERATE_REPORT',
                'QUERY_DATA',
                'CREATE_TRANSACTION',
                'DETECT_ANOMALY',
                'EXTRACT_DOCUMENT',
                'PREDICT_MAINTENANCE',
                'MATCH_INVOICE',
                'FORECAST_BUDGET',
                'GENERAL',
            ],
            index: true,
        },
        inputSummary: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        // Which AI agents participated
        agentsUsed: [{
            type: String,
            enum: [
                'intent_agent',
                'document_vision_agent',
                'planning_agent',
                'validation_agent',
                'memory_agent',
                'execution_agent',
            ],
        }],
        // Execution plan steps
        planSteps: [{
            step: { type: Number, required: true },
            action: { type: String, required: true },
            status: {
                type: String,
                enum: ['pending', 'completed', 'rolled_back', 'skipped', 'failed'],
                default: 'pending',
            },
            durationMs: { type: Number },
            details: { type: mongoose.Schema.Types.Mixed },
        }],
        // Anomalies detected during operation
        anomaliesDetected: [{
            field: { type: String },
            zScore: { type: Number },
            value: { type: mongoose.Schema.Types.Mixed },
            threshold: { type: Number },
            message: { type: String },
        }],
        // Overall confidence of the AI operation
        confidenceScore: {
            type: Number,
            min: 0,
            max: 1,
        },
        // Self-consistency voting results (Planning Agent)
        selfConsistencyVotes: [{
            voteIndex: Number,
            decision: String,
            confidence: Number,
        }],
        // Rollback events if saga failed
        rollbackEvents: [{
            step: { type: Number },
            reason: { type: String },
            rolledBackAt: { type: Date, default: Date.now },
        }],
        // Human approval tracking
        humanApprovalRequired: {
            type: Boolean,
            default: false,
        },
        humanApprovalBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        humanApprovalAt: Date,
        humanApprovalDecision: {
            type: String,
            enum: ['approved', 'rejected', 'modified', null],
            default: null,
        },
        // Timing
        totalDurationMs: {
            type: Number,
        },
        // Related entity (what was affected)
        relatedEntityType: {
            type: String,
            enum: [
                'Maintenance',
                'Asset',
                'PurchaseOrder',
                'Transaction',
                'Invoice',
                'Vendor',
                'Inventory',
                'Budget',
                'Document',
                'User',
                'System',
            ],
        },
        relatedEntityId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        // The full explainability output (shown in demo)
        explanation: {
            type: mongoose.Schema.Types.Mixed,
        },
        // Digital twin preview diff (before write)
        digitalTwinPreview: {
            type: mongoose.Schema.Types.Mixed,
        },
        // Operation result
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'rolled_back', 'awaiting_approval'],
            default: 'pending',
            index: true,
        },
        // Office scope
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
AiOperationSchema.index({ intent: 1, createdAt: -1 });
AiOperationSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });
AiOperationSchema.index({ officeId: 1, createdAt: -1 });
AiOperationSchema.index({ 'anomaliesDetected.zScore': 1 });
AiOperationSchema.index({ confidenceScore: 1 });

/**
 * Static: Log an AI operation (non-blocking, never throws)
 */
AiOperationSchema.statics.log = async function (data) {
    try {
        return await this.create(data);
    } catch (error) {
        console.error('AiOperation log error:', error.message);
        return null;
    }
};

/**
 * Static: Get operations for a specific entity
 */
AiOperationSchema.statics.getForEntity = async function (entityType, entityId, limit = 20) {
    return this.find({ relatedEntityType: entityType, relatedEntityId: entityId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name email')
        .lean();
};

/**
 * Static: Get anomalies within a date range
 */
AiOperationSchema.statics.getAnomalies = async function (officeId, startDate, endDate) {
    const query = {
        'anomaliesDetected.0': { $exists: true }, // Has at least one anomaly
    };
    if (officeId) query.officeId = officeId;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    return this.find(query)
        .sort({ createdAt: -1 })
        .populate('userId', 'name email')
        .lean();
};

/**
 * Static: Get operations needing human approval
 */
AiOperationSchema.statics.getPendingApprovals = async function (officeId) {
    return this.find({
        status: 'awaiting_approval',
        humanApprovalRequired: true,
        humanApprovalDecision: null,
        ...(officeId ? { officeId } : {}),
    })
        .sort({ createdAt: -1 })
        .populate('userId', 'name email')
        .lean();
};

module.exports = mongoose.model('AiOperation', AiOperationSchema);
