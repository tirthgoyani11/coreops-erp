/**
 * CoreOps Orchestrator v3 — "LLM Thinks, Code Executes"
 * 
 * Architecture:
 *   1. Local keyword classifier (sub-1ms, zero LLM calls)
 *   2. If ambiguous → LLM intent classifier (Kaggle/Ollama)
 *   3. Entity extraction + enum validation
 *   4. Hardcoded handler execution via agentExecutor
 *   5. For queries → LLM synthesis on live ERP snapshot
 * 
 * NEVER lets the LLM generate Prisma/SQL. All DB ops are in agentExecutor.
 */

const kaggleService = require('./kaggleInferenceService');
const agentExecutor = require('./agentExecutor');
const logger = require('../utils/logger');
const prisma = require('../config/prisma');

// ─── INTENT PATTERN MAP (sub-1ms local classification) ──────────
const INTENT_PATTERNS = [
    { intent: 'CREATE_ASSET', keywords: ['create asset', 'add asset', 'new asset', 'register asset', 'register this', 'bought a new', 'add a new', 'create a new'] },
    { intent: 'UPDATE_ASSET', keywords: ['update asset', 'edit asset', 'modify asset', 'change asset'] },
    { intent: 'CREATE_TRANSACTION', keywords: ['create transaction', 'new transaction', 'add transaction', 'record expense', 'record income', 'new expense', 'new income', 'add expense', 'add income', 'make expense', 'make income'] },
    { intent: 'REFILL_INVENTORY', keywords: ['refill', 'restock', 'reorder stock', 'replenish', 'low stock refill', 'order more'] },
    { intent: 'APPROVE_PURCHASE', keywords: ['approve po', 'approve purchase', 'approve order', 'accept po', 'approve purch'] },
    { intent: 'REJECT_PURCHASE', keywords: ['reject po', 'reject purchase', 'reject order', 'cancel po', 'deny po'] },
    { intent: 'CLOSE_MAINTENANCE', keywords: ['close ticket', 'complete ticket', 'resolve ticket', 'finish ticket', 'close maintenance'] },
    { intent: 'CREATE_TICKET', keywords: ['create ticket', 'new ticket', 'raise ticket', 'report issue', 'maintenance request'] },
    { intent: 'GET_LOW_STOCK', keywords: ['low stock', 'stock alert', 'out of stock', 'inventory alert'] },
    { intent: 'GET_ASSET_STATS', keywords: ['asset stats', 'asset summary', 'asset overview', 'how many asset'] },
    { intent: 'SET_BUDGET', keywords: ['set budget', 'update budget', 'change budget', 'budget limit'] },
    { intent: 'MATCH_INVOICE', keywords: ['match invoice', 'invoice match', 'three way match', '3-way match'] },
    { intent: 'PROCESS_BILL', keywords: ['process bill', 'pay bill', 'vendor bill', 'bill payment'] },
    { intent: 'DETECT_ANOMALY', keywords: ['anomaly', 'anomalies', 'unusual', 'suspicious', 'spike', 'irregular'] },
    { intent: 'FORECAST_BUDGET', keywords: ['forecast', 'predict budget', 'budget forecast', 'spending forecast'] },
    { intent: 'QUERY_DATA', keywords: ['show me', 'list all', 'how many', 'what is', 'what are', 'budget status', 'budget summary', 'tell me about', 'give me', 'display', 'summarize', 'overview', 'report'] },
];

