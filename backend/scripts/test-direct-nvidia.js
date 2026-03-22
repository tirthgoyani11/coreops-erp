require('dotenv').config();

async function testDirectNvidia() {
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const nvidiaBase = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    const model = process.env.KIMI_MODEL || 'moonshotai/kimi-k2-instruct';

    console.log(`Testing Direct NVIDIA NIM: ${nvidiaBase}/chat/completions`);
    console.log(`Model: ${model}`);

    try {
        const response = await fetch(`${nvidiaBase}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${nvidiaKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'hello' }],
                max_tokens: 10
            })
        });

        const status = response.status;
        const text = await response.text();
        console.log(`Status: ${status}`);
        console.log(`Response Body: ${text}`);
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

testDirectNvidia();
