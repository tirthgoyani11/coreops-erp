/**
 * Agent Executor — Executes ERP Operations from AI Intent
 * 
 * Maps intents to actual database operations.
 * Has access to ALL ERP modules.
 */

const prisma = require('../config/prisma');
const logger = require('../utils/logger');

// ─── Secret Field Sanitizer ──────────────────────────────────────
// Strips sensitive fields from any object/array before showing to AI/user.
// This lets handlers use `findUnique()` WITHOUT a `select`, grabbing all
// fields, then calling sanitize() to remove secrets. No more schema errors!
const SENSITIVE_KEYS = new Set([
    'password', 'passwordHash', 'refreshToken', 'refreshTokens',
    'passwordResetToken', 'passwordResetExpires',
    'inviteToken', 'inviteTokenExpires',
    'passwordChangedAt', 'failedLoginAttempts', 'lockUntil',
    'apiKey', 'secretKey', 'accessToken', 'privateKey',
]);

function sanitize(data) {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(sanitize);
    if (typeof data !== 'object') return data;
    const clean = {};
    for (const [key, val] of Object.entries(data)) {
        if (SENSITIVE_KEYS.has(key)) continue;
        clean[key] = typeof val === 'object' && val !== null ? sanitize(val) : val;
    }
    return clean;
}


// ─── Product Knowledge Base for Smart Auto-Fill ─────────────────
// Maps product keywords to realistic default details
const PRODUCT_KNOWLEDGE = {
    // Laptops
    'macbook pro': { manufacturer: 'Apple', model: 'MacBook Pro', price: 1999, description: 'Apple MacBook Pro laptop for professional use', warranty: 12, serialPrefix: 'FVFC' },
    'macbook air': { manufacturer: 'Apple', model: 'MacBook Air', price: 1299, description: 'Apple MacBook Air ultralight laptop', warranty: 12, serialPrefix: 'FVFA' },
    'macbook': { manufacturer: 'Apple', model: 'MacBook', price: 1499, description: 'Apple MacBook laptop', warranty: 12, serialPrefix: 'FVFM' },
    'thinkpad': { manufacturer: 'Lenovo', model: 'ThinkPad', price: 1200, description: 'Lenovo ThinkPad business laptop', warranty: 36, serialPrefix: 'PF' },
    'ideapad': { manufacturer: 'Lenovo', model: 'IdeaPad', price: 700, description: 'Lenovo IdeaPad consumer laptop', warranty: 12, serialPrefix: 'PF' },
    'dell xps': { manufacturer: 'Dell', model: 'XPS', price: 1400, description: 'Dell XPS premium laptop', warranty: 12, serialPrefix: 'CN0' },
    'dell latitude': { manufacturer: 'Dell', model: 'Latitude', price: 1100, description: 'Dell Latitude enterprise laptop', warranty: 36, serialPrefix: 'CN0' },
    'dell inspiron': { manufacturer: 'Dell', model: 'Inspiron', price: 700, description: 'Dell Inspiron consumer laptop', warranty: 12, serialPrefix: 'CN0' },
    'hp elitebook': { manufacturer: 'HP', model: 'EliteBook', price: 1300, description: 'HP EliteBook enterprise laptop', warranty: 36, serialPrefix: '5CG' },
    'hp probook': { manufacturer: 'HP', model: 'ProBook', price: 900, description: 'HP ProBook business laptop', warranty: 12, serialPrefix: '5CG' },
    'hp spectre': { manufacturer: 'HP', model: 'Spectre', price: 1500, description: 'HP Spectre premium convertible laptop', warranty: 12, serialPrefix: '5CG' },
    'surface pro': { manufacturer: 'Microsoft', model: 'Surface Pro', price: 1200, description: 'Microsoft Surface Pro 2-in-1 device', warranty: 12, serialPrefix: 'MS0' },
    'surface laptop': { manufacturer: 'Microsoft', model: 'Surface Laptop', price: 1100, description: 'Microsoft Surface Laptop', warranty: 12, serialPrefix: 'MS0' },
    'asus zenbook': { manufacturer: 'ASUS', model: 'ZenBook', price: 1000, description: 'ASUS ZenBook ultrabook', warranty: 12, serialPrefix: 'LN' },
    'asus rog': { manufacturer: 'ASUS', model: 'ROG', price: 1800, description: 'ASUS ROG gaming laptop', warranty: 12, serialPrefix: 'LN' },
    'acer swift': { manufacturer: 'Acer', model: 'Swift', price: 800, description: 'Acer Swift ultrabook', warranty: 12, serialPrefix: 'NX' },
    // Phones
    'iphone': { manufacturer: 'Apple', model: 'iPhone', price: 999, description: 'Apple iPhone smartphone', warranty: 12, serialPrefix: 'DNQH' },
    'galaxy': { manufacturer: 'Samsung', model: 'Galaxy', price: 899, description: 'Samsung Galaxy smartphone', warranty: 12, serialPrefix: 'R5CR' },
    'pixel': { manufacturer: 'Google', model: 'Pixel', price: 799, description: 'Google Pixel smartphone', warranty: 12, serialPrefix: 'GP' },
    'oneplus': { manufacturer: 'OnePlus', model: 'OnePlus', price: 699, description: 'OnePlus smartphone', warranty: 12, serialPrefix: 'OP' },
    // Desktops
    'imac': { manufacturer: 'Apple', model: 'iMac', price: 1499, description: 'Apple iMac all-in-one desktop', warranty: 12, serialPrefix: 'C02' },
    'mac mini': { manufacturer: 'Apple', model: 'Mac Mini', price: 699, description: 'Apple Mac Mini compact desktop', warranty: 12, serialPrefix: 'C07' },
    'mac studio': { manufacturer: 'Apple', model: 'Mac Studio', price: 1999, description: 'Apple Mac Studio professional desktop', warranty: 12, serialPrefix: 'C07' },
    'optiplex': { manufacturer: 'Dell', model: 'OptiPlex', price: 800, description: 'Dell OptiPlex business desktop', warranty: 36, serialPrefix: 'CN0' },
    'hp prodesk': { manufacturer: 'HP', model: 'ProDesk', price: 750, description: 'HP ProDesk business desktop', warranty: 36, serialPrefix: '5CG' },
    // Printers
    'laserjet': { manufacturer: 'HP', model: 'LaserJet', price: 400, description: 'HP LaserJet printer', warranty: 12, serialPrefix: 'VNB' },
    'epson': { manufacturer: 'Epson', model: 'EcoTank', price: 350, description: 'Epson EcoTank printer', warranty: 12, serialPrefix: 'X5WJ' },
    'brother': { manufacturer: 'Brother', model: 'Brother Printer', price: 300, description: 'Brother multifunction printer', warranty: 24, serialPrefix: 'U64' },
    // Servers
    'poweredge': { manufacturer: 'Dell', model: 'PowerEdge', price: 5000, description: 'Dell PowerEdge rack server', warranty: 36, serialPrefix: 'CN0' },
    'proliant': { manufacturer: 'HP', model: 'ProLiant', price: 4500, description: 'HPE ProLiant enterprise server', warranty: 36, serialPrefix: 'CZ2' },
    // Networking
    'cisco': { manufacturer: 'Cisco', model: 'Catalyst', price: 2000, description: 'Cisco networking equipment', warranty: 12, serialPrefix: 'FOC' },
    'ubiquiti': { manufacturer: 'Ubiquiti', model: 'UniFi', price: 300, description: 'Ubiquiti UniFi networking device', warranty: 12, serialPrefix: 'UBI' },
    // Monitors
    'monitor': { manufacturer: 'Dell', model: 'UltraSharp Monitor', price: 500, description: 'Professional display monitor', warranty: 36, serialPrefix: 'CN0' },
    'display': { manufacturer: 'LG', model: 'UltraWide Display', price: 600, description: 'LG UltraWide display', warranty: 36, serialPrefix: 'LG0' },
    // Furniture
    'standing desk': { manufacturer: 'FlexiSpot', model: 'Standing Desk', price: 500, description: 'Electric height-adjustable standing desk', warranty: 60, serialPrefix: 'FS' },
    'ergonomic chair': { manufacturer: 'Herman Miller', model: 'Aeron Chair', price: 1200, description: 'Ergonomic office chair for extended use', warranty: 144, serialPrefix: 'HM' },
    'office chair': { manufacturer: 'Steelcase', model: 'Leap Chair', price: 800, description: 'Professional office chair', warranty: 144, serialPrefix: 'SC' },
    'office desk': { manufacturer: 'IKEA', model: 'BEKANT Desk', price: 350, description: 'Office work desk', warranty: 120, serialPrefix: 'IK' },
};

/**
 * Match product name against knowledge base to get smart defaults
 */
function getProductDefaults(assetName) {
    const lower = assetName.toLowerCase();
    let bestMatch = null;
    let bestLen = 0;

    for (const [keyword, defaults] of Object.entries(PRODUCT_KNOWLEDGE)) {
        if (lower.includes(keyword) && keyword.length > bestLen) {
            bestMatch = { ...defaults };
            bestLen = keyword.length;
        }
    }

    // Attempt to extract model variant from the name (e.g., "MacBook Pro M3" → model becomes "MacBook Pro M3")
    if (bestMatch) {
        // Use the full asset name as model if it's more specific
        bestMatch.model = assetName;
    }

    return bestMatch;
}

