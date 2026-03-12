// src/controllers/searchController.js
const prisma = require('../config/prisma');

/**
 * Perform a global search across multiple entities (Assets, Tickets, Inventory, Users)
 */
exports.searchAll = async (req, res, next) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const searchQuery = { contains: q, mode: 'insensitive' };
        
        // Run all queries concurrently for performance
        const [assets, tickets, inventory, users] = await Promise.all([
            // 1. Assets
            prisma.asset.findMany({
                where: { OR: [{ name: searchQuery }, { assetTag: searchQuery }] },
                take: 5,
                select: { id: true, name: true, assetTag: true, status: true }
            }),
            
            // 2. Tickets
            prisma.ticket.findMany({
                where: { OR: [{ title: searchQuery }, { description: searchQuery }] },
                take: 5,
                select: { id: true, title: true, status: true, priority: true }
            }),
            
            // 3. Inventory
            prisma.inventoryItem.findMany({
                where: { OR: [{ name: searchQuery }, { sku: searchQuery }] },
                take: 5,
                select: { id: true, name: true, sku: true, category: true }
            }),
            
            // 4. Users (only if admin/manager?) -> for global search let's just show basic name/role
            prisma.user.findMany({
                where: { OR: [{ firstName: searchQuery }, { lastName: searchQuery }, { email: searchQuery }] },
                take: 5,
                select: { id: true, firstName: true, lastName: true, role: true, email: true }
            })
        ]);

        // Transform results into a unified format for the Command Palette
        const results = [
            ...assets.map(a => ({
                id: `asset-${a.id}`,
                type: 'Asset',
                title: a.name,
                subtitle: `Tag: ${a.assetTag} • Status: ${a.status}`,
                url: `/assets/${a.id}`,
                icon: 'Monitor'
            })),
            
            ...tickets.map(t => ({
                id: `ticket-${t.id}`,
                type: 'Maintenance Ticket',
                title: t.title,
                subtitle: `Priority: ${t.priority} • Status: ${t.status}`,
                url: `/maintenance/${t.id}`,
                icon: 'Ticket'
            })),
            
            ...inventory.map(i => ({
                id: `inv-${i.id}`,
                type: 'Inventory',
                title: i.name,
                subtitle: `SKU: ${i.sku} • Category: ${i.category}`,
                url: `/inventory/${i.id}`,
                icon: 'Package'
            })),
            
            ...users.map(u => ({
                id: `user-${u.id}`,
                type: 'User',
                title: `${u.firstName} ${u.lastName}`,
                subtitle: `Role: ${u.role} • ${u.email}`,
                url: `/users/${u.id}`,
                icon: 'User'
            }))
        ];

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        next(error);
    }
};
