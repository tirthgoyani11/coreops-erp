const aiService = require('./aiService');
const AiOperation = require('../models/AiOperation');
const logger = require('../utils/logger');

/**
 * Intent Extraction Service
 * 
 * Extracts structured intent from natural language input.
 * Uses Ollama (qwen2.5:3b) with JSON-enforced output.
 * 
 * Input:  "Close the AC-102 maintenance ticket, the bill was 4800 rupees"
 * Output: { intent: "CLOSE_MAINTENANCE", entities: { assetId: "AC-102", amount: 4800 }, confidence: 0.94 }
 */

const INTENT_SYSTEM_PROMPT = `You are an ERP intent extraction engine for CoreOps ERP system.

Given a natural language command, extract the structured intent.

Valid intents:
- CLOSE_MAINTENANCE: Close/complete a maintenance ticket
- PROCESS_BILL: Process a repair or vendor bill
- APPROVE_PURCHASE: Approve a purchase order
- REJECT_PURCHASE: Reject a purchase order
- GENERATE_REPORT: Generate a financial or analytics report
- QUERY_DATA: Query data or ask a question about the system
- CREATE_TRANSACTION: Record a financial transaction
- DETECT_ANOMALY: Check for anomalies in data
- EXTRACT_DOCUMENT: Extract data from an uploaded document
- PREDICT_MAINTENANCE: Predict maintenance needs
- MATCH_INVOICE: Match invoice to PO and GRN
- FORECAST_BUDGET: Forecast budget or expenses
- GENERAL: General command that doesn't fit other categories

Output ONLY valid JSON with this exact structure:
{
  "intent": "INTENT_NAME",
  "entities": {
    "assetId": "string or null",
    "ticketId": "string or null", 
    "vendorName": "string or null",
    "amount": "number or null",
    "currency": "string, default INR",
    "dateRange": { "start": "ISO date or null", "end": "ISO date or null" },
    "officeLocation": "string or null",
    "reportType": "string or null",
    "additionalContext": "string or null"
  },
  "confidence": 0.0 to 1.0
}`;

/**
 * Extract intent from natural language text
 * @param {string} text - User's natural language input
 * @param {Object} context - { userId, officeId, sessionId }
 * @returns {Object} { intent, entities, confidence, aiOperationId }
 */
async function extractIntent(text, context = {}) {
    const startTime = Date.now();

    const result = await aiService.generateJSON('intent', text, {
        systemPrompt: INTENT_SYSTEM_PROMPT,
        temperature: 0.1, // Low temp for deterministic extraction
        maxTokens: 512,
    });

    const durationMs = Date.now() - startTime;

    // Default fallback if AI fails
    const defaultResult = {
        intent: 'GENERAL',
        entities: {},
        confidence: 0,
    };

    const parsed = result.parsed || defaultResult;

    // Log the AI operation
    const aiOp = await AiOperation.log({
        userId: context.userId,
        sessionId: context.sessionId,
        intent: parsed.intent || 'GENERAL',
        inputSummary: text.substring(0, 500),
        agentsUsed: ['intent_agent'],
        confidenceScore: parsed.confidence || 0,
        totalDurationMs: durationMs,
        status: result.error ? 'failed' : 'completed',
        officeId: context.officeId,
        explanation: {
            model: result.model,
            tokensGenerated: result.tokensGenerated,
            rawOutput: result.raw,
        },
    });

    return {
        ...parsed,
        aiOperationId: aiOp?._id,
        model: result.model,
        durationMs,
    };
}

/**
 * Classify urgency of a maintenance request from description
 * @param {string} description - Issue description
 * @returns {Object} { priority, reasoning, confidence }
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
