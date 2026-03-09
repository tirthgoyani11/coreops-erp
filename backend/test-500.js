const axios = require('axios');
const http = require('http');

async function test() {
    try {
        console.log("Logging in...");
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'tirth@coreops.in',
            password: 'CoreOps@2026'
        });
        const token = loginRes.data.token;
        console.log("Login successful. Token acquired.");

        console.log("Fetching /api/assets...");
        const assetsRes = await axios.get('http://localhost:5000/api/assets', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Assets fetched successfully:", assetsRes.data.data.length);

        console.log("Fetching /api/assets/stats...");
        const statsRes = await axios.get('http://localhost:5000/api/assets/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Stats fetched successfully.");

        console.log("Fetching /api/notifications/unread-count...");
        const notiRes = await axios.get('http://localhost:5000/api/notifications/unread-count', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Unread count fetched successfully.");

    } catch (error) {
        if (error.response) {
            console.error("HTTP ERROR:", error.response.status);
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("UNKNOWN ERROR:", error.message);
        }
    }
}

test();