/**
 * Generate a realistic serial number
 */
function generateSerial(prefix) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let serial = prefix || 'SN';
    for (let i = 0; i < 8; i++) {
        serial += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return serial;
}

/**
 * Execute an ERP action based on intent + entities
 */
async function execute(intent, entities, context) {
    const handlers = {
        APPROVE_PURCHASE: approvePO,
        REJECT_PURCHASE: rejectPO,
        CLOSE_MAINTENANCE: closeMaintenance,
        CREATE_TRANSACTION: createTransaction,
        PROCESS_BILL: processBill,
        MATCH_INVOICE: matchInvoice,
        CREATE_ASSET: createAsset,
        REFILL_INVENTORY: refillInventory,
        // v3 — New handlers
        CREATE_TICKET: createTicket,
        UPDATE_ASSET: updateAsset,
        GET_LOW_STOCK: getLowStock,
        GET_ASSET_STATS: getAssetStats,
        SET_BUDGET: setBudget,
        // v4 — List & Dashboard handlers
        LIST_ASSETS: listAssets,
        LIST_VENDORS: listVendors,
        LIST_PURCHASE_ORDERS: listPurchaseOrders,
        LIST_TICKETS: listTickets,
        LIST_INVENTORY: listInventory,
        LIST_TRANSACTIONS: listTransactions,
        DASHBOARD_SUMMARY: dashboardSummary,
        // v5 — Full system coverage
        CREATE_VENDOR: createVendor,
        CREATE_PURCHASE_ORDER: createPurchaseOrder,
        CREATE_INVENTORY: createInventoryItem,
        VIEW_PROFIT_LOSS: viewProfitLoss,
        VIEW_CASH_FLOW: viewCashFlow,
        VIEW_BALANCE_SHEET: viewBalanceSheet,
        LIST_GL_ACCOUNTS: listGLAccounts,
        CREATE_GL_ACCOUNT: createGLAccount,
        VIEW_AUDIT_LOGS: viewAuditLogs,
        LIST_NOTIFICATIONS: listNotifications,
        SEND_NOTIFICATION: sendNotification,
        LIST_OFFICES: listOffices,
        CREATE_OFFICE: createOffice,
        LIST_USERS: listUsers,
        VIEW_ANALYTICS: viewAnalytics,
        LIST_DOCUMENTS: listDocuments,
        VIEW_PROFILE: viewProfile,
        UPDATE_TICKET: updateTicket,
        // v6 — Predictive maintenance
        PREDICT_MAINTENANCE: predictMaintenance,
    };

    const handler = handlers[intent];
    if (!handler) {
        return { success: false, message: `No executor for intent: ${intent}` };
    }

    try {
        return await handler(entities, context);
    } catch (error) {
        logger.error(`Agent executor ${intent} error:`, error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Fetch context data for analysis intents
 * Provides a universal snapshot of the ERP so the AI can answer ANY question.
 */
async function fetchContextData(intent, entities, context) {
    try {
        switch (intent) {
            case 'DETECT_ANOMALY':
            case 'QUERY_DATA':
            case 'GENERATE_REPORT': {
                const now = new Date();
                const isSuperAdmin = context.role === 'SUPER_ADMIN';
                const officeFilter = (!isSuperAdmin && context.officeId) ? { officeId: context.officeId } : {};

                const [transactions, budgets, inventory, pos, assets, tickets] = await Promise.all([
                    // Last 50 transactions
                    prisma.transaction.findMany({ where: officeFilter, take: 50, orderBy: { date: 'desc' }, select: { type: true, category: true, amount: true, description: true, date: true } }),
                    // This month's budgets
                    prisma.budget.findMany({ where: { month: now.getMonth() + 1, year: now.getFullYear() }, select: { category: true, limit: true, spent: true } }),
                    // Inventory — generous limit for AI quality
                    prisma.inventory.findMany({
                        where: officeFilter,
                        take: 50,
                        select: { name: true, currentQuantity: true, unitCost: true, minimumQuantity: true },
                    }),
                    // Recent POs
                    prisma.purchaseOrder.findMany({ where: officeFilter, take: 20, orderBy: { createdAt: 'desc' }, select: { poNumber: true, status: true, totalAmount: true } }),
                    // Asset summary
                    prisma.asset.findMany({ where: officeFilter, take: 50, select: { name: true, status: true, category: true } }),
                    // Active Maintenance Tickets
                    prisma.maintenanceTicket.findMany({ where: { status: { not: 'COMPLETED' }, ...officeFilter }, select: { ticketNumber: true, issueDescription: true, priority: true, status: true } }),
                ]);

                return {
                    erp_snapshot: {
                        recent_transactions: transactions,
                        current_budgets: budgets,
                        inventory_items: inventory,
                        recent_purchase_orders: pos,
                        assets_overview: assets,
                        active_maintenance_tickets: tickets
                    }
                };
            }

            case 'FORECAST_BUDGET': {
                const budgets = await prisma.budget.findMany({
                    orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 48,
                    select: { category: true, month: true, year: true, limit: true, spent: true },
                });
                return { historical_budgets: budgets };
            }

            case 'PREDICT_MAINTENANCE': {
                const tickets = await prisma.maintenanceTicket.findMany({
                    take: 50, orderBy: { createdAt: 'desc' },
                    select: { issueDescription: true, status: true, priority: true, actualCost: true, createdAt: true, closedAt: true },
                });
                return { historical_maintenance: tickets };
            }

            default:
                return {};
        }
    } catch (error) {
        logger.error('fetchContextData error:', error.message);
        return { error: error.message };
    }
}

// ─── Action Handlers ────────────────────────────────────

async function approvePO(entities, context) {
    const poNumber = entities.poNumber || entities.additionalContext;
    if (!poNumber) return { success: false, message: 'Please specify a PO number to approve.' };

    const po = await prisma.purchaseOrder.findFirst({
        where: { poNumber: { contains: poNumber, mode: 'insensitive' } },
    });
    if (!po) return { success: false, message: `Purchase Order "${poNumber}" not found.` };
    if (po.status === 'APPROVED') return { success: false, message: `PO ${po.poNumber} is already approved.` };

    const updated = await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: {
            status: 'APPROVED',
            approvedById: context.userId,
            approvalDate: new Date(),
        },
    });
    return { success: true, message: `PO ${updated.poNumber} approved successfully.`, data: { poNumber: updated.poNumber, status: 'APPROVED' } };
}

async function rejectPO(entities, context) {
    const poNumber = entities.poNumber || entities.additionalContext;
    if (!poNumber) return { success: false, message: 'Please specify a PO number to reject.' };

    const po = await prisma.purchaseOrder.findFirst({
        where: { poNumber: { contains: poNumber, mode: 'insensitive' } },
    });
    if (!po) return { success: false, message: `Purchase Order "${poNumber}" not found.` };

    const updated = await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'CANCELLED' },
    });
    return { success: true, message: `PO ${updated.poNumber} rejected.`, data: { poNumber: updated.poNumber, status: 'CANCELLED' } };
}



