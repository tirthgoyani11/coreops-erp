const { z } = require('zod');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatOllama } = require('@langchain/ollama');
const logger = require('../utils/logger');

// ─── ZOD SCHEMAS for Structured Output ──────────────────────────────

const IntentSchema = z.object({
  intent: z.enum([
    'CREATE_ASSET', 'UPDATE_ASSET', 'REMOVE_ASSET', 'CREATE_TRANSACTION', 'REFILL_INVENTORY',
    'APPROVE_PURCHASE', 'REJECT_PURCHASE', 'CLOSE_MAINTENANCE', 'CREATE_TICKET',
    'GET_LOW_STOCK', 'GET_ASSET_STATS', 'SET_BUDGET', 'MATCH_INVOICE', 'PROCESS_BILL',
    'LIST_ASSETS', 'LIST_VENDORS', 'LIST_REQUISITIONS', 'LIST_RFQS', 'LIST_PURCHASE_ORDERS',
    'LIST_TICKETS', 'LIST_INVENTORY', 'LIST_TRANSACTIONS', 'DASHBOARD_SUMMARY',
    'CREATE_VENDOR', 'CREATE_PURCHASE_ORDER', 'CREATE_INVENTORY',
    'VIEW_PROFIT_LOSS', 'VIEW_CASH_FLOW', 'VIEW_BALANCE_SHEET',
    'LIST_GL_ACCOUNTS', 'CREATE_GL_ACCOUNT', 'VIEW_AUDIT_LOGS',
    'LIST_NOTIFICATIONS', 'SEND_NOTIFICATION', 'LIST_OFFICES', 'CREATE_OFFICE',
    'LIST_USERS', 'VIEW_ANALYTICS', 'LIST_DOCUMENTS', 'VIEW_PROFILE', 'UPDATE_TICKET',
    'QUERY_DATA', 'DETECT_ANOMALY', 'FORECAST_BUDGET', 'GENERAL'
  ]).describe('The core intent of the user request'),
  
  entities: z.object({
    // Assets
    assetId: z.string().describe("Asset ID or GUAI. Extract from history if the user refers to 'it', 'that', or a previously mentioned asset.").optional(),
    assetName: z.string().optional(),
    assetCategory: z.enum(['LAPTOP', 'COMPUTER', 'PHONE', 'PRINTER', 'SERVER', 'NETWORK', 'FURNITURE', 'VEHICLE', 'EQUIPMENT', 'MACHINERY', 'OTHER']).optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    condition: z.enum(['GOOD', 'FAIR', 'POOR', 'NEW']).optional(),
    warrantyMonths: z.number().optional(),
    assignedTo: z.string().optional(),
    
    // Financials / Transactions
    amount: z.number().optional(),
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    
    // Procurement
    poNumber: z.string().optional(),
    vendorName: z.string().optional(),
    
    // Tickets
    ticketId: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    status: z.string().optional(), // Generic status update
    
    // Inventory
    itemName: z.string().optional(),
    inventoryType: z.enum(['PRODUCT', 'SPARE']).optional(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    
    // GL Accounts
    accountName: z.string().optional(),
    accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']).optional(),
    accountCode: z.string().optional(),
    
    // Notifications / Messaging
    title: z.string().optional(),
    notifMessage: z.string().optional(),
    
    // Offices
    officeName: z.string().optional(),
    officeCode: z.string().optional(),
    city: z.string().optional(),
    
    // Queries
    reportType: z.string().optional(),
    limit: z.number().default(10).optional(),
  }).describe('The entities extracted from the command'),
  
  confidence: z.number().min(0).max(1).describe('The confidence score of the classification')
});

const { ChatPromptTemplate, HumanMessagePromptTemplate } = require('@langchain/core/prompts');
const { SystemMessage, HumanMessage, AIMessage } = require('@langchain/core/messages');

function convertHistoryToMessages(history) {
    if (!history || !Array.isArray(history)) return [];
    return history.map(([role, content]) => {
        if (role === 'user') return new HumanMessage(content);
        if (role === 'assistant') return new AIMessage(content);
        return new SystemMessage(content);
    });
}

// ─── MODEL INITIALIZATION with Fallbacks ──────────────────────────

function getModels(schema = null) {
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const nvidiaBase = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    
    // Primary: Kimi (via NVIDIA NIM)
    const kimiModel = new ChatOpenAI({
        apiKey: nvidiaKey,
        configuration: {
            baseURL: nvidiaBase,
        },
        modelName: process.env.KIMI_MODEL || 'moonshotai/kimi-k2-instruct',
        temperature: 0.1,
        maxTokens: 1024,
    });

    // Secondary: Local Ollama
    const ollamaModel = new ChatOllama({
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        model: process.env.AI_MODEL_INTENT || 'qwen2.5:1.5b',
        temperature: 0.1,
    });

    if (schema) {
        // Correct way to handle fallback with structured output:
        // Apply withStructuredOutput to EACH model FIRST, then define the fallback chain.
        const kimiStructured = kimiModel.withStructuredOutput(schema);
        const ollamaStructured = ollamaModel.withStructuredOutput(schema);
        return kimiStructured.withFallbacks([ollamaStructured]);
    }

    // Strategy: Fallback to locally hosted LLM if Kimi (API) is down
    return kimiModel.withFallbacks([ollamaModel]);
}

/**
 * Perform Intent and Entity extraction using LangChain
 * replaces Step 2 of the Orchestrator
 */
async function classifyIntent(userMessage, systemPrompt, history = []) {
    const structuredModel = getModels(IntentSchema);
    
    const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemPrompt),
        ...convertHistoryToMessages(history),
        HumanMessagePromptTemplate.fromTemplate('{input}')
    ]);

    const chain = prompt.pipe(structuredModel);
    
    try {
        const response = await chain.invoke({
            input: userMessage
        });
        return response;
    } catch (error) {
        logger.error('[LangChain] Classification failed:', error.message);
        console.error("RAW ERROR:", error);
        return { intent: 'GENERAL', entities: {}, confidence: 0 };
    }
}

