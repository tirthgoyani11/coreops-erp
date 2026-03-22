const prisma = require('../config/prisma');
const { postTransactionToGL } = require('../services/financePostingService');
const { publishEvent } = require('../coreops/eventBus');
const { evaluateEvent } = require('../coreops/automationEngine');

function normalizeEntityType(value) {
    const v = String(value || '').trim().toUpperCase();
    if (['ASSET', 'FIXED_ASSET', 'CAPEX'].includes(v)) return 'ASSET';
    if (['INVENTORY', 'STOCK', 'PRODUCT', 'SPARE'].includes(v)) return 'INVENTORY';
    return null;
}

function inferEntityType(category, description) {
    const text = `${String(category || '')} ${String(description || '')}`.toLowerCase();
    if (/(asset|capex|equipment|machinery|laptop|server|vehicle|furniture)/.test(text)) return 'ASSET';
    if (/(inventory|stock|material|raw|spare|item|product)/.test(text)) return 'INVENTORY';
    return null;
}

async function resolveOfficeIdForRequest(req) {
    let officeId = req.user.office?.id || req.user.officeId;
    if (!officeId) {
        const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { officeId: true } });
        officeId = dbUser?.officeId;
    }
    if (!officeId) {
        const firstOffice = await prisma.office.findFirst({ select: { id: true } });
        officeId = firstOffice?.id;
    }
    return officeId || null;
}

async function generateGuai(tx, officeId) {
    const office = await tx.office.findUnique({
        where: { id: officeId },
        select: { countryCode: true, locationCode: true, code: true },
    });
    const countryCode = office?.countryCode || 'IN';
    const locationCode = office?.locationCode || office?.code || 'HQ';

    const counter = await tx.counter.upsert({
        where: { name: 'asset_guai' },
        update: { sequence: { increment: 1 } },
        create: { name: 'asset_guai', prefix: 'GUAI', sequence: 1 },
    });

    const seq = String(counter.sequence).padStart(6, '0');
    return `${countryCode}-${locationCode}-${seq}`;
}

