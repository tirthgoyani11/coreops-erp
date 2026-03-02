/**
 * CoreOps Orchestrator - Intent-Based Tool Calling Agent
 */
const kaggleService = require('./kaggleInferenceService');
const agentExecutor = require('./agentExecutor');
const logger = require('../utils/logger');
const prisma = require('../config/prisma');

const SYSTEM_PROMPT = `You are OpsPilot, the AI assistant for CoreOps ERP.
You help users manage assets, inventory, POs, and maintenance tickets.

AVAILABLE TOOLS:
1. CREATE_ASSET: Creates a new physical asset or software license.
   - arguments: { assetName: string, assetCategory: string, amount: number }
2. REFILL_INVENTORY: Orders more stock for low inventory items.
   - arguments: { description: string, amount: number }
3. DETECT_ANOMALY: Finds unusual transactions or spikes.
   - arguments: {}
4. QUERY_DATA: General questions about the business data.
   - arguments: {}
5. GENERAL: General conversation or unknown requests.

INSTRUCTIONS:
Analyze the user's prompt and decide which tool to call.
You MUST output ONLY valid JSON in this exact format:
\`\`\`json
{
  "intent": "CREATE_ASSET",
  "entities": {
    "assetName": "MacBook Air M3",
    "assetCategory": "LAPTOP",
    "amount": 1200
  },
  "response": "Understood, creating the asset now..."
}
\`\`\`
Only use the tools listed above. If none match, use intent "GENERAL".`;

function extractJSON(text) {
    if (!text) return null;
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    try {
        if (match) return JSON.parse(match[1]);
        const clean = text.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
        return JSON.parse(clean);
    } catch {
        return null;
    }
}

async function getChatMemory(userId, sessionId) {
    if (!sessionId) return "";
    const ops = await prisma.aiOperation.findMany({
        where: { sessionId, userId },
        orderBy: { createdAt: 'desc' },
        take: 3
    });
    if (ops.length === 0) return "";

    let mem = "\\n--- RECENT CONVERSATION HISTORY ---\\n";
    for (const op of ops.reverse()) {
        if (op.inputSummary) mem += `User: ${op.inputSummary}\\n`;
        if (op.explanation?.output) mem += `OpsPilot: ${op.explanation.output}\\n`;
    }
    return mem + "--------------------------------------\\n";
}

async function processCommand(userMessage, context = {}) {
    const startTime = Date.now();
    const modelsUsed = [];
    let actions = [];

    try {
        logger.info("[Orchestrator] Contacting AI for Tool Selection...");

        // Fetch universal snapshot context natively
        const snapshot = await agentExecutor.fetchContextData('QUERY_DATA', {}, context);
        const memory = await getChatMemory(context.userId, context.sessionId);

        const promptContext = `\n\n${memory}\n--- ERP LIVE DATA SNAPSHOT ---\n${JSON.stringify(snapshot).substring(0, 3000)}\n------------------------------\n\nCurrent User Prompt: ` + userMessage;

        let result1 = await kaggleService.reasoning(promptContext, { systemPrompt: SYSTEM_PROMPT, temperature: 0.1 });
        modelsUsed.push({ model: 'reasoning', source: result1.source });

        let parsed = extractJSON(result1.text);

        if (!parsed) {
            logger.warn("[Orchestrator] Failed to parse JSON. Falling back to GENERAL intent.");
            parsed = { intent: "GENERAL", entities: {}, response: result1.text.replace(/<think>[\s\S]*?<\/think>/i, '').trim() };
        }

        let finalResponse = parsed.response || result1.text;

        // If it's an action intent, execute it via the rigid hardcoded AgentExecutor
        if (parsed.intent !== "GENERAL" && parsed.intent !== "QUERY_DATA") {
            const execResult = await agentExecutor.execute(parsed.intent, parsed.entities || {}, context);
            if (execResult && execResult.success) {
                finalResponse = execResult.message;
                actions.push(execResult);
            } else if (execResult) {
                finalResponse = `❌ Failed to execute action: ${execResult.message}`;
            }
        }

        const durationMs = Date.now() - startTime;

        await prisma.aiOperation.create({
            data: {
                userId: context.userId,
                sessionId: context.sessionId || null,
                intent: parsed.intent || 'GENERAL',
                inputSummary: userMessage.substring(0, 500),
                agentsUsed: modelsUsed.map(m => m.model),
                confidenceScore: 0.95,
                totalDurationMs: durationMs,
                status: 'AI_COMPLETED',
                officeId: context.officeId || null,
                explanation: { modelsUsed, parsed, output: finalResponse.substring(0, 1000) }
            }
        }).catch(e => logger.error("Log fail: " + e.message));

        return { response: finalResponse, intent: parsed.intent || 'GENERAL', confidence: 1.0, modelsUsed, actions, durationMs };

    } catch (error) {
        logger.error('[Orchestrator] Error:', error.message);
        return {
            response: `Sorry, an internal error occurred: ${error.message}`,
            intent: 'ERROR', confidence: 0, modelsUsed, actions: [], durationMs: Date.now() - startTime,
        };
    }
}

async function processVision(imageBase64, prompt, context = {}) {
    const startTime = Date.now();
    try {
        const result = await kaggleService.vision(imageBase64, prompt);
        return { response: result.text, model: 'vision', source: result.source, durationMs: Date.now() - startTime };
    } catch (error) {
        return { response: null, error: error.message, durationMs: Date.now() - startTime };
    }
}

module.exports = { processCommand, processVision };
