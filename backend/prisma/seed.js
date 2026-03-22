require('dotenv/config');
const bcrypt = require('bcrypt');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const {
  PrismaClient,
  UserRole,
  OfficeType,
  InventoryType,
  TrackingType,
  AssetCategory,
  AssetStatus,
  AssetCondition,
  GLAccountType,
  TransactionType,
  TransactionStatus,
  ReferenceType,
  QuotationStatus,
  SalesOrderStatus,
  POStatus,
  FiscalPeriodStatus,
} = require('@prisma/client');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/coreops_dev';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function upsertFiscalCalendar({ tenantId, legalEntityId, name, yearStartMonth }) {
  const existing = await prisma.fiscalCalendar.findFirst({
    where: { tenantId, legalEntityId, name },
  });

  if (existing) {
    return prisma.fiscalCalendar.update({
      where: { id: existing.id },
      data: { yearStartMonth, isActive: true },
    });
  }

  return prisma.fiscalCalendar.create({
    data: { tenantId, legalEntityId, name, yearStartMonth, isActive: true },
  });
}

async function upsertFiscalPeriod({ accountingBookId, fiscalCalendarId, code, periodName, startDate, endDate }) {
  const existing = await prisma.fiscalPeriod.findFirst({
    where: { accountingBookId, code },
  });

  const payload = {
    accountingBookId,
    fiscalCalendarId,
    code,
    periodName,
    startDate,
    endDate,
    status: FiscalPeriodStatus.OPEN,
    isAdjustment: false,
  };

  if (existing) {
    return prisma.fiscalPeriod.update({ where: { id: existing.id }, data: payload });
  }

  return prisma.fiscalPeriod.create({ data: payload });
}

