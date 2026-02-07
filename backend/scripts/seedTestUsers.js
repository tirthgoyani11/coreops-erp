/**
 * Seed Script: Create Test Users for Each Role
 * 
 * Run with: node scripts/seedTestUsers.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the ACTUAL User model (NOT a simplified one)
const User = require('../src/models/User');

const testUsers = [
    { name: 'Super Admin', email: 'admin@coreops.com', role: 'SUPER_ADMIN' },
    { name: 'Manager User', email: 'manager@coreops.com', role: 'MANAGER' },
    { name: 'Staff User', email: 'staff@coreops.com', role: 'STAFF' },
    { name: 'Technician User', email: 'tech@coreops.com', role: 'TECHNICIAN' },
    { name: 'Viewer User', email: 'viewer@coreops.com', role: 'VIEWER' },
];

const PASSWORD = 'Test@123';

async function seedUsers() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/coreops-erp';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        for (const userData of testUsers) {
            // Delete existing user with this email first
            await User.deleteOne({ email: userData.email });

            // Create new user (password will be hashed by User model pre-save hook)
            await User.create({
                ...userData,
                password: PASSWORD,
                isActive: true,
            });
            console.log(`✅ Created: ${userData.email} (${userData.role})`);
        }

        console.log('\n🎉 Seed complete! Test credentials:');
        console.log('═══════════════════════════════════════════════');
        console.log('Password for all: Test@123');
        console.log('───────────────────────────────────────────────');
        testUsers.forEach(u => console.log(`${u.role.padEnd(15)} → ${u.email}`));
        console.log('═══════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Seed failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedUsers();
