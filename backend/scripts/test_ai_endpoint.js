/**
 * End-to-End AI Endpoint Test
 * Tests the full pipeline: OpsPilot chat → orchestrator → classifier → handler
 */

const API = 'http://localhost:5000/api';

// Login to get auth token
async function getToken() {
    const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'priya@coreops.in', password: 'CoreOps@2026' }),
    });
    const data = await res.json();
    return data.data?.accessToken || data.data?.token || data.token || null;
}

async function testAI(token, message) {
    const start = Date.now();
    try {
        const res = await fetch(`${API}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ message }),
        });
        const data = await res.json();
        const ms = Date.now() - start;

        return {
            status: res.status,
            success: data.data?.intent ? true : false,
            intent: data.data?.intent || 'N/A',
            response: (data.data?.response || data.message || 'No response').substring(0, 120),
            ms,
            modelsUsed: data.data?.modelsUsed?.map(m => m.model).join(', ') || 'N/A',
        };
    } catch (err) {
        return { status: 'ERROR', success: false, intent: 'N/A', response: err.message, ms: Date.now() - start };
    }
}

async function main() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  🧪 OpsPilot AI v3 — End-to-End Test Suite');
    console.log('═══════════════════════════════════════════════════\n');

    // Get auth token
    console.log('🔑 Logging in...');
    const token = await getToken();
    if (!token) {
        console.log('❌ Could not authenticate. Trying without token...\n');
    } else {
        console.log('✅ Authenticated\n');
    }

    const tests = [
        // ACTION intents (should be <2s, local classifier, no LLM)
        { msg: 'Create a new MacBook Air M3 asset costing 1200', expected: 'CREATE_ASSET' },
        { msg: 'Show me asset stats', expected: 'GET_ASSET_STATS' },
        { msg: 'Any low stock items?', expected: 'GET_LOW_STOCK' },

        // QUERY intents (needs LLM for synthesis)
        { msg: 'What is our budget status this month?', expected: 'QUERY_DATA' },

        // GENERAL (needs LLM chat)
        { msg: 'Hello! What can you do?', expected: 'GENERAL' },
    ];

    let passed = 0;
    console.log('─── Test Results ───────────────────────────────\n');

    for (const test of tests) {
        const result = await testAI(token, test.msg);
        const intentMatch = result.intent === test.expected;
        const icon = intentMatch ? '✅' : '❌';
        if (intentMatch) passed++;

        console.log(`${icon} [${result.ms}ms] "${test.msg}"`);
        console.log(`   Intent: ${result.intent} (expected: ${test.expected})`);
        console.log(`   Models: ${result.modelsUsed}`);
        console.log(`   Response: ${result.response}`);
        console.log('');
    }

    console.log('─── Summary ────────────────────────────────────');
    console.log(`   Score: ${passed}/${tests.length} (${Math.round(100 * passed / tests.length)}%)`);
    console.log('═══════════════════════════════════════════════════\n');
}

main().catch(console.error);
