/**
 * CoreOps Training Data Generator
 * 
 * Generates JSONL training data for fine-tuning the Qwen3-4B intent model.
 * Reads real ERP data from the database to create realistic examples.
 * 
 * Usage: node scripts/generate_training_data.js
 * Output: scripts/coreops_intent_train.jsonl
 */

const prisma = require('../src/config/prisma');
const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT = 'You are an ERP intent classifier for CoreOps. Output ONLY valid JSON: {"intent":"INTENT_NAME","entities":{...},"confidence":0.0-1.0}';

const VALID_INTENTS = [
    'CREATE_ASSET', 'UPDATE_ASSET', 'CREATE_TRANSACTION', 'REFILL_INVENTORY',
    'APPROVE_PURCHASE', 'REJECT_PURCHASE', 'CLOSE_MAINTENANCE', 'CREATE_TICKET',
    'GET_LOW_STOCK', 'GET_ASSET_STATS', 'SET_BUDGET', 'MATCH_INVOICE',
    'PROCESS_BILL', 'QUERY_DATA', 'DETECT_ANOMALY', 'FORECAST_BUDGET', 'GENERAL',
];

function makeExample(userMsg, intent, entities, confidence = 0.97) {
    return {
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMsg },
            { role: 'assistant', content: JSON.stringify({ intent, entities, confidence }) },
        ],
    };
}

