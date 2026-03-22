require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial CRM data...');

  // Get first office
  const office = await prisma.office.findFirst();
  if (!office) throw new Error("No office found.");

  // Check if customers already exist
  const existingCustomer = await prisma.customer.findFirst();
  if (existingCustomer) {
    console.log('CRM data already exists. Skipping...');
    return;
  }

  // Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Acme Corporation',
      email: 'billing@acme.corp',
      phone: '+1-555-0100',
      company: 'Acme Corp',
      address: '123 Enterprise Way, Tech City',
      gstNumber: 'GSTIN1234567890',
      creditLimit: 50000,
      officeId: office.id,
    }
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Globex Inc',
      email: 'accounts@globex.inc',
      phone: '+1-555-0200',
      company: 'Globex Inc',
      address: '456 Global Ave, Business Park',
      creditLimit: 25000,
      officeId: office.id,
    }
  });

  // Create Pricing Rule
  await prisma.pricingRule.create({
    data: {
      name: 'Enterprise VIP Discount',
      type: 'PERCENTAGE',
      value: 10, // 10%
      applicableTo: 'SPECIFIC_CUSTOMER',
      referenceId: customer1.id,
      officeId: office.id,
      validUntil: new Date('2026-12-31')
    }
  });

  console.log('CRM Data Seeded Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