async function materializeLinkedExpenseEntity({ tx, entityType, req, officeId, amount, referenceId, category, description }) {
    const payloadAsset = req.body.asset || {};
    const payloadInventory = req.body.inventory || {};

    if (entityType === 'ASSET') {
        if (referenceId) {
            const existingAsset = await tx.asset.findUnique({ where: { id: referenceId }, select: { id: true } });
            if (!existingAsset) throw new Error('Referenced asset not found');
            return { entityType: 'ASSET', referenceId: existingAsset.id, created: false };
        }

        const office = await tx.office.findUnique({ where: { id: officeId }, select: { baseCurrency: true } });
        const guai = await generateGuai(tx, officeId);
        const asset = await tx.asset.create({
            data: {
                guai,
                name: payloadAsset.name || description || `Asset ${Date.now().toString().slice(-6)}`,
                category: String(payloadAsset.category || 'OTHER').toUpperCase(),
                manufacturer: payloadAsset.manufacturer || null,
                model: payloadAsset.model || null,
                serialNumber: payloadAsset.serialNumber || null,
                purchasePrice: Number(amount || 0),
                purchaseDate: payloadAsset.purchaseDate ? new Date(payloadAsset.purchaseDate) : new Date(),
                currency: String(office?.baseCurrency || 'INR').toUpperCase(),
                purchaseOrderNumber: payloadAsset.purchaseOrderNumber || null,
                invoiceNumber: payloadAsset.invoiceNumber || null,
                vendorId: payloadAsset.vendorId || null,
                officeId,
                status: 'ACTIVE',
                currentBookValue: Number(amount || 0),
                createdById: req.user.id,
            },
            select: { id: true, guai: true, name: true },
        });

        return { entityType: 'ASSET', referenceId: asset.id, created: true, asset };
    }

    if (entityType === 'INVENTORY') {
        const quantity = Math.max(1, Number(payloadInventory.quantity || req.body.quantity || 1));
        const unitCost = Number(payloadInventory.unitCost || payloadInventory.costPrice || (Number(amount || 0) / quantity) || 0);

        if (referenceId) {
            const existingInventory = await tx.inventory.findUnique({ where: { id: referenceId } });
            if (!existingInventory) throw new Error('Referenced inventory item not found');

            const updated = await tx.inventory.update({
                where: { id: referenceId },
                data: {
                    currentQuantity: { increment: quantity },
                    lastPurchasePrice: unitCost > 0 ? unitCost : existingInventory.lastPurchasePrice,
                    lastPurchaseDate: new Date(),
                    unitCost: unitCost > 0 ? unitCost : existingInventory.unitCost,
                    costPrice: unitCost > 0 ? unitCost : existingInventory.costPrice,
                },
                select: { id: true, name: true, sku: true },
            });

            await tx.stockMovement.create({
                data: {
                    inventoryId: updated.id,
                    type: 'STOCK_IN',
                    quantity,
                    reason: 'Auto stock-in from finance expense transaction',
                    reference: `FIN-${Date.now()}`,
                    performedById: req.user.id,
                },
            });

            return { entityType: 'INVENTORY', referenceId: updated.id, created: false, inventory: updated };
        }

        const generatedSku = payloadInventory.sku || `AUTO-${Date.now().toString().slice(-8)}`;
        const createdInventory = await tx.inventory.create({
            data: {
                name: payloadInventory.name || description || `Inventory ${Date.now().toString().slice(-6)}`,
                type: String(payloadInventory.type || 'PRODUCT').toUpperCase(),
                description: payloadInventory.description || description || null,
                sku: generatedSku,
                partNumber: payloadInventory.partNumber || null,
                category: payloadInventory.category || category || 'GENERAL',
                subcategory: payloadInventory.subcategory || null,
                officeId,
                trackingType: payloadInventory.trackingType || 'QUANTITY',
                currentQuantity: quantity,
                reorderPoint: Number(payloadInventory.reorderPoint || 10),
                reorderQuantity: Number(payloadInventory.reorderQuantity || 50),
                minimumQuantity: Number(payloadInventory.minimumQuantity || 5),
                unit: payloadInventory.unit || 'pieces',
                unitCost: unitCost > 0 ? unitCost : null,
                costPrice: unitCost > 0 ? unitCost : null,
                pricingCurrency: payloadInventory.pricingCurrency || 'INR',
                lastPurchasePrice: unitCost > 0 ? unitCost : null,
                lastPurchaseDate: new Date(),
            },
            select: { id: true, name: true, sku: true },
        });

        await tx.stockMovement.create({
            data: {
                inventoryId: createdInventory.id,
                type: 'STOCK_IN',
                quantity,
                reason: 'Auto stock-in from finance expense transaction',
                reference: generatedSku,
                performedById: req.user.id,
            },
        });

        return { entityType: 'INVENTORY', referenceId: createdInventory.id, created: true, inventory: createdInventory };
    }

    return null;
}