async function createTransaction(entities, context) {
    const amount = entities.amount;
    if (!amount) return { success: false, message: 'Please specify an amount for the transaction. Example: "Make new expense of Mumbai travel with cost 250087"' };

    let officeId = context.officeId;
    if (!officeId) {
        const dbUser = await prisma.user.findUnique({ where: { id: context.userId }, select: { officeId: true } });
        officeId = dbUser?.officeId;
    }
    if (!officeId) {
        const firstOffice = await prisma.office.findFirst({ select: { id: true } });
        officeId = firstOffice?.id;
    }

    const txType = entities.type || 'EXPENSE';
    const category = entities.category || 'Other';
    const description = entities.description || entities.additionalContext || 'Created by OpsPilot AI';
    const parsedAmount = parseFloat(String(amount).replace(/,/g, ''));

    const transaction = await prisma.transaction.create({
        data: {
            type: txType,
            category,
            amount: parsedAmount,
            description,
            date: new Date(),
            officeId: officeId || null,
            recordedById: context.userId,
        },
    });

    const typeIcon = txType === 'INCOME' ? '📈' : '📉';
    return {
        success: true,
        message: `${typeIcon} **Transaction Created!**\n\n` +
            `• **Type**: ${txType}\n` +
            `• **Category**: ${category}\n` +
            `• **Amount**: ₹${parsedAmount.toLocaleString('en-IN')}\n` +
            `• **Description**: ${description}\n` +
            `• **Date**: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        data: transaction,
    };
}

async function createAsset(entities, context) {
    const name = entities.assetName;
    if (!name) return { success: false, message: 'Please specify the name of the asset to create.' };

    let officeId = context.officeId;
    if (!officeId) {
        const dbUser = await prisma.user.findUnique({ where: { id: context.userId }, select: { officeId: true } });
        officeId = dbUser?.officeId;
    }
    if (!officeId) {
        const firstOffice = await prisma.office.findFirst({ select: { id: true } });
        officeId = firstOffice?.id;
    }

    const status = entities.assetStatus || 'ACTIVE';
    const VALID_CATS = ['LAPTOP', 'COMPUTER', 'FURNITURE', 'VEHICLE', 'EQUIPMENT', 'PHONE', 'PRINTER', 'SERVER', 'NETWORK', 'MACHINERY', 'OTHER'];
    let category = entities.assetCategory || 'OTHER';
    if (!VALID_CATS.includes(category)) category = 'OTHER';

    // Smart auto-fill: look up product knowledge base for realistic defaults
    const defaults = getProductDefaults(name);
    const manufacturer = entities.manufacturer || (defaults ? defaults.manufacturer : null);
    const model = entities.model || (defaults ? defaults.model : name);
    const description = entities.description || (defaults ? defaults.description : `${name} — registered via OpsPilot AI`);
    const serialNumber = entities.serialNumber || generateSerial(defaults ? defaults.serialPrefix : 'SN');
    const purchasePrice = entities.amount ? parseFloat(entities.amount) : (defaults ? defaults.price : 0);
    const VALID_CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'];
    let condition = (entities.condition || 'GOOD').toUpperCase();
    if (!VALID_CONDITIONS.includes(condition)) condition = 'GOOD';

    // Warranty: default from knowledge base (months), or user-specified
    const now = new Date();
    const warrantyMonths = entities.warrantyMonths || (defaults ? defaults.warranty : null);
    const warrantyStart = now;
    const warrantyEnd = warrantyMonths
        ? new Date(now.getFullYear(), now.getMonth() + warrantyMonths, now.getDate())
        : null;

    // Find vendor if user specified, otherwise leave null
    let vendorId = null;
    if (entities.vendorName) {
        const vendor = await prisma.vendor.findFirst({
            where: { name: { contains: entities.vendorName, mode: 'insensitive' } },
            select: { id: true },
        });
        if (vendor) vendorId = vendor.id;
    }

    // Assign to user if specified
    let assignedToId = null;
    if (entities.assignedTo) {
        const assignee = await prisma.user.findFirst({
            where: {
                OR: [
                    { name: { contains: entities.assignedTo, mode: 'insensitive' } },
                    { email: { contains: entities.assignedTo, mode: 'insensitive' } },
                ],
            },
            select: { id: true },
        });
        if (assignee) assignedToId = assignee.id;
    }

    const asset = await prisma.asset.create({
        data: {
            guai: 'ASSET-' + Date.now().toString().slice(-8),
            name,
            status,
            category,
            manufacturer,
            model,
            serialNumber,
            purchasePrice,
            purchaseDate: now,
            condition,
            warrantyStart,
            warrantyEnd,
            warrantyTerms: warrantyMonths ? `${warrantyMonths} month manufacturer warranty` : null,
            notes: description || `Created by OpsPilot AI on ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
            officeId: officeId || null,
            vendorId,
            assignedToId,
            createdById: context.userId,
        }
    });

    // Build rich response
    let msg = `🖥️ **Asset Created Successfully!**\n\n`;
    msg += `| Field | Value |\n|-------|-------|\n`;
    msg += `| **Name** | ${asset.name} |\n`;
    msg += `| **GUAI** | ${asset.guai} |\n`;
    msg += `| **Category** | ${asset.category} |\n`;
    if (asset.manufacturer) msg += `| **Manufacturer** | ${asset.manufacturer} |\n`;
    if (asset.model) msg += `| **Model** | ${asset.model} |\n`;
    msg += `| **Serial No.** | ${asset.serialNumber} |\n`;
    msg += `| **Condition** | ${asset.condition} |\n`;
    msg += `| **Status** | ${asset.status} |\n`;
    msg += `| **Purchase Price** | $${purchasePrice.toLocaleString('en-US')} |\n`;
    msg += `| **Purchase Date** | ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} |\n`;
    if (warrantyEnd) msg += `| **Warranty** | ${warrantyMonths} months (until ${warrantyEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}) |\n`;
    msg += `\n📝 ${asset.description}`;

    return { success: true, message: msg, data: asset };
}

async function refillInventory(entities, context) {
    let amount = entities.amount ? parseInt(entities.amount) : null;
    let itemName = entities.description || '';

    let items = [];

    // If the prompt contains a specific item name, try to match it
    if (itemName.length > 2) {
        const allInventory = await prisma.inventory.findMany({ select: { id: true, name: true } });
        const textLower = itemName.toLowerCase();
        for (const inv of allInventory) {
            if (textLower.includes(inv.name.toLowerCase())) {
                items = await prisma.inventory.findMany({ where: { id: inv.id } });
                break;
            }
        }
    }

    // Fallback: If no item specified, find the most critical low stock item
    if (items.length === 0) {
        const lowStockItems = await prisma.inventory.findMany({
            where: { currentQuantity: { lte: prisma.inventory.fields.minimumQuantity } },
            orderBy: { currentQuantity: 'asc' },
            take: 1
        });
        if (lowStockItems.length === 0) {
            return { success: false, message: 'All inventory items are sufficiently stocked. No low stock items found to refill.' };
        }
        items = lowStockItems;
    }

    const item = items[0];

    // Use requested amount (refill to 50 means order 50), or fallback to item's reorderQuantity
    let orderQuantity = amount && amount > 0 ? amount : (item.reorderQuantity || 50);

    let officeId = context.officeId;
    if (!officeId) {
        const dbUser = await prisma.user.findUnique({ where: { id: context.userId }, select: { officeId: true } });
        officeId = dbUser?.officeId || item.officeId;
    }

    let vendorId = item.primaryVendorId;
    if (!vendorId) {
        const firstVendor = await prisma.vendor.findFirst({ select: { id: true } });
        if (!firstVendor) return { success: false, message: 'No vendors found in the system to order from.' };
        vendorId = firstVendor.id;
    }

    const unitPrice = item.unitCost || item.costPrice || item.lastPurchasePrice || 100;
    const poNumber = 'PO-AI-' + Date.now().toString().slice(-6);

    // Atomic transaction across 4 tables guarantees data integrity
    const result = await prisma.$transaction(async (tx) => {
        // 1. Create completed PO
        const po = await tx.purchaseOrder.create({
            data: {
                poNumber,
                vendorId,
                officeId,
                requestedById: context.userId || "00000000-0000-0000-0000-000000000000",
                approvedById: context.userId,
                status: 'RECEIVED',
                approvalDate: new Date(),
                orderDate: new Date(),
                deliveryDate: new Date(),
                totalAmount: orderQuantity * unitPrice,
                notes: 'Auto-generated and auto-received by OpsPilot AI for low stock refill'
            }
        });

        // 2. Create PO Item
        await tx.purchaseOrderItem.create({
            data: {
                purchaseOrderId: po.id,
                inventoryId: item.id,
                name: item.name,
                quantity: orderQuantity,
                unitPrice: unitPrice,
                totalPrice: orderQuantity * unitPrice,
                receivedQuantity: orderQuantity
            }
        });

        // 3. Update Inventory Stock Level
        const updatedItem = await tx.inventory.update({
            where: { id: item.id },
            data: {
                currentQuantity: item.currentQuantity + orderQuantity,
                lastRestockDate: new Date()
            }
        });

        // 4. Create Stock Movement Log
        await tx.stockMovement.create({
            data: {
                inventoryId: item.id,
                type: 'STOCK_IN',
                quantity: orderQuantity,
                reason: 'Auto Stock Refill via AI',
                reference: poNumber,
                performedById: context.userId
            }
        });

        return { po, updatedItem };
    });

    return {
        success: true,
        message: `📦 **Stock Refilled Successfully!**\n\n` +
            `I identified low stock for **${item.name}** and autonomously executed a refill workflow:\n` +
            `• **Purchase Order**: ${result.po.poNumber} (Auto-Approved & Received)\n` +
            `• **Quantity Ordered**: ${orderQuantity} units\n` +
            `• **Total Cost**: ₹${result.po.totalAmount.toLocaleString('en-IN')}\n` +
            `• **New Stock Level**: ${result.updatedItem.currentQuantity} units (up from ${item.currentQuantity})`,
        data: result.updatedItem
    };
}

async function processBill(entities, context) {
    return createTransaction({ ...entities, type: 'EXPENSE' }, context);
}

async function matchInvoice(entities, context) {
    const poNumber = entities.poNumber || entities.additionalContext;
    if (!poNumber) return { success: false, message: 'Please specify a PO number for invoice matching.' };

    const po = await prisma.purchaseOrder.findFirst({
        where: { poNumber: { contains: poNumber, mode: 'insensitive' } },
        include: { items: true, vendor: { select: { name: true } } },
    });
    if (!po) return { success: false, message: `PO "${poNumber}" not found for invoice matching.` };

    return {
        success: true,
        message: `Invoice matched to PO ${po.poNumber} from ${po.vendor?.name || 'Unknown Vendor'}. Total: ₹${po.totalAmount}.`,
        data: { poNumber: po.poNumber, vendor: po.vendor?.name, totalAmount: po.totalAmount, items: po.items.length },
    };
}

// ─── v3: NEW HANDLERS ───────────────────────────────────────────