async function main() {
  const defaultPassword = 'CoreOps@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  console.log('Seeding CoreOps detailed dataset...');

  const tenant = await prisma.tenant.upsert({
    where: { code: 'COREOPS' },
    update: { name: 'CoreOps Group', isActive: true },
    create: { code: 'COREOPS', name: 'CoreOps Group', isActive: true },
  });

  const legalEntity = await prisma.legalEntity.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'COREOPS-IN' } },
    update: {
      name: 'CoreOps India Pvt Ltd',
      countryCode: 'IN',
      baseCurrency: 'INR',
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      code: 'COREOPS-IN',
      name: 'CoreOps India Pvt Ltd',
      countryCode: 'IN',
      baseCurrency: 'INR',
      taxRegistration: '29AABCC1234D1ZV',
      isActive: true,
    },
  });

  const businessUnits = await Promise.all([
    prisma.businessUnit.upsert({
      where: { legalEntityId_code: { legalEntityId: legalEntity.id, code: 'OPS' } },
      update: { name: 'Operations', isActive: true },
      create: {
        tenantId: tenant.id,
        legalEntityId: legalEntity.id,
        code: 'OPS',
        name: 'Operations',
        isActive: true,
      },
    }),
    prisma.businessUnit.upsert({
      where: { legalEntityId_code: { legalEntityId: legalEntity.id, code: 'CORP' } },
      update: { name: 'Corporate Services', isActive: true },
      create: {
        tenantId: tenant.id,
        legalEntityId: legalEntity.id,
        code: 'CORP',
        name: 'Corporate Services',
        isActive: true,
      },
    }),
  ]);

  const fiscalCalendar = await upsertFiscalCalendar({
    tenantId: tenant.id,
    legalEntityId: legalEntity.id,
    name: 'CoreOps FY Calendar',
    yearStartMonth: 4,
  });

  const accountingBook = await prisma.accountingBook.upsert({
    where: { legalEntityId_code: { legalEntityId: legalEntity.id, code: 'PRIMARY' } },
    update: { name: 'Primary IFRS Book', baseCurrency: 'INR', isPrimary: true, isActive: true },
    create: {
      tenantId: tenant.id,
      legalEntityId: legalEntity.id,
      code: 'PRIMARY',
      name: 'Primary IFRS Book',
      baseCurrency: 'INR',
      isPrimary: true,
      isActive: true,
    },
  });

  const fiscalPeriod = await upsertFiscalPeriod({
    accountingBookId: accountingBook.id,
    fiscalCalendarId: fiscalCalendar.id,
    code: 'FY2026-P01',
    periodName: 'April 2026',
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    endDate: new Date('2026-04-30T23:59:59.999Z'),
  });

  const officeSeed = [
    {
      code: 'BLR-HQ',
      name: 'Bengaluru HQ',
      type: OfficeType.HEADQUARTERS,
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      countryCode: 'IN',
      street: '45 Residency Road',
      postalCode: '560025',
      phone: '+91-80-4100-1000',
      email: 'blr.hq@coreops.local',
      website: 'https://coreops.local',
      lowStockThreshold: 12,
      autoApproveUnder: 1200,
      maintenanceApprovalThreshold: 6000,
      businessUnitId: businessUnits[1].id,
    },
    {
      code: 'MUM-REG',
      name: 'Mumbai Regional Office',
      type: OfficeType.REGIONAL_OFFICE,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      countryCode: 'IN',
      street: '220 Nariman Point',
      postalCode: '400021',
      phone: '+91-22-5000-2000',
      email: 'mum.regional@coreops.local',
      website: 'https://coreops.local',
      lowStockThreshold: 10,
      autoApproveUnder: 900,
      maintenanceApprovalThreshold: 5000,
      businessUnitId: businessUnits[0].id,
    },
    {
      code: 'DEL-BR1',
      name: 'Delhi Branch',
      type: OfficeType.BRANCH,
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      countryCode: 'IN',
      street: '11 Connaught Place',
      postalCode: '110001',
      phone: '+91-11-6000-3000',
      email: 'del.branch@coreops.local',
      website: 'https://coreops.local',
      lowStockThreshold: 8,
      autoApproveUnder: 700,
      maintenanceApprovalThreshold: 3500,
      businessUnitId: businessUnits[0].id,
    },
    {
      code: 'CHE-WH1',
      name: 'Chennai Warehouse',
      type: OfficeType.WAREHOUSE,
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      countryCode: 'IN',
      street: '74 Port Access Road',
      postalCode: '600001',
      phone: '+91-44-7000-4000',
      email: 'che.warehouse@coreops.local',
      website: 'https://coreops.local',
      lowStockThreshold: 20,
      autoApproveUnder: 500,
      maintenanceApprovalThreshold: 2500,
      businessUnitId: businessUnits[0].id,
    },
  ];

  const offices = [];
  for (const office of officeSeed) {
    const saved = await prisma.office.upsert({
      where: { code: office.code },
      update: {
        ...office,
        tenantId: tenant.id,
        legalEntityId: legalEntity.id,
        baseCurrency: 'INR',
        isActive: true,
      },
      create: {
        ...office,
        tenantId: tenant.id,
        legalEntityId: legalEntity.id,
        baseCurrency: 'INR',
        isActive: true,
      },
    });
    offices.push(saved);
  }

  const officeByCode = Object.fromEntries(offices.map((office) => [office.code, office]));

  const userSeed = [
    {
      name: 'Aarav Mehta',
      email: 'superadmin@coreops.local',
      role: UserRole.SUPER_ADMIN,
      officeCode: 'BLR-HQ',
      canApproveTickets: true,
      canManageAssets: true,
      canManageInventory: true,
      canViewFinancials: true,
      canManageUsers: true,
      canManageVendors: true,
      approvalLimit: -1,
    },
    {
      name: 'Nisha Kapoor',
      email: 'admin@coreops.local',
      role: UserRole.ADMIN,
      officeCode: 'BLR-HQ',
      canApproveTickets: true,
      canManageAssets: true,
      canManageInventory: true,
      canViewFinancials: true,
      canManageUsers: true,
      canManageVendors: true,
      approvalLimit: 500000,
    },
    {
      name: 'Rohan Iyer',
      email: 'finance.manager@coreops.local',
      role: UserRole.MANAGER,
      officeCode: 'BLR-HQ',
      canApproveTickets: true,
      canManageAssets: false,
      canManageInventory: false,
      canViewFinancials: true,
      canManageUsers: false,
      canManageVendors: true,
      approvalLimit: 250000,
    },
    {
      name: 'Priya Nair',
      email: 'ops.manager@coreops.local',
      role: UserRole.MANAGER,
      officeCode: 'MUM-REG',
      canApproveTickets: true,
      canManageAssets: true,
      canManageInventory: true,
      canViewFinancials: true,
      canManageUsers: false,
      canManageVendors: true,
      approvalLimit: 150000,
    },
    {
      name: 'Vikram Singh',
      email: 'procurement@coreops.local',
      role: UserRole.STAFF,
      officeCode: 'CHE-WH1',
      canApproveTickets: false,
      canManageAssets: false,
      canManageInventory: true,
      canViewFinancials: false,
      canManageUsers: false,
      canManageVendors: true,
      approvalLimit: 20000,
    },
    {
      name: 'Sana Ali',
      email: 'technician1@coreops.local',
      role: UserRole.TECHNICIAN,
      officeCode: 'DEL-BR1',
      canApproveTickets: false,
      canManageAssets: true,
      canManageInventory: true,
      canViewFinancials: false,
      canManageUsers: false,
      canManageVendors: false,
      approvalLimit: 5000,
    },
    {
      name: 'Imran Qureshi',
      email: 'technician2@coreops.local',
      role: UserRole.TECHNICIAN,
      officeCode: 'MUM-REG',
      canApproveTickets: false,
      canManageAssets: true,
      canManageInventory: true,
      canViewFinancials: false,
      canManageUsers: false,
      canManageVendors: false,
      approvalLimit: 5000,
    },
    {
      name: 'Meera Das',
      email: 'finance.staff@coreops.local',
      role: UserRole.STAFF,
      officeCode: 'BLR-HQ',
      canApproveTickets: false,
      canManageAssets: false,
      canManageInventory: false,
      canViewFinancials: true,
      canManageUsers: false,
      canManageVendors: false,
      approvalLimit: 10000,
    },
    {
      name: 'Aditya Rao',
      email: 'warehouse.staff@coreops.local',
      role: UserRole.STAFF,
      officeCode: 'CHE-WH1',
      canApproveTickets: false,
      canManageAssets: false,
      canManageInventory: true,
      canViewFinancials: false,
      canManageUsers: false,
      canManageVendors: false,
      approvalLimit: 5000,
    },
    {
      name: 'Neha Gupta',
      email: 'viewer@coreops.local',
      role: UserRole.VIEWER,
      officeCode: 'DEL-BR1',
      canApproveTickets: false,
      canManageAssets: false,
      canManageInventory: false,
      canViewFinancials: true,
      canManageUsers: false,
      canManageVendors: false,
      approvalLimit: 0,
    },
  ];

  const users = [];
  for (const user of userSeed) {
    const office = officeByCode[user.officeCode];
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        password: hashedPassword,
        officeId: office.id,
        tenantId: tenant.id,
        legalEntityId: legalEntity.id,
        canApproveTickets: user.canApproveTickets,
        canManageAssets: user.canManageAssets,
        canManageInventory: user.canManageInventory,
        canViewFinancials: user.canViewFinancials,
        canManageUsers: user.canManageUsers,
        canManageVendors: user.canManageVendors,
        approvalLimit: user.approvalLimit,
        isActive: true,
      },
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        officeId: office.id,
        tenantId: tenant.id,
        legalEntityId: legalEntity.id,
        canApproveTickets: user.canApproveTickets,
        canManageAssets: user.canManageAssets,
        canManageInventory: user.canManageInventory,
        canViewFinancials: user.canViewFinancials,
        canManageUsers: user.canManageUsers,
        canManageVendors: user.canManageVendors,
        approvalLimit: user.approvalLimit,
        isActive: true,
      },
    });
    users.push(saved);
  }

  const userByEmail = Object.fromEntries(users.map((user) => [user.email, user]));

  const vendorSeed = [
    { name: 'Vertex Supplies Pvt Ltd', vendorCode: 'VND-001', city: 'Bengaluru' },
    { name: 'Northwind Components', vendorCode: 'VND-002', city: 'Mumbai' },
    { name: 'Delta Industrial Tech', vendorCode: 'VND-003', city: 'Pune' },
    { name: 'Sigma Office Systems', vendorCode: 'VND-004', city: 'Delhi' },
    { name: 'RapidServe IT Parts', vendorCode: 'VND-005', city: 'Chennai' },
    { name: 'BluePeak Networks', vendorCode: 'VND-006', city: 'Hyderabad' },
    { name: 'GreenGrid Energy Solutions', vendorCode: 'VND-007', city: 'Ahmedabad' },
    { name: 'Urban Machine Works', vendorCode: 'VND-008', city: 'Coimbatore' },
    { name: 'Nexline Mobility', vendorCode: 'VND-009', city: 'Gurugram' },
    { name: 'PrimeBuild Engineering', vendorCode: 'VND-010', city: 'Kolkata' },
  ];

  const vendors = [];
  for (const [index, vendor] of vendorSeed.entries()) {
    const saved = await prisma.vendor.upsert({
      where: { vendorCode: vendor.vendorCode },
      update: {
        name: vendor.name,
        contactPerson: `Vendor Contact ${index + 1}`,
        email: `vendor${index + 1}@coreops.local`,
        phone: `+91-90000${String(index + 1).padStart(5, '0')}`,
        address: `${vendor.city}, India`,
        rating: 4.0 + (index % 5) * 0.2,
        isBlacklisted: false,
        officeId: officeByCode['BLR-HQ'].id,
        bankDetails: {
          bankName: 'Axis Bank',
          accountNumber: `0001100${String(index + 1).padStart(4, '0')}`,
          ifscCode: 'UTIB0000123',
        },
      },
      create: {
        name: vendor.name,
        vendorCode: vendor.vendorCode,
        contactPerson: `Vendor Contact ${index + 1}`,
        email: `vendor${index + 1}@coreops.local`,
        phone: `+91-90000${String(index + 1).padStart(5, '0')}`,
        address: `${vendor.city}, India`,
        rating: 4.0 + (index % 5) * 0.2,
        isBlacklisted: false,
        officeId: officeByCode['BLR-HQ'].id,
        bankDetails: {
          bankName: 'Axis Bank',
          accountNumber: `0001100${String(index + 1).padStart(4, '0')}`,
          ifscCode: 'UTIB0000123',
        },
      },
    });
    vendors.push(saved);
  }

  const inventorySeed = [
    { sku: 'INV-LAP-001', name: 'Business Laptop 14-inch', officeCode: 'CHE-WH1', type: InventoryType.PRODUCT, qty: 35, cost: 52000, price: 64000 },
    { sku: 'INV-MON-002', name: '24-inch IPS Monitor', officeCode: 'CHE-WH1', type: InventoryType.PRODUCT, qty: 48, cost: 9800, price: 12900 },
    { sku: 'INV-KBD-003', name: 'Mechanical Keyboard', officeCode: 'CHE-WH1', type: InventoryType.SPARE, qty: 120, cost: 2100, price: 3200 },
    { sku: 'INV-MSE-004', name: 'Wireless Mouse', officeCode: 'CHE-WH1', type: InventoryType.SPARE, qty: 150, cost: 850, price: 1450 },
    { sku: 'INV-PRN-005', name: 'Laser Printer Toner', officeCode: 'MUM-REG', type: InventoryType.SPARE, qty: 60, cost: 3200, price: 4500 },
    { sku: 'INV-SSD-006', name: '1TB NVMe SSD', officeCode: 'MUM-REG', type: InventoryType.SPARE, qty: 75, cost: 4600, price: 6200 },
    { sku: 'INV-RTR-007', name: 'Enterprise Router', officeCode: 'BLR-HQ', type: InventoryType.PRODUCT, qty: 20, cost: 18500, price: 24000 },
    { sku: 'INV-CBL-008', name: 'Cat6 Cable Box', officeCode: 'BLR-HQ', type: InventoryType.SPARE, qty: 90, cost: 1700, price: 2550 },
    { sku: 'INV-BAT-009', name: 'UPS Battery Pack', officeCode: 'DEL-BR1', type: InventoryType.SPARE, qty: 42, cost: 5900, price: 7600 },
    { sku: 'INV-CAM-010', name: 'Security Camera Unit', officeCode: 'DEL-BR1', type: InventoryType.PRODUCT, qty: 26, cost: 7400, price: 9800 },
  ];

  const inventoryItems = [];
  for (const [index, item] of inventorySeed.entries()) {
    const saved = await prisma.inventory.upsert({
      where: { sku: item.sku },
      update: {
        type: item.type,
        name: item.name,
        description: `${item.name} for operations and maintenance support`,
        officeId: officeByCode[item.officeCode].id,
        trackingType: TrackingType.QUANTITY,
        currentQuantity: item.qty,
        reorderPoint: 10,
        reorderQuantity: 25,
        minimumQuantity: 8,
        unit: 'pieces',
        costPrice: item.cost,
        sellingPrice: item.price,
        unitCost: item.cost,
        pricingCurrency: 'INR',
        lastPurchasePrice: item.cost,
        lastPurchaseDate: new Date('2026-03-10T00:00:00.000Z'),
        isActive: true,
        primaryVendorId: vendors[index % vendors.length].id,
      },
      create: {
        type: item.type,
        sku: item.sku,
        name: item.name,
        description: `${item.name} for operations and maintenance support`,
        partNumber: `PART-${String(index + 1).padStart(3, '0')}`,
        category: item.type === InventoryType.PRODUCT ? 'HARDWARE' : 'SPARES',
        subcategory: 'IT',
        officeId: officeByCode[item.officeCode].id,
        trackingType: TrackingType.QUANTITY,
        currentQuantity: item.qty,
        reorderPoint: 10,
        reorderQuantity: 25,
        minimumQuantity: 8,
        unit: 'pieces',
        costPrice: item.cost,
        sellingPrice: item.price,
        unitCost: item.cost,
        pricingCurrency: 'INR',
        lastPurchasePrice: item.cost,
        lastPurchaseDate: new Date('2026-03-10T00:00:00.000Z'),
        isActive: true,
        primaryVendorId: vendors[index % vendors.length].id,
      },
    });
    inventoryItems.push(saved);
  }

  const inventoryBySku = Object.fromEntries(inventoryItems.map((item) => [item.sku, item]));

  const assetSeed = [
    { guai: 'GUAI-2026-0001', name: 'Executive Laptop - AM', category: AssetCategory.LAPTOP, officeCode: 'BLR-HQ', purchasePrice: 92000 },
    { guai: 'GUAI-2026-0002', name: 'Finance Workstation 01', category: AssetCategory.COMPUTER, officeCode: 'BLR-HQ', purchasePrice: 78000 },
    { guai: 'GUAI-2026-0003', name: 'Network Rack Switch 48P', category: AssetCategory.NETWORK, officeCode: 'BLR-HQ', purchasePrice: 130000 },
    { guai: 'GUAI-2026-0004', name: 'Warehouse Barcode Printer', category: AssetCategory.PRINTER, officeCode: 'CHE-WH1', purchasePrice: 44000 },
    { guai: 'GUAI-2026-0005', name: 'Regional Router - MUM', category: AssetCategory.NETWORK, officeCode: 'MUM-REG', purchasePrice: 38000 },
    { guai: 'GUAI-2026-0006', name: 'Conference Room Display', category: AssetCategory.EQUIPMENT, officeCode: 'DEL-BR1', purchasePrice: 56000 },
    { guai: 'GUAI-2026-0007', name: 'Portable Service Laptop 01', category: AssetCategory.LAPTOP, officeCode: 'DEL-BR1', purchasePrice: 61000 },
    { guai: 'GUAI-2026-0008', name: 'Portable Service Laptop 02', category: AssetCategory.LAPTOP, officeCode: 'MUM-REG', purchasePrice: 61000 },
    { guai: 'GUAI-2026-0009', name: 'UPS Unit - HQ Data Room', category: AssetCategory.EQUIPMENT, officeCode: 'BLR-HQ', purchasePrice: 87000 },
    { guai: 'GUAI-2026-0010', name: 'Office Utility Vehicle', category: AssetCategory.VEHICLE, officeCode: 'MUM-REG', purchasePrice: 650000 },
  ];

  for (const [index, asset] of assetSeed.entries()) {
    await prisma.asset.upsert({
      where: { guai: asset.guai },
      update: {
        name: asset.name,
        category: asset.category,
        officeId: officeByCode[asset.officeCode].id,
        vendorId: vendors[index % vendors.length].id,
        purchaseDate: new Date('2026-02-15T00:00:00.000Z'),
        purchasePrice: asset.purchasePrice,
        currentBookValue: asset.purchasePrice * 0.9,
        status: AssetStatus.ACTIVE,
        condition: AssetCondition.GOOD,
        assignedToId: users[index % users.length].id,
        createdById: userByEmail['admin@coreops.local'].id,
      },
      create: {
        guai: asset.guai,
        name: asset.name,
        category: asset.category,
        officeId: officeByCode[asset.officeCode].id,
        vendorId: vendors[index % vendors.length].id,
        purchaseDate: new Date('2026-02-15T00:00:00.000Z'),
        purchasePrice: asset.purchasePrice,
        currentBookValue: asset.purchasePrice * 0.9,
        currency: 'INR',
        status: AssetStatus.ACTIVE,
        condition: AssetCondition.GOOD,
        assignedToId: users[index % users.length].id,
        createdById: userByEmail['admin@coreops.local'].id,
      },
    });
  }

  const customerSeed = [
    { name: 'Acme Manufacturing', city: 'Bengaluru' },
    { name: 'Helix Retail Pvt Ltd', city: 'Mumbai' },
    { name: 'Orion Logistics', city: 'Delhi' },
    { name: 'Zenith Healthcare', city: 'Chennai' },
    { name: 'Nimbus Foods', city: 'Pune' },
    { name: 'Atlas Telecom', city: 'Hyderabad' },
    { name: 'Nova Infratech', city: 'Ahmedabad' },
    { name: 'BlueRiver Textiles', city: 'Surat' },
    { name: 'Skyline Education', city: 'Kolkata' },
    { name: 'Everon Energy', city: 'Noida' },
  ];

  await prisma.salesOrderItem.deleteMany({ where: { salesOrder: { orderNumber: { startsWith: 'SO-2026-' } } } });
  await prisma.salesOrder.deleteMany({ where: { orderNumber: { startsWith: 'SO-2026-' } } });
  await prisma.quotationItem.deleteMany({ where: { quotation: { quotationNumber: { startsWith: 'QT-2026-' } } } });
  await prisma.quotation.deleteMany({ where: { quotationNumber: { startsWith: 'QT-2026-' } } });
  await prisma.customer.deleteMany({ where: { name: { in: customerSeed.map((c) => c.name) } } });

  await prisma.customer.createMany({
    data: customerSeed.map((customer, index) => ({
      name: customer.name,
      company: customer.name,
      email: `accounts${index + 1}@customer.local`,
      phone: `+91-88000${String(index + 1).padStart(5, '0')}`,
      address: `${customer.city}, India`,
      gstNumber: `29GSTCUS${String(index + 1).padStart(5, '0')}Z${(index % 9) + 1}`,
      creditLimit: 500000 + index * 25000,
      outstanding: 0,
      status: 'ACTIVE',
      officeId: offices[index % offices.length].id,
    })),
  });

  const customers = await prisma.customer.findMany({ where: { name: { in: customerSeed.map((c) => c.name) } } });
  const customerByName = Object.fromEntries(customers.map((customer) => [customer.name, customer]));

  const glAccountSeed = [
    { code: '1000', name: 'Cash and Bank', type: GLAccountType.ASSET, normalSide: 'DEBIT' },
    { code: '1100', name: 'Accounts Receivable', type: GLAccountType.ASSET, normalSide: 'DEBIT' },
    { code: '1200', name: 'Inventory', type: GLAccountType.ASSET, normalSide: 'DEBIT' },
    { code: '1500', name: 'Fixed Assets', type: GLAccountType.ASSET, normalSide: 'DEBIT' },
    { code: '2000', name: 'Accounts Payable', type: GLAccountType.LIABILITY, normalSide: 'CREDIT' },
    { code: '2100', name: 'Accrued Expenses', type: GLAccountType.LIABILITY, normalSide: 'CREDIT' },
    { code: '3000', name: 'Retained Earnings', type: GLAccountType.EQUITY, normalSide: 'CREDIT' },
    { code: '4000', name: 'Product Revenue', type: GLAccountType.REVENUE, normalSide: 'CREDIT' },
    { code: '5000', name: 'Cost of Goods Sold', type: GLAccountType.EXPENSE, normalSide: 'DEBIT' },
    { code: '5100', name: 'Repairs and Maintenance', type: GLAccountType.EXPENSE, normalSide: 'DEBIT' },
  ];

  const glAccounts = [];
  for (const account of glAccountSeed) {
    const saved = await prisma.glAccount.upsert({
      where: { code: account.code },
      update: {
        name: account.name,
        type: account.type,
        normalSide: account.normalSide,
        officeId: officeByCode['BLR-HQ'].id,
        tenantId: tenant.id,
        legalEntityId: legalEntity.id,
        isActive: true,
      },
      create: {
        code: account.code,
        name: account.name,
        type: account.type,
        normalSide: account.normalSide,
        officeId: officeByCode['BLR-HQ'].id,
        tenantId: tenant.id,
        legalEntityId: legalEntity.id,
        isActive: true,
      },
    });
    glAccounts.push(saved);
  }

  const glByCode = Object.fromEntries(glAccounts.map((account) => [account.code, account]));

  const quoteData = [
    {
      quotationNumber: 'QT-2026-0001',
      customer: 'Acme Manufacturing',
      inventorySku: 'INV-LAP-001',
      qty: 8,
      unitPrice: 63500,
      discount: 2500,
      officeCode: 'BLR-HQ',
    },
    {
      quotationNumber: 'QT-2026-0002',
      customer: 'Helix Retail Pvt Ltd',
      inventorySku: 'INV-CAM-010',
      qty: 15,
      unitPrice: 9600,
      discount: 0,
      officeCode: 'MUM-REG',
    },
    {
      quotationNumber: 'QT-2026-0003',
      customer: 'Orion Logistics',
      inventorySku: 'INV-RTR-007',
      qty: 6,
      unitPrice: 23500,
      discount: 1500,
      officeCode: 'DEL-BR1',
    },
  ];

  const quotes = [];
  for (const quote of quoteData) {
    const quoteTotal = quote.qty * quote.unitPrice - quote.discount;
    const savedQuote = await prisma.quotation.upsert({
      where: { quotationNumber: quote.quotationNumber },
      update: {
        customerId: customerByName[quote.customer].id,
        officeId: officeByCode[quote.officeCode].id,
        status: QuotationStatus.SENT,
        totalAmount: quoteTotal,
        currency: 'INR',
        validUntil: new Date('2026-05-15T00:00:00.000Z'),
        notes: 'Seeded enterprise quotation',
        createdById: userByEmail['ops.manager@coreops.local'].id,
      },
      create: {
        quotationNumber: quote.quotationNumber,
        customerId: customerByName[quote.customer].id,
        officeId: officeByCode[quote.officeCode].id,
        status: QuotationStatus.SENT,
        totalAmount: quoteTotal,
        currency: 'INR',
        validUntil: new Date('2026-05-15T00:00:00.000Z'),
        notes: 'Seeded enterprise quotation',
        createdById: userByEmail['ops.manager@coreops.local'].id,
      },
    });

    await prisma.quotationItem.deleteMany({ where: { quotationId: savedQuote.id } });
    await prisma.quotationItem.create({
      data: {
        quotationId: savedQuote.id,
        inventoryId: inventoryBySku[quote.inventorySku].id,
        description: `${inventoryBySku[quote.inventorySku].name} supply package`,
        quantity: quote.qty,
        unitPrice: quote.unitPrice,
        discount: quote.discount,
        total: quoteTotal,
      },
    });
    quotes.push(savedQuote);
  }

  const salesOrderData = [
    { orderNumber: 'SO-2026-0001', quoteNumber: 'QT-2026-0001', customer: 'Acme Manufacturing', officeCode: 'BLR-HQ' },
    { orderNumber: 'SO-2026-0002', quoteNumber: 'QT-2026-0002', customer: 'Helix Retail Pvt Ltd', officeCode: 'MUM-REG' },
    { orderNumber: 'SO-2026-0003', quoteNumber: 'QT-2026-0003', customer: 'Orion Logistics', officeCode: 'DEL-BR1' },
  ];

  for (const order of salesOrderData) {
    const sourceQuote = quotes.find((quote) => quote.quotationNumber === order.quoteNumber);
    const quoteItem = await prisma.quotationItem.findFirst({ where: { quotationId: sourceQuote.id } });

    const salesOrder = await prisma.salesOrder.upsert({
      where: { orderNumber: order.orderNumber },
      update: {
        customerId: customerByName[order.customer].id,
        officeId: officeByCode[order.officeCode].id,
        quotationId: sourceQuote.id,
        status: SalesOrderStatus.CONFIRMED,
        totalAmount: sourceQuote.totalAmount,
        expectedDelivery: new Date('2026-05-25T00:00:00.000Z'),
        notes: 'Seeded order converted from quotation',
        createdById: userByEmail['ops.manager@coreops.local'].id,
      },
      create: {
        orderNumber: order.orderNumber,
        customerId: customerByName[order.customer].id,
        officeId: officeByCode[order.officeCode].id,
        quotationId: sourceQuote.id,
        status: SalesOrderStatus.CONFIRMED,
        totalAmount: sourceQuote.totalAmount,
        currency: 'INR',
        expectedDelivery: new Date('2026-05-25T00:00:00.000Z'),
        notes: 'Seeded order converted from quotation',
        createdById: userByEmail['ops.manager@coreops.local'].id,
      },
    });

    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: salesOrder.id } });
    await prisma.salesOrderItem.create({
      data: {
        salesOrderId: salesOrder.id,
        inventoryId: quoteItem.inventoryId,
        description: quoteItem.description,
        quantity: quoteItem.quantity,
        fulfilledQty: 0,
        unitPrice: quoteItem.unitPrice,
        discount: quoteItem.discount,
        total: quoteItem.total,
      },
    });
  }

  const purchaseOrderSeed = [
    {
      poNumber: 'PO-2026-0001',
      vendorCode: 'VND-001',
      inventorySku: 'INV-LAP-001',
      qty: 10,
      unitPrice: 51000,
      officeCode: 'CHE-WH1',
    },
    {
      poNumber: 'PO-2026-0002',
      vendorCode: 'VND-006',
      inventorySku: 'INV-RTR-007',
      qty: 5,
      unitPrice: 18000,
      officeCode: 'BLR-HQ',
    },
    {
      poNumber: 'PO-2026-0003',
      vendorCode: 'VND-004',
      inventorySku: 'INV-PRN-005',
      qty: 25,
      unitPrice: 3000,
      officeCode: 'MUM-REG',
    },
  ];

  for (const po of purchaseOrderSeed) {
    const vendor = vendors.find((entry) => entry.vendorCode === po.vendorCode);
    const lineTotal = po.qty * po.unitPrice;
    const taxAmount = lineTotal * 0.18;
    const savedPO = await prisma.purchaseOrder.upsert({
      where: { poNumber: po.poNumber },
      update: {
        vendorId: vendor.id,
        officeId: officeByCode[po.officeCode].id,
        tenantId: tenant.id,
        legalEntityId: legalEntity.id,
        fiscalPeriodId: fiscalPeriod.id,
        requestedById: userByEmail['procurement@coreops.local'].id,
        status: POStatus.APPROVED,
        subtotal: lineTotal,
        taxAmount,
        totalAmount: lineTotal + taxAmount,
        orderDate: new Date('2026-04-12T00:00:00.000Z'),
        expectedDeliveryDate: new Date('2026-04-28T00:00:00.000Z'),
        approvedById: userByEmail['ops.manager@coreops.local'].id,
        approvalDate: new Date('2026-04-12T02:00:00.000Z'),
        notes: 'Seeded approved purchase order',
      },
      create: {
        poNumber: po.poNumber,
        vendorId: vendor.id,
        officeId: officeByCode[po.officeCode].id,
        tenantId: tenant.id,
        legalEntityId: legalEntity.id,
        fiscalPeriodId: fiscalPeriod.id,
        requestedById: userByEmail['procurement@coreops.local'].id,
        status: POStatus.APPROVED,
        subtotal: lineTotal,
        taxAmount,
        totalAmount: lineTotal + taxAmount,
        orderDate: new Date('2026-04-12T00:00:00.000Z'),
        expectedDeliveryDate: new Date('2026-04-28T00:00:00.000Z'),
        approvedById: userByEmail['ops.manager@coreops.local'].id,
        approvalDate: new Date('2026-04-12T02:00:00.000Z'),
        notes: 'Seeded approved purchase order',
      },
    });

    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: savedPO.id } });
    await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: savedPO.id,
        inventoryId: inventoryBySku[po.inventorySku].id,
        name: inventoryBySku[po.inventorySku].name,
        description: 'Seeded procurement line item',
        quantity: po.qty,
        unitPrice: po.unitPrice,
        totalPrice: lineTotal,
        receivedQuantity: 0,
      },
    });
  }

  await prisma.transaction.deleteMany({ where: { description: { startsWith: '[seed]' } } });

  const transactionSeed = [
    {
      type: TransactionType.INCOME,
      category: 'SALES',
      amount: 508000,
      description: '[seed] Sales receipt from Acme',
      officeCode: 'BLR-HQ',
      referenceType: ReferenceType.INVOICE,
      glCode: '4000',
    },
    {
      type: TransactionType.EXPENSE,
      category: 'PROCUREMENT',
      amount: 601800,
      description: '[seed] Inventory procurement batch',
      officeCode: 'CHE-WH1',
      referenceType: ReferenceType.PURCHASE_ORDER,
      glCode: '5000',
    },
    {
      type: TransactionType.EXPENSE,
      category: 'MAINTENANCE',
      amount: 42000,
      description: '[seed] Emergency network maintenance',
      officeCode: 'MUM-REG',
      referenceType: ReferenceType.MAINTENANCE_TICKET,
      glCode: '5100',
    },
    {
      type: TransactionType.INCOME,
      category: 'SALES',
      amount: 144000,
      description: '[seed] Camera package invoice',
      officeCode: 'MUM-REG',
      referenceType: ReferenceType.INVOICE,
      glCode: '4000',
    },
    {
      type: TransactionType.INCOME,
      category: 'SERVICES',
      amount: 141000,
      description: '[seed] Router deployment service',
      officeCode: 'DEL-BR1',
      referenceType: ReferenceType.INVOICE,
      glCode: '4000',
    },
    {
      type: TransactionType.EXPENSE,
      category: 'UTILITIES',
      amount: 23500,
      description: '[seed] Data center utility cost',
      officeCode: 'BLR-HQ',
      referenceType: ReferenceType.MANUAL,
      glCode: '5100',
    },
    {
      type: TransactionType.EXPENSE,
      category: 'LOGISTICS',
      amount: 17500,
      description: '[seed] Inter-office transfer freight',
      officeCode: 'CHE-WH1',
      referenceType: ReferenceType.MANUAL,
      glCode: '5000',
    },
    {
      type: TransactionType.INCOME,
      category: 'SALES',
      amount: 96000,
      description: '[seed] Maintenance renewal billing',
      officeCode: 'DEL-BR1',
      referenceType: ReferenceType.INVOICE,
      glCode: '4000',
    },
    {
      type: TransactionType.EXPENSE,
      category: 'PROCUREMENT',
      amount: 106200,
      description: '[seed] Printer consumables procurement',
      officeCode: 'MUM-REG',
      referenceType: ReferenceType.PURCHASE_ORDER,
      glCode: '5000',
    },
    {
      type: TransactionType.INCOME,
      category: 'SALES',
      amount: 82000,
      description: '[seed] Quarterly support plan',
      officeCode: 'BLR-HQ',
      referenceType: ReferenceType.INVOICE,
      glCode: '4000',
    },
  ];

  await prisma.transaction.createMany({
    data: transactionSeed.map((tx) => ({
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      currency: 'INR',
      date: new Date('2026-04-15T00:00:00.000Z'),
      description: tx.description,
      referenceType: tx.referenceType,
      officeId: officeByCode[tx.officeCode].id,
      tenantId: tenant.id,
      legalEntityId: legalEntity.id,
      fiscalPeriodId: fiscalPeriod.id,
      recordedById: userByEmail['finance.staff@coreops.local'].id,
      status: TransactionStatus.CLEARED,
      glAccountId: glByCode[tx.glCode].id,
    })),
  });

  await prisma.settings.upsert({
    where: { key: 'seed:metadata' },
    update: {
      value: {
        version: '2026.03.23',
        generatedAt: new Date().toISOString(),
        notes: 'Detailed seed dataset with 10+ entries across users, vendors, inventory, assets, customers, and finance transactions.',
      },
    },
    create: {
      key: 'seed:metadata',
      value: {
        version: '2026.03.23',
        generatedAt: new Date().toISOString(),
        notes: 'Detailed seed dataset with 10+ entries across users, vendors, inventory, assets, customers, and finance transactions.',
      },
    },
  });

  console.log('Seed complete.');
  console.log('Default login password for seeded users:', defaultPassword);
  console.log('Seed counts:', {
    offices: officeSeed.length,
    users: userSeed.length,
    vendors: vendorSeed.length,
    inventory: inventorySeed.length,
    assets: assetSeed.length,
    customers: customerSeed.length,
    quotations: quoteData.length,
    salesOrders: salesOrderData.length,
    purchaseOrders: purchaseOrderSeed.length,
    transactions: transactionSeed.length,
    glAccounts: glAccountSeed.length,
  });
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
