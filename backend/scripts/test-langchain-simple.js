require('dotenv').config();
const { ChatOpenAI } = require('@langchain/openai');

async function testLangChainSimple() {
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const nvidiaBase = 'https://integrate.api.nvidia.com';
    const model = process.env.KIMI_MODEL || 'moonshotai/kimi-k2-instruct';

    console.log(`Testing LangChain ChatOpenAI: ${nvidiaBase}`);
    console.log(`Model: ${model}`);

    const chat = new ChatOpenAI({
        apiKey: nvidiaKey,
        baseURL: nvidiaBase,
        modelName: model,
        temperature: 0.1,
    });

    try {
        const response = await chat.invoke("hello");
        console.log('Response:', response.content);
        console.log('✅ LangChain Simple Passed');
    } catch (e) {
        console.error('LangChain Simple Failed:', e);
    }
}

testLangChainSimple();