async function createTicket(entities, context) {
    const description = entities.description || entities.additionalContext;
    if (!description) return { success: false, message: 'Please describe the maintenance issue.' };

    let officeId = context.officeId;
    if (!officeId) {
        const dbUser = await prisma.user.findUnique({ where: { id: context.userId }, select: { officeId: true } });
        officeId = dbUser?.officeId;
    }
    if (!officeId) {
        const firstOffice = await prisma.office.findFirst({ select: { id: true } });
        officeId = firstOffice?.id;
    }

    // Find asset if specified
    let assetId = entities.assetId;
    if (assetId) {
        const normalizedAssetId = String(assetId).replace(/-/g, ' ');
        const dbAsset = await prisma.asset.findFirst({
            where: {
                OR: [
                    { id: assetId },
                    { name: { contains: String(assetId), mode: 'insensitive' } },
                    { name: { contains: normalizedAssetId, mode: 'insensitive' } },
                    { guai: { equals: String(assetId), mode: 'insensitive' } }
                ],
                officeId: officeId
            }
        });
        if (dbAsset) {
            assetId = dbAsset.id;
        } else {
            return { success: false, message: `Could not find an asset matching "${assetId}" in your office.` };
        }
    } else {
        const firstAsset = await prisma.asset.findFirst({ where: { officeId, status: 'ACTIVE' }, select: { id: true } });
        assetId = firstAsset?.id;
    }
    if (!assetId) return { success: false, message: 'No active assets found to create a ticket for. Please specify an asset.' };

    // Generate ticket number
    const counter = await prisma.counter.upsert({
        where: { name: 'maintenance_ticket' },
        update: { sequence: { increment: 1 } },
        create: { name: 'maintenance_ticket', prefix: 'MT-', sequence: 1 },
    });
    const ticketNumber = `MT-${String(counter.sequence).padStart(4, '0')}`;

    const ticket = await prisma.maintenanceTicket.create({
        data: {
            ticketNumber,
            assetId,
            officeId,
            issueDescription: description,
            priority: entities.priority || 'MEDIUM',
            requestedById: context.userId,
        },
    });

    return {
        success: true,
        message: `🔧 **Maintenance Ticket Created!**\n\n` +
            `• **Ticket**: ${ticket.ticketNumber}\n` +
            `• **Issue**: ${description}\n` +
            `• **Priority**: ${ticket.priority}\n` +
            `• **Status**: ${ticket.status}`,
        data: ticket,
    };
}

async function updateAsset(entities, context) {
    const assetId = entities.assetId || entities.guai;
    if (!assetId) return { success: false, message: 'Please specify which asset to update (ID or GUAI).' };

    const normalizedAssetId = String(assetId).replace(/-/g, ' ');
    const asset = await prisma.asset.findFirst({
        where: {
            OR: [
                { id: assetId },
                { guai: { contains: String(assetId), mode: 'insensitive' } },
                { name: { contains: String(assetId), mode: 'insensitive' } },
                { name: { contains: normalizedAssetId, mode: 'insensitive' } },
            ],
        },
    });
    if (!asset) return { success: false, message: `Asset "${assetId}" not found.` };

    const updateData = {};
    if (entities.name) updateData.name = entities.name;
    if (entities.assetStatus) updateData.status = entities.assetStatus;
    if (entities.assetCategory) updateData.category = entities.assetCategory;
    if (entities.location) updateData.building = entities.location;
    if (entities.manufacturer) updateData.manufacturer = entities.manufacturer;
    if (entities.model) updateData.model = entities.model;
    if (entities.serialNumber) updateData.serialNumber = entities.serialNumber;
    if (entities.description) updateData.description = entities.description;
    if (entities.condition) updateData.condition = entities.condition;
    if (entities.floor) updateData.floor = entities.floor;
    if (entities.room) updateData.room = entities.room;

    if (Object.keys(updateData).length === 0) {
        return { success: false, message: 'No update fields specified. What would you like to change?' };
    }

    const updated = await prisma.asset.update({ where: { id: asset.id }, data: updateData });

    return {
        success: true,
        message: `✅ **Asset Updated!**\n\n` +
            `• **Asset**: ${updated.name} (${updated.guai})\n` +
            `• **Fields changed**: ${Object.keys(updateData).join(', ')}`,
        data: updated,
    };
}

async function getLowStock(entities, context) {
    const lowItems = await prisma.inventory.findMany({
        where: { currentQuantity: { lte: 10 } },
        orderBy: { currentQuantity: 'asc' },
        take: 10,
        select: { name: true, currentQuantity: true, minimumQuantity: true, reorderPoint: true, unit: true },
    });

    if (lowItems.length === 0) {
        return { success: true, message: '✅ All inventory items are sufficiently stocked. No low-stock alerts.' };
    }

    let msg = `⚠️ **Low Stock Alert** — ${lowItems.length} items need attention\n\n`;
    msg += `| Item | Stock | Min | Status |\n|------|-------|-----|--------|\n`;
    for (const item of lowItems) {
        const status = item.currentQuantity <= item.minimumQuantity ? '🔴 Critical' : '🟡 Low';
        msg += `| ${item.name} | ${item.currentQuantity} ${item.unit} | ${item.minimumQuantity} | ${status} |\n`;
    }
    msg += `\n💡 **Tip:** Say "refill stock" to auto-reorder the most critical item.`;

    return { success: true, message: msg, data: lowItems };
}

async function getAssetStats(entities, context) {
    const where = {};
    if (context.officeId) where.officeId = context.officeId;

    const [total, active, maintenance, retired, valueAgg] = await Promise.all([
        prisma.asset.count({ where }),
        prisma.asset.count({ where: { ...where, status: 'ACTIVE' } }),
        prisma.asset.count({ where: { ...where, status: 'MAINTENANCE' } }),
        prisma.asset.count({ where: { ...where, status: 'RETIRED' } }),
        prisma.asset.aggregate({ where, _sum: { purchasePrice: true } }),
    ]);

    const totalValue = valueAgg._sum.purchasePrice || 0;

    return {
        success: true,
        message: `📊 **Asset Overview**\n\n` +
            `| Metric | Value |\n|--------|-------|\n` +
            `| 📦 Total Assets | **${total}** |\n` +
            `| ✅ Active | **${active}** |\n` +
            `| 🔧 In Maintenance | **${maintenance}** |\n` +
            `| ⛔ Retired | **${retired}** |\n` +
            `| 💰 Total Value | **₹${totalValue.toLocaleString('en-IN')}** |`,
        data: { total, active, maintenance, retired, totalValue },
    };
}

async function setBudget(entities, context) {
    const category = entities.category || 'General';
    const limit = entities.amount;
    if (!limit) return { success: false, message: 'Please specify a budget limit amount.' };

    let officeId = context.officeId;
    if (!officeId) {
        const dbUser = await prisma.user.findUnique({ where: { id: context.userId }, select: { officeId: true } });
        officeId = dbUser?.officeId;
    }
    if (!officeId) {
        const firstOffice = await prisma.office.findFirst({ select: { id: true } });
        officeId = firstOffice?.id;
    }

    const now = new Date();
    const month = entities.month || now.getMonth() + 1;
    const year = entities.year || now.getFullYear();

    const budget = await prisma.budget.upsert({
        where: { officeId_category_month_year: { officeId, category, month, year } },
        update: { limit: parseFloat(limit) },
        create: { officeId, category, month, year, limit: parseFloat(limit) },
    });

    return {
        success: true,
        message: `💰 **Budget Set!**\n\n` +
            `• **Category**: ${budget.category}\n` +
            `• **Month**: ${month}/${year}\n` +
            `• **Limit**: ₹${parseFloat(limit).toLocaleString('en-IN')}\n` +
            `• **Spent**: ₹${budget.spent.toLocaleString('en-IN')}`,
        data: budget,
    };
}

module.exports = {
    execute,
    fetchContextData,
};

// ─── v4: LIST & DASHBOARD HANDLERS ──────────────────────────────

async function listAssets(entities, context) {
    const where = {};
    if (context.officeId) where.officeId = context.officeId;
    if (entities.status) where.status = entities.status.toUpperCase();

    const assets = await prisma.asset.findMany({
        where,
        take: parseInt(entities.limit) || 15,
        orderBy: { createdAt: 'desc' },
        select: { name: true, guai: true, status: true, category: true, purchasePrice: true },
    });

    if (assets.length === 0) {
        return { success: true, message: '📭 No assets found matching your criteria.' };
    }

    const statusIcon = { ACTIVE: '✅', MAINTENANCE: '🔧', RETIRED: '⛔', DISPOSED: '🗑️' };
    let msg = `🖥️ **Assets** (${assets.length} found)\n\n`;
    msg += `| Asset | Category | Status | Value |\n|-------|----------|--------|-------|\n`;
    for (const a of assets) {
        msg += `| **${a.name}** | ${a.category} | ${statusIcon[a.status] || ''} ${a.status} | ₹${(a.purchasePrice || 0).toLocaleString('en-IN')} |\n`;
    }

    return { success: true, message: msg, data: assets };
}