async function generateAll() {
    const examples = [];

    // ── CREATE_ASSET variations ──
    const categories = ['LAPTOP', 'COMPUTER', 'PHONE', 'PRINTER', 'SERVER', 'NETWORK', 'FURNITURE', 'VEHICLE', 'EQUIPMENT', 'MACHINERY', 'OTHER'];
    const assetNames = {
        LAPTOP: ['MacBook Pro M3', 'ThinkPad X1 Carbon', 'Dell XPS 15', 'HP EliteBook 840'],
        COMPUTER: ['iMac 27"', 'Dell OptiPlex 7090', 'HP Z4 Workstation'],
        PHONE: ['iPhone 15 Pro', 'Samsung Galaxy S24', 'Google Pixel 8'],
        PRINTER: ['HP LaserJet Pro', 'Epson EcoTank L3250', 'Canon PIXMA'],
        SERVER: ['Dell PowerEdge R750', 'HPE ProLiant DL380', 'Server Rack Unit'],
        NETWORK: ['Cisco Catalyst Switch', 'Ubiquiti WiFi AP', 'Fortinet Firewall'],
        FURNITURE: ['Standing Desk', 'Ergonomic Chair', 'Filing Cabinet'],
        VEHICLE: ['Toyota Innova', 'Mahindra Thar', 'Delivery Van'],
        EQUIPMENT: ['Oscilloscope', 'Power Drill Set', 'Measuring Instruments'],
        MACHINERY: ['Industrial Generator', 'Air Compressor', 'CNC Machine'],
        OTHER: ['Conference Room Projector', 'Smart TV 55"', 'Portable AC'],
    };
    const prices = [1200, 5000, 15000, 25000, 50000, 100000, 250000];
    const templates = [
        (n, c, p) => `Create a new ${c.toLowerCase()} asset ${n} costing ${p}`,
        (n, c, p) => `Add ${n} worth ₹${p} to our assets`,
        (n, c, p) => `Register new asset: ${n}, price ${p}`,
        (n, c, p) => `I need to add a new ${n} asset costing $${p}`,
        (n, c, p) => `Can you create an asset for a ${n}? It costs ${p}`,
    ];
    for (const cat of categories) {
        const names = assetNames[cat] || ['Generic Item'];
        for (const name of names.slice(0, 2)) {
            const price = prices[Math.floor(Math.random() * prices.length)];
            const tmpl = templates[Math.floor(Math.random() * templates.length)];
            examples.push(makeExample(tmpl(name, cat, price), 'CREATE_ASSET', { assetName: name, assetCategory: cat, amount: price }));
        }
    }

    // ── CREATE_TRANSACTION ──
    const txExamples = [
        ['Record an expense of 15000 for office supplies', 'EXPENSE', 15000, 'Office Supplies', 'Supplies'],
        ['Add income of 500000 from client payment', 'INCOME', 500000, 'Client Payment', 'Revenue'],
        ['New expense: travel to Mumbai costing 25000', 'EXPENSE', 25000, 'Travel to Mumbai', 'Travel'],
        ['Record monthly rent expense of 75000', 'EXPENSE', 75000, 'Monthly Rent', 'Rent'],
        ['Add revenue of 180000 from product sales', 'INCOME', 180000, 'Product Sales', 'Sales'],
        ['Make a new expense for electricity bill 12000', 'EXPENSE', 12000, 'Electricity Bill', 'Utilities'],
        ['Record salary expense of 350000', 'EXPENSE', 350000, 'Salary Payment', 'Salary'],
        ['New income of 90000 from consulting fees', 'INCOME', 90000, 'Consulting Fees', 'Services'],
    ];
    for (const [msg, type, amt, desc, cat] of txExamples) {
        examples.push(makeExample(msg, 'CREATE_TRANSACTION', { type, amount: amt, description: desc, category: cat }));
    }

    // ── APPROVE/REJECT PO ──
    for (let i = 1; i <= 5; i++) {
        const poNum = `PO-2026-${String(i).padStart(4, '0')}`;
        examples.push(makeExample(`Approve purchase order ${poNum}`, 'APPROVE_PURCHASE', { poNumber: poNum }));
        examples.push(makeExample(`Please approve PO ${poNum}`, 'APPROVE_PURCHASE', { poNumber: poNum }));
        examples.push(makeExample(`Reject PO ${poNum}`, 'REJECT_PURCHASE', { poNumber: poNum }));
    }

    // ── CLOSE MAINTENANCE ──
    for (let i = 1; i <= 5; i++) {
        const ticketNum = `MT-${String(i).padStart(4, '0')}`;
        examples.push(makeExample(`Close maintenance ticket ${ticketNum}`, 'CLOSE_MAINTENANCE', { ticketId: ticketNum }));
        examples.push(makeExample(`Mark ticket ${ticketNum} as completed`, 'CLOSE_MAINTENANCE', { ticketId: ticketNum }));
    }

    // ── REFILL INVENTORY ──
    const refillItems = ['printer paper', 'toner cartridges', 'cleaning supplies', 'safety gloves', 'USB cables'];
    for (const item of refillItems) {
        const qty = [50, 100, 200][Math.floor(Math.random() * 3)];
        examples.push(makeExample(`Refill ${item} to ${qty} units`, 'REFILL_INVENTORY', { description: item, amount: qty }));
        examples.push(makeExample(`Restock ${item}`, 'REFILL_INVENTORY', { description: item }));
    }

    // ── CREATE TICKET ──
    const ticketIssues = [
        ['Laptop screen flickering', 'HIGH'],
        ['Printer not printing', 'MEDIUM'],
        ['Server room AC not working', 'CRITICAL'],
        ['Office chair broken armrest', 'LOW'],
        ['Network switch port failure', 'HIGH'],
    ];
    for (const [issue, priority] of ticketIssues) {
        examples.push(makeExample(`Report issue: ${issue}`, 'CREATE_TICKET', { description: issue, priority }));
        examples.push(makeExample(`Create maintenance ticket for ${issue}`, 'CREATE_TICKET', { description: issue, priority }));
    }

    // ── QUERY DATA ──
    const queries = [
        ['Show me budget summary for this month', { reportType: 'budget_summary' }],
        ['How many assets do we have?', { reportType: 'asset_count' }],
        ['List all pending purchase orders', { reportType: 'pending_pos' }],
        ['What are our inventory levels?', { reportType: 'inventory_levels' }],
        ['Show recent transactions', { reportType: 'recent_transactions' }],
        ['Give me an overview of maintenance tickets', { reportType: 'ticket_overview' }],
        ['What is our total asset value?', { reportType: 'asset_value' }],
        ['Show me expense breakdown', { reportType: 'expense_breakdown' }],
        ['How much have we spent this month?', { reportType: 'monthly_spending' }],
        ['List all active maintenance tickets', { reportType: 'active_tickets' }],
    ];
    for (const [msg, ent] of queries) {
        examples.push(makeExample(msg, 'QUERY_DATA', ent));
    }

    // ── DETECT ANOMALY ──
    const anomalyQueries = [
        'Are there any anomalies in our spending?',
        'Detect unusual transactions this week',
        'Any suspicious expense spikes?',
        'Check for irregular patterns in our data',
        'Find any budgetary anomalies',
    ];
    for (const q of anomalyQueries) {
        examples.push(makeExample(q, 'DETECT_ANOMALY', {}));
    }

    // ── GENERAL ──
    const generalQueries = [
        'Hello!', 'What can you do?', 'Help me with something',
        'Tell me about CoreOps', 'Who are you?', 'Thanks!',
        'Good morning', 'What features do you have?',
        "What's the weather today?", 'Tell me a joke',
    ];
    for (const q of generalQueries) {
        examples.push(makeExample(q, 'GENERAL', {}));
    }

    // ── Write JSONL ──
    const outputPath = path.join(__dirname, 'coreops_intent_train.jsonl');
    const lines = examples.map(e => JSON.stringify(e)).join('\n');
    fs.writeFileSync(outputPath, lines, 'utf-8');

    console.log(`\n✅ Generated ${examples.length} training examples`);
    console.log(`📄 Output: ${outputPath}`);
    console.log(`\nIntent distribution:`);
    const intentCounts = {};
    for (const ex of examples) {
        const intent = JSON.parse(ex.messages[2].content).intent;
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    }
    for (const [intent, count] of Object.entries(intentCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${intent}: ${count}`);
    }

    await prisma.$disconnect();
}

generateAll().catch(e => { console.error(e); process.exit(1); });
