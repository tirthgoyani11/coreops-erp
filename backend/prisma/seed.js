const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt = require('bcrypt');

// Use the project's prisma singleton
const prisma = require('../src/config/prisma');
const BCRYPT_ROUNDS = 12;

async function main() {
    console.log('🌱 Seeding CoreOps ERP database...\n');

    // ═══════════════════════════════════════════════════════════
    // 1. OFFICES
    // ═══════════════════════════════════════════════════════════
    console.log('📍 Creating offices...');
    const hq = await prisma.office.create({
        data: {
            name: 'CoreOps Headquarters',
            code: 'HQ-AHM',
            type: 'HEADQUARTERS',
            street: '100 Corporate Drive',
            city: 'Ahmedabad',
            state: 'Gujarat',
            country: 'India',
            postalCode: '380015',
            phone: '+91-79-12345678',
            email: 'hq@coreops.in',
            baseCurrency: 'INR',
            countryCode: 'IN',
            locationCode: 'AHM',
            maintenanceApprovalThreshold: 10000,
            autoApproveUnder: 2000,
        },
    });

    const mumbai = await prisma.office.create({
        data: {
            name: 'Mumbai Regional Office',
            code: 'RO-MUM',
            type: 'REGIONAL_OFFICE',
            parentId: hq.id,
            street: '45 Bandra Kurla Complex',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            postalCode: '400051',
            phone: '+91-22-87654321',
            email: 'mumbai@coreops.in',
            baseCurrency: 'INR',
            countryCode: 'IN',
            locationCode: 'MUM',
        },
    });

    const delhi = await prisma.office.create({
        data: {
            name: 'Delhi Branch',
            code: 'BR-DEL',
            type: 'BRANCH',
            parentId: hq.id,
            street: '12 Connaught Place',
            city: 'New Delhi',
            state: 'Delhi',
            country: 'India',
            postalCode: '110001',
            phone: '+91-11-55667788',
            email: 'delhi@coreops.in',
            baseCurrency: 'INR',
            countryCode: 'IN',
            locationCode: 'DEL',
        },
    });

    console.log(`   ✅ ${hq.name}, ${mumbai.name}, ${delhi.name}`);

    // ═══════════════════════════════════════════════════════════
    // 2. USERS
    // ═══════════════════════════════════════════════════════════
    console.log('👤 Creating users...');
    const pw = await bcrypt.hash('CoreOps@2026', BCRYPT_ROUNDS);

    const superAdmin = await prisma.user.create({
        data: {
            name: 'Tirth Goyani',
            firstName: 'Tirth',
            lastName: 'Goyani',
            email: 'tirth@coreops.in',
            password: pw,
            role: 'SUPER_ADMIN',
            officeId: hq.id,
            canApproveTickets: true,
            canManageAssets: true,
            canManageInventory: true,
            canViewFinancials: true,
            canManageUsers: true,
            canManageVendors: true,
            approvalLimit: -1,
        },
    });

    const manager = await prisma.user.create({
        data: {
            name: 'Priya Sharma',
            firstName: 'Priya',
            lastName: 'Sharma',
            email: 'priya@coreops.in',
            password: pw,
            role: 'MANAGER',
            officeId: mumbai.id,
            canApproveTickets: true,
            canManageAssets: true,
            canManageInventory: true,
            canViewFinancials: true,
            canManageVendors: true,
            approvalLimit: 50000,
        },
    });

    const tech = await prisma.user.create({
        data: {
            name: 'Rahul Patel',
            firstName: 'Rahul',
            lastName: 'Patel',
            email: 'rahul@coreops.in',
            password: pw,
            role: 'TECHNICIAN',
            officeId: mumbai.id,
        },
    });

    const staff = await prisma.user.create({
        data: {
            name: 'Anita Desai',
            firstName: 'Anita',
            lastName: 'Desai',
            email: 'anita@coreops.in',
            password: pw,
            role: 'STAFF',
            officeId: delhi.id,
        },
    });

    const viewer = await prisma.user.create({
        data: {
            name: 'Vikram Singh',
            firstName: 'Vikram',
            lastName: 'Singh',
            email: 'vikram@coreops.in',
            password: pw,
            role: 'VIEWER',
            officeId: hq.id,
        },
    });

    console.log(`   ✅ 5 users (password: CoreOps@2026)`);

    // ═══════════════════════════════════════════════════════════
    // 3. VENDORS
    // ═══════════════════════════════════════════════════════════
    console.log('🏢 Creating vendors...');
    const vendors = await Promise.all([
        prisma.vendor.create({
            data: {
                name: 'TechParts India Pvt Ltd',
                vendorCode: 'VND-TECH-001',
                contactPerson: 'Amit Verma',
                email: 'amit@techparts.in',
                phone: '+91-9876543210',
                address: '78, MIDC Industrial Area, Pune 411057',
                gstNumber: '27AABCT1234A1Z5',
                panNumber: 'AABCT1234A',
                rating: 4.5,
                bankDetails: { bankName: 'HDFC Bank', accountNumber: '50100012345678', ifscCode: 'HDFC0001234' },
            },
        }),
        prisma.vendor.create({
            data: {
                name: 'Office Essentials Corp',
                vendorCode: 'VND-OESS-002',
                contactPerson: 'Sneha Kulkarni',
                email: 'sneha@officeessentials.in',
                phone: '+91-9988776655',
                address: '22, Nehru Road, Bangalore 560001',
                gstNumber: '29AABCO5678B1Z8',
                rating: 4.2,
            },
        }),
        prisma.vendor.create({
            data: {
                name: 'Gujarat Heavy Machinery',
                vendorCode: 'VND-GHM-003',
                contactPerson: 'Rajesh Mehta',
                email: 'rajesh@ghm.co.in',
                phone: '+91-9765432100',
                address: 'Plot 45, GIDC Vatva, Ahmedabad 382445',
                gstNumber: '24AABCG9012C1Z3',
                rating: 3.8,
            },
        }),
    ]);
    console.log(`   ✅ ${vendors.length} vendors`);

    // ═══════════════════════════════════════════════════════════
    // 4. ASSETS
    // ═══════════════════════════════════════════════════════════
    console.log('💻 Creating assets...');

    // Set up counter for GUAI
    await prisma.counter.upsert({
        where: { name: 'asset_guai' },
        update: { sequence: 0 },
        create: { name: 'asset_guai', prefix: 'GUAI', sequence: 0 },
    });

    const assetData = [
        { name: 'Dell Latitude 5540', category: 'LAPTOP', manufacturer: 'Dell', model: 'Latitude 5540', serialNumber: 'DL5540-AHM-001', purchasePrice: 78500, officeId: hq.id, building: 'Main Tower', floor: '3', room: '302', condition: 'EXCELLENT' },
        { name: 'HP LaserJet Pro M428', category: 'PRINTER', manufacturer: 'HP', model: 'LaserJet Pro M428fdw', serialNumber: 'HPLJ-M428-002', purchasePrice: 32000, officeId: hq.id, building: 'Main Tower', floor: '2', room: '201' },
        { name: 'Cisco Catalyst 9200', category: 'NETWORK', manufacturer: 'Cisco', model: 'Catalyst 9200L-24P', serialNumber: 'CSC-9200-003', purchasePrice: 145000, officeId: hq.id, building: 'Server Room', floor: 'B1', room: 'SR-01', condition: 'GOOD' },
        { name: 'MacBook Pro 16"', category: 'LAPTOP', manufacturer: 'Apple', model: 'MacBook Pro M3 Max', serialNumber: 'MBP16-MUM-004', purchasePrice: 249900, officeId: mumbai.id, building: 'BKC Tower', floor: '12', room: '1205', condition: 'EXCELLENT', assignedToId: manager.id },
        { name: 'Herman Miller Aeron Chair', category: 'FURNITURE', manufacturer: 'Herman Miller', model: 'Aeron Size B', serialNumber: 'HM-AERON-005', purchasePrice: 52000, officeId: mumbai.id, building: 'BKC Tower', floor: '12', room: '1210' },
        { name: 'Dell PowerEdge R750', category: 'SERVER', manufacturer: 'Dell', model: 'PowerEdge R750xs', serialNumber: 'PE-R750-006', purchasePrice: 485000, officeId: hq.id, building: 'Server Room', floor: 'B1', room: 'SR-01', condition: 'GOOD' },
        { name: 'Toyota Innova Crysta', category: 'VEHICLE', manufacturer: 'Toyota', model: 'Innova Crysta 2.4 GX', serialNumber: 'GJ01AB1234', purchasePrice: 2150000, officeId: hq.id, condition: 'GOOD' },
        { name: 'Lenovo ThinkPad T14', category: 'LAPTOP', manufacturer: 'Lenovo', model: 'ThinkPad T14 Gen 4', serialNumber: 'TP-T14-008', purchasePrice: 85000, officeId: delhi.id, building: 'CP Office', floor: '5', room: '503', assignedToId: staff.id },
        { name: 'Samsung 65" Display', category: 'EQUIPMENT', manufacturer: 'Samsung', model: 'QM65R-B', serialNumber: 'SAM-65QM-009', purchasePrice: 92000, officeId: mumbai.id, building: 'BKC Tower', floor: '12', room: 'Conference A' },
        { name: 'APC Smart-UPS 3000VA', category: 'EQUIPMENT', manufacturer: 'APC', model: 'SMT3000RMI2U', serialNumber: 'APC-3000-010', purchasePrice: 65000, officeId: hq.id, building: 'Server Room', floor: 'B1', room: 'SR-01' },
    ];

    const assets = [];
    for (let i = 0; i < assetData.length; i++) {
        const counter = await prisma.counter.update({
            where: { name: 'asset_guai' },
            data: { sequence: { increment: 1 } },
        });
        const seq = String(counter.sequence).padStart(6, '0');
        const { officeId, condition, assignedToId, ...rest } = assetData[i];
        const office = [hq, mumbai, delhi].find(o => o.id === officeId);
        const guai = `${office.countryCode || 'IN'}-${office.locationCode || 'HQ'}-${seq}`;

        const asset = await prisma.asset.create({
            data: {
                guai,
                ...rest,
                officeId,
                condition: condition || 'GOOD',
                assignedToId: assignedToId || null,
                currency: 'INR',
                currentBookValue: rest.purchasePrice * 0.85, // ~85% of purchase
                createdById: superAdmin.id,
                purchaseDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
            },
        });
        assets.push(asset);
    }
    console.log(`   ✅ ${assets.length} assets`);

    // ═══════════════════════════════════════════════════════════
    // 5. INVENTORY
    // ═══════════════════════════════════════════════════════════
    console.log('📦 Creating inventory...');
    const inventoryData = [
        { name: 'Toner Cartridge HP 58A', type: 'SPARE', sku: 'SPR-00001', partNumber: 'CF258A', category: 'Printer Supplies', currentQuantity: 25, reorderPoint: 5, unitCost: 4200, officeId: hq.id },
        { name: 'RAM DDR4 16GB SODIMM', type: 'SPARE', sku: 'SPR-00002', partNumber: 'KVR3200S11D8/16', category: 'Computer Parts', currentQuantity: 12, reorderPoint: 3, unitCost: 3800, officeId: hq.id },
        { name: 'SSD 512GB NVMe M.2', type: 'SPARE', sku: 'SPR-00003', partNumber: 'MZ-V8V500B', category: 'Computer Parts', currentQuantity: 8, reorderPoint: 4, unitCost: 4500, officeId: hq.id },
        { name: 'Ethernet Cable Cat6 3m', type: 'SPARE', sku: 'SPR-00004', partNumber: 'CAT6-3M', category: 'Networking', currentQuantity: 100, reorderPoint: 20, unitCost: 150, officeId: hq.id },
        { name: 'A4 Paper Ream 500 sheets', type: 'PRODUCT', sku: 'PRD-00001', category: 'Office Supplies', currentQuantity: 50, reorderPoint: 10, costPrice: 280, sellingPrice: 320, officeId: hq.id },
        { name: 'Whiteboard Markers (Set of 4)', type: 'PRODUCT', sku: 'PRD-00002', category: 'Office Supplies', currentQuantity: 30, reorderPoint: 8, costPrice: 120, sellingPrice: 150, officeId: mumbai.id },
        { name: 'Laptop Charger USB-C 65W', type: 'SPARE', sku: 'SPR-00005', partNumber: 'USB-C-65W', category: 'Computer Parts', currentQuantity: 6, reorderPoint: 3, unitCost: 2200, officeId: mumbai.id },
        { name: 'Keyboard Logitech MX Keys', type: 'PRODUCT', sku: 'PRD-00003', category: 'Peripherals', currentQuantity: 15, reorderPoint: 5, costPrice: 8500, sellingPrice: 9500, officeId: delhi.id },
        { name: 'Engine Oil 5W-30 (5L)', type: 'SPARE', sku: 'SPR-00006', partNumber: 'EO-5W30-5L', category: 'Vehicle Parts', currentQuantity: 3, reorderPoint: 5, unitCost: 1800, officeId: hq.id }, // low stock!
        { name: 'Air Filter Toyota Innova', type: 'SPARE', sku: 'SPR-00007', partNumber: 'TY-AF-IC24', category: 'Vehicle Parts', currentQuantity: 2, reorderPoint: 3, unitCost: 650, officeId: hq.id }, // low stock!
    ];

    const inventoryItems = [];
    for (const item of inventoryData) {
        const inv = await prisma.inventory.create({ data: item });
        inventoryItems.push(inv);
    }

    // Add initial stock movements
    for (const inv of inventoryItems) {
        await prisma.stockMovement.create({
            data: {
                inventoryId: inv.id,
                type: 'STOCK_IN',
                quantity: inv.currentQuantity,
                reason: 'Initial stock',
                reference: 'SEED',
                performedById: superAdmin.id,
            },
        });
    }
    console.log(`   ✅ ${inventoryItems.length} items + stock movements`);

    // ═══════════════════════════════════════════════════════════
    // 6. MAINTENANCE TICKETS
    // ═══════════════════════════════════════════════════════════
    console.log('🔧 Creating maintenance tickets...');
    const tickets = await Promise.all([
        prisma.maintenanceTicket.create({
            data: {
                ticketNumber: 'MT-20260215-0001',
                assetId: assets[1].id, // HP Printer
                officeId: hq.id,
                issueDescription: 'Paper jam every 3rd print. Roller assembly making grinding noise.',
                issueType: 'HARDWARE_FAILURE',
                priority: 'HIGH',
                estimatedCost: 3500,
                status: 'IN_PROGRESS',
                approvalStatus: 'AUTO_APPROVED',
                assignedToId: tech.id,
                assignedDate: new Date(),
                requestedById: staff.id,
                reportedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                algorithmDecision: { decision: 'REPAIR', confidence: 85, repairScore: 78, autoApprove: true },
            },
        }),
        prisma.maintenanceTicket.create({
            data: {
                ticketNumber: 'MT-20260218-0002',
                assetId: assets[5].id, // Dell Server
                officeId: hq.id,
                issueDescription: 'RAID controller showing degraded status on Disk 3. Needs replacement.',
                issueType: 'HARDWARE_FAILURE',
                priority: 'CRITICAL',
                estimatedCost: 45000,
                status: 'REQUESTED',
                approvalStatus: 'PENDING',
                requestedById: superAdmin.id,
                reportedDate: new Date(),
            },
        }),
        prisma.maintenanceTicket.create({
            data: {
                ticketNumber: 'MT-20260210-0003',
                assetId: assets[0].id, // Dell Latitude
                officeId: hq.id,
                issueDescription: 'Scheduled quarterly laptop maintenance - clean, update BIOS, thermal paste.',
                issueType: 'PREVENTIVE',
                priority: 'LOW',
                estimatedCost: 800,
                status: 'COMPLETED',
                approvalStatus: 'AUTO_APPROVED',
                assignedToId: tech.id,
                requestedById: manager.id,
                completedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                resolution: 'Cleaned internals, applied new thermal paste, updated BIOS to v1.8.2.',
                actualCost: 650,
                reportedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            },
        }),
    ]);

    // Work log for the completed ticket
    await prisma.workLog.create({
        data: {
            ticketId: tickets[2].id,
            technicianId: tech.id,
            startTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
            hoursWorked: 2,
            notes: 'Opened laptop, cleaned dust, applied Arctic MX-5 thermal paste. Ran stress test for 30 min.',
        },
    });

    // Spare part usage
    await prisma.sparePartUsage.create({
        data: {
            ticketId: tickets[0].id, // printer ticket
            inventoryId: inventoryItems[0].id, // Toner
            partNumber: 'CF258A',
            name: 'Toner Cartridge HP 58A',
            quantity: 1,
            costPerUnit: 4200,
        },
    });

    // Maintenance history for the completed ticket
    await prisma.assetMaintenanceHistory.create({
        data: {
            assetId: assets[0].id,
            type: 'PREVENTIVE',
            cost: 650,
            notes: 'Quarterly maintenance completed successfully.',
        },
    });

    console.log(`   ✅ ${tickets.length} tickets + work logs + spare parts`);

    // ═══════════════════════════════════════════════════════════
    // 7. PURCHASE ORDERS
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Creating purchase orders...');
    const po = await prisma.purchaseOrder.create({
        data: {
            poNumber: 'PO-2026-0001',
            vendorId: vendors[0].id,
            officeId: hq.id,
            requestedById: manager.id,
            status: 'APPROVED',
            subtotal: 27000,
            taxAmount: 4860,
            totalAmount: 31860,
            orderDate: new Date(),
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            approvedById: superAdmin.id,
            approvalDate: new Date(),
            notes: 'Quarterly printer supplies replenishment',
            items: {
                create: [
                    { name: 'Toner Cartridge HP 58A', quantity: 5, unitPrice: 4200, totalPrice: 21000, inventoryId: inventoryItems[0].id },
                    { name: 'SSD 512GB NVMe M.2', quantity: 2, unitPrice: 4500, totalPrice: 9000, inventoryId: inventoryItems[2].id },
                ],
            },
        },
    });

    const po2 = await prisma.purchaseOrder.create({
        data: {
            poNumber: 'PO-2026-0002',
            vendorId: vendors[1].id,
            officeId: mumbai.id,
            requestedById: manager.id,
            status: 'DRAFT',
            subtotal: 17000,
            taxAmount: 3060,
            totalAmount: 20060,
            notes: 'Office supplies for Q2',
            items: {
                create: [
                    { name: 'A4 Paper Ream', quantity: 20, unitPrice: 280, totalPrice: 5600 },
                    { name: 'Whiteboard Markers (Bulk)', quantity: 50, unitPrice: 120, totalPrice: 6000 },
                    { name: 'Keyboard Logitech MX Keys', quantity: 3, unitPrice: 8500, totalPrice: 25500, inventoryId: inventoryItems[7].id },
                ],
            },
        },
    });

    console.log(`   ✅ 2 purchase orders with items`);

    // ═══════════════════════════════════════════════════════════
    // 8. TRANSACTIONS
    // ═══════════════════════════════════════════════════════════
    console.log('💰 Creating transactions...');
    const txns = [
        { type: 'EXPENSE', category: 'MAINTENANCE', amount: 650, description: 'Laptop preventive maintenance (MT-20260210-0003)', officeId: hq.id, recordedById: superAdmin.id, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { type: 'EXPENSE', category: 'PROCUREMENT', amount: 31860, description: 'PO-2026-0001: Printer supplies + SSDs', officeId: hq.id, recordedById: manager.id, referenceType: 'PURCHASE_ORDER', referenceId: po.id },
        { type: 'EXPENSE', category: 'UTILITIES', amount: 45000, description: 'Electricity bill - Feb 2026', officeId: hq.id, recordedById: superAdmin.id },
        { type: 'EXPENSE', category: 'RENT', amount: 125000, description: 'Office rent - Feb 2026', officeId: mumbai.id, recordedById: manager.id },
        { type: 'INCOME', category: 'SERVICE', amount: 85000, description: 'IT consulting service invoice #INV-2026-012', officeId: hq.id, recordedById: superAdmin.id },
        { type: 'INCOME', category: 'SERVICE', amount: 42000, description: 'Equipment rental income', officeId: mumbai.id, recordedById: manager.id },
        { type: 'EXPENSE', category: 'MAINTENANCE', amount: 12500, description: 'Vehicle servicing - Toyota Innova', officeId: hq.id, recordedById: superAdmin.id, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
        { type: 'EXPENSE', category: 'TRAVEL', amount: 8500, description: 'Delhi site visit - flight tickets', officeId: hq.id, recordedById: superAdmin.id },
    ];

    for (const t of txns) {
        await prisma.transaction.create({ data: t });
    }
    console.log(`   ✅ ${txns.length} transactions`);

    // ═══════════════════════════════════════════════════════════
    // 9. BUDGETS
    // ═══════════════════════════════════════════════════════════
    console.log('📊 Creating budgets...');
    const budgetData = [
        { officeId: hq.id, category: 'MAINTENANCE', month: 2, year: 2026, limit: 200000, spent: 13150 },
        { officeId: hq.id, category: 'PROCUREMENT', month: 2, year: 2026, limit: 500000, spent: 31860 },
        { officeId: hq.id, category: 'UTILITIES', month: 2, year: 2026, limit: 60000, spent: 45000 },
        { officeId: mumbai.id, category: 'RENT', month: 2, year: 2026, limit: 150000, spent: 125000 },
        { officeId: mumbai.id, category: 'MAINTENANCE', month: 2, year: 2026, limit: 100000, spent: 0 },
        { officeId: delhi.id, category: 'MAINTENANCE', month: 2, year: 2026, limit: 75000, spent: 0 },
    ];

    for (const b of budgetData) {
        await prisma.budget.create({ data: b });
    }
    console.log(`   ✅ ${budgetData.length} budget entries`);

    // ═══════════════════════════════════════════════════════════
    // 10. NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════
    console.log('🔔 Creating notifications...');
    await Promise.all([
        prisma.notification.create({
            data: {
                recipientId: superAdmin.id,
                type: 'APPROVAL_REQUIRED',
                title: 'Critical Maintenance Approval Needed',
                message: 'Server RAID controller replacement (₹45,000) requires your approval.',
                priority: 'HIGH',
                relatedModel: 'MaintenanceTicket',
                relatedDocId: tickets[1].id,
            },
        }),
        prisma.notification.create({
            data: {
                recipientId: manager.id,
                type: 'LOW_STOCK',
                title: 'Low Stock Alert',
                message: 'Engine Oil 5W-30 is below reorder point (3/5 remaining).',
                priority: 'MEDIUM',
            },
        }),
        prisma.notification.create({
            data: {
                recipientId: tech.id,
                type: 'TICKET_ASSIGNED',
                title: 'New Ticket Assigned',
                message: 'HP Printer paper jam ticket has been assigned to you.',
                priority: 'HIGH',
                relatedModel: 'MaintenanceTicket',
                relatedDocId: tickets[0].id,
                isRead: true,
                readAt: new Date(),
            },
        }),
    ]);
    console.log(`   ✅ 3 notifications`);

    // ═══════════════════════════════════════════════════════════
    // 11. CURRENCY RATES
    // ═══════════════════════════════════════════════════════════
    console.log('💱 Creating currency rates...');
    await Promise.all([
        prisma.currencyRate.create({ data: { baseCurrency: 'INR', targetCurrency: 'USD', rate: 0.0119, source: 'seed' } }),
        prisma.currencyRate.create({ data: { baseCurrency: 'INR', targetCurrency: 'EUR', rate: 0.0110, source: 'seed' } }),
        prisma.currencyRate.create({ data: { baseCurrency: 'INR', targetCurrency: 'GBP', rate: 0.0094, source: 'seed' } }),
        prisma.currencyRate.create({ data: { baseCurrency: 'USD', targetCurrency: 'INR', rate: 84.03, source: 'seed' } }),
    ]);
    console.log(`   ✅ 4 exchange rates`);

    // ═══════════════════════════════════════════════════════════
    // 12. SETTINGS
    // ═══════════════════════════════════════════════════════════
    console.log('⚙️  Creating settings...');
    await Promise.all([
        prisma.settings.create({ data: { key: 'companyName', value: '"CoreOps Technologies Pvt Ltd"' } }),
        prisma.settings.create({ data: { key: 'defaultCurrency', value: '"INR"' } }),
        prisma.settings.create({ data: { key: 'defaultTimezone', value: '"Asia/Kolkata"' } }),
        prisma.settings.create({ data: { key: 'maintenanceMode', value: 'false' } }),
        prisma.settings.create({ data: { key: 'sessionTimeout', value: '30' } }),
        prisma.settings.create({ data: { key: 'passwordPolicy', value: JSON.stringify({ minLength: 8, requireUppercase: true, requireNumber: true, requireSpecialChar: true }) } }),
    ]);
    console.log(`   ✅ 6 settings`);

    // ═══════════════════════════════════════════════════════════
    // 13. AUDIT LOGS
    // ═══════════════════════════════════════════════════════════
    console.log('📝 Creating audit logs...');
    await Promise.all([
        prisma.auditLog.create({ data: { userId: superAdmin.id, action: 'LOGIN', resourceType: 'USER_RESOURCE', resourceId: superAdmin.id, status: 'SUCCESS', description: 'Super admin logged in' } }),
        prisma.auditLog.create({ data: { userId: superAdmin.id, action: 'CREATE_ASSET', resourceType: 'ASSET_RESOURCE', resourceId: assets[0].id, status: 'SUCCESS', description: `Created asset: ${assets[0].name}` } }),
        prisma.auditLog.create({ data: { userId: manager.id, action: 'CREATE_PURCHASE_ORDER', resourceType: 'PURCHASE_ORDER_RESOURCE', resourceId: po.id, status: 'SUCCESS', description: 'Created PO-2026-0001' } }),
        prisma.auditLog.create({ data: { userId: superAdmin.id, action: 'APPROVE_PURCHASE_ORDER', resourceType: 'PURCHASE_ORDER_RESOURCE', resourceId: po.id, status: 'SUCCESS', description: 'Approved PO-2026-0001' } }),
    ]);
    console.log(`   ✅ 4 audit logs`);

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🎉 Seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   Offices ........... 3');
    console.log('   Users ............. 5  (pw: CoreOps@2026)');
    console.log('   Vendors ........... 3');
    console.log('   Assets ............ 10');
    console.log('   Inventory Items ... 10  (2 low-stock alerts)');
    console.log('   Stock Movements ... 10');
    console.log('   Maint. Tickets .... 3  (1 completed, 1 in-progress, 1 pending)');
    console.log('   Purchase Orders ... 2  (1 approved, 1 draft)');
    console.log('   Transactions ...... 8');
    console.log('   Budgets ........... 6');
    console.log('   Notifications ..... 3');
    console.log('   Currency Rates .... 4');
    console.log('   Settings .......... 6');
    console.log('   Audit Logs ........ 4');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n🔑 Login credentials:');
    console.log('   Super Admin . tirth@coreops.in / CoreOps@2026');
    console.log('   Manager ..... priya@coreops.in / CoreOps@2026');
    console.log('   Technician .. rahul@coreops.in / CoreOps@2026');
    console.log('   Staff ....... anita@coreops.in / CoreOps@2026');
    console.log('   Viewer ...... vikram@coreops.in / CoreOps@2026');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Seed failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