async function listVendors(entities, context) {
    const vendors = sanitize(await prisma.vendor.findMany({
        take: parseInt(entities.limit) || 15,
        orderBy: { createdAt: 'desc' },
    }));

    if (vendors.length === 0) {
        return { success: true, message: '📭 No vendors found in the system.' };
    }

    let msg = `🏢 **Vendors** (${vendors.length} found)\n\n`;
    msg += `| Vendor | Contact | Status |\n|--------|---------|--------|\n`;
    for (const v of vendors) {
        const isActive = v.isActive !== false && v.status !== 'INACTIVE' && !v.isBlacklisted;
        const status = isActive ? '✅ Active' : '⛔ Inactive';
        msg += `| **${v.name}** | ${v.contactPerson || '—'} | ${status} |\n`;
    }

    return { success: true, message: msg, data: vendors };
}

async function listPurchaseOrders(entities, context) {
    const where = {};
    if (context.officeId) where.officeId = context.officeId;
    if (entities.status) where.status = entities.status.toUpperCase();

    const pos = await prisma.purchaseOrder.findMany({
        where,
        take: parseInt(entities.limit) || 15,
        orderBy: { createdAt: 'desc' },
        select: { poNumber: true, status: true, totalAmount: true, createdAt: true, vendor: { select: { name: true } } },
    });

    if (pos.length === 0) {
        return { success: true, message: '📭 No purchase orders found.' };
    }

    const statusIcon = { DRAFT: '📝', PENDING: '⏳', APPROVED: '✅', ORDERED: '📦', RECEIVED: '✅', CANCELLED: '❌' };
    let msg = `📋 **Purchase Orders** (${pos.length} found)\n\n`;
    msg += `| PO # | Vendor | Amount | Status |\n|------|--------|--------|--------|\n`;
    for (const po of pos) {
        msg += `| **${po.poNumber}** | ${po.vendor?.name || '—'} | ₹${po.totalAmount.toLocaleString('en-IN')} | ${statusIcon[po.status] || ''} ${po.status} |\n`;
    }

    return { success: true, message: msg, data: pos };
}

async function listTickets(entities, context) {
    const where = {};
    if (context.officeId) where.officeId = context.officeId;
    if (entities.status) {
        where.status = entities.status.toUpperCase();
    } else {
        where.status = { not: 'COMPLETED' };
    }

    const tickets = await prisma.maintenanceTicket.findMany({
        where,
        take: parseInt(entities.limit) || 15,
        orderBy: { createdAt: 'desc' },
        select: { ticketNumber: true, issueDescription: true, priority: true, status: true, createdAt: true },
    });

    if (tickets.length === 0) {
        return { success: true, message: '✅ No active maintenance tickets. Everything looks good!' };
    }

    const prioIcon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };
    let msg = `🔧 **Maintenance Tickets** (${tickets.length} active)\n\n`;
    msg += `| Ticket | Issue | Priority | Status |\n|--------|-------|----------|--------|\n`;
    for (const t of tickets) {
        const desc = (t.issueDescription || '').substring(0, 40);
        msg += `| **${t.ticketNumber}** | ${desc} | ${prioIcon[t.priority] || ''} ${t.priority} | ${t.status} |\n`;
    }

    return { success: true, message: msg, data: tickets };
}

async function listInventory(entities, context) {
    const where = {};
    if (context.officeId) where.officeId = context.officeId;

    const items = await prisma.inventory.findMany({
        where,
        take: parseInt(entities.limit) || 20,
        orderBy: { currentQuantity: 'asc' },
        select: { name: true, currentQuantity: true, minimumQuantity: true, unit: true, unitCost: true },
    });

    if (items.length === 0) {
        return { success: true, message: '📭 No inventory items found.' };
    }

    let msg = `📦 **Inventory** (${items.length} items)\n\n`;
    msg += `| Item | Stock | Min | Unit Cost | Status |\n|------|-------|-----|-----------|--------|\n`;
    for (const item of items) {
        const status = item.currentQuantity <= item.minimumQuantity ? '🔴 Low' : '✅ OK';
        msg += `| **${item.name}** | ${item.currentQuantity} ${item.unit || ''} | ${item.minimumQuantity} | ₹${(item.unitCost || 0).toLocaleString('en-IN')} | ${status} |\n`;
    }

    return { success: true, message: msg, data: items };
}

