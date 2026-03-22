require('dotenv').config();
const prisma = require('../src/config/prisma');

function uniqueSuffix() {
  return Date.now().toString().slice(-6);
}

function q(ident) {
  return `"${String(ident).replace(/"/g, '""')}"`;
}

async function truncateAllExceptUsersAndOffices() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  const keep = new Set(['User', 'Office', '_prisma_migrations']);
  const tables = rows
    .map((r) => r.tablename)
    .filter((name) => !keep.has(name));

  if (!tables.length) return;

  const tableList = tables.map((name) => q(name)).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY;`);
}

async function ensureOfficeForUsers() {
  const officeCount = await prisma.office.count();
  if (officeCount > 0) return await prisma.office.findFirst({ orderBy: { createdAt: 'asc' } });

  return prisma.office.create({
    data: {
      name: 'CoreOps HQ',
      code: `HQ-${uniqueSuffix()}`,
      type: 'HEADQUARTERS',
      country: 'India',
      city: 'Mumbai',
      baseCurrency: 'INR',
      isActive: true,
    },
  });
}

async function main() {
  console.log('Resetting system data (preserving User and Office)...');

  await truncateAllExceptUsersAndOffices();

  const office = await ensureOfficeForUsers();
  const users = await prisma.user.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });

  if (!users.length) {
    throw new Error('No users found. Create at least one user before running fresh seed.');
  }

  const admin = users.find((u) => ['SUPER_ADMIN', 'ADMIN'].includes(u.role)) || users[0];
  const staff = users.find((u) => ['STAFF', 'TECHNICIAN', 'MANAGER'].includes(u.role)) || users[0];

  const [vendorA, vendorB] = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'Mumbai Tech Supplies Pvt Ltd',
        vendorCode: `VND-MUM-${uniqueSuffix()}`,
        email: 'accounts@mumbaitechsupplies.in',
        phone: '+91-9988776655',
        officeId: office.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Western Facilities Services',
        vendorCode: `VND-WFS-${uniqueSuffix()}`,
        email: 'billing@wfs.in',
        phone: '+91-9977665544',
        officeId: office.id,
      },
    }),
  ]);

  const customer = await prisma.customer.create({
    data: {
      name: 'Acme Industrial Works',
      email: 'finance@acme-industrial.in',
      phone: '+91-9123456789',
      company: 'Acme Industrial Works',
      officeId: office.id,
      status: 'ACTIVE',
      creditLimit: 750000,
      outstanding: 0,
    },
  });

  await prisma.pricingRule.create({
    data: {
      name: 'Standard B2B 5%',
      type: 'PERCENTAGE',
      value: 5,
      applicableTo: 'CUSTOMER',
      referenceId: customer.id,
      officeId: office.id,
      isActive: true,
    },
  });

  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setDate(dueSoon.getDate() + 15);

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber: `QT-${uniqueSuffix()}`,
      customerId: customer.id,
      officeId: office.id,
      status: 'ACCEPTED',
      totalAmount: 118000,
      currency: 'INR',
      validUntil: dueSoon,
      notes: 'Fresh seed quotation',
      createdById: admin.id,
      items: {
        create: [
          {
            description: 'Industrial maintenance package',
            quantity: 1,
            unitPrice: 100000,
            discount: 0,
            total: 100000,
          },
        ],
      },
    },
  });

  const salesOrder = await prisma.salesOrder.create({
    data: {
      orderNumber: `SO-${uniqueSuffix()}`,
      customerId: customer.id,
      officeId: office.id,
      quotationId: quotation.id,
      status: 'CONFIRMED',
      totalAmount: 118000,
      currency: 'INR',
      expectedDelivery: dueSoon,
      notes: 'Fresh seed sales order',
      createdById: admin.id,
      items: {
        create: [
          {
            description: 'Industrial maintenance package',
            quantity: 1,
            fulfilledQty: 0,
            unitPrice: 100000,
            discount: 0,
            total: 100000,
          },
        ],
      },
    },
  });

  await prisma.aRInvoice.create({
    data: {
      invoiceNumber: `AR-${uniqueSuffix()}`,
      salesOrderId: salesOrder.id,
      customerId: customer.id,
      officeId: office.id,
      status: 'ISSUED',
      totalAmount: 118000,
      amountPaid: 0,
      currency: 'INR',
      dueDate: dueSoon,
      lines: {
        create: [
          {
            description: 'Industrial maintenance package',
            quantity: 1,
            unitPrice: 100000,
            lineAmount: 100000,
            taxCode: 'IGST18',
            taxRate: 18,
            taxAmount: 18000,
          },
        ],
      },
    },
  });

  const apDue = new Date(now);
  apDue.setDate(apDue.getDate() - 10);

  const apInvoiceA = await prisma.aPInvoice.create({
    data: {
      invoiceNumber: `AP-${uniqueSuffix()}`,
      vendorId: vendorA.id,
      officeId: office.id,
      status: 'APPROVED',
      matchStatus: 'PARTIALLY_MATCHED',
      subtotal: 45000,
      taxAmount: 8100,
      totalAmount: 53100,
      amountPaid: 0,
      currency: 'INR',
      invoiceDate: now,
      dueDate: apDue,
      description: 'Workstation and accessories',
      createdById: admin.id,
      approvedById: admin.id,
      approvalDate: now,
      lines: {
        create: [
          {
            description: 'Workstation setup kit',
            quantity: 3,
            unitPrice: 15000,
            lineAmount: 45000,
            taxCode: 'SGST9',
            taxRate: 18,
            taxAmount: 8100,
          },
        ],
      },
    },
  });

  await prisma.invoiceMatchLog.create({
    data: {
      invoiceId: apInvoiceA.id,
      matchType: 'PRICE_VARIANCE',
      status: 'TOLERANCE_EXCEEDED',
      variance: 750,
      toleranceLimit: 0.5,
      notes: 'Fresh seed variance sample',
    },
  });

  await prisma.aPInvoice.create({
    data: {
      invoiceNumber: `AP-${uniqueSuffix()}`,
      vendorId: vendorB.id,
      officeId: office.id,
      status: 'MATCHED',
      matchStatus: 'MATCHED',
      subtotal: 20000,
      taxAmount: 3600,
      totalAmount: 23600,
      amountPaid: 0,
      currency: 'INR',
      invoiceDate: now,
      dueDate: dueSoon,
      description: 'Facility maintenance supplies',
      createdById: admin.id,
      approvedById: admin.id,
      approvalDate: now,
      lines: {
        create: [
          {
            description: 'Maintenance supplies',
            quantity: 1,
            unitPrice: 20000,
            lineAmount: 20000,
            taxCode: 'IGST18',
            taxRate: 18,
            taxAmount: 3600,
          },
        ],
      },
    },
  });

  const [claimSubmitted, claimApproved] = await Promise.all([
    prisma.expenseClaim.create({
      data: {
        claimNumber: `EXP-${new Date().getFullYear()}-${String(1).padStart(4, '0')}`,
        employeeId: staff.id,
        officeId: office.id,
        status: 'SUBMITTED',
        totalAmount: 4280,
        currency: 'INR',
        description: 'Client site local travel and meals',
        items: {
          create: [
            {
              date: now,
              category: 'TRAVEL',
              description: 'Local cab charges',
              amount: 2800,
            },
            {
              date: now,
              category: 'FOOD',
              description: 'Client meeting lunch',
              amount: 1480,
            },
          ],
        },
      },
    }),
    prisma.expenseClaim.create({
      data: {
        claimNumber: `EXP-${new Date().getFullYear()}-${String(2).padStart(4, '0')}`,
        employeeId: staff.id,
        officeId: office.id,
        status: 'APPROVED',
        totalAmount: 12500,
        currency: 'INR',
        description: 'Mumbai travel reimbursement',
        approvedById: admin.id,
        approvalDate: now,
        items: {
          create: [
            {
              date: now,
              category: 'TRAVEL',
              description: 'Intercity train and taxi',
              amount: 12500,
            },
          ],
        },
      },
    }),
  ]);

  await prisma.transaction.createMany({
    data: [
      {
        type: 'INCOME',
        category: 'SERVICE_REVENUE',
        amount: 50000,
        currency: 'INR',
        date: now,
        description: 'Advance from customer',
        referenceType: 'INVOICE',
        referenceId: 'ADV-001',
        officeId: office.id,
        recordedById: admin.id,
        status: 'CLEARED',
      },
      {
        type: 'EXPENSE',
        category: 'OPERATIONS',
        amount: 8700,
        currency: 'INR',
        date: now,
        description: 'Office utility and internet',
        referenceType: 'MANUAL',
        referenceId: 'OPS-001',
        officeId: office.id,
        recordedById: admin.id,
        status: 'CLEARED',
      },
    ],
  });

  const counts = await Promise.all([
    prisma.vendor.count(),
    prisma.customer.count(),
    prisma.aPInvoice.count(),
    prisma.aRInvoice.count(),
    prisma.expenseClaim.count(),
    prisma.transaction.count(),
  ]);

  console.log('Fresh seed complete.');
  console.log(`Office: ${office.name}`);
  console.log(`Vendors: ${counts[0]}, Customers: ${counts[1]}`);
  console.log(`AP Invoices: ${counts[2]}, AR Invoices: ${counts[3]}`);
  console.log(`Expense Claims: ${counts[4]}, Transactions: ${counts[5]}`);
  console.log(`Sample claims: ${claimSubmitted.claimNumber}, ${claimApproved.claimNumber}`);
}

main()
  .catch((err) => {
    console.error('Fresh seed failed');
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
