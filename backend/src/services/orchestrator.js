/**
 * CoreOps Orchestrator v3 — "LLM Thinks, Code Executes"
 * 
 * Architecture:
 *   1. Local keyword classifier (sub-1ms, zero LLM calls)
 *   2. If ambiguous → LLM intent classifier (Kimi K2.5 → Kaggle → Ollama)
 *   3. Entity extraction + enum validation
 *   4. Hardcoded handler execution via agentExecutor
 *   5. For queries → LLM synthesis on live ERP snapshot
 * 
 * LLM Provider Priority: Kimi K2.5 (NVIDIA NIM) → Kaggle GPU (ngrok) → Ollama (local)
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
    { intent: 'LIST_ASSETS', keywords: ['list asset', 'show asset', 'all asset', 'my asset', 'view asset'] },
    { intent: 'LIST_VENDORS', keywords: ['list vendor', 'show vendor', 'all vendor', 'my vendor', 'view vendor'] },
    { intent: 'LIST_PURCHASE_ORDERS', keywords: ['list po', 'show po', 'pending po', 'all po', 'purchase order', 'list purchase', 'show purchase', 'pending purchase'] },
    { intent: 'LIST_TICKETS', keywords: ['list ticket', 'show ticket', 'open ticket', 'all ticket', 'active ticket', 'pending ticket', 'my ticket'] },
    { intent: 'LIST_INVENTORY', keywords: ['list inventory', 'show inventory', 'stock list', 'all inventory', 'inventory list', 'warehouse stock'] },
    { intent: 'LIST_TRANSACTIONS', keywords: ['list transaction', 'show transaction', 'recent transaction', 'all transaction', 'expense list', 'income list'] },
    { intent: 'DASHBOARD_SUMMARY', keywords: ['dashboard', 'system summary', 'erp summary', 'overall status', 'quick summary', 'system status'] },
    // ── v5: Full system intents ──
    { intent: 'CREATE_VENDOR', keywords: ['create vendor', 'add vendor', 'new vendor', 'register vendor', 'add supplier', 'new supplier'] },
    { intent: 'CREATE_PURCHASE_ORDER', keywords: ['create po', 'new po', 'create purchase order', 'new purchase order', 'raise po', 'raise purchase order'] },
    { intent: 'CREATE_INVENTORY', keywords: ['create inventory', 'add inventory', 'new inventory', 'add stock', 'new stock item', 'add item to inventory'] },
    { intent: 'VIEW_PROFIT_LOSS', keywords: ['profit and loss', 'profit loss', 'p&l', 'pnl', 'income statement', 'profit report'] },
    { intent: 'VIEW_CASH_FLOW', keywords: ['cash flow', 'cashflow', 'cash in', 'cash out', 'money flow'] },
    { intent: 'VIEW_BALANCE_SHEET', keywords: ['balance sheet', 'balancesheet', 'assets liabilities', 'net equity'] },
    { intent: 'LIST_GL_ACCOUNTS', keywords: ['chart of account', 'gl account', 'general ledger', 'ledger account', 'list gl', 'show gl'] },
    { intent: 'CREATE_GL_ACCOUNT', keywords: ['create gl', 'new gl account', 'add gl account', 'create ledger', 'add ledger account'] },
    { intent: 'VIEW_AUDIT_LOGS', keywords: ['audit log', 'audit trail', 'activity log', 'system log', 'recent activity', 'who did'] },
    { intent: 'LIST_NOTIFICATIONS', keywords: ['my notification', 'show notification', 'list notification', 'unread notification', 'bell', 'alerts'] },
    { intent: 'SEND_NOTIFICATION', keywords: ['send notification', 'broadcast', 'notify all', 'send alert', 'announce'] },
    { intent: 'LIST_OFFICES', keywords: ['list office', 'show office', 'all office', 'all branch', 'show branch', 'list branch', 'our offices', 'our branches'] },
    { intent: 'CREATE_OFFICE', keywords: ['create office', 'add office', 'new office', 'create branch', 'add branch', 'new branch'] },
    { intent: 'LIST_USERS', keywords: ['list user', 'show user', 'all user', 'team member', 'show team', 'employee list', 'all employee', 'show employee'] },
    { intent: 'VIEW_ANALYTICS', keywords: ['analytics', 'insight', 'kpi', 'metrics', 'performance', 'stats overview'] },
    { intent: 'LIST_DOCUMENTS', keywords: ['list document', 'show document', 'all document', 'my document', 'uploaded file', 'my files'] },
    { intent: 'VIEW_PROFILE', keywords: ['my profile', 'who am i', 'show profile', 'view profile', 'account info', 'my account'] },
    { intent: 'UPDATE_TICKET', keywords: ['update ticket', 'change ticket', 'edit ticket', 'modify ticket', 'ticket priority', 'ticket status'] },
    { intent: 'PREDICT_MAINTENANCE', keywords: ['predict maintenance', 'predict failure', 'when will it fail', 'failure prediction', 'predictive maintenance', 'mtbf', 'mean time between', 'asset risk', 'maintenance forecast', 'asset health'] },
    { intent: 'QUERY_DATA', keywords: ['show me', 'how many', 'what is', 'what are', 'budget status', 'budget summary', 'tell me about', 'give me', 'display', 'summarize', 'overview', 'report'] },
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

Valid intents: CREATE_ASSET, CREATE_TRANSACTION, REFILL_INVENTORY, APPROVE_PURCHASE, REJECT_PURCHASE, CLOSE_MAINTENANCE, CREATE_TICKET, UPDATE_ASSET, GET_LOW_STOCK, SET_BUDGET, MATCH_INVOICE, PROCESS_BILL, LIST_ASSETS, LIST_VENDORS, LIST_PURCHASE_ORDERS, LIST_TICKETS, LIST_INVENTORY, LIST_TRANSACTIONS, DASHBOARD_SUMMARY, CREATE_VENDOR, CREATE_PURCHASE_ORDER, CREATE_INVENTORY, VIEW_PROFIT_LOSS, VIEW_CASH_FLOW, VIEW_BALANCE_SHEET, LIST_GL_ACCOUNTS, CREATE_GL_ACCOUNT, VIEW_AUDIT_LOGS, LIST_NOTIFICATIONS, SEND_NOTIFICATION, LIST_OFFICES, CREATE_OFFICE, LIST_USERS, VIEW_ANALYTICS, LIST_DOCUMENTS, VIEW_PROFILE, UPDATE_TICKET, QUERY_DATA, DETECT_ANOMALY, FORECAST_BUDGET, GENERAL

Entity schemas per intent:
- CREATE_ASSET: { assetName, assetCategory (LAPTOP|COMPUTER|PHONE|PRINTER|SERVER|NETWORK|FURNITURE|VEHICLE|EQUIPMENT|MACHINERY|OTHER), amount, manufacturer, model, description, serialNumber, condition (GOOD|FAIR|POOR|NEW), warrantyMonths, vendorName, assignedTo }
  IMPORTANT: For CREATE_ASSET, you MUST fill as many fields as possible from context. If user says "MacBook Pro M3", set manufacturer="Apple", model="MacBook Pro M3", assetCategory="LAPTOP". If user says "fill by yourself" or "other details fill yourself", infer realistic values.
- CREATE_TRANSACTION: { type (INCOME|EXPENSE), amount, description, category }
- REFILL_INVENTORY: { description, amount }
- APPROVE_PURCHASE / REJECT_PURCHASE: { poNumber }
- CLOSE_MAINTENANCE: { ticketId, assetId }
- CREATE_TICKET: { assetId, description, priority (LOW|MEDIUM|HIGH|CRITICAL) }
- LIST_ASSETS / LIST_VENDORS / LIST_PURCHASE_ORDERS / LIST_TICKETS / LIST_INVENTORY / LIST_TRANSACTIONS: { limit, status }
- DASHBOARD_SUMMARY: {}
- CREATE_VENDOR: { vendorName, contactPerson, email, phone, address, gstNumber }
- CREATE_PURCHASE_ORDER: { vendorName, amount, description }
- CREATE_INVENTORY: { itemName, inventoryType (PRODUCT|SPARE), quantity, amount, unit }
- VIEW_PROFIT_LOSS / VIEW_CASH_FLOW / VIEW_BALANCE_SHEET: {}
- LIST_GL_ACCOUNTS: { limit }
- CREATE_GL_ACCOUNT: { accountName, accountType (ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE), accountCode }
- VIEW_AUDIT_LOGS: { limit }
- LIST_NOTIFICATIONS: { limit }
- SEND_NOTIFICATION: { title, notifMessage }
- LIST_OFFICES / LIST_USERS / LIST_DOCUMENTS: { limit }
- CREATE_OFFICE: { officeName, officeCode, city, state, country }
- VIEW_ANALYTICS / VIEW_PROFILE: {}
- UPDATE_TICKET: { ticketId, priority, status, description }
- QUERY_DATA: { reportType }
- GENERAL: {}

Output ONLY the JSON object, nothing else.`;

const QUERY_SYSTEM_PROMPT = `You are OpsPilot Analytics for CoreOps ERP.
You receive live ERP data and answer questions with precision.

Formatting Rules:
1. Always cite specific numbers from the data provided
2. Use ₹ for INR currency, format with commas (₹1,25,000)
3. Use markdown tables with proper | alignment when comparing 3+ items
4. Use **bold** for key values, names, and important numbers
5. Use emojis to indicate status: ✅ good, ⚠️ warning, 🔴 critical, 📊 data, 💰 money, 📦 inventory
6. Flag values >2x the average as unusual with ⚠️
7. Never fabricate data — if missing, say "data not available"
8. Keep answers concise and actionable
9. Do NOT use # or ## or ### headers — use **bold text** instead
10. Use bullet points (•) for lists, not dashes
11. Separate sections with a blank line for readability
12. End with a brief actionable recommendation when relevant`;

const CHAT_SYSTEM_PROMPT = `You are OpsPilot, the AI assistant for CoreOps ERP system.
You help manage assets, inventory, purchase orders, maintenance tickets, budgets, and transactions.

Formatting Rules:
1. Keep responses concise, warm, and professional
2. Use **bold** for emphasis, never use # headers
3. Use emojis naturally: 🖥️ assets, 📦 inventory, 📋 POs, 🔧 maintenance, 💰 budgets, 📊 analytics, ⚡ actions
4. Use bullet points (•) for lists
5. Use markdown tables only when showing structured data with 3+ rows
6. Format currency as ₹X,XX,XXX
7. Be action-oriented — tell users what you CAN DO, not just describe

Capabilities you can EXECUTE (not just describe):
• 🖥️ Create, update, list assets with smart auto-fill
• 📦 Create inventory items, refill low stock, check stock levels
• 📋 Create, list, approve, or reject purchase orders
• 🔧 Create, update, close, list maintenance tickets
• 💰 Set budgets, record transactions (income/expense)
• 📊 Analytics, anomaly detection, budget forecasts, KPIs
• 🔍 Search and query any ERP data
• 📄 Invoice matching, bill processing
• 🏢 Create & list vendors/suppliers
• 💹 Profit & Loss, Cash Flow, Balance Sheet reports
• 📒 Chart of Accounts — list & create GL accounts
• 🛡️ View audit logs and system activity
• 🔔 List & send notifications
• 🏗️ List & create offices/branches
• 👥 List users & team members
• 📄 List uploaded documents
• 👤 View your profile & account info

When listing capabilities, show them as actionable commands the user can try.`;

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

        // Extract asset name (heuristic: remove intent keywords and price, keep the product name)
        const nameClean = message
            .replace(/create|add|new|register|a\s+new|asset|for|costing|worth|priced?\s*at|at|of|\$|₹|[\d,]+(\.\d+)?/gi, '')
            .replace(/\b(active|inactive|today|date|today'?s?|on|and|other|details?|fill|by|yourself|all|the|with|please)\b/gi, '')
            .replace(/in the \w+ category/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (nameClean.length > 1) {
            entities.assetName = nameClean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        // Extract condition
        if (/\bnew\b/i.test(message) && /condition/i.test(message)) entities.condition = 'NEW';
        else if (/\bfair\b/i.test(message)) entities.condition = 'FAIR';
        else if (/\bpoor\b|\bdamaged\b/i.test(message)) entities.condition = 'POOR';

        // Extract warranty (e.g. "2 year warranty", "12 month warranty")
        const warrantyYrMatch = message.match(/(\d+)\s*(?:year|yr)s?\s*warranty/i);
        if (warrantyYrMatch) entities.warrantyMonths = parseInt(warrantyYrMatch[1]) * 12;
        const warrantyMoMatch = message.match(/(\d+)\s*months?\s*warranty/i);
        if (warrantyMoMatch) entities.warrantyMonths = parseInt(warrantyMoMatch[1]);

        // Extract manufacturer
        const mfgMatch = message.match(/(?:by|from|manufacturer|made by|brand)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/i);
        if (mfgMatch) entities.manufacturer = mfgMatch[1].trim();

        // Extract "assign to" / "assigned to"
        const assignMatch = message.match(/(?:assign(?:ed)?\s+to|for\s+user|for\s+employee)\s+([A-Za-z]+(?:\s[A-Za-z]+)?)/i);
        if (assignMatch) entities.assignedTo = assignMatch[1].trim();
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

    // ── v5: Entity extraction for new intents ──

    // Vendor name extraction
    if (intent === 'CREATE_VENDOR') {
        const vendorClean = message.replace(/create|add|new|register|vendor|supplier|named?|called?|please|a\s+new/gi, '').trim();
        if (vendorClean.length > 1) entities.vendorName = vendorClean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // PO creation — vendor name
    if (intent === 'CREATE_PURCHASE_ORDER') {
        const vendorRef = message.match(/(?:from|vendor|supplier|for)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:for|worth|costing|amount|$))/i);
        if (vendorRef) entities.vendorName = vendorRef[1].trim();
        const descMatch = message.match(/(?:for|of|about)\s+(.+?)(?:\s+(?:from|worth|costing|amount|$))/i);
        if (descMatch) entities.description = descMatch[1].trim();
    }

    // Inventory creation
    if (intent === 'CREATE_INVENTORY') {
        const itemClean = message.replace(/create|add|new|inventory|stock|item|to|please|a\s+new/gi, '').replace(/[\d,]+/g, '').trim();
        if (itemClean.length > 1) entities.itemName = itemClean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (/spare/i.test(message)) entities.inventoryType = 'SPARE';
        const qtyMatch = message.match(/(\d+)\s*(?:units?|pieces?|pcs|qty|quantity)/i);
        if (qtyMatch) entities.quantity = qtyMatch[1];
    }

    // GL Account creation
    if (intent === 'CREATE_GL_ACCOUNT') {
        const nameClean = message.replace(/create|add|new|gl|general\s+ledger|ledger|account|please|a\s+new/gi, '').trim();
        if (nameClean.length > 1) entities.accountName = nameClean;
        if (/asset/i.test(message)) entities.accountType = 'ASSET';
        else if (/liabilit/i.test(message)) entities.accountType = 'LIABILITY';
        else if (/equity/i.test(message)) entities.accountType = 'EQUITY';
        else if (/revenue|income/i.test(message)) entities.accountType = 'REVENUE';
        else if (/expense/i.test(message)) entities.accountType = 'EXPENSE';
    }

    // Office creation
    if (intent === 'CREATE_OFFICE') {
        const nameClean = message.replace(/create|add|new|office|branch|please|a\s+new/gi, '').trim();
        if (nameClean.length > 1) entities.officeName = nameClean;
        const cityMatch = message.match(/(?:in|at|city)\s+([A-Z][a-zA-Z]+)/i);
        if (cityMatch) entities.city = cityMatch[1];
    }

    // Update ticket — priority and status
    if (intent === 'UPDATE_TICKET') {
        if (/critical|emergency/i.test(message)) entities.priority = 'CRITICAL';
        else if (/high/i.test(message)) entities.priority = 'HIGH';
        else if (/\blow\b/i.test(message)) entities.priority = 'LOW';
        else if (/medium/i.test(message)) entities.priority = 'MEDIUM';

        if (/complet|done|finish|resolv/i.test(message)) entities.status = 'COMPLETED';
        else if (/progress|start|working/i.test(message)) entities.status = 'IN_PROGRESS';
    }

    // Notification sending
    if (intent === 'SEND_NOTIFICATION') {
        const titleMatch = message.match(/(?:title|subject)\s*[:=]?\s*(.+?)(?:\s*(?:message|body|$))/i);
        if (titleMatch) entities.title = titleMatch[1].trim();
        const msgMatch = message.match(/(?:message|body)\s*[:=]?\s*(.+)/i);
        if (msgMatch) entities.notifMessage = msgMatch[1].trim();
    }

    // Generic description extraction for any intent
    if (!entities.description) {
        const descMatch = message.match(/(?:description|about|for)\s+(.+?)(?:\s+(?:costing|worth|amount|from|with|$))/i);
        if (descMatch) entities.description = descMatch[1].trim();
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
            'LIST_ASSETS', 'LIST_VENDORS', 'LIST_PURCHASE_ORDERS', 'LIST_TICKETS',
            'LIST_INVENTORY', 'LIST_TRANSACTIONS', 'DASHBOARD_SUMMARY',
            // v5: full system coverage
            'CREATE_VENDOR', 'CREATE_PURCHASE_ORDER', 'CREATE_INVENTORY',
            'VIEW_PROFIT_LOSS', 'VIEW_CASH_FLOW', 'VIEW_BALANCE_SHEET',
            'LIST_GL_ACCOUNTS', 'CREATE_GL_ACCOUNT',
            'VIEW_AUDIT_LOGS', 'LIST_NOTIFICATIONS', 'SEND_NOTIFICATION',
            'LIST_OFFICES', 'CREATE_OFFICE', 'LIST_USERS',
            'VIEW_ANALYTICS', 'LIST_DOCUMENTS', 'VIEW_PROFILE', 'UPDATE_TICKET',
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

        const VALID_AI_INTENTS = [
            'CLOSE_MAINTENANCE', 'PROCESS_BILL', 'APPROVE_PURCHASE', 'REJECT_PURCHASE', 'GENERATE_REPORT',
            'QUERY_DATA', 'CREATE_TRANSACTION', 'DETECT_ANOMALY', 'EXTRACT_DOCUMENT', 'PREDICT_MAINTENANCE',
            'MATCH_INVOICE', 'FORECAST_BUDGET', 'CREATE_ASSET', 'REFILL_INVENTORY', 'GENERAL',
            'CREATE_TICKET', 'UPDATE_ASSET', 'GET_LOW_STOCK', 'GET_ASSET_STATS', 'SET_BUDGET',
            'LIST_ASSETS', 'LIST_VENDORS', 'LIST_PURCHASE_ORDERS', 'LIST_TICKETS', 'LIST_INVENTORY',
            'LIST_TRANSACTIONS', 'DASHBOARD_SUMMARY', 'CREATE_VENDOR', 'CREATE_PURCHASE_ORDER',
            'CREATE_INVENTORY', 'VIEW_PROFIT_LOSS', 'VIEW_CASH_FLOW', 'VIEW_BALANCE_SHEET',
            'LIST_GL_ACCOUNTS', 'CREATE_GL_ACCOUNT', 'VIEW_AUDIT_LOGS', 'LIST_NOTIFICATIONS',
            'SEND_NOTIFICATION', 'LIST_OFFICES', 'CREATE_OFFICE', 'LIST_USERS', 'VIEW_ANALYTICS',
            'LIST_DOCUMENTS', 'VIEW_PROFILE', 'UPDATE_TICKET', 'UPDATE_ASSET_STATUS',
        ];
        const logIntent = VALID_AI_INTENTS.includes(classification.intent) ? classification.intent : 'GENERAL';

        await prisma.aiOperation.create({
            data: {
                userId: context.userId,
                sessionId: context.sessionId || null,
                intent: logIntent,
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