async function listTransactions(entities, context) {
    const where = {};
    if (context.officeId) where.officeId = context.officeId;
    if (entities.type) where.type = entities.type.toUpperCase();

    const txns = await prisma.transaction.findMany({
        where,
        take: parseInt(entities.limit) || 15,
        orderBy: { date: 'desc' },
        select: { type: true, category: true, amount: true, description: true, date: true },
    });

    if (txns.length === 0) {
        return { success: true, message: '📭 No transactions found.' };
    }

    const total = txns.reduce((sum, t) => sum + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
    let msg = `💰 **Recent Transactions** (${txns.length} shown)\n\n`;
    msg += `| Date | Type | Category | Amount | Description |\n|------|------|----------|--------|-------------|\n`;
    for (const t of txns) {
        const icon = t.type === 'INCOME' ? '📈' : '📉';
        const date = t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
        msg += `| ${date} | ${icon} ${t.type} | ${t.category || '—'} | ₹${t.amount.toLocaleString('en-IN')} | ${(t.description || '').substring(0, 30)} |\n`;
    }
    const netIcon = total >= 0 ? '📈' : '📉';
    msg += `\n${netIcon} **Net:** ₹${Math.abs(total).toLocaleString('en-IN')} ${total >= 0 ? 'surplus' : 'deficit'}`;

    return { success: true, message: msg, data: txns };
}

async function dashboardSummary(entities, context) {
    const where = {};
    if (context.officeId) where.officeId = context.officeId;

    const now = new Date();
    const [
        assetCount, activeAssets, inventoryCount, lowStockCount,
        openTickets, criticalTickets, pendingPOs, recentTxns,
        budgets
    ] = await Promise.all([
        prisma.asset.count({ where }),
        prisma.asset.count({ where: { ...where, status: 'ACTIVE' } }),
        prisma.inventory.count({ where }),
        prisma.inventory.count({ where: { ...where, currentQuantity: { lte: 5 } } }),
        prisma.maintenanceTicket.count({ where: { ...where, status: { not: 'COMPLETED' } } }),
        prisma.maintenanceTicket.count({ where: { ...where, priority: 'CRITICAL', status: { not: 'COMPLETED' } } }),
        prisma.purchaseOrder.count({ where: { ...where, status: 'PENDING' } }),
        prisma.transaction.findMany({ where, take: 5, orderBy: { date: 'desc' }, select: { type: true, amount: true, description: true } }),
        prisma.budget.findMany({ where: { ...where, month: now.getMonth() + 1, year: now.getFullYear() }, select: { category: true, limit: true, spent: true } }),
    ]);

    const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
    const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const budgetIcon = budgetPct > 90 ? '🔴' : budgetPct > 70 ? '🟡' : '✅';

    let msg = `⚡ **CoreOps Dashboard**\n\n`;

    msg += `| Module | Status |\n|--------|--------|\n`;
    msg += `| 🖥️ Assets | **${activeAssets}** active of **${assetCount}** total |\n`;
    msg += `| 📦 Inventory | **${inventoryCount}** items ${lowStockCount > 0 ? `• 🔴 **${lowStockCount}** low stock` : '• ✅ All stocked'} |\n`;
    msg += `| 🔧 Maintenance | **${openTickets}** open tickets ${criticalTickets > 0 ? `• 🔴 **${criticalTickets}** critical` : ''} |\n`;
    msg += `| 📋 Purchase Orders | **${pendingPOs}** pending approval |\n`;
    msg += `| ${budgetIcon} Budget | ₹${totalSpent.toLocaleString('en-IN')} / ₹${totalBudget.toLocaleString('en-IN')} (**${budgetPct}%** used) |\n`;

    if (lowStockCount > 0 || criticalTickets > 0 || pendingPOs > 0) {
        msg += `\n⚠️ **Action Items:**\n`;
        if (criticalTickets > 0) msg += `• 🔴 ${criticalTickets} critical ticket(s) need immediate attention\n`;
        if (lowStockCount > 0) msg += `• 📦 ${lowStockCount} inventory item(s) below minimum stock\n`;
        if (pendingPOs > 0) msg += `• 📋 ${pendingPOs} PO(s) awaiting approval\n`;
    }

    return { success: true, message: msg, data: { assetCount, activeAssets, inventoryCount, lowStockCount, openTickets, criticalTickets, pendingPOs, budgetPct } };
}

// ─── v5: FULL SYSTEM HANDLERS ───────────────────────────────────

// ── Vendor Management ───────────────────────────────────────────
async function createVendor(entities, context) {
    const name = entities.vendorName || entities.description;
    if (!name) return { success: false, message: 'Please specify the vendor name.' };

    const vendorCode = 'VND-' + Date.now().toString().slice(-6);
    const vendor = await prisma.vendor.create({
        data: {
            name,
            vendorCode,
            contactPerson: entities.contactPerson || null,
            email: entities.email || null,
            phone: entities.phone || null,
            address: entities.address || null,
            gstNumber: entities.gstNumber || null,
        },
    });

    let msg = `🏢 **Vendor Created!**\n\n`;
    msg += `| Field | Value |\n|-------|-------|\n`;
    msg += `| **Name** | ${vendor.name} |\n`;
    msg += `| **Code** | ${vendor.vendorCode} |\n`;
    msg += `| **Status** | ✅ ACTIVE |\n`;
    if (vendor.contactPerson) msg += `| **Contact** | ${vendor.contactPerson} |\n`;
    if (vendor.email) msg += `| **Email** | ${vendor.email} |\n`;
    if (vendor.phone) msg += `| **Phone** | ${vendor.phone} |\n`;

    return { success: true, message: msg, data: vendor };
}

// ── Purchase Order Creation ─────────────────────────────────────
async function createPurchaseOrder(entities, context) {
    const description = entities.description || 'Created by OpsPilot AI';
    const amount = entities.amount ? parseFloat(entities.amount) : 0;

    let officeId = context.officeId;
    if (!officeId) {
        const dbUser = await prisma.user.findUnique({ where: { id: context.userId }, select: { officeId: true } });
        officeId = dbUser?.officeId;
    }
    if (!officeId) {
        const firstOffice = await prisma.office.findFirst({ select: { id: true } });
        officeId = firstOffice?.id;
    }

    // Find vendor
    let vendorId = null;
    if (entities.vendorName) {
        const vendor = await prisma.vendor.findFirst({
            where: { name: { contains: entities.vendorName, mode: 'insensitive' } },
            select: { id: true, name: true },
        });
        if (vendor) vendorId = vendor.id;
    }
    if (!vendorId) {
        const firstVendor = await prisma.vendor.findFirst({ where: { isBlacklisted: false }, select: { id: true } });
        if (!firstVendor) return { success: false, message: 'No vendors found. Please create a vendor first.' };
        vendorId = firstVendor.id;
    }

    const poNumber = 'PO-' + Date.now().toString().slice(-6);
    const po = await prisma.purchaseOrder.create({
        data: {
            poNumber,
            vendorId,
            officeId,
            totalAmount: amount,
            status: 'PENDING',
            requestedById: context.userId,
            notes: description,
        },
        include: { vendor: { select: { name: true } } },
    });

    let msg = `📋 **Purchase Order Created!**\n\n`;
    msg += `| Field | Value |\n|-------|-------|\n`;
    msg += `| **PO Number** | ${po.poNumber} |\n`;
    msg += `| **Vendor** | ${po.vendor?.name || '—'} |\n`;
    msg += `| **Amount** | ₹${amount.toLocaleString('en-IN')} |\n`;
    msg += `| **Status** | ⏳ PENDING |\n`;
    msg += `| **Description** | ${description} |\n`;
    msg += `\n💡 Say **"approve PO ${po.poNumber}"** to approve it.`;

    return { success: true, message: msg, data: po };
}

// ── Inventory Item Creation ─────────────────────────────────────
async function createInventoryItem(entities, context) {
    const name = entities.itemName || entities.description;
    if (!name) return { success: false, message: 'Please specify the inventory item name.' };

    let officeId = context.officeId;
    if (!officeId) {
        const dbUser = await prisma.user.findUnique({ where: { id: context.userId }, select: { officeId: true } });
        officeId = dbUser?.officeId;
    }
    if (!officeId) {
        const firstOffice = await prisma.office.findFirst({ select: { id: true } });
        officeId = firstOffice?.id;
    }

    const sku = 'SKU-' + Date.now().toString().slice(-6);
    const quantity = entities.quantity ? parseInt(entities.quantity) : 0;
    const unitCost = entities.amount ? parseFloat(entities.amount) : 0;

    const item = await prisma.inventory.create({
        data: {
            name,
            sku,
            type: entities.inventoryType?.toUpperCase() === 'SPARE' ? 'SPARE' : 'PRODUCT',
            currentQuantity: quantity,
            minimumQuantity: entities.minQuantity ? parseInt(entities.minQuantity) : Math.max(5, Math.floor(quantity * 0.2)),
            reorderPoint: entities.reorderPoint ? parseInt(entities.reorderPoint) : Math.max(10, Math.floor(quantity * 0.3)),
            reorderQuantity: entities.reorderQty ? parseInt(entities.reorderQty) : Math.max(20, quantity),
            unitCost,
            unit: entities.unit || 'pcs',
            officeId,
        },
    });

    let msg = `📦 **Inventory Item Created!**\n\n`;
    msg += `| Field | Value |\n|-------|-------|\n`;
    msg += `| **Name** | ${item.name} |\n`;
    msg += `| **SKU** | ${item.sku} |\n`;
    msg += `| **Type** | ${item.type} |\n`;
    msg += `| **Quantity** | ${item.currentQuantity} ${item.unit} |\n`;
    msg += `| **Min Stock** | ${item.minimumQuantity} |\n`;
    msg += `| **Unit Cost** | ₹${unitCost.toLocaleString('en-IN')} |\n`;

    return { success: true, message: msg, data: item };
}

// ── Financial Reports ───────────────────────────────────────────
async function viewProfitLoss(entities, context) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [income, expenses] = await Promise.all([
        prisma.transaction.aggregate({ where: { type: 'INCOME', date: { gte: startOfMonth } }, _sum: { amount: true }, _count: true }),
        prisma.transaction.aggregate({ where: { type: 'EXPENSE', date: { gte: startOfMonth } }, _sum: { amount: true }, _count: true }),
    ]);

    const totalIncome = income._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const netProfit = totalIncome - totalExpenses;
    const profitIcon = netProfit >= 0 ? '📈' : '📉';
    const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Top expense categories
    const topCategories = await prisma.transaction.groupBy({
        by: ['category'],
        where: { type: 'EXPENSE', date: { gte: startOfMonth } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
    });

    let msg = `${profitIcon} **Profit & Loss — ${monthName}**\n\n`;
    msg += `| Metric | Amount |\n|--------|--------|\n`;
    msg += `| 📈 Total Income | **₹${totalIncome.toLocaleString('en-IN')}** (${income._count} txns) |\n`;
    msg += `| 📉 Total Expenses | **₹${totalExpenses.toLocaleString('en-IN')}** (${expenses._count} txns) |\n`;
    msg += `| ${profitIcon} **Net ${netProfit >= 0 ? 'Profit' : 'Loss'}** | **₹${Math.abs(netProfit).toLocaleString('en-IN')}** |\n`;

    if (topCategories.length > 0) {
        msg += `\n**Top Expense Categories:**\n`;
        for (const cat of topCategories) {
            msg += `• ${cat.category || 'Uncategorized'}: ₹${(cat._sum.amount || 0).toLocaleString('en-IN')}\n`;
        }
    }

    return { success: true, message: msg };
}

async function viewCashFlow(entities, context) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const transactions = await prisma.transaction.findMany({
        where: { date: { gte: startOfMonth } },
        orderBy: { date: 'desc' },
        select: { type: true, category: true, amount: true, date: true, description: true },
    });

    let inflow = 0, outflow = 0;
    for (const t of transactions) {
        if (t.type === 'INCOME') inflow += t.amount;
        else outflow += t.amount;
    }
    const netFlow = inflow - outflow;
    const flowIcon = netFlow >= 0 ? '✅' : '⚠️';

    let msg = `💸 **Cash Flow — ${monthName}**\n\n`;
    msg += `| Flow | Amount |\n|------|--------|\n`;
    msg += `| 📈 Cash Inflow | **₹${inflow.toLocaleString('en-IN')}** |\n`;
    msg += `| 📉 Cash Outflow | **₹${outflow.toLocaleString('en-IN')}** |\n`;
    msg += `| ${flowIcon} **Net Cash Flow** | **₹${Math.abs(netFlow).toLocaleString('en-IN')}** ${netFlow >= 0 ? '(positive)' : '(negative)'} |\n`;
    msg += `| 📊 Total Transactions | **${transactions.length}** |\n`;

    if (netFlow < 0) {
        msg += `\n⚠️ **Alert:** Negative cash flow this month. Review expenses to balance the budget.`;
    }

    return { success: true, message: msg };
}

async function viewBalanceSheet(entities, context) {
    const [totalAssetValue, totalLiabilities] = await Promise.all([
        prisma.asset.aggregate({ _sum: { purchasePrice: true } }),
        prisma.purchaseOrder.aggregate({
            where: { status: { in: ['PENDING', 'APPROVED', 'ORDERED'] } },
            _sum: { totalAmount: true },
        }),
    ]);

    const assets = totalAssetValue._sum.purchasePrice || 0;
    const liabilities = totalLiabilities._sum.totalAmount || 0;
    const equity = assets - liabilities;

    let msg = `📊 **Balance Sheet Summary**\n\n`;
    msg += `| Category | Amount |\n|----------|--------|\n`;
    msg += `| 🏢 Total Assets | **₹${assets.toLocaleString('en-IN')}** |\n`;
    msg += `| 📋 Outstanding Liabilities | **₹${liabilities.toLocaleString('en-IN')}** |\n`;
    msg += `| 💰 **Net Equity** | **₹${equity.toLocaleString('en-IN')}** |\n`;

    return { success: true, message: msg };
}

