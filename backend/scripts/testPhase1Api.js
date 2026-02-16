const axios = require('axios');

const API_URL = 'http://localhost:5000/api/auth';
const ADMIN_EMAIL = 'admin@coreops.com';
const ADMIN_PASSWORD = 'Test@123';

async function runTest() {
    console.log('🔍 Phase 1 API Verification Started...\n');

    let token = null;

    // 1. Test Login
    try {
        console.log('1️⃣ Testing Login...');
        const response = await axios.post(`${API_URL}/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        if (response.data.success && response.data.token) {
            token = response.data.token;
            console.log('✅ Login Successful');
            console.log(`   Token received: ${token.substring(0, 15)}...`);
            console.log(`   User Role: ${response.data.user.role}`);
        } else {
            console.error('❌ Login Failed: No token received');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Login Failed:', error.response?.data?.message || error.message);
        process.exit(1);
    }

    // 2. Test Get Profile (Protected Route)
    try {
        console.log('\n2️⃣ Testing Protected Route (/me)...');
        const response = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success && response.data.data.email === ADMIN_EMAIL) {
            console.log('✅ Protected Route Access Successful');
            console.log(`   Profile Retrieved: ${response.data.data.name} (${response.data.data.email})`);
        } else {
            console.error('❌ Protected Route Failed: Invalid response');
        }

    } catch (error) {
        console.error('❌ Protected Route Failed:', error.response?.data?.message || error.message);
    }

    // 3. Test Unauthorized Access
    try {
        console.log('\n3️⃣ Testing Unauthorized Access...');
        await axios.get(`${API_URL}/me`);
        console.error('❌ Unauthorized Access Failed: Should have returned 401');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Unauthorized Access Blocked (401 received)');
        } else {
            console.error(`❌ Unexpected Status: ${error.response?.status}`);
        }
    }

    console.log('\n✨ Phase 1 Verification Complete');
}

runTest();
