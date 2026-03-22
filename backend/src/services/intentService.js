const langchainService = require('./langchainService');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');

/**
 * Intent Extraction Service (Now powered by LangChain)
 */

const INTENT_SYSTEM_PROMPT = `You are an ERP intent extraction engine for CoreOps ERP system.
Extract the structured intent and entities from the user command.`;

/**
 * Extract intent from natural language text
 */
async function extractIntent(text, context = {}) {
    const startTime = Date.now();

    // Use LangChain for robust classification
    const result = await langchainService.classifyIntent(text, INTENT_SYSTEM_PROMPT);

    const durationMs = Date.now() - startTime;

    // Log the AI operation via Prisma
    let aiOp = null;
    try {
        aiOp = await prisma.aiOperation.create({
            data: {
                userId: context.userId,
                sessionId: context.sessionId || null,
                intent: result.intent || 'GENERAL',
                inputSummary: text.substring(0, 500),
                agentsUsed: ['langchain_intent_agent'],
                confidenceScore: result.confidence || 0,
                totalDurationMs: durationMs,
                status: 'AI_COMPLETED',
                officeId: context.officeId || null,
                explanation: {
                    entities: result.entities,
                    confidence: result.confidence,
                },
            },
        });
    } catch (err) {
        logger.error('Failed to log AI operation:', err.message);
    }

    return {
        ...result,
        aiOperationId: aiOp?.id,
        durationMs,
    };
}

/**
 * Classify urgency of a maintenance request from description
 */
async function classifyUrgency(description) {
    const prompt = `Classify the urgency of this maintenance request. Output JSON only.
    
Request: "${description}"

Output format:
{
  "priority": "low" | "medium" | "high" | "critical",
  "reasoning": "one sentence explanation",
  "confidence": 0.0 to 1.0
}`;

    const result = await aiService.generateJSON('validation', prompt, {
        temperature: 0.1,
        maxTokens: 200,
    });

    return result.parsed || { priority: 'medium', reasoning: 'Default classification', confidence: 0 };
}

module.exports = {
    extractIntent,
    classifyUrgency,
};
