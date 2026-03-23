require('dotenv').config();
const mindee = require('mindee');
const fs = require('fs');

async function testMindee() {
    const apiKey = process.env.MINDEE_API_KEY;
    const invoiceModelId = process.env.MINDEE_INVOICE_MODEL_ID;
    const filePath = 'C:\\Users\\tirth\\Downloads\\A4-S2-GST-Invoice-Format_page-0001-scaled.jpg';

    try {
        console.log('Calling Mindee API with model:', invoiceModelId);
        const client = new mindee.Client({ apiKey });
        const inputSource = new mindee.PathInput({ inputPath: filePath });
        
        const response = await client.enqueueAndGetResult(
            mindee.product.Extraction,
            inputSource,
            { modelId: invoiceModelId }
        );

        console.log('\n=== Complete Response Structure ===');
        console.log(JSON.stringify(response, (key, value) => {
            // Skip circular references and large binary data
            if (typeof value === 'function') return '[Function]';
            if (key.includes('readable') || key.includes('stream')) return '[Stream]';
            return value;
        }, 2).slice(0, 5000)); // First 5000 chars

        console.log('\n=== Inference Result ===');
        if (response?.inference?.result) {
            console.log('Result keys:', Object.keys(response.inference.result));
            console.log('Fields:', response.inference.result.fields);
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
    }
}

testMindee();
