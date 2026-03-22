require('dotenv').config();
const prisma = require('../src/config/prisma');

function uniqueSuffix() {
  return Date.now().toString().slice(-6);
}

async function ensureOffice() {
  const existing = await prisma.office.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) return existing;

  return prisma.office.create({
    data: {
      name: 'Seed Office',
      code: `SO-${uniqueSuffix()}`,
    },
  });
}

async function ensureUser(officeId) {
  const existing = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) return existing;

  // Fallback user only for seeding references; password is not used by this script.
  return prisma.user.create({
    data: {
      name: 'Seed Admin',
      email: `seed-admin-${uniqueSuffix()}@coreops.local`,
      password: 'seed-only-placeholder',
      role: 'SUPER_ADMIN',
      officeId,
    },
  });
}

async function ensureVendor() {
  const code = 'SEED-VENDOR';
  const existing = await prisma.vendor.findUnique({ where: { vendorCode: code } });
  if (existing) return existing;

  return prisma.vendor.create({
    data: {
      name: 'Seed Vendor Pvt Ltd',
      vendorCode: code,
      email: 'vendor.seed@coreops.local',
      phone: '+91-9999999999',
    },
  });
}

async function ensureCustomer(officeId) {
  const existing = await prisma.customer.findFirst({ where: { name: 'Seed Customer LLP' } });
  if (existing) return existing;

  return prisma.customer.create({
    data: {
      name: 'Seed Customer LLP',
      email: 'customer.seed@coreops.local',
      officeId,
      status: 'ACTIVE',
    },
  });
}

async function main() {
  console.log('Seeding Financial workspace demo data...');

  const office = await ensureOffice();
  const user = await ensureUser(office.id);
  const vendor = await ensureVendor();
  const customer = await ensureCustomer(office.id);

  const soNumber = `SO-SEED-${uniqueSuffix()}`;
  const arNumber = `AR-SEED-${uniqueSuffix()}`;
  const apNumber = `AP-SEED-${uniqueSuffix()}`;

  // Create a Sales Order required by ARInvoice relation.
  const salesOrder = await prisma.salesOrder.create({
    data: {
      orderNumber: soNumber,
      customerId: customer.id,
      officeId: office.id,
      status: 'CONFIRMED',
      totalAmount: 2360,
      currency: 'INR',
      notes: 'Seed for Financial workspace cards',
      createdById: user.id,
      items: {
        create: [
          {
            description: 'Seed service line',
            quantity: 2,
            unitPrice: 1000,
            discount: 0,
            total: 2000,
          },
        ],
      },
    },
  });

  const now = new Date();
  const pastDue = new Date(now);
  pastDue.setDate(pastDue.getDate() - 20);

  const futureDue = new Date(now);
  futureDue.setDate(futureDue.getDate() + 10);

  const apInvoice = await prisma.aPInvoice.create({
    data: {
      invoiceNumber: apNumber,
      vendorId: vendor.id,
      officeId: office.id,
      status: 'APPROVED',
      matchStatus: 'PARTIALLY_MATCHED',
      subtotal: 1000,
      taxAmount: 180,
      totalAmount: 1180,
      amountPaid: 0,
      currency: 'INR',
      invoiceDate: now,
      dueDate: pastDue,
      description: 'Seed Financial workspace AP invoice',
      createdById: user.id,
      approvedById: user.id,
      approvalDate: now,
      lines: {
        create: [
          {
            description: 'Seed AP line item',
            quantity: 1,
            unitPrice: 1000,
            lineAmount: 1000,
            taxCode: 'SGST9',
            taxRate: 18,
            taxAmount: 180,
          },
        ],
      },
      matchLog: {
        create: [
          {
            matchType: 'QTY_VARIANCE',
            status: 'TOLERANCE_EXCEEDED',
            variance: 2,
            toleranceLimit: 0.5,
            notes: 'Seed mismatch for dashboard visibility',
          },
        ],
      },
    },
  });

  const arInvoice = await prisma.aRInvoice.create({
    data: {
      invoiceNumber: arNumber,
      salesOrderId: salesOrder.id,
      customerId: customer.id,
      officeId: office.id,
      status: 'ISSUED',
      totalAmount: 2360,
      amountPaid: 0,
      currency: 'INR',
      dueDate: futureDue,
      lines: {
        create: [
          {
            description: 'Seed AR line item',
            quantity: 2,
            unitPrice: 1000,
            lineAmount: 2000,
            taxCode: 'IGST18',
            taxRate: 18,
            taxAmount: 360,
          },
        ],
      },
    },
  });

  console.log('Seed complete.');
  console.log(`Office: ${office.name} (${office.id})`);
  console.log(`AP Invoice: ${apInvoice.invoiceNumber}`);
  console.log(`AR Invoice: ${arInvoice.invoiceNumber}`);
  console.log('Refresh Financial workspace UI to see non-zero cards.');
}

main()
  .catch((error) => {
    console.error('Financial workspace seed failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
