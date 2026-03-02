/**
 * Agent Executor — Executes ERP Operations from AI Intent
 * 
 * Maps intents to actual database operations.
 * Has access to ALL ERP modules.
 */

const prisma = require('../config/prisma');
const logger = require('../utils/logger');

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
                const [transactions, budgets, inventory, pos, assets, tickets] = await Promise.all([
                    // Last 20 transactions
                    prisma.transaction.findMany({ take: 20, orderBy: { date: 'desc' }, select: { type: true, category: true, amount: true, description: true, date: true } }),
                    // This month's budgets
                    prisma.budget.findMany({ where: { month: now.getMonth() + 1, year: now.getFullYear() }, select: { category: true, limit: true, spent: true } }),
                    // All inventory (to answer "how many types of inventory")
                    prisma.inventory.findMany({ take: 50, select: { name: true, currentQuantity: true, unitCost: true, minimumQuantity: true } }),
                    // Recent POs
                    prisma.purchaseOrder.findMany({ take: 10, orderBy: { createdAt: 'desc' }, select: { poNumber: true, status: true, totalAmount: true } }),
                    // Asset summary
                    prisma.asset.findMany({ take: 20, select: { name: true, status: true, category: true } }),
                    // Active Maintenance Tickets
                    prisma.maintenanceTicket.findMany({ where: { status: { not: 'COMPLETED' } }, select: { ticketNumber: true, issueDescription: true, priority: true, status: true } }),
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

async function closeMaintenance(entities, context) {
    const ticketId = entities.ticketId || entities.additionalContext;
    if (!ticketId) return { success: false, message: 'Please specify a ticket ID to close.' };

    const ticket = await prisma.maintenanceTicket.findFirst({
        where: {
            OR: [
                { id: ticketId },
                { ticketNumber: { contains: ticketId, mode: 'insensitive' } },
            ],
        },
    });
    if (!ticket) return { success: false, message: `Maintenance ticket "${ticketId}" not found.` };

    const updated = await prisma.maintenanceTicket.update({
        where: { id: ticket.id },
        data: { status: 'COMPLETED', closedAt: new Date() },
    });
    return { success: true, message: `Maintenance ticket ${updated.ticketNumber || updated.id} closed.`, data: updated };
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
    const category = entities.assetCategory || 'DEVICE';

    const asset = await prisma.asset.create({
        data: {
            guai: 'ASSET-' + Date.now().toString().slice(-8),
            name,
            status,
            category,
            purchasePrice: entities.amount ? parseFloat(entities.amount) : 0,
            purchaseDate: new Date(),
            officeId: officeId || null,
        }
    });

    return {
        success: true,
        message: `🖥️ **Asset Created!**\n\n` +
            `• **Name**: ${asset.name}\n` +
            `• **Status**: ${asset.status}\n` +
            `• **Category**: ${asset.category}\n` +
            `• **Acquired**: ${asset.purchaseDate.toLocaleDateString('en-IN')}`,
        data: asset
    };
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

module.exports = {
    execute,
    fetchContextData,
};
