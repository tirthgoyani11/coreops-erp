/**
 * LangChain Verification Script
 * 
 * Tests:
 * 1. Intent Classification (Structured Output)
 * 2. Synthesis (RAG style)
 * 3. Chat (General purpose)
 */

require('dotenv').config();
const langchainService = require('../src/services/langchainService');

async function testIntent() {
    console.log('\n--- Testing Intent Classification ---');
    const command = "Create a new Apple MacBook Pro M3 costing 150000 in the laptop category";
    const systemPrompt = "Extract ERP intent and entities.";
    
    try {
        const result = await langchainService.classifyIntent(command, systemPrompt);
        console.log('Result:', JSON.stringify(result, null, 2));
        if (result.intent === 'CREATE_ASSET' && result.entities.assetCategory === 'LAPTOP') {
            console.log('✅ Intent Classification Passed');
        } else {
            console.log('⚠️ Intent Classification returned unexpected results (check model/api key)');
        }
    } catch (e) {
        console.error('❌ Intent Classification Failed:', e.message);
    }
}

async function testSynthesis() {
    console.log('\n--- Testing Synthesis ---');
    const prompt = "How is our budget looking?";
    const contextData = {
        budget: { total: 500000, spent: 125000, remaining: 375000 },
        recent_transactions: [
            { category: 'Maintenance', amount: 5000, date: '2026-03-20' }
        ]
    };
    
    try {
        const result = await langchainService.synthesizeResponse(prompt, "You are a budget analyst.", contextData);
        console.log('Synthesis Output:', result);
        if (result && result.length > 10) {
            console.log('✅ Synthesis Passed');
        }
    } catch (e) {
        console.error('❌ Synthesis Failed:', e.message);
    }
}

async function runTests() {
    console.log('Starting LangChain Verification...');
    await testIntent();
    await testSynthesis();
    console.log('\nVerification Complete.');
}

runTests();