// ─── ENUM VALIDATION MAPS ───────────────────────────────────────
const CATEGORY_MAP = {
    'laptop': 'LAPTOP', 'macbook': 'LAPTOP', 'notebook': 'LAPTOP', 'thinkpad': 'LAPTOP',
    'computer': 'COMPUTER', 'desktop': 'COMPUTER', 'pc': 'COMPUTER', 'workstation': 'COMPUTER', 'imac': 'COMPUTER',
    'phone': 'PHONE', 'iphone': 'PHONE', 'mobile': 'PHONE', 'smartphone': 'PHONE', 'android': 'PHONE',
    'printer': 'PRINTER', 'scanner': 'PRINTER', 'copier': 'PRINTER', 'mfp': 'PRINTER',
    'server': 'SERVER', 'rack': 'SERVER', 'blade': 'SERVER', 'nas': 'SERVER',
    'router': 'NETWORK', 'switch': 'NETWORK', 'firewall': 'NETWORK', 'access point': 'NETWORK', 'wifi': 'NETWORK', 'modem': 'NETWORK',
    'furniture': 'FURNITURE', 'desk': 'FURNITURE', 'chair': 'FURNITURE', 'table': 'FURNITURE', 'cabinet': 'FURNITURE',
    'vehicle': 'VEHICLE', 'car': 'VEHICLE', 'truck': 'VEHICLE', 'van': 'VEHICLE', 'bike': 'VEHICLE',
    'equipment': 'EQUIPMENT', 'tool': 'EQUIPMENT', 'instrument': 'EQUIPMENT',
    'machinery': 'MACHINERY', 'machine': 'MACHINERY', 'generator': 'MACHINERY', 'compressor': 'MACHINERY',
};

