/**
 * Script to assign an office to a user
 * Run with: node scripts/assignOfficeToUser.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Office = require('../src/models/Office');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find or create a default office
        let office = await Office.findOne({});

        if (!office) {
            console.log('No office found, creating default office...');
            office = await Office.create({
                name: 'Main Headquarters',
                code: 'HQ',
                address: {
                    street: '123 Main Street',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    country: 'India',
                    zipCode: '400001'
                },
                isActive: true
            });
            console.log('Created office:', office.name, office._id);
        } else {
            console.log('Found existing office:', office.name, office._id);
        }

        // Find all users without an office and assign them
        const usersWithoutOffice = await User.find({ officeId: { $exists: false } });
        const usersWithNullOffice = await User.find({ officeId: null });

        const usersToUpdate = [...usersWithoutOffice, ...usersWithNullOffice];

        console.log(`Found ${usersToUpdate.length} users without office assignment`);

        for (const user of usersToUpdate) {
            user.officeId = office._id;
            await user.save();
            console.log(`Assigned office to user: ${user.email}`);
        }

        // Also update any user that might have officeId as undefined
        const result = await User.updateMany(
            { $or: [{ officeId: { $exists: false } }, { officeId: null }] },
            { officeId: office._id }
        );

        console.log(`Updated ${result.modifiedCount} additional users`);
        console.log('\n✅ Done! All users now have an office assigned.');
        console.log('Office ID:', office._id.toString());

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();
