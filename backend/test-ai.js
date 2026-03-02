require('dotenv').config();
const orchestrator = require('./src/services/orchestrator');

(async () => {
    // Mock user session context
    const context = { userId: 'test-user', sessionId: 'test-session' };

    console.log("== Testing Budget Query ==");
    const res = await orchestrator.processCommand("Our budget for June and July", context);
    console.log("Output Length:", res.response.length);
    console.log("Contains Think Tags?", res.response.includes('<think>'));

    // Process exits
    process.exit(0);
})();
