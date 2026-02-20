const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiService = require('../services/aiService');
const intentService = require('../services/intentService');
const AiOperation = require('../models/AiOperation');

/**
 * AI Routes — OpsPilot API
 * All AI-related endpoints for intent extraction, health checks,
 * operation history, and approval workflows.
 */

// @desc    Health check — is Ollama running?
// @route   GET /api/ai/health
// @access  Private
router.get('/health', protect, async (req, res) => {
    try {
        const health = await aiService.healthCheck();
        res.json({ success: true, data: health });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @desc    Extract intent from natural language
// @route   POST /api/ai/intent
// @access  Private
router.post('/intent', protect, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

        const result = await intentService.extractIntent(text, {
            userId: req.user._id,
            officeId: req.user.officeId,
            sessionId: req.headers['x-session-id'],
        });

        // Emit progress via WebSocket
        const socketServer = require('../config/socketServer');
        socketServer.notifyUser(req.user._id.toString(), {
            type: 'ai_progress',
            event: 'intent_extracted',
            data: { intent: result.intent, confidence: result.confidence },
        });

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @desc    Get AI operation history
// @route   GET /api/ai/operations
// @access  Private
router.get('/operations', protect, async (req, res) => {
    try {
        const { intent, status, limit = 20, entityType, entityId } = req.query;
        const query = {};

        // Scope to user's office unless super admin
        if (req.user.role !== 'SUPER_ADMIN') {
            query.officeId = req.user.officeId;
        }
        if (intent) query.intent = intent;
        if (status) query.status = status;
        if (entityType) query.relatedEntityType = entityType;
        if (entityId) query.relatedEntityId = entityId;

        const operations = await AiOperation.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('userId', 'name email')
            .lean();

        res.json({ success: true, count: operations.length, data: operations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @desc    Get a single AI operation (full explainability)
// @route   GET /api/ai/operations/:id
// @access  Private
router.get('/operations/:id', protect, async (req, res) => {
    try {
        const op = await AiOperation.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('humanApprovalBy', 'name');

        if (!op) return res.status(404).json({ success: false, message: 'AI operation not found' });

        res.json({ success: true, data: op });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @desc    Get pending AI approvals
// @route   GET /api/ai/pending-approvals
// @access  Private (Manager+)
router.get('/pending-approvals', protect, async (req, res) => {
    try {
        const officeId = req.user.role === 'SUPER_ADMIN' ? null : req.user.officeId;
        const pending = await AiOperation.getPendingApprovals(officeId);
        res.json({ success: true, count: pending.length, data: pending });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @desc    Approve / Reject an AI operation
// @route   PUT /api/ai/operations/:id/approve
// @access  Private (Manager+)
router.put('/operations/:id/approve', protect, async (req, res) => {
    try {
        const { decision } = req.body; // "approved" or "rejected"
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ success: false, message: 'Decision must be approved or rejected' });
        }

        const op = await AiOperation.findById(req.params.id);
        if (!op) return res.status(404).json({ success: false, message: 'AI operation not found' });

        op.humanApprovalDecision = decision;
        op.humanApprovalBy = req.user._id;
        op.humanApprovalAt = new Date();
        op.status = decision === 'approved' ? 'completed' : 'failed';
        await op.save();

        // Notify requester via WebSocket
        const socketServer = require('../config/socketServer');
        socketServer.notifyUser(op.userId.toString(), {
            type: 'ai_approval',
            event: decision,
            operationId: op._id,
            intent: op.intent,
        });

        res.json({ success: true, data: op });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @desc    Get anomalies detected by AI
// @route   GET /api/ai/anomalies
// @access  Private
router.get('/anomalies', protect, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const officeId = req.user.role === 'SUPER_ADMIN' ? null : req.user.officeId;
        const anomalies = await AiOperation.getAnomalies(officeId, startDate, endDate);
        res.json({ success: true, count: anomalies.length, data: anomalies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