function firstJsonObject(text) {
    const src = String(text || '');
    const match = src.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

function inferAmountFromText(text) {
    const src = String(text || '');
    const m = src.match(/(?:rs\.?|inr|₹)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
    if (!m?.[1]) return null;
    const parsed = Number(String(m[1]).replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function createAutoRecordedTransaction({ req, officeId, input }) {
    const type = String(input.type || 'EXPENSE').toUpperCase();
    const category = String(input.category || 'AUTOMATION').toUpperCase();
    const amount = Number(input.amount || 0);
    const description = input.description || `${input.sourceModule || 'SYSTEM'} automated finance record`;
    const referenceType = input.referenceType || 'MANUAL';
    const referenceId = input.referenceId || null;
    const linkedEntityType = normalizeEntityType(input.linkedEntityType);
    const autoCreateEntity = input.autoCreateEntity !== false;

    if (!['INCOME', 'EXPENSE'].includes(type)) {
        throw new Error('type must be INCOME or EXPENSE');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('amount must be a positive number');
    }

    let linkedEntity = null;

    const transaction = await prisma.$transaction(async (tx) => {
        let effectiveReferenceId = referenceId;
        let effectiveReferenceType = referenceType;

        if (type === 'EXPENSE' && autoCreateEntity && linkedEntityType) {
            linkedEntity = await materializeLinkedExpenseEntity({
                tx,
                entityType: linkedEntityType,
                req,
                officeId,
                amount,
                referenceId: effectiveReferenceId,
                category,
                description,
            });

            if (linkedEntity?.referenceId) {
                effectiveReferenceId = linkedEntity.referenceId;
                effectiveReferenceType = 'MANUAL';
            }
        }

        const created = await tx.transaction.create({
            data: {
                type,
                category,
                amount,
                description,
                referenceType: effectiveReferenceType,
                referenceId: effectiveReferenceId,
                date: input.date ? new Date(input.date) : new Date(),
                officeId: officeId || null,
                recordedById: req.user.id,
                status: 'CLEARED',
            },
        });

        await postTransactionToGL({ tx, transaction: created, userId: req.user.id });
        return created;
    });

    const financeEvent = await publishEvent('finance.transaction.created', {
        transactionId: transaction.id,
        officeId,
        amount,
        category,
        sourceModule: input.sourceModule || 'AUTOMATION',
        referenceType,
        referenceId,
    }, {
        source: 'finance.automation.intake',
        officeId,
        actorId: req.user?.id || null,
    });

    await evaluateEvent(financeEvent, {
        source: 'finance.automation.intake',
        officeId,
        actorId: req.user?.id || null,
    });

    return { transaction, linkedEntity };
}

// @desc    Get All Transactions
// @route   GET /api/finance/transactions
exports.getTransactions = async (req, res) => {
    try {
        const { type, category, startDate, endDate, page = 1, limit = 50 } = req.query;
        const where = {};

        const take = Math.min(parseInt(limit) || 50, 200);
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

        // Scope to office unless super admin
        if (req.user.role !== 'SUPER_ADMIN') {
            where.officeId = req.user.office?.id || req.user.officeId;
        }

        if (type) where.type = type;
        if (category) where.category = category;
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                include: { recordedBy: { select: { id: true, name: true } } },
                skip,
                take,
            }),
            prisma.transaction.count({ where }),
        ]);

        res.status(200).json({
            success: true,
            count: transactions.length,
            total,
            page: Math.max(parseInt(page) || 1, 1),
            totalPages: Math.ceil(total / take),
            data: transactions,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Create Transaction
// @route   POST /api/finance/transactions
exports.createTransaction = async (req, res) => {
    try {
        const { type, category, amount, description, referenceType, referenceId, date, linkedEntityType, autoCreateEntity } = req.body;

        // Input validation
        if (!type || !['INCOME', 'EXPENSE'].includes(type)) {
            return res.status(400).json({ success: false, message: 'type must be INCOME or EXPENSE' });
        }
        if (!category || typeof category !== 'string') {
            return res.status(400).json({ success: false, message: 'category is required' });
        }
        if (amount == null || isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'amount must be a positive number' });
        }

        const officeId = await resolveOfficeIdForRequest(req);

        if (type === 'EXPENSE') {
            const { detectDuplicateTransaction } = require('../utils/anomaly');
            const dupeCheck = await detectDuplicateTransaction({ vendor: description, amount, date, officeId }, prisma);
            if (dupeCheck.isDuplicate && dupeCheck.confidence > 0.8) {
                return res.status(400).json({ success: false, message: dupeCheck.message, isDuplicate: true });
            }
        }

        let budgetWarning = null;
        let linkedEntity = null;

        const transaction = await prisma.$transaction(async (tx) => {
            const effectiveEntityType = normalizeEntityType(linkedEntityType || req.body.entityType || req.body.relatedEntityType) || inferEntityType(category, description);
            const shouldAutoMaterialize = type === 'EXPENSE' && autoCreateEntity !== false && effectiveEntityType;

            let effectiveReferenceId = referenceId || null;
            let effectiveReferenceType = referenceType || 'MANUAL';

            if (shouldAutoMaterialize) {
                linkedEntity = await materializeLinkedExpenseEntity({
                    tx,
                    entityType: effectiveEntityType,
                    req,
                    officeId,
                    amount: Number(amount),
                    referenceId: effectiveReferenceId,
                    category,
                    description,
                });

                if (linkedEntity?.referenceId) {
                    effectiveReferenceId = linkedEntity.referenceId;
                    effectiveReferenceType = 'MANUAL';
                }
            }

            const createdTransaction = await tx.transaction.create({
                data: {
                    type,
                    category,
                    amount,
                    description,
                    referenceType: effectiveReferenceType,
                    referenceId: effectiveReferenceId,
                    date: date ? new Date(date) : new Date(),
                    officeId: officeId || null,
                    recordedById: req.user.id,
                },
            });

            // Auto-post to GL for zero-manual accounting entries.
            await postTransactionToGL({ tx, transaction: createdTransaction, userId: req.user.id });

            if (type === 'EXPENSE' && officeId) {
                const dateObj = new Date(createdTransaction.date);
                const month = dateObj.getMonth() + 1;
                const year = dateObj.getFullYear();

                const budget = await tx.budget.findUnique({
                    where: {
                        officeId_category_month_year: {
                            officeId,
                            category,
                            month,
                            year,
                        },
                    },
                });

                if (budget) {
                    const updatedBudget = await tx.budget.update({
                        where: { id: budget.id },
                        data: { spent: { increment: amount } },
                    });

                    if (updatedBudget.spent >= updatedBudget.limit * 0.9) {
                        budgetWarning = `Budget variance alert: ${category} spending (₹${updatedBudget.spent.toLocaleString()}) has exceeded 90% of the monthly limit (₹${updatedBudget.limit.toLocaleString()}).`;
                    }
                }
            }

            return createdTransaction;
        });

        const expenseEventName = type === 'EXPENSE' ? 'finance.expense.created' : 'finance.income.created';
        const financeEvent = await publishEvent(expenseEventName, {
            transactionId: transaction.id,
            officeId,
            amount: Number(amount),
            category,
            linkedEntityType: linkedEntity?.entityType || null,
            linkedEntityId: linkedEntity?.referenceId || null,
        }, {
            source: 'finance.transaction.controller',
            officeId,
            actorId: req.user?.id || null,
        });

        await evaluateEvent(financeEvent, {
            source: 'finance.transaction.controller',
            officeId,
            actorId: req.user?.id || null,
        });

        res.status(201).json({
            success: true,
            data: transaction,
            ...(linkedEntity ? { linkedEntity } : {}),
            ...(budgetWarning ? { warning: budgetWarning } : {}),
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Set/Update Budget
// @route   POST /api/finance/budgets
exports.setBudget = async (req, res) => {
    try {
        const { category, month, year, limit } = req.body;
        let officeId = req.user.office?.id || req.user.officeId;
        if (!officeId) {
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { officeId: true } });
            officeId = dbUser?.officeId;
        }
        if (!officeId) {
            const firstOffice = await prisma.office.findFirst({ select: { id: true } });
            officeId = firstOffice?.id;
        }
        if (!officeId) {
            return res.status(400).json({ success: false, message: 'No office found. Please assign an office to your account.' });
        }

        const budget = await prisma.budget.upsert({
            where: {
                officeId_category_month_year: {
                    officeId,
                    category,
                    month: parseInt(month),
                    year: parseInt(year),
                },
            },
            update: { limit },
            create: {
                officeId,
                category,
                month: parseInt(month),
                year: parseInt(year),
                limit,
            },
        });

        res.status(200).json({ success: true, data: budget });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get Budgets Status
// @route   GET /api/finance/budgets
exports.getBudgets = async (req, res) => {
    try {
        const { month, year } = req.query;
        const where = {};
        let officeId = req.user.office?.id || req.user.officeId;
        if (!officeId) {
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { officeId: true } });
            officeId = dbUser?.officeId;
        }
        if (!officeId) {
            const firstOffice = await prisma.office.findFirst({ select: { id: true } });
            officeId = firstOffice?.id;
        }
        if (officeId) where.officeId = officeId;

        if (month) where.month = parseInt(month);
        if (year) where.year = parseInt(year);

        const budgets = await prisma.budget.findMany({ where });
        res.status(200).json({ success: true, data: budgets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─── PHASE 2: AP/AR AGING + GST ────────────────────────────────

// @desc    Accounts Payable Aging Report
// @route   GET /api/finance/ap-aging
exports.getAPAging = async (req, res) => {
    try {
        const now = new Date();

        // Get all invoices with outstanding amounts (type: PURCHASE/EXPENSE)
        const invoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
                ...(req.user.role !== 'SUPER_ADMIN' ? { officeId: req.user.officeId } : {}),
            },
            orderBy: { dueDate: 'asc' },
        });

        // Bucket into aging periods
        const buckets = { current: [], days30: [], days60: [], days90: [], over90: [] };
        let totalOutstanding = 0;

        for (const inv of invoices) {
            const outstanding = (inv.totalAmount || 0) - (inv.paidAmount || 0);
            if (outstanding <= 0) continue;

            totalOutstanding += outstanding;
            const daysOverdue = Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));

            const item = {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                vendorName: inv.vendorName,
                totalAmount: inv.totalAmount,
                outstanding,
                dueDate: inv.dueDate,
                daysOverdue: Math.max(0, daysOverdue),
            };

            if (daysOverdue <= 0) buckets.current.push(item);
            else if (daysOverdue <= 30) buckets.days30.push(item);
            else if (daysOverdue <= 60) buckets.days60.push(item);
            else if (daysOverdue <= 90) buckets.days90.push(item);
            else buckets.over90.push(item);
        }

        res.json({
            success: true,
            data: {
                buckets,
                summary: {
                    current: buckets.current.reduce((s, i) => s + i.outstanding, 0),
                    '1-30': buckets.days30.reduce((s, i) => s + i.outstanding, 0),
                    '31-60': buckets.days60.reduce((s, i) => s + i.outstanding, 0),
                    '61-90': buckets.days90.reduce((s, i) => s + i.outstanding, 0),
                    '90+': buckets.over90.reduce((s, i) => s + i.outstanding, 0),
                    total: totalOutstanding,
                },
                count: invoices.length,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Accounts Receivable Aging Report
// @route   GET /api/finance/ar-aging
exports.getARAging = async (req, res) => {
    try {
        const now = new Date();

        // Get outstanding income-related transactions (receivables)
        const transactions = await prisma.transaction.findMany({
            where: {
                type: 'INCOME',
                status: 'PENDING',
                ...(req.user.role !== 'SUPER_ADMIN' ? { officeId: req.user.officeId } : {}),
            },
            orderBy: { date: 'asc' },
        });

        const buckets = { current: [], days30: [], days60: [], days90: [], over90: [] };
        let totalReceivable = 0;

        for (const txn of transactions) {
            totalReceivable += txn.amount;
            const daysOld = Math.floor((now - new Date(txn.date)) / (1000 * 60 * 60 * 24));

            const item = {
                id: txn.id,
                description: txn.description,
                amount: txn.amount,
                category: txn.category,
                date: txn.date,
                daysOld,
            };

            if (daysOld <= 30) buckets.current.push(item);
            else if (daysOld <= 60) buckets.days30.push(item);
            else if (daysOld <= 90) buckets.days60.push(item);
            else if (daysOld <= 120) buckets.days90.push(item);
            else buckets.over90.push(item);
        }

        res.json({
            success: true,
            data: {
                buckets,
                summary: {
                    '0-30': buckets.current.reduce((s, i) => s + i.amount, 0),
                    '31-60': buckets.days30.reduce((s, i) => s + i.amount, 0),
                    '61-90': buckets.days60.reduce((s, i) => s + i.amount, 0),
                    '91-120': buckets.days90.reduce((s, i) => s + i.amount, 0),
                    '120+': buckets.over90.reduce((s, i) => s + i.amount, 0),
                    total: totalReceivable,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    GST Summary for a period
// @route   GET /api/finance/gst-summary
exports.getGSTSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : now;

        const officeFilter = req.user.role !== 'SUPER_ADMIN'
            ? { officeId: req.user.officeId }
            : {};

        // Get all transactions in period
        const transactions = await prisma.transaction.findMany({
            where: {
                date: { gte: start, lte: end },
                status: 'CLEARED',
                ...officeFilter,
            },
        });

        // Calculate GST at 18% (standard Indian GST rate)
        const gstRate = 0.18;
        const income = transactions.filter(t => t.type === 'INCOME');
        const expenses = transactions.filter(t => t.type === 'EXPENSE');

        const totalSales = income.reduce((s, t) => s + t.amount, 0);
        const totalPurchases = expenses.reduce((s, t) => s + t.amount, 0);

        // GST collected on sales (output GST)
        const outputGST = totalSales * gstRate / (1 + gstRate); // GST included in price
        // GST paid on purchases (input GST credit)
        const inputGST = totalPurchases * gstRate / (1 + gstRate);
        // Net GST payable
        const netGST = outputGST - inputGST;

        res.json({
            success: true,
            data: {
                period: { startDate: start, endDate: end },
                sales: {
                    total: Math.round(totalSales * 100) / 100,
                    taxableValue: Math.round((totalSales / (1 + gstRate)) * 100) / 100,
                    cgst: Math.round((outputGST / 2) * 100) / 100,
                    sgst: Math.round((outputGST / 2) * 100) / 100,
                    igst: 0,
                    totalGST: Math.round(outputGST * 100) / 100,
                },
                purchases: {
                    total: Math.round(totalPurchases * 100) / 100,
                    taxableValue: Math.round((totalPurchases / (1 + gstRate)) * 100) / 100,
                    cgst: Math.round((inputGST / 2) * 100) / 100,
                    sgst: Math.round((inputGST / 2) * 100) / 100,
                    igst: 0,
                    totalGST: Math.round(inputGST * 100) / 100,
                },
                netLiability: {
                    cgst: Math.round(((outputGST - inputGST) / 2) * 100) / 100,
                    sgst: Math.round(((outputGST - inputGST) / 2) * 100) / 100,
                    igst: 0,
                    total: Math.round(netGST * 100) / 100,
                },
                transactionCount: transactions.length,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Finance automation feed and control-tower metrics
// @route   GET /api/finance/automation-feed
exports.getAutomationFeed = async (req, res) => {
    try {
        const officeWhere = req.user.role !== 'SUPER_ADMIN'
            ? { officeId: req.user.office?.id || req.user.officeId }
            : {};

        const [recentTransactions, recentJournalEntries] = await Promise.all([
            prisma.transaction.findMany({
                where: officeWhere,
                orderBy: { date: 'desc' },
                take: 30,
                include: {
                    recordedBy: { select: { id: true, name: true } },
                },
            }),
            prisma.journalEntry.findMany({
                where: officeWhere,
                orderBy: { date: 'desc' },
                take: 20,
                include: {
                    createdBy: { select: { id: true, name: true } },
                },
            }),
        ]);

        const total = recentTransactions.length;
        const autoCovered = recentTransactions.filter((t) => String(t.referenceType || '').toUpperCase() !== 'MANUAL').length;
        const manual = total - autoCovered;
        const autoCoveragePct = total > 0 ? Number(((autoCovered / total) * 100).toFixed(1)) : 0;

        const byCategory = recentTransactions.reduce((acc, t) => {
            const key = t.category || 'UNCATEGORIZED';
            acc[key] = (acc[key] || 0) + Number(t.amount || 0);
            return acc;
        }, {});

        const exceptionSignals = recentTransactions.filter((t) => {
            const status = String(t.status || '').toUpperCase();
            return ['PENDING', 'FAILED', 'REVERSED'].includes(status);
        });

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    recentTransactionCount: total,
                    autoRecordedCount: autoCovered,
                    manualRecordedCount: manual,
                    autoCoveragePct,
                },
                topCategoryFlow: Object.entries(byCategory)
                    .map(([category, amount]) => ({ category, amount }))
                    .sort((a, b) => Number(b.amount) - Number(a.amount))
                    .slice(0, 8),
                exceptions: exceptionSignals.slice(0, 10),
                recentTransactions,
                recentJournalEntries,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    AI + OCR-assisted intake and auto-record transaction
// @route   POST /api/finance/automation/intake
exports.intakeAISignal = async (req, res) => {
    try {
        const { text, image, signal, sourceModule, eventType } = req.body;
        const officeId = await resolveOfficeIdForRequest(req);

        if (!text && !image && !signal) {
            return res.status(400).json({ success: false, message: 'Provide text, image, or structured signal payload' });
        }

        let extracted = { ...(signal || {}) };
        let visionText = '';

        if (image) {
            const langchainService = require('../services/langchainService');
            const vision = await langchainService.processVision(
                image,
                'Extract financial transaction details (amount, type, category, vendor, reference id, date). Return concise JSON if possible.'
            );
            visionText = String(vision?.text || '');
            const parsedVision = firstJsonObject(visionText);
            if (parsedVision && typeof parsedVision === 'object') {
                extracted = { ...parsedVision, ...extracted };
            }
        }

        if (text) {
            const orchestrator = require('../services/orchestrator');
            const aiPrompt = `Convert the following into strict JSON with keys type(INCOME|EXPENSE), category, amount, description, referenceType, referenceId, linkedEntityType. Text: ${text}`;
            const aiResult = await orchestrator.processCommand(aiPrompt, {
                userId: req.user.id,
                officeId,
                role: req.user.role,
            });
            const parsedText = firstJsonObject(aiResult?.response || '');
            if (parsedText && typeof parsedText === 'object') {
                extracted = { ...parsedText, ...extracted };
            }
        }

        const fallbackDescription = [
            text ? String(text).slice(0, 200) : '',
            !text && visionText ? String(visionText).slice(0, 200) : '',
        ].filter(Boolean).join(' | ');

        const normalizedInput = {
            type: extracted.type || (String(eventType || '').toLowerCase().includes('income') ? 'INCOME' : 'EXPENSE'),
            category: extracted.category || 'AUTOMATION',
            amount: extracted.amount || inferAmountFromText(text) || inferAmountFromText(visionText),
            description: extracted.description || fallbackDescription || `${sourceModule || 'SYSTEM'} automated signal`,
            referenceType: extracted.referenceType || 'MANUAL',
            referenceId: extracted.referenceId || null,
            linkedEntityType: extracted.linkedEntityType || null,
            autoCreateEntity: extracted.autoCreateEntity !== false,
            sourceModule: sourceModule || 'AI_OCR',
            eventType: eventType || 'FINANCIAL_SIGNAL',
        };

        if (!normalizedInput.amount || Number(normalizedInput.amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Unable to infer a valid positive amount from input. Please provide amount explicitly.',
                extracted,
            });
        }

        const result = await createAutoRecordedTransaction({
            req,
            officeId,
            input: normalizedInput,
        });

        res.status(201).json({
            success: true,
            message: 'Financial record auto-created from AI/OCR signal',
            data: {
                ...result,
                normalizedInput,
                extracted,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

