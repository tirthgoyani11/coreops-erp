const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const EMAIL = process.env.TEST_EMAIL || 'tirth@coreops.in';
const PASSWORD = process.env.TEST_PASSWORD || 'CoreOps@2026';

async function main() {
    const api = axios.create({
        baseURL: BASE_URL,
        timeout: 30000,
    });

    console.log('=== Financial Rebuild API Proof ===');
    console.log(`Base URL: ${BASE_URL}`);

    // 1) Login
    const loginRes = await api.post('/api/auth/login', {
        email: EMAIL,
        password: PASSWORD,
    });

    if (!loginRes.data?.token) {
        throw new Error('Login did not return access token');
    }

    const token = loginRes.data.token;
    console.log('1) Login OK');
    console.log(`   user: ${loginRes.data.user?.email}`);
    console.log(`   role: ${loginRes.data.user?.role}`);

    const authApi = axios.create({
        baseURL: BASE_URL,
        timeout: 30000,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    // 2) List AP invoices
    const apListRes = await authApi.get('/api/ap-invoices');
    const apInvoices = apListRes.data?.data || [];
    console.log('2) AP Invoices list OK');
    console.log(`   count: ${apListRes.data?.count ?? apInvoices.length}`);

    // 3) Matching report
    const matchReportRes = await authApi.get('/api/ap-invoices/matching/report');
    console.log('3) AP Matching report OK');
    console.log(`   count: ${matchReportRes.data?.count ?? 0}`);

    // 4) Try matching first invoice if present
    if (apInvoices.length > 0) {
        const invoice = apInvoices[0];
        try {
            const matchRes = await authApi.post(`/api/ap-invoices/${invoice.id}/match`, {
                poId: invoice.poId || undefined,
                grnId: invoice.grnId || undefined,
                tolerance: 0.005,
            });
            console.log('4) AP Invoice match OK');
            console.log(`   invoice: ${invoice.invoiceNumber}`);
            console.log(`   status: ${matchRes.data?.data?.status}`);
        } catch (err) {
            console.log('4) AP Invoice match attempted but failed (non-blocking for proof)');
            console.log(`   invoice: ${invoice.invoiceNumber}`);
            console.log(`   reason: ${err.response?.data?.message || err.message}`);
        }
    } else {
        console.log('4) AP Invoice match skipped (no AP invoices available)');
    }

    // 5) Tax reconciliation
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = now.toISOString();

    const taxReconRes = await authApi.get('/api/finance-ext/tax-reconciliation', {
        params: {
            startDate: start,
            endDate: end,
        },
    });
    console.log('5) Tax reconciliation OK');
    console.log(`   summaryRows: ${taxReconRes.data?.data?.summary?.length || 0}`);

    // 6) GST reconciliation
    const gstReconRes = await authApi.get('/api/finance-ext/gst-reconciliation', {
        params: {
            startDate: start,
            endDate: end,
        },
    });
    console.log('6) GST reconciliation OK');
    console.log(`   netPayable: ${gstReconRes.data?.data?.netPayable ?? 'N/A'}`);

    // 7) Line tax calculation
    const calcRes = await authApi.post('/api/finance-ext/tax/calculate-line', {
        lineAmount: 1000,
        taxCode: 'GST_18',
    });
    console.log('7) Tax line calculation OK');
    console.log(`   taxAmount: ${calcRes.data?.data?.taxAmount}`);

    console.log('=== Proof Complete ===');
}

main().catch((error) => {
    console.error('Proof script failed');
    if (error.response) {
        console.error('status:', error.response.status);
        console.error('data:', error.response.data);
    } else {
        console.error('message:', error.message);
        console.error('code:', error.code);
    }
    process.exit(1);
});
