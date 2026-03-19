const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errorHandler');

function resolveScopedOfficeId(user) {
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return null;
    const officeId = user.office?.id || user.officeId;
    return typeof officeId === 'object' ? officeId.id : officeId;
}

function daysSince(dateLike) {
    if (!dateLike) return 0;
    const date = new Date(dateLike);
    const deltaMs = Date.now() - date.getTime();
    return Math.max(0, Math.floor(deltaMs / (1000 * 60 * 60 * 24)));
}

function severityFromAge(days) {
    if (days >= 30) return 'CRITICAL';
    if (days >= 14) return 'HIGH';
    if (days >= 7) return 'MEDIUM';
    return 'LOW';
}

exports.getExceptionCenter = asyncHandler(async (req, res) => {
    const officeId = resolveScopedOfficeId(req.user);
    const whereOffice = officeId ? { officeId } : {};

    const [
        poCandidates,
        overdueInvoices,
        breachedTickets,
        lowStockInventory,
    ] = await Promise.all([
        prisma.purchaseOrder.findMany({
            where: {
                ...whereOffice,
                status: { in: ['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
            },
            include: {
                goodsReceipts: { select: { id: true, grnNumber: true, createdAt: true } },
                vendor: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: 100,
        }),
        prisma.invoice.findMany({
            where: {
                ...whereOffice,
                status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
                dueDate: { lt: new Date() },
            },
            orderBy: { dueDate: 'asc' },
            take: 100,
        }),
        prisma.maintenanceTicket.findMany({
            where: {
                ...whereOffice,
                OR: [
                    { slaBreached: true },
                    {
                        status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'] },
                        slaResolutionDeadline: { lt: new Date() },
                    },
                ],
            },
            include: {
                asset: { select: { id: true, guai: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: 100,
        }),
        prisma.inventory.findMany({
            where: {
                ...whereOffice,
                isActive: true,
                currentQuantity: { lte: 5 },
                type: 'SPARE',
            },
            orderBy: { currentQuantity: 'asc' },
            take: 100,
        }),
    ]);

    const threeWayMatchExceptions = poCandidates
        .filter((po) => {
            const hasGrn = (po.goodsReceipts || []).length > 0 || !!po.grnReference;
            const hasInvoice = !!po.invoiceReference;
            return !hasGrn || !hasInvoice;
        })
        .map((po) => {
            const ageDays = daysSince(po.createdAt);
            return {
                id: `EX-3WAY-${po.id}`,
                module: 'PROCUREMENT',
                type: 'THREE_WAY_MISMATCH',
                severity: severityFromAge(ageDays),
                ageDays,
                slaTargetDays: 7,
                status: ageDays > 7 ? 'SLA_BREACHED' : 'OPEN',
                title: `3-way match incomplete for ${po.poNumber}`,
                summary: `Missing ${po.goodsReceipts?.length ? 'invoice' : 'goods receipt and invoice'} linkage.`,
                reference: {
                    purchaseOrderId: po.id,
                    purchaseOrderNumber: po.poNumber,
                    vendor: po.vendor?.name || null,
                    currency: po.currency,
                    amount: Number(po.totalAmount || 0),
                    hasGRN: !!po.goodsReceipts?.length || !!po.grnReference,
                    hasInvoice: !!po.invoiceReference,
                },
                createdAt: po.createdAt,
            };
        });

    const apOverdueExceptions = overdueInvoices.map((invoice) => {
        const ageDays = daysSince(invoice.dueDate || invoice.createdAt);
        return {
            id: `EX-AP-${invoice.id}`,
            module: 'FINANCE',
            type: 'AP_OVERDUE',
            severity: severityFromAge(ageDays),
            ageDays,
            slaTargetDays: 5,
            status: ageDays > 5 ? 'SLA_BREACHED' : 'OPEN',
            title: `AP overdue invoice ${invoice.invoiceNumber}`,
            summary: `Outstanding vendor payment overdue by ${ageDays} day(s).`,
            reference: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                amount: Number(invoice.totalAmount || 0),
                currency: invoice.currency,
                dueDate: invoice.dueDate,
                invoiceStatus: invoice.status,
            },
            createdAt: invoice.createdAt,
        };
    });

    const maintenanceExceptions = breachedTickets.map((ticket) => {
        const ageDays = daysSince(ticket.createdAt);
        return {
            id: `EX-MNT-${ticket.id}`,
            module: 'MAINTENANCE',
            type: 'SLA_BREACH',
            severity: severityFromAge(ageDays),
            ageDays,
            slaTargetDays: 3,
            status: ticket.slaBreached || ageDays > 3 ? 'SLA_BREACHED' : 'OPEN',
            title: `Maintenance SLA risk on ${ticket.ticketNumber}`,
            summary: `Ticket ${ticket.status} with priority ${ticket.priority}.`,
            reference: {
                ticketId: ticket.id,
                ticketNumber: ticket.ticketNumber,
                priority: ticket.priority,
                status: ticket.status,
                assignedTo: ticket.assignedTo?.name || null,
                assetGuai: ticket.asset?.guai || null,
            },
            createdAt: ticket.createdAt,
        };
    });

    const inventoryExceptions = lowStockInventory.map((item) => {
        const shortage = Number(item.minimumQuantity || 0) - Number(item.currentQuantity || 0);
        return {
            id: `EX-INV-${item.id}`,
            module: 'INVENTORY',
            type: 'LOW_SPARE_STOCK',
            severity: shortage >= 10 ? 'HIGH' : 'MEDIUM',
            ageDays: daysSince(item.updatedAt || item.createdAt),
            slaTargetDays: 2,
            status: 'OPEN',
            title: `Low stock spare: ${item.name}`,
            summary: `Current stock ${item.currentQuantity} is below minimum ${item.minimumQuantity}.`,
            reference: {
                inventoryId: item.id,
                partNumber: item.partNumber,
                sku: item.sku,
                currentQuantity: item.currentQuantity,
                minimumQuantity: item.minimumQuantity,
                reorderPoint: item.reorderPoint,
                officeId: item.officeId,
            },
            createdAt: item.updatedAt || item.createdAt,
        };
    });

    const exceptions = [
        ...threeWayMatchExceptions,
        ...apOverdueExceptions,
        ...maintenanceExceptions,
        ...inventoryExceptions,
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const summary = {
        total: exceptions.length,
        bySeverity: {
            CRITICAL: exceptions.filter((e) => e.severity === 'CRITICAL').length,
            HIGH: exceptions.filter((e) => e.severity === 'HIGH').length,
            MEDIUM: exceptions.filter((e) => e.severity === 'MEDIUM').length,
            LOW: exceptions.filter((e) => e.severity === 'LOW').length,
        },
        byModule: {
            PROCUREMENT: threeWayMatchExceptions.length,
            FINANCE: apOverdueExceptions.length,
            MAINTENANCE: maintenanceExceptions.length,
            INVENTORY: inventoryExceptions.length,
        },
        slaBreached: exceptions.filter((e) => e.status === 'SLA_BREACHED').length,
        generatedAt: new Date().toISOString(),
    };

    res.status(200).json({
        success: true,
        data: {
            summary,
            exceptions,
        },
    });
});

exports.getExecutiveCockpit = asyncHandler(async (req, res) => {
    const officeId = resolveScopedOfficeId(req.user);
    const whereOffice = officeId ? { officeId } : {};

    const [assetCount, activeTickets, openInvoices, payableTotal, expenseClaims] = await Promise.all([
        prisma.asset.count({ where: whereOffice }),
        prisma.maintenanceTicket.count({
            where: {
                ...whereOffice,
                status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'] },
            },
        }),
        prisma.invoice.count({
            where: {
                ...whereOffice,
                status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
            },
        }),
        prisma.invoice.aggregate({
            where: {
                ...whereOffice,
                status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
            },
            _sum: { totalAmount: true },
        }),
        prisma.expenseClaim.count({
            where: {
                ...whereOffice,
                status: { in: ['SUBMITTED', 'APPROVED'] },
            },
        }),
    ]);

    const totalPayable = Number(payableTotal._sum.totalAmount || 0);

    res.status(200).json({
        success: true,
        data: {
            kpis: {
                assetsInScope: assetCount,
                activeMaintenanceTickets: activeTickets,
                openPayables: openInvoices,
                payableExposure: Number(totalPayable.toFixed(2)),
                pendingExpenseClaims: expenseClaims,
            },
            generatedAt: new Date().toISOString(),
        },
    });
});
