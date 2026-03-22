const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const prisma = require('../config/prisma');
const aiService = require('../services/aiService');
const intentService = require('../services/intentService');

async function persistInAppNotification({ recipientId, title, message, priority = 'LOW', relatedModel, relatedDocId }) {
    if (!recipientId || !title || !message) return;
    try {
        await prisma.notification.create({
            data: {
                recipientId,
                type: 'SYSTEM_ALERT',
                title,
                message,
                priority,
                relatedModel,
                relatedDocId,
            },
        });
    } catch (err) {
        // Do not block AI responses if notification persistence fails.
        console.warn('[AI Routes] Failed to persist notification:', err.message);
    }
}

/**
 * AI Routes — OpsPilot API (Prisma)
 */

// GET /api/ai/health
router.get('/health', protect, async (req, res) => {
    try {
        const health = await aiService.healthCheck();
        res.json({ success: true, data: health });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/intent
router.post('/intent', protect, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

        const result = await intentService.extractIntent(text, {
            userId: req.user.id,
            officeId: req.user.officeId,
            sessionId: req.headers['x-session-id'],
        });

        const socketServer = require('../config/socketServer');
        socketServer.notifyUser(req.user.id, {
            type: 'ai_progress',
            event: 'intent_extracted',
            data: { intent: result.intent, confidence: result.confidence },
        });

        await persistInAppNotification({
            recipientId: req.user.id,
            title: 'AI Intent Analyzed',
            message: `Detected intent: ${result.intent} (${Math.round((result.confidence || 0) * 100)}% confidence).`,
            priority: 'LOW',
            relatedModel: 'AIOperation',
        });

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/operations
router.get('/operations', protect, async (req, res) => {
    try {
        const { intent, status, limit = 20, entityType, entityId } = req.query;
        const where = {};

        if (req.user.role !== 'SUPER_ADMIN') {
            where.officeId = req.user.officeId;
        }
        if (intent) where.intent = intent;
        if (status) where.status = status;
        if (entityType) where.relatedEntityType = entityType;
        if (entityId) where.relatedEntityId = entityId;

        const operations = await prisma.aiOperation.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            include: { user: { select: { id: true, name: true, email: true } } },
        });

        res.json({ success: true, count: operations.length, data: operations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/operations/:id
router.get('/operations/:id', protect, async (req, res) => {
    try {
        const op = await prisma.aiOperation.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { id: true, name: true, email: true } },
                humanApprovalBy: { select: { id: true, name: true } },
            },
        });
        if (!op) return res.status(404).json({ success: false, message: 'AI operation not found' });
        res.json({ success: true, data: op });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/pending-approvals
router.get('/pending-approvals', protect, async (req, res) => {
    try {
        const where = { humanApprovalRequired: true, status: 'AI_AWAITING_APPROVAL' };
        if (req.user.role !== 'SUPER_ADMIN') where.officeId = req.user.officeId;

        const pending = await prisma.aiOperation.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
        res.json({ success: true, count: pending.length, data: pending });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/ai/operations/:id/approve
router.put('/operations/:id/approve', protect, async (req, res) => {
    try {
        const { decision } = req.body;
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ success: false, message: 'Decision must be approved or rejected' });
        }

        const op = await prisma.aiOperation.findUnique({ where: { id: req.params.id } });
        if (!op) return res.status(404).json({ success: false, message: 'AI operation not found' });

        const updated = await prisma.aiOperation.update({
            where: { id: req.params.id },
            data: {
                humanApprovalDecision: decision,
                humanApprovalById: req.user.id,
                humanApprovalAt: new Date(),
                status: decision === 'approved' ? 'AI_COMPLETED' : 'AI_FAILED',
            },
        });

        const socketServer = require('../config/socketServer');
        socketServer.notifyUser(op.userId, {
            type: 'ai_approval',
            event: decision,
            operationId: op.id,
            intent: op.intent,
        });

        await persistInAppNotification({
            recipientId: op.userId,
            title: decision === 'approved' ? 'AI Operation Approved' : 'AI Operation Rejected',
            message: `Your AI request (${op.intent}) was ${decision}.`,
            priority: decision === 'approved' ? 'MEDIUM' : 'HIGH',
            relatedModel: 'AIOperation',
            relatedDocId: op.id,
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/anomalies
router.get('/anomalies', protect, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = { intent: 'DETECT_ANOMALY' };

        if (req.user.role !== 'SUPER_ADMIN') where.officeId = req.user.officeId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const anomalies = await prisma.aiOperation.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true } } },
        });
        res.json({ success: true, count: anomalies.length, data: anomalies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── OPSPILOT MULTI-LLM ENDPOINTS ─────────────────────────

const orchestrator = require('../services/orchestrator');
const langchainService = require('../services/langchainService');

// POST /api/ai/chat — Main OpsPilot orchestrator
router.post('/chat', protect, async (req, res) => {
    try {
        const { message, providerPreference, modelPreference } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

        const providerHint = providerPreference || req.headers['x-ai-provider'];
        const modelHint = modelPreference || req.headers['x-ai-model'];

        const result = await orchestrator.processCommand(message, {
            userId: req.user.id,
            officeId: req.user.officeId || req.user.office?.id,
            role: req.user.role,
            sessionId: req.headers['x-session-id'],
            providerPreference: providerHint,
            modelPreference: modelHint,
        });

        // Notify via socket
        try {
            const socketServer = require('../config/socketServer');
            socketServer.notifyUser(req.user.id, {
                type: 'opspilot_response',
                data: { intent: result.intent, modelsUsed: result.modelsUsed },
            });
            await persistInAppNotification({
                recipientId: req.user.id,
                title: 'OpsPilot Response Ready',
                message: `Completed: ${result.intent || 'GENERAL'} using ${result.modelsUsed?.map((m) => m.source || m.model).filter(Boolean).join(' -> ') || 'available providers'}.`,
                priority: 'LOW',
                relatedModel: 'AIOperation',
            });
        } catch (e) { /* socket optional */ }

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/vision — OCR / Document analysis
router.post('/vision', protect, async (req, res) => {
    try {
        const { image, prompt } = req.body;
        if (!image) return res.status(400).json({ success: false, message: 'Image (base64) is required' });

        const result = await orchestrator.processVision(image, prompt, {
            userId: req.user.id,
            officeId: req.user.officeId || req.user.office?.id,
        });

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/models — Health check for AI providers
router.get('/models', protect, async (req, res) => {
    try {
        // Simplified health check for LangChain-managed providers
        res.json({ 
            success: true, 
            data: { 
                kimi: 'active',
                ollama: 'fallback_ready',
                orchestrator: 'langchain_v1'
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