// ── General Ledger ──────────────────────────────────────────────
async function listGLAccounts(entities, context) {
    const accounts = await prisma.gLAccount.findMany({
        take: parseInt(entities.limit) || 20,
        orderBy: { code: 'asc' },
        select: { code: true, name: true, type: true, balance: true, isActive: true },
    });

    if (accounts.length === 0) {
        return { success: true, message: '📭 No GL accounts found. Create one to get started.' };
    }

    const typeIcon = { ASSET: '🏢', LIABILITY: '📋', EQUITY: '💰', REVENUE: '📈', EXPENSE: '📉' };
    let msg = `📒 **Chart of Accounts** (${accounts.length} accounts)\n\n`;
    msg += `| Code | Account Name | Type | Balance |\n|------|-------------|------|--------|\n`;
    for (const acc of accounts) {
        const icon = typeIcon[acc.type] || '📄';
        const status = acc.isActive ? '' : ' ⛔';
        msg += `| ${acc.code} | ${acc.name}${status} | ${icon} ${acc.type} | ₹${(acc.balance || 0).toLocaleString('en-IN')} |\n`;
    }

    return { success: true, message: msg, data: accounts };
}

async function createGLAccount(entities, context) {
    const name = entities.accountName || entities.description;
    if (!name) return { success: false, message: 'Please specify the account name.' };

    const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
    let type = (entities.accountType || 'EXPENSE').toUpperCase();
    if (!VALID_TYPES.includes(type)) type = 'EXPENSE';

    const code = entities.accountCode || (type.substring(0, 1) + Date.now().toString().slice(-4));

    const account = await prisma.gLAccount.create({
        data: {
            code,
            name,
            type,
            description: entities.glDescription || `${name} — created via OpsPilot`,
            isActive: true,
        },
    });

    let msg = `📒 **GL Account Created!**\n\n`;
    msg += `| Field | Value |\n|-------|-------|\n`;
    msg += `| **Code** | ${account.code} |\n`;
    msg += `| **Name** | ${account.name} |\n`;
    msg += `| **Type** | ${account.type} |\n`;
    msg += `| **Status** | ✅ Active |\n`;

    return { success: true, message: msg, data: account };
}

// ── Audit Logs ──────────────────────────────────────────────────
async function viewAuditLogs(entities, context) {
    const logs = await prisma.auditLog.findMany({
        take: parseInt(entities.limit) || 15,
        orderBy: { timestamp: 'desc' },
        select: { action: true, resource: true, resourceId: true, timestamp: true, userId: true, details: true },
    });

    if (logs.length === 0) {
        return { success: true, message: '📭 No audit logs found.' };
    }

    let msg = `🛡️ **Recent Audit Logs** (${logs.length} entries)\n\n`;
    msg += `| Time | Action | Resource |\n|------|--------|----------|\n`;
    for (const log of logs) {
        const time = new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const action = log.action || '—';
        const resource = log.resource ? `${log.resource} ${log.resourceId ? '#' + log.resourceId.substring(0, 8) : ''}` : '—';
        msg += `| ${time} | ${action} | ${resource} |\n`;
    }

    return { success: true, message: msg, data: logs };
}

// ── Notifications ───────────────────────────────────────────────
async function listNotifications(entities, context) {
    const notifications = await prisma.notification.findMany({
        where: { recipientId: context.userId },
        take: parseInt(entities.limit) || 15,
        orderBy: { createdAt: 'desc' },
        select: { title: true, message: true, type: true, isRead: true, createdAt: true },
    });

    if (notifications.length === 0) {
        return { success: true, message: '✅ No notifications. You\'re all caught up!' };
    }

    const unread = notifications.filter(n => !n.isRead).length;
    let msg = `🔔 **Notifications** (${notifications.length} total, ${unread} unread)\n\n`;
    for (const n of notifications) {
        const readIcon = n.isRead ? '✅' : '🔵';
        const time = new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        msg += `${readIcon} **${n.title}** — ${time}\n`;
        msg += `   ${n.message}\n\n`;
    }

    return { success: true, message: msg, data: notifications };
}

async function sendNotification(entities, context) {
    const title = entities.title || 'OpsPilot Notification';
    const message = entities.notifMessage || entities.description || 'Notification from OpsPilot AI';

    // Broadcast to all users in the office
    let officeId = context.officeId;
    if (!officeId) {
        const dbUser = await prisma.user.findUnique({ where: { id: context.userId }, select: { officeId: true } });
        officeId = dbUser?.officeId;
    }

    const users = await prisma.user.findMany({
        where: officeId ? { officeId } : {},
        select: { id: true },
        take: 100,
    });

    if (users.length === 0) {
        return { success: false, message: 'No users found to send notifications to.' };
    }

    const notifications = await prisma.notification.createMany({
        data: users.map(u => ({
            recipientId: u.id,
            type: 'SYSTEM_ALERT',
            title,
            message,
        })),
    });

    return {
        success: true,
        message: `🔔 **Notification Sent!**\n\n• **Title**: ${title}\n• **Message**: ${message}\n• **Recipients**: ${users.length} user(s)`,
    };
}

// ── Organizations / Offices ─────────────────────────────────────
async function listOffices(entities, context) {
    const offices = await prisma.office.findMany({
        take: parseInt(entities.limit) || 20,
        orderBy: { name: 'asc' },
        select: { name: true, code: true, city: true, state: true, country: true, _count: { select: { users: true, assets: true } } },
    });

    if (offices.length === 0) {
        return { success: true, message: '📭 No offices/branches found.' };
    }

    let msg = `🏢 **Offices & Branches** (${offices.length} total)\n\n`;
    msg += `| Office | Code | Location | Users | Assets |\n|--------|------|----------|-------|--------|\n`;
    for (const o of offices) {
        const location = [o.city, o.state, o.country].filter(Boolean).join(', ') || '—';
        msg += `| **${o.name}** | ${o.code} | ${location} | ${o._count.users} | ${o._count.assets} |\n`;
    }

    return { success: true, message: msg, data: offices };
}

async function createOffice(entities, context) {
    const name = entities.officeName || entities.description;
    if (!name) return { success: false, message: 'Please specify the office/branch name.' };

    const code = entities.officeCode || name.substring(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-4);

    const office = await prisma.office.create({
        data: {
            name,
            code,
            city: entities.city || null,
            state: entities.state || null,
            country: entities.country || 'India',
            address: entities.address || null,
        },
    });

    let msg = `🏢 **Office Created!**\n\n`;
    msg += `| Field | Value |\n|-------|-------|\n`;
    msg += `| **Name** | ${office.name} |\n`;
    msg += `| **Code** | ${office.code} |\n`;
    if (office.city) msg += `| **City** | ${office.city} |\n`;
    if (office.state) msg += `| **State** | ${office.state} |\n`;
    msg += `| **Country** | ${office.country || 'India'} |\n`;

    return { success: true, message: msg, data: office };
}

// ── Users ───────────────────────────────────────────────────────
async function listUsers(entities, context) {
    const users = sanitize(await prisma.user.findMany({
        take: parseInt(entities.limit) || 20,
        orderBy: { name: 'asc' },
        include: { office: true },
    }));

    if (users.length === 0) {
        return { success: true, message: '📭 No users found.' };
    }

    const roleIcon = { SUPER_ADMIN: '👑', ADMIN: '🔑', MANAGER: '📊', STAFF: '👤', VIEWER: '👁️' };
    let msg = `👥 **Users** (${users.length} total)\n\n`;
    msg += `| Name | Role | Office | Status |\n|------|------|--------|--------|\n`;
    for (const u of users) {
        const icon = roleIcon[u.role] || '👤';
        const active = u.isActive !== false && u.status !== 'INACTIVE';
        const status = active ? '✅' : '⛔';
        msg += `| **${u.name}** | ${icon} ${u.role} | ${u.office?.name || '—'} | ${status} |\n`;
    }

    return { success: true, message: msg, data: users };
}

// ── Analytics ───────────────────────────────────────────────────
async function viewAnalytics(entities, context) {
    const where = {};
    if (context.officeId) where.officeId = context.officeId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
        assetsByCategory, monthlyIncome, monthlyExpense,
        ticketsByPriority, inventoryValue, vendorCount
    ] = await Promise.all([
        prisma.asset.groupBy({ by: ['category'], _count: true, orderBy: { _count: { category: 'desc' } }, take: 5 }),
        prisma.transaction.aggregate({ where: { type: 'INCOME', date: { gte: startOfMonth } }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { type: 'EXPENSE', date: { gte: startOfMonth } }, _sum: { amount: true } }),
        prisma.maintenanceTicket.groupBy({ by: ['priority'], where: { status: { not: 'COMPLETED' } }, _count: true }),
        prisma.inventory.aggregate({ _sum: { currentQuantity: true } }),
        prisma.vendor.count({ where: { isBlacklisted: false } }),
    ]);

    let msg = `📊 **Analytics Overview**\n\n`;

    // Assets by category
    msg += `**🖥️ Assets by Category**\n`;
    for (const cat of assetsByCategory) {
        msg += `• ${cat.category}: **${cat._count}**\n`;
    }

    // Financial summary
    const income = monthlyIncome._sum.amount || 0;
    const expense = monthlyExpense._sum.amount || 0;
    msg += `\n**💰 This Month's Financials**\n`;
    msg += `• Income: ₹${income.toLocaleString('en-IN')}\n`;
    msg += `• Expenses: ₹${expense.toLocaleString('en-IN')}\n`;
    msg += `• Net: ₹${(income - expense).toLocaleString('en-IN')}\n`;

    // Tickets by priority
    if (ticketsByPriority.length > 0) {
        const prioIcon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };
        msg += `\n**🔧 Open Tickets by Priority**\n`;
        for (const t of ticketsByPriority) {
            msg += `• ${prioIcon[t.priority] || ''} ${t.priority}: **${t._count}**\n`;
        }
    }

    msg += `\n• 📦 Total Inventory Units: **${(inventoryValue._sum.currentQuantity || 0).toLocaleString()}**`;
    msg += `\n• 🏢 Active Vendors: **${vendorCount}**`;

    return { success: true, message: msg };
}