/**
 * Perform RAG Synthesis or Data Analytics Query
 * replaces Step 4 of the Orchestrator
 */
async function synthesizeResponse(userMessage, systemPrompt, contextData, history = []) {
    const model = getModels(); 
    
    const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemPrompt),
        ...convertHistoryToMessages(history),
        HumanMessagePromptTemplate.fromTemplate('Recent ERP Snapshot:\n{context}\n\nUser Question: {input}')
    ]);

    const chain = prompt.pipe(model);
    
    try {
        const response = await chain.invoke({
            input: userMessage,
            context: JSON.stringify(contextData).substring(0, 5000)
        });
        return response.content;
    } catch (error) {
        logger.error('[LangChain] Synthesis failed:', error.message);
        return "I'm sorry, I couldn't analyze the data right now.";
    }
}

/**
 * Generic Chat (General small talk/fallback)
 */
async function chatResponse(userMessage, systemPrompt, history = []) {
    const model = getModels();
    
    const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemPrompt),
        ...convertHistoryToMessages(history),
        HumanMessagePromptTemplate.fromTemplate('{input}')
    ]);

    const chain = prompt.pipe(model);
    
    try {
        const response = await chain.invoke({ input: userMessage });
        return response.content;
    } catch (error) {
        logger.error('[LangChain] Chat failed:', error.message);
        return "I'm OpsPilot, how can I help?";
    }
}



/**
 * Perform Vision / OCR analysis
 */
async function processVision(imageBase64, promptText) {
    const { modelWithFallback } = getModels();
    
    // Some models (like Kimi/NVIDIA) support multi-modal inputs via OpenAI format
    const message = new HumanMessage({
        content: [
            { type: "text", text: promptText || "Analyze this image for CoreOps ERP and extract relevant details." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
    });

    try {
        const response = await modelWithFallback.invoke([message]);
        return { text: response.content, source: 'langchain-vision' };
    } catch (error) {
        logger.error('[LangChain] Vision failed:', error.message);
        return { text: "I couldn't process the image right now.", error: error.message };
    }
}

module.exports = {
    IntentSchema,
    classifyIntent,
    synthesizeResponse,
    chatResponse,
    processVision
};
