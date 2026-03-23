require('dotenv').config();
const mindee = require('mindee');
const path = require('path');

async function testMindee() {
    const apiKey = process.env.MINDEE_API_KEY;
    const invoiceModelId = process.env.MINDEE_INVOICE_MODEL_ID;
    const filePath = 'C:\\Users\\tirth\\Downloads\\A4-S2-GST-Invoice-Format_page-0001-scaled.jpg';

    console.log('=== Mindee Configuration Test ===');
    console.log('API Key configured:', apiKey ? '✓ Yes' : '✗ No');
    console.log('Invoice Model ID:', invoiceModelId || '✗ Not set');
    console.log('Test file exists:', require('fs').existsSync(filePath) ? '✓ Yes' : '✗ No');
    console.log('');

    if (!apiKey || !invoiceModelId) {
        console.error('❌ Missing configuration');
        return;
    }

    try {
        console.log('Initializing Mindee client...');
        const client = new mindee.Client({ apiKey });
        
        console.log('Creating input source...');
        const inputSource = new mindee.PathInput({ inputPath: filePath });
        
        console.log('Calling Mindee API...');
        const response = await client.enqueueAndGetResult(
            mindee.product.Extraction,
            inputSource,
            { modelId: invoiceModelId }
        );

        console.log('✓ API call successful');
        console.log('Response structure:', {
            hasInference: !!response?.inference,
            hasResult: !!response?.inference?.result,
            fieldsCount: response?.inference?.result?.fields ? Object.keys(response.inference.result.fields).length : 0,
        });

        // Show first few fields
        if (response?.inference?.result?.fields) {
            const fieldKeys = Object.keys(response.inference.result.fields).slice(0, 5);
            console.log('First 5 fields:', fieldKeys);
        }
    } catch (error) {
        console.error('❌ Mindee API Error:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Status:', error.statusCode);
        if (error.response?.data) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testMindee();