// ── Documents ───────────────────────────────────────────────────
async function listDocuments(entities, context) {
    const documents = await prisma.document.findMany({
        take: parseInt(entities.limit) || 15,
        orderBy: { createdAt: 'desc' },
        select: { name: true, type: true, path: true, createdAt: true, uploadedBy: { select: { name: true } } },
    });

    if (documents.length === 0) {
        return { success: true, message: '📭 No documents found.' };
    }

    let msg = `📄 **Documents** (${documents.length} found)\n\n`;
    msg += `| Document | Type | Uploaded By | Date |\n|----------|------|-------------|------|\n`;
    for (const doc of documents) {
        const date = new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        msg += `| **${doc.name}** | ${doc.type || '—'} | ${doc.uploadedBy?.name || '—'} | ${date} |\n`;
    }

    return { success: true, message: msg, data: documents };
}

// ── Profile ─────────────────────────────────────────────────────
async function viewProfile(entities, context) {
    // Fetch full user — sanitize() will strip all secrets
    const raw = await prisma.user.findUnique({
        where: { id: context.userId },
        include: { office: true },
    });

    if (!raw) return { success: false, message: 'Could not find your profile.' };
    const user = sanitize(raw);

    const roleIcon = { SUPER_ADMIN: '👑', ADMIN: '🔑', MANAGER: '📊', STAFF: '👤', VIEWER: '👁️' };
    let msg = `👤 **Your Profile**\n\n`;
    msg += `| Field | Value |\n|-------|-------|\n`;
    msg += `| **Name** | ${user.name || '—'} |\n`;
    msg += `| **Email** | ${user.email || '—'} |\n`;
    msg += `| **Role** | ${roleIcon[user.role] || ''} ${user.role || '—'} |\n`;
    const isActive = user.isActive !== false && user.status !== 'INACTIVE';
    msg += `| **Status** | ${isActive ? '✅ Active' : '⛔ Inactive'} |\n`;
    if (user.phone) msg += `| **Phone** | ${user.phone} |\n`;
    msg += `| **Office** | ${user.office?.name || '—'} (${user.office?.code || '—'}) |\n`;
    if (user.lastLogin) msg += `| **Last Login** | ${new Date(user.lastLogin).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} |\n`;
    msg += `| **Joined** | ${new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} |\n`;

    return { success: true, message: msg, data: user };
}

// ── Close Maintenance Ticket ──────────────────────────────────────
async function closeMaintenance(entities, context) {
    let ticketId = entities.ticketId;
    let assetId = entities.assetId;

    if (!ticketId && !assetId) {
        return { success: false, message: 'Please specify the ticket ID or the asset name to close the maintenance for.' };
    }

    let ticket = null;

    if (ticketId) {
        ticket = await prisma.maintenanceTicket.findFirst({
            where: {
                OR: [
                    { id: ticketId },
                    { ticketNumber: { contains: ticketId, mode: 'insensitive' } },
                ],
                officeId: context.officeId
            },
        });
    } else if (assetId) {
        // Find by asset name if no ticket ID was given
        const normalizedAssetId = String(assetId).replace(/-/g, ' ');
        const asset = await prisma.asset.findFirst({
            where: {
                OR: [
                    { id: assetId },
                    { guai: { contains: String(assetId), mode: 'insensitive' } },
                    { name: { contains: String(assetId), mode: 'insensitive' } },
                    { name: { contains: normalizedAssetId, mode: 'insensitive' } },
                ],
                officeId: context.officeId
            },
            select: { id: true, name: true }
        });

        if (!asset) return { success: false, message: `Could not find asset "${assetId}" to close ticket for.` };

        // Find the active ticket for this asset
        ticket = await prisma.maintenanceTicket.findFirst({
            where: {
                assetId: asset.id,
                status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!ticket) return { success: false, message: `Asset "${asset.name}" has no active maintenance tickets.` };
    }

    if (!ticket) return { success: false, message: `Ticket not found or already closed.` };

    const updated = await prisma.maintenanceTicket.update({
        where: { id: ticket.id },
        data: {
            status: 'COMPLETED',
            completedDate: new Date(),
            resolution: entities.description || 'Completed via OpsPilot'
        }
    });

    return {
        success: true,
        message: `✅ **Ticket Closed!**\n\n• **Ticket**: ${updated.ticketNumber}\n• **Status**: COMPLETED`,
        data: updated,
    };
}

// ── Update Maintenance Ticket ───────────────────────────────────
async function updateTicket(entities, context) {
    const ticketId = entities.ticketId;
    if (!ticketId) return { success: false, message: 'Please specify a ticket ID to update.' };

    const ticket = await prisma.maintenanceTicket.findFirst({
        where: {
            OR: [
                { id: ticketId },
                { ticketNumber: { contains: ticketId, mode: 'insensitive' } },
            ],
        },
    });
    if (!ticket) return { success: false, message: `Ticket "${ticketId}" not found.` };

    const updateData = {};
    if (entities.priority) updateData.priority = entities.priority.toUpperCase();
    if (entities.status) updateData.status = entities.status.toUpperCase();
    if (entities.description) updateData.issueDescription = entities.description;

    if (Object.keys(updateData).length === 0) {
        return { success: false, message: 'No fields to update. Specify priority, status, or description.' };
    }

    const updated = await prisma.maintenanceTicket.update({ where: { id: ticket.id }, data: updateData });

    return {
        success: true,
        message: `✅ **Ticket Updated!**\n\n• **Ticket**: ${updated.ticketNumber}\n• **Fields changed**: ${Object.keys(updateData).join(', ')}`,
        data: updated,
    };
}

// ─── v6: PREDICTIVE MAINTENANCE ─────────────────────────────────

async function predictMaintenance(entities, context) {
    const officeFilter = context.officeId ? { officeId: context.officeId } : {};

    // Get top assets by ticket count
    const assets = await prisma.asset.findMany({
        where: { ...officeFilter, status: 'ACTIVE' },
        take: 10,
        include: {
            maintenanceTickets: {
                select: { createdAt: true, priority: true, actualCost: true, estimatedCost: true },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (assets.length === 0) {
        return { success: true, message: '📊 No active assets found to predict maintenance for.' };
    }

    // Analyze each asset
    const results = assets
        .filter(a => a.maintenanceTickets.length >= 2)
        .map(asset => {
            const tickets = asset.maintenanceTickets;
            const sorted = [...tickets].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            // MTBF calculation
            let totalDays = 0;
            for (let i = 1; i < sorted.length; i++) {
                totalDays += (new Date(sorted[i].createdAt) - new Date(sorted[i - 1].createdAt)) / (1000 * 60 * 60 * 24);
            }
            const mtbf = Math.round(totalDays / (sorted.length - 1));

            // Risk score
            const criticalCount = tickets.filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH').length;
            const riskScore = Math.min(100, Math.round(tickets.length * 10 + criticalCount * 15 + Math.max(0, 100 - mtbf)));
            const riskLevel = riskScore > 70 ? '🔴 CRITICAL' : riskScore > 50 ? '🟠 HIGH' : riskScore > 30 ? '🟡 MEDIUM' : '🟢 LOW';

            // Predict next failure (last date + MTBF)
            const lastTicketDate = new Date(sorted[sorted.length - 1].createdAt);
            const predictedDate = new Date(lastTicketDate.getTime() + mtbf * 24 * 60 * 60 * 1000);

            return { name: asset.name, guai: asset.guai, ticketCount: tickets.length, mtbf, riskScore, riskLevel, predictedDate };
        })
        .sort((a, b) => b.riskScore - a.riskScore);

    if (results.length === 0) {
        return { success: true, message: '📊 Not enough maintenance history to make predictions. Assets need at least 2 maintenance tickets.' };
    }

    let msg = `🔮 **Predictive Maintenance Report**\n\n`;
    msg += `| Asset | Tickets | MTBF (days) | Risk | Next Predicted |\n`;
    msg += `|-------|---------|-------------|------|----------------|\n`;
    for (const r of results.slice(0, 8)) {
        msg += `| **${r.name}** | ${r.ticketCount} | ${r.mtbf}d | ${r.riskLevel} | ${r.predictedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} |\n`;
    }

    const highRisk = results.filter(r => r.riskScore > 50);
    if (highRisk.length > 0) {
        msg += `\n⚠️ **${highRisk.length} asset(s) at elevated risk** — consider scheduling preventive maintenance.`;
    }

    return { success: true, message: msg, data: results };
}


module.exports = { execute, fetchContextData };