const VALID_CATEGORIES = ['LAPTOP', 'COMPUTER', 'FURNITURE', 'VEHICLE', 'EQUIPMENT', 'PHONE', 'PRINTER', 'SERVER', 'NETWORK', 'MACHINERY', 'OTHER'];
const VALID_TX_TYPES = ['INCOME', 'EXPENSE'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// ─── SYSTEM PROMPTS ─────────────────────────────────────────────
const INTENT_SYSTEM_PROMPT = `You are OpsPilot, the AI intent classifier for CoreOps ERP.
Given a user command, output ONLY valid JSON with this exact schema:
{"intent":"INTENT_NAME","entities":{...},"confidence":0.0-1.0}

Valid intents: CREATE_ASSET, CREATE_TRANSACTION, REFILL_INVENTORY, APPROVE_PURCHASE, REJECT_PURCHASE, CLOSE_MAINTENANCE, CREATE_TICKET, UPDATE_ASSET, GET_LOW_STOCK, SET_BUDGET, MATCH_INVOICE, PROCESS_BILL, QUERY_DATA, DETECT_ANOMALY, FORECAST_BUDGET, GENERAL

Entity schemas per intent:
- CREATE_ASSET: { assetName, assetCategory (LAPTOP|COMPUTER|PHONE|PRINTER|SERVER|NETWORK|FURNITURE|VEHICLE|EQUIPMENT|MACHINERY|OTHER), amount }
- CREATE_TRANSACTION: { type (INCOME|EXPENSE), amount, description, category }
- REFILL_INVENTORY: { description, amount }
- APPROVE_PURCHASE / REJECT_PURCHASE: { poNumber }
- CLOSE_MAINTENANCE: { ticketId }
- CREATE_TICKET: { assetId, description, priority (LOW|MEDIUM|HIGH|CRITICAL) }
- QUERY_DATA: { reportType }
- GENERAL: {}

Output ONLY the JSON object, nothing else.`;

const QUERY_SYSTEM_PROMPT = `You are OpsPilot Analytics for CoreOps ERP.
You receive live ERP data and answer questions with precision.

Rules:
1. Always cite specific numbers from the data provided
2. Use ₹ for INR currency formatting
3. Use markdown tables when comparing items
4. Flag values >2x the average as unusual
5. Never fabricate data — if missing, say "data not available"
6. Keep answers concise and actionable
7. Format numbers with commas (e.g., ₹1,25,000)`;

const CHAT_SYSTEM_PROMPT = `You are OpsPilot, the AI assistant for CoreOps ERP system.
You help manage assets, inventory, purchase orders, maintenance tickets, budgets, and transactions.
Keep responses concise and professional. Use markdown formatting.
If the user asks about capabilities, list: asset management, inventory control, PO approval/rejection,
maintenance ticket handling, budget tracking, transaction recording, anomaly detection, and data queries.`;

// ─── LOCAL INTENT CLASSIFIER ────────────────────────────────────
function classifyLocally(message) {
    const lower = message.toLowerCase().trim();

    for (const pattern of INTENT_PATTERNS) {
        for (const keyword of pattern.keywords) {
            if (lower.includes(keyword)) {
                return { intent: pattern.intent, confidence: 0.90, source: 'local' };
            }
        }
    }

    return null; // Ambiguous → needs LLM
}

// ─── ENTITY EXTRACTION (deterministic) ──────────────────────────
function extractEntities(message, intent) {
    const entities = {};

    // Extract amount/price (handles $, ₹, commas)
    const amountMatch = message.match(/(?:[\$₹]?\s*)([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|rupees?|inr|usd)?/i);
    if (amountMatch) {
        entities.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // Extract PO number
    const poMatch = message.match(/PO[-\s]?\d+[-\s]?\d*/i) || message.match(/purchase\s+order\s+(?:#?\s*)(\S+)/i);
    if (poMatch) {
        entities.poNumber = poMatch[0].replace(/^purchase\s+order\s+#?\s*/i, '');
    }

    // Extract ticket ID
    const ticketMatch = message.match(/(?:MT|TK|ticket)[-\s]?\d+/i) || message.match(/ticket\s+(?:#?\s*)(\S+)/i);
    if (ticketMatch) {
        entities.ticketId = ticketMatch[0].replace(/^ticket\s+#?\s*/i, '');
    }

    // Extract asset category
    if (intent === 'CREATE_ASSET' || intent === 'UPDATE_ASSET') {
        const lower = message.toLowerCase();
        for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
            if (lower.includes(keyword)) {
                entities.assetCategory = category;
                break;
            }
        }
        if (!entities.assetCategory) {
            entities.assetCategory = 'OTHER';
        }

        // Extract asset name (heuristic: remove intent keywords and price, keep the rest)
        const nameClean = message
            .replace(/create|add|new|register|a\s+new|asset|for|costing|worth|priced?\s*at|at|of|\$|₹|[\d,]+(\.\d+)?/gi, '')
            .replace(/\b(active|inactive|laptop|computer|phone|printer|server|network|furniture|vehicle|equipment|machinery|other)\b/gi, '')
            .replace(/in the \w+ category/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (nameClean.length > 1) {
            entities.assetName = nameClean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
    }

    // Extract transaction type
    if (intent === 'CREATE_TRANSACTION' || intent === 'PROCESS_BILL') {
        entities.type = /income|revenue|earning|receipt/i.test(message) ? 'INCOME' : 'EXPENSE';
        const descMatch = message.match(/(?:for|of|about|description:?)\s+(.+?)(?:\s+(?:costing|worth|amount|of|for)\s+|$)/i);
        if (descMatch) entities.description = descMatch[1].trim();
    }

    // Extract priority
    if (intent === 'CREATE_TICKET') {
        if (/critical|emergency|urgent/i.test(message)) entities.priority = 'CRITICAL';
        else if (/high/i.test(message)) entities.priority = 'HIGH';
        else if (/low/i.test(message)) entities.priority = 'LOW';
        else entities.priority = 'MEDIUM';
    }

    // Refill inventory — extract item description
    if (intent === 'REFILL_INVENTORY') {
        const itemMatch = message.replace(/refill|restock|reorder|replenish|stock|to|units?|pieces?|[\d,]+/gi, '').trim();
        if (itemMatch.length > 1) entities.description = itemMatch;
    }

    return entities;
}

// ─── JSON EXTRACTION FROM LLM OUTPUT ────────────────────────────
function extractJSON(text) {
    if (!text) return null;

    // Strip <think>...</think> blocks
    const thinkEnd = text.indexOf('</think>');
    if (thinkEnd !== -1) {
        text = text.substring(thinkEnd + 8).trim();
    }
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Try multiple extraction strategies
    const strategies = [
        (t) => JSON.parse(t),
        (t) => JSON.parse(t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]),
        (t) => JSON.parse(t.match(/(\{[\s\S]*\})/)?.[1]),
    ];

    for (const fn of strategies) {
        try {
            const parsed = fn(text);
            if (parsed && typeof parsed === 'object') {
                // Ensure minimum schema
                if (!parsed.intent) parsed.intent = 'GENERAL';
                if (!parsed.entities) parsed.entities = {};
                if (!parsed.confidence) parsed.confidence = 0.5;
                return parsed;
            }
        } catch { }
    }

    return null;
}

// ─── CHAT MEMORY (success-only, hygiene-first) ──────────────────
async function getChatMemory(userId, sessionId) {
    if (!sessionId) return '';
    try {
        const ops = await prisma.aiOperation.findMany({
            where: { sessionId, userId, status: 'AI_COMPLETED' }, // SUCCESS ONLY
            orderBy: { createdAt: 'desc' },
            take: 3,
        });
        if (ops.length === 0) return '';

        let mem = '\n--- RECENT HISTORY ---\n';
        for (const op of ops.reverse()) {
            if (op.inputSummary) mem += `User: ${op.inputSummary}\n`;
            if (op.explanation?.output) mem += `OpsPilot: ${String(op.explanation.output).substring(0, 200)}\n`;
        }
        return mem + '----------------------\n';
    } catch {
        return '';
    }
}

// ─── MAIN ORCHESTRATOR ENTRY POINT ──────────────────────────────
async function processCommand(userMessage, context = {}) {
    const startTime = Date.now();
    const modelsUsed = [];
    const actions = [];

    try {
        // ── Step 1: Local keyword classification (sub-1ms) ──
        let classification = classifyLocally(userMessage);
        let entities = {};

        if (classification) {
            modelsUsed.push({ model: 'local-classifier', source: 'local' });
            entities = extractEntities(userMessage, classification.intent);
            logger.info(`[Orchestrator] Local hit: ${classification.intent} (${classification.confidence})`);
        } else {
            // ── Step 2: LLM classification (Kaggle → Ollama → fallback) ──
            logger.info('[Orchestrator] Ambiguous intent → calling LLM classifier...');
            const llmResult = await kaggleService.intent(userMessage, INTENT_SYSTEM_PROMPT);
            modelsUsed.push({ model: 'intent-llm', source: llmResult.source });

            const parsed = llmResult.parsed || extractJSON(llmResult.text);
            if (parsed && parsed.intent) {
                classification = { intent: parsed.intent, confidence: parsed.confidence || 0.7, source: 'llm' };
                entities = { ...extractEntities(userMessage, parsed.intent), ...(parsed.entities || {}) };
            } else {
                classification = { intent: 'GENERAL', confidence: 0.5, source: 'fallback' };
            }
            logger.info(`[Orchestrator] LLM classified: ${classification.intent} (${classification.confidence})`);
        }

        // ── Step 3: Validate extracted entities ──
        if (entities.assetCategory && !VALID_CATEGORIES.includes(entities.assetCategory)) {
            entities.assetCategory = CATEGORY_MAP[entities.assetCategory?.toLowerCase()] || 'OTHER';
        }
        if (entities.type && !VALID_TX_TYPES.includes(entities.type)) {
            entities.type = 'EXPENSE';
        }
        if (entities.priority && !VALID_PRIORITIES.includes(entities.priority)) {
            entities.priority = 'MEDIUM';
        }

        let finalResponse = '';

        // ── Step 4: Route to correct handler ──
        const actionIntents = [
            'CREATE_ASSET', 'UPDATE_ASSET', 'CREATE_TRANSACTION', 'REFILL_INVENTORY',
            'APPROVE_PURCHASE', 'REJECT_PURCHASE', 'CLOSE_MAINTENANCE', 'CREATE_TICKET',
            'GET_LOW_STOCK', 'GET_ASSET_STATS', 'SET_BUDGET', 'MATCH_INVOICE', 'PROCESS_BILL',
        ];

        if (actionIntents.includes(classification.intent)) {
            // ACTION → Execute deterministically, ZERO LLM calls
            const execResult = await agentExecutor.execute(classification.intent, entities, context);
            if (execResult && execResult.success) {
                finalResponse = execResult.message;
                actions.push(execResult);
            } else {
                finalResponse = `❌ ${execResult?.message || 'Action failed. Please try rephrasing.'}`;
            }

        } else if (['QUERY_DATA', 'DETECT_ANOMALY', 'FORECAST_BUDGET', 'GENERATE_REPORT', 'PREDICT_MAINTENANCE'].includes(classification.intent)) {
            // QUERY → Fetch snapshot + LLM synthesis
            const snapshot = await agentExecutor.fetchContextData(classification.intent, entities, context);
            const memory = await getChatMemory(context.userId, context.sessionId);
            const snapshotStr = JSON.stringify(snapshot).substring(0, 4000);

            const queryPrompt = `${memory}\n--- ERP LIVE DATA ---\n${snapshotStr}\n---------------------\n\nUser Question: ${userMessage}\n\nProvide a clear, data-driven answer.`;

            const llmResult = await kaggleService.reasoning(queryPrompt, {
                systemPrompt: QUERY_SYSTEM_PROMPT,
                temperature: 0.3,
            });
            modelsUsed.push({ model: 'reasoning', source: llmResult.source });
            finalResponse = llmResult.text || 'I could not generate an analysis. Please try a more specific question.';

        } else {
            // GENERAL → LLM chat
            const memory = await getChatMemory(context.userId, context.sessionId);
            const chatPrompt = memory ? `${memory}\nUser: ${userMessage}` : userMessage;

            const llmResult = await kaggleService.chat(chatPrompt, {
                systemPrompt: CHAT_SYSTEM_PROMPT,
                temperature: 0.7,
            });
            modelsUsed.push({ model: 'chat', source: llmResult.source });
            finalResponse = llmResult.text || "I'm OpsPilot, your ERP assistant. I can help with assets, inventory, POs, tickets, budgets, and transactions. What do you need?";
        }

        // ── Step 5: Log operation (success only for clean memory) ──
        const durationMs = Date.now() - startTime;

        await prisma.aiOperation.create({
            data: {
                userId: context.userId,
                sessionId: context.sessionId || null,
                intent: classification.intent || 'GENERAL',
                inputSummary: userMessage.substring(0, 500),
                agentsUsed: modelsUsed.map(m => m.model),
                confidenceScore: classification.confidence || 0,
                totalDurationMs: durationMs,
                status: actions.length > 0 && actions[0].success ? 'AI_COMPLETED' : (finalResponse.startsWith('❌') ? 'AI_FAILED' : 'AI_COMPLETED'),
                officeId: context.officeId || null,
                explanation: {
                    modelsUsed,
                    classification,
                    entities,
                    output: finalResponse.substring(0, 1000),
                },
            },
        }).catch(e => logger.error('AiOperation log fail: ' + e.message));

        return {
            response: finalResponse,
            intent: classification.intent || 'GENERAL',
            confidence: classification.confidence || 0,
            modelsUsed,
            actions,
            durationMs,
        };

    } catch (error) {
        logger.error('[Orchestrator] Fatal error:', error.message);
        return {
            response: `Sorry, an internal error occurred: ${error.message}`,
            intent: 'ERROR',
            confidence: 0,
            modelsUsed,
            actions: [],
            durationMs: Date.now() - startTime,
        };
    }
}

// ─── VISION (unchanged) ─────────────────────────────────────────
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
