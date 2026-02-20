require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coreops';

const resetUsers = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const users = [
            {
                email: 'admin@coreops.io',
                password: 'Test@123',
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
                isActive: true
            },
            {
                email: 'tech@coreops.com',
                password: 'Test@123',
                name: 'Technician User',
                role: 'TECHNICIAN',
                isActive: true
            },
            {
                email: 'admin@coreops.com',
                password: 'Test@123',
                name: 'Admin User',
                role: 'ADMIN',
                isActive: true
            }
        ];

        for (const u of users) {
            const existing = await User.findOne({ email: u.email });
            if (existing) {
                existing.password = u.password;
                existing.isActive = true;
                existing.role = u.role;
                await existing.save();
                console.log(`Updated user: ${u.email}`);
            } else {
                await User.create(u);
                console.log(`Created user: ${u.email}`);
            }
        }

        console.log('All users reset successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting users:', error);
        process.exit(1);
    }
};

resetUsers();
