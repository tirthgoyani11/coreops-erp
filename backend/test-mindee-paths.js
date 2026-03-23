require('dotenv').config();
const mindee = require('mindee');

async function testMindee() {
    const apiKey = process.env.MINDEE_API_KEY;
    const invoiceModelId = process.env.MINDEE_INVOICE_MODEL_ID;
    const filePath = 'C:\\Users\\tirth\\Downloads\\A4-S2-GST-Invoice-Format_page-0001-scaled.jpg';

    try {
        console.log('Calling Mindee API...');
        const client = new mindee.Client({ apiKey });
        const inputSource = new mindee.PathInput({ inputPath: filePath });
        
        const response = await client.enqueueAndGetResult(
            mindee.product.Extraction,
            inputSource,
            { modelId: invoiceModelId }
        );

        console.log('\n=== Checking Response Paths ===');
        console.log('response.inference exists:', !!response?.inference);
        console.log('response.rawHttp.inference exists:', !!response?.rawHttp?.inference);
        console.log('response.inference.result.fields exists:', !!response?.inference?.result?.fields);
        console.log('response.rawHttp.inference.result.fields exists:', !!response?.rawHttp?.inference?.result?.fields);
        
        console.log('\n=== Path Comparison ===');
        const fields1 = response?.inference?.result?.fields;
        const fields2 = response?.rawHttp?.inference?.result?.fields;
        
        console.log('Fields from response.inference.result.fields:', fields1 ? Object.keys(fields1).length + ' fields' : 'undefined');
        console.log('Fields from response.rawHttp.inference.result.fields:', fields2 ? Object.keys(fields2).length + ' fields' : 'undefined');
        
        // Show first field from working path
        if (fields2) {
            const firstKey = Object.keys(fields2)[0];
            console.log('\nFirst field example (supplier_name):');
            console.log(JSON.stringify(fields2.supplier_name, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMindee();
