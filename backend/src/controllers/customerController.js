const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');

function resolveOfficeId(value) {
    if (!value) return null;
    if (typeof value === 'object' && value.id) return value.id;
    return value;
}

exports.createCustomer = asyncHandler(async (req, res, next) => {
    const { name, email, phone, company, address, gstNumber, creditLimit } = req.body;
    
    // Assumes user's officeId is injected by auth middleware or explicit in body
    const officeId = resolveOfficeId(req.user?.officeId || req.body.officeId);
    if (!officeId) return next(new AppError('Office ID is required', 400));

    const customer = await prisma.customer.create({
        data: {
            name,
            email,
            phone,
            company,
            address,
            gstNumber,
            creditLimit: parseFloat(creditLimit) || 0,
            officeId
        }
    });

    res.status(201).json({ success: true, data: customer });
});

exports.getCustomers = asyncHandler(async (req, res, next) => {
    const officeId = resolveOfficeId(req.user?.officeId || req.query.officeId);
    
    const customers = await prisma.customer.findMany({
        where: {
            // If officeId provided, scope to it. Otherwise return all (super admin)
            ...(officeId && { officeId }),
            status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: customers.length, data: customers });
});

exports.getCustomer = asyncHandler(async (req, res, next) => {
    const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
        include: {
            salesOrders: { orderBy: { createdAt: 'desc' }, take: 5 },
            arInvoices: { orderBy: { createdAt: 'desc' }, take: 5 },
            quotations: { orderBy: { createdAt: 'desc' }, take: 5 }
        }
    });

    if (!customer) return next(new AppError('Customer not found', 404));
    res.status(200).json({ success: true, data: customer });
});

exports.updateCustomer = asyncHandler(async (req, res, next) => {
    const { name, email, phone, company, address, gstNumber, creditLimit, status } = req.body;

    const exists = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!exists) return next(new AppError('Customer not found', 404));

    const customer = await prisma.customer.update({
        where: { id: req.params.id },
        data: {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone }),
            ...(company && { company }),
            ...(address && { address }),
            ...(gstNumber && { gstNumber }),
            ...(creditLimit !== undefined && { creditLimit: parseFloat(creditLimit) }),
            ...(status && { status })
        }
    });

    res.status(200).json({ success: true, data: customer });
});